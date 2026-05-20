import type { DccExEvent, Power } from './parser';
import type { Transport, ConnectionState } from './transport';
import { cmd } from './commands';

export interface RouteInfo {
  id: number;
  type: string;
  name: string;
  state: number;
  caption: string;
}

export interface RosterEntry {
  id: number;
  name: string;
  functions?: string;
}

/**
 * Bright, distinct colours (Tailwind 400-level) for locos on the dark layout.
 * Assigned by the loco's position in the sorted roster, so each loco keeps a
 * stable colour for as long as the roster is unchanged.
 */
const LOCO_PALETTE = [
  '#f87171', // red
  '#fb923c', // orange
  '#facc15', // yellow
  '#4ade80', // green
  '#22d3ee', // cyan
  '#60a5fa', // blue
  '#c084fc', // purple
  '#f472b6', // pink
  '#2dd4bf', // teal
  '#a3e635', // lime
];

/**
 * Reactive state hub. One instance per connection; UI components read directly
 * from these `$state` fields. Reservations are seeded empty — they populate
 * once the CS emits <jS> broadcasts (our patch to EXRAIL2.cpp / CommandDistributor).
 */
class DashboardStore {
  transport: Transport | null = $state(null);
  connection: ConnectionState = $state('disconnected');

  turnouts: Map<number, boolean> = $state(new Map()); // id -> closed
  sensors: Map<number, boolean> = $state(new Map()); // id -> active
  outputs: Map<number, boolean> = $state(new Map()); // id -> state
  routes: Map<number, RouteInfo> = $state(new Map());
  roster: Map<number, RosterEntry> = $state(new Map()); // loco id -> entry
  reservations: Map<number, number> = $state(new Map()); // section -> loco (-1 = freed, removed on free)
  blocks: Map<number, number> = $state(new Map()); // block -> loco
  power: { track: 'MAIN' | 'PROG' | 'ALL'; on: boolean; joined: boolean } = $state({
    track: 'ALL',
    on: false,
    joined: false,
  });

  /** Last N raw events for the debug panel. */
  log: { time: number; ev: DccExEvent }[] = $state([]);
  private readonly LOG_LIMIT = 200;

  // Outgoing commands are paced so we never flood the CS (which answers a burst
  // of <JR id> queries with an <X>). One command leaves every SEND_INTERVAL ms.
  private sendQueue: string[] = [];
  private pumpTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SEND_INTERVAL = 150;
  // Initial queries wait for the CS startup banner (<iDCC-EX ...>); this timer
  // is the fallback if the CS never sends one (e.g. already-running station).
  private initTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;
  private readonly INIT_FALLBACK = 1500;

  attach(transport: Transport): void {
    this.transport = transport;
    transport.onStateChange((s) => {
      this.connection = s;
      if (s === 'connected') {
        this.initialized = false;
        if (this.initTimer) clearTimeout(this.initTimer);
        this.initTimer = setTimeout(() => this.startInitialQueries(), this.INIT_FALLBACK);
      } else {
        this.resetSending();
      }
    });
    transport.onEvent((ev) => this.apply(ev));
  }

  /** Fire the initial state queries once, after the CS is ready. */
  private startInitialQueries(): void {
    if (this.initialized) return;
    this.initialized = true;
    if (this.initTimer) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }
    this.requestInitialState();
  }

  requestInitialState(): void {
    this.enqueue(
      cmd.queryPower(),
      cmd.listTurnouts(),
      cmd.listSensors(),
      cmd.listOutputs(),
      cmd.listRoutes(),
      cmd.listReservations(),
      cmd.listRoster()
    );
  }

  /** Queue commands for paced sending. */
  private enqueue(...cmds: string[]): void {
    this.sendQueue.push(...cmds);
    this.pump();
  }

  private pump(): void {
    if (this.pumpTimer !== null) return;
    const step = () => {
      const next = this.sendQueue.shift();
      if (next === undefined) {
        this.pumpTimer = null;
        return;
      }
      this.transport?.send(next);
      this.pumpTimer = setTimeout(step, this.SEND_INTERVAL);
    };
    step();
  }

  /** Drop any pending queued commands and timers (on disconnect). */
  private resetSending(): void {
    this.initialized = false;
    this.sendQueue = [];
    if (this.pumpTimer) {
      clearTimeout(this.pumpTimer);
      this.pumpTimer = null;
    }
    if (this.initTimer) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }
  }

  apply(ev: DccExEvent): void {
    this.log = [...this.log.slice(-(this.LOG_LIMIT - 1)), { time: Date.now(), ev }];

    switch (ev.tag) {
      case 'turnout':
        this.turnouts = new Map(this.turnouts).set(ev.id, ev.closed);
        return;
      case 'sensor':
        this.sensors = new Map(this.sensors).set(ev.id, ev.active);
        return;
      case 'output':
        this.outputs = new Map(this.outputs).set(ev.id, ev.state);
        return;
      case 'route-info': {
        const existing = this.routes.get(ev.id);
        const next = new Map(this.routes);
        next.set(ev.id, {
          id: ev.id,
          type: ev.type,
          name: ev.name,
          state: existing?.state ?? 0,
          caption: existing?.caption ?? '',
        });
        this.routes = next;
        return;
      }
      case 'route-state': {
        const existing = this.routes.get(ev.id);
        if (!existing) return;
        const next = new Map(this.routes);
        next.set(ev.id, { ...existing, state: ev.state });
        this.routes = next;
        return;
      }
      case 'route-caption': {
        const existing = this.routes.get(ev.id);
        if (!existing) return;
        const next = new Map(this.routes);
        next.set(ev.id, { ...existing, caption: ev.caption });
        this.routes = next;
        return;
      }
      case 'reservation': {
        const next = new Map(this.reservations);
        if (ev.loco < 0) next.delete(ev.id);
        else next.set(ev.id, ev.loco);
        this.reservations = next;
        return;
      }
      case 'roster-list': {
        const next = new Map(this.roster);
        for (const id of ev.ids) {
          if (!next.has(id)) next.set(id, { id, name: `Lok ${id}` });
        }
        this.roster = next;
        // Ask for each loco's name/functions — paced, so the CS doesn't <X> us.
        this.enqueue(...ev.ids.map((id) => cmd.rosterEntry(id)));
        return;
      }
      case 'roster-entry': {
        const next = new Map(this.roster);
        next.set(ev.id, { id: ev.id, name: ev.name || `Lok ${ev.id}`, functions: ev.functions });
        this.roster = next;
        return;
      }
      case 'block-enter':
        this.blocks = new Map(this.blocks).set(ev.block, ev.loco);
        return;
      case 'block-exit': {
        const next = new Map(this.blocks);
        next.delete(ev.block);
        this.blocks = next;
        return;
      }
      case 'power':
        this.power = { track: ev.track, on: ev.on, joined: ev.joined };
        return;
      case 'startup':
        // CS is ready — fire the initial queries now (cancels the fallback).
        this.startInitialQueries();
        return;
    }
  }

  /**
   * Stable, distinct colour for a loco. Locos in the roster get a palette
   * colour by their sorted position; anything else falls back to a hashed hue.
   */
  colorForLoco(loco: number): string {
    const ids = [...this.roster.keys()].sort((a, b) => a - b);
    const idx = ids.indexOf(loco);
    if (idx >= 0) return LOCO_PALETTE[idx % LOCO_PALETTE.length];
    return `hsl(${(loco * 47) % 360} 70% 65%)`;
  }

  // ----- intents -----
  toggleTurnout(id: number): void {
    const current = this.turnouts.get(id) ?? true;
    this.transport?.send(cmd.setTurnout(id, !current));
  }

  toggleOutput(id: number): void {
    const current = this.outputs.get(id) ?? false;
    this.transport?.send(cmd.setOutput(id, !current));
  }

  startRoute(id: number): void {
    this.transport?.send(cmd.startRoute(id));
  }

  killRoute(id: number): void {
    this.transport?.send(cmd.killRoute(id));
  }

  /** Force-free one section reservation. CS broadcasts <jS id -1> back. */
  freeSection(id: number): void {
    this.transport?.send(cmd.freeSection(id));
  }

  /** Force-free all section reservations. */
  freeAllReservations(): void {
    this.transport?.send(cmd.freeAllSections());
  }

  setPower(on: boolean): void {
    this.transport?.send(on ? cmd.powerOn() : cmd.powerOff());
  }
}

export const store = new DashboardStore();

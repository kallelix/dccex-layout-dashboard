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

  attach(transport: Transport): void {
    this.transport = transport;
    transport.onStateChange((s) => {
      this.connection = s;
      if (s === 'connected') this.requestInitialState();
    });
    transport.onEvent((ev) => this.apply(ev));
  }

  requestInitialState(): void {
    if (!this.transport) return;
    this.transport.send(cmd.queryPower());
    this.transport.send(cmd.listTurnouts());
    this.transport.send(cmd.listSensors());
    this.transport.send(cmd.listOutputs());
    this.transport.send(cmd.listRoutes());
    this.transport.send(cmd.listReservations());
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
    }
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

  setPower(on: boolean): void {
    this.transport?.send(on ? cmd.powerOn() : cmd.powerOff());
  }
}

export const store = new DashboardStore();

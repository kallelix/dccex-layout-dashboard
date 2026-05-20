/**
 * Layout JSON schema — the dashboard's view of the physical layout.
 *
 * The CommandStation only knows IDs; this file maps those IDs to geometry,
 * human-readable labels, and groupings (sections, scenes).
 */

export interface LayoutDocument {
  /** Layout name shown in the title. */
  name: string;
  /** SVG viewBox, e.g. "0 0 1000 600". */
  viewBox: string;
  /** Track segments (raw SVG path strings). */
  segments: Segment[];
  /** Turnouts overlaid on the track. */
  turnouts: TurnoutDef[];
  /** Sensors as small markers. */
  sensors: SensorDef[];
  /** Building / scene lights driven by EX-RAIL Outputs. */
  lights: LightDef[];
  /** Logical sections that group segments for reservation highlighting. */
  sections: SectionDef[];
  /** EX-RAIL routes/sequences exposed as quick-start buttons. */
  sequences: SequenceDef[];
}

export interface Segment {
  /** Local-only id used by sections to reference this segment. */
  id: string;
  /** SVG path data. */
  path: string;
  /** Optional EX-RAIL section id this segment belongs to. */
  sectionId?: number;
  stroke?: string;
  strokeWidth?: number;
}

export interface TurnoutDef {
  /** CS turnout id (matches `<H id ...>`). */
  id: number;
  x: number;
  y: number;
  /** Rotation in degrees. */
  rotation?: number;
  label?: string;
  /**
   * Topology (all optional, all reference `segments[].id`):
   * which track leg meets the points (`root`) and which legs the turnout
   * routes onto when CLOSED (`<T id 0>`) vs THROWN (`<T id 1>`). When set,
   * the rendered leg that is NOT currently selected is dimmed, so the set
   * route is visible. CLOSED/THROWN is a decoder convention, not necessarily
   * the physically straight leg — wire these to whatever the hardware does.
   */
  root?: string;
  closed?: string;
  thrown?: string;
}

export interface SensorDef {
  /** CS sensor id (matches `<Q id>` / `<q id>`). */
  id: number;
  x: number;
  y: number;
  label?: string;
}

export interface LightDef {
  x: number;
  y: number;
  label?: string;
  /** EX-RAIL alias from myAlias.h, for reference / future grouping. */
  alias?: string;
  /** SVG radius in px (default 7). */
  r?: number;
  /**
   * How the CS drives this light. Default `'output'`.
   * - `'output'`: an EX-RAIL Output / VPIN — `outputId` required, set via
   *   `<Z id state>`, state from `<Y id state>`.
   * - `'turnout'`: a DCC accessory light declared as `TURNOUTL(...)` —
   *   `turnoutId` required, switched via `<T id 0|1>`, state from `<H id state>`.
   *   `on` is treated as THROWN (`<T id 1>`).
   */
  protocol?: 'output' | 'turnout';
  /** Output / VPIN id — required when `protocol` is `'output'` (the default). */
  outputId?: number;
  /** Turnout id — required when `protocol` is `'turnout'`. */
  turnoutId?: number;
}

export interface SectionDef {
  /** EX-RAIL section id used in RESERVE/FREE opcodes. */
  id: number;
  label: string;
  /** Segment ids that make up this section, for highlight colouring. */
  segments: string[];
}

export interface SequenceDef {
  /** EX-RAIL route id (started with `</ START id>`). */
  routeId: number;
  label: string;
  icon?: string;
}

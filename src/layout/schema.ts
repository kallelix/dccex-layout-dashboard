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
}

export interface SensorDef {
  /** CS sensor id (matches `<Q id>` / `<q id>`). */
  id: number;
  x: number;
  y: number;
  label?: string;
}

export interface LightDef {
  /** CS output id (matches `<Y id state>` and is set via `<Z id state>`). */
  outputId: number;
  x: number;
  y: number;
  label?: string;
  /** EX-RAIL alias from myAlias.h, for reference / future grouping. */
  alias?: string;
  /** SVG radius in px (default 6). */
  r?: number;
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

/**
 * Builders for DCC-EX native protocol commands the dashboard sends.
 * All return strings including the `<>` framing — pass straight to transport.send().
 */

export const cmd = {
  // Enumerate / query
  listTurnouts: (): string => '<T>',
  listSensors: (): string => '<S>',
  listOutputs: (): string => '<Z>',
  listRoutes: (): string => '<JA>',
  listReservations: (): string => '<JS>',
  listRoster: (): string => '<JR>',
  rosterEntry: (id: number): string => `<JR ${id}>`,
  queryPower: (): string => '<s>',

  // Turnouts: <T id 0|1>  (0 = close, 1 = throw)
  setTurnout: (id: number, closed: boolean): string => `<T ${id} ${closed ? 0 : 1}>`,

  // Outputs (used for building lights too): <Z id state>
  setOutput: (id: number, on: boolean): string => `<Z ${id} ${on ? 1 : 0}>`,

  // EX-RAIL: start a route/sequence by id.
  // The native syntax is `</ START id>` (parser: EXRAIL2Parser.cpp:49).
  startRoute: (id: number): string => `</ START ${id}>`,
  killRoute: (id: number): string => `</ KILL ${id}>`,

  // Track power
  powerOn: (): string => '<1>',
  powerOff: (): string => '<0>',
  powerOnMain: (): string => '<1 MAIN>',
  powerOnProg: (): string => '<1 PROG>',
} as const;

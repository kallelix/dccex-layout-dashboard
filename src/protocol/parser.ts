/**
 * DCC-EX native protocol parser.
 *
 * The native protocol is framed with `<` / `>`. Each frame starts with a tag
 * (single char or `j` + char for EX-RAIL sub-tags) followed by space-separated
 * arguments. Strings are double-quoted and may contain spaces.
 *
 * This parser is permissive: unknown tags surface as { tag: 'unknown', raw }
 * so callers can log them without crashing.
 */

export type Power = 'OFF' | 'MAIN' | 'PROG' | 'JOIN' | 'BOTH';

export type DccExEvent =
  | { tag: 'turnout'; id: number; closed: boolean }
  | { tag: 'sensor'; id: number; active: boolean }
  | { tag: 'output'; id: number; state: boolean }
  | { tag: 'power'; track: 'MAIN' | 'PROG' | 'ALL'; on: boolean; joined: boolean }
  | { tag: 'loco'; address: number; speed: number; direction: 'fwd' | 'rev'; stop: boolean; functions: number }
  | { tag: 'block-enter'; block: number; loco: number }
  | { tag: 'block-exit'; block: number; loco: number }
  | { tag: 'route-info'; id: number; type: string; name: string }
  | { tag: 'route-state'; id: number; state: number }
  | { tag: 'route-caption'; id: number; caption: string }
  | { tag: 'reservation'; id: number; loco: number } // loco = -1 means freed
  | { tag: 'ok' }
  | { tag: 'error'; message: string }
  | { tag: 'unknown'; raw: string };

/**
 * Tokenize the inside of a `<...>` frame. Quoted strings stay one token.
 */
export function tokenize(body: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < body.length) {
    const c = body[i];
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }
    if (c === '"') {
      const end = body.indexOf('"', i + 1);
      if (end === -1) {
        tokens.push(body.slice(i + 1));
        break;
      }
      tokens.push(body.slice(i + 1, end));
      i = end + 1;
      continue;
    }
    let j = i;
    while (j < body.length && body[j] !== ' ' && body[j] !== '\t') j++;
    tokens.push(body.slice(i, j));
    i = j;
  }
  return tokens;
}

/**
 * Split a raw stream chunk into complete `<...>` frames. Returns the list of
 * frame bodies (without the angle brackets) plus any leftover not-yet-closed
 * tail that the caller should prepend to the next chunk.
 */
export function frame(buffer: string): { frames: string[]; rest: string } {
  const frames: string[] = [];
  let i = 0;
  while (i < buffer.length) {
    const start = buffer.indexOf('<', i);
    if (start === -1) return { frames, rest: '' };
    const end = buffer.indexOf('>', start + 1);
    if (end === -1) return { frames, rest: buffer.slice(start) };
    frames.push(buffer.slice(start + 1, end));
    i = end + 1;
  }
  return { frames, rest: '' };
}

function num(s: string | undefined): number {
  if (s === undefined) return NaN;
  return Number(s);
}

export function parseFrame(body: string): DccExEvent {
  const raw = `<${body}>`;
  const tokens = tokenize(body);
  if (tokens.length === 0) return { tag: 'unknown', raw };

  const head = tokens[0];

  // Power tag has no space before the digit: <p0>, <p1>, <p1 MAIN>, <p1 JOIN>...
  if (head.length >= 2 && head[0] === 'p' && (head[1] === '0' || head[1] === '1')) {
    const on = head[1] === '1';
    if (!on) return { tag: 'power', track: 'ALL', on: false, joined: false };
    const arg = tokens[1] ?? '';
    if (arg === '' || arg === 'BOTH') return { tag: 'power', track: 'ALL', on: true, joined: false };
    if (arg === 'MAIN') return { tag: 'power', track: 'MAIN', on: true, joined: false };
    if (arg === 'PROG') return { tag: 'power', track: 'PROG', on: true, joined: false };
    if (arg === 'JOIN') return { tag: 'power', track: 'ALL', on: true, joined: true };
    return { tag: 'power', track: 'ALL', on, joined: false };
  }

  // Two-letter EX-RAIL tags: jA, jB, jS ...
  if (head.length === 2 && head[0] === 'j') {
    switch (head[1]) {
      case 'A': {
        // <jA id type "name">  or  <jA id state>
        const id = num(tokens[1]);
        if (tokens.length >= 4) {
          return { tag: 'route-info', id, type: tokens[2] ?? '', name: tokens[3] ?? '' };
        }
        return { tag: 'route-state', id, state: num(tokens[2]) };
      }
      case 'B': {
        // <jB id state>  or  <jB id "caption">
        const id = num(tokens[1]);
        const second = tokens[2] ?? '';
        const asNum = Number(second);
        if (!Number.isNaN(asNum) && second !== '') {
          return { tag: 'route-state', id, state: asNum };
        }
        return { tag: 'route-caption', id, caption: second };
      }
      case 'S': {
        // <jS id loco>   section reservation (loco = -1 means freed).
        // Note: <jR> is the loco roster, not reservations.
        return { tag: 'reservation', id: num(tokens[1]), loco: num(tokens[2]) };
      }
    }
    return { tag: 'unknown', raw };
  }

  switch (head) {
    case 'H': {
      // <H id state>  — DCC++ classic convention: 1=thrown, 0=closed.
      // CommandDistributor.cpp emits `!isClosed` here.
      return { tag: 'turnout', id: num(tokens[1]), closed: tokens[2] === '0' };
    }
    case 'Q':
      return { tag: 'sensor', id: num(tokens[1]), active: true };
    case 'q':
      return { tag: 'sensor', id: num(tokens[1]), active: false };
    case 'Y': {
      // <Y id state>
      return { tag: 'output', id: num(tokens[1]), state: tokens[2] === '1' };
    }
    case 'K':
      return { tag: 'block-enter', block: num(tokens[1]), loco: num(tokens[2]) };
    case 'k':
      return { tag: 'block-exit', block: num(tokens[1]), loco: num(tokens[2]) };
    case 'l': {
      // <l address slot speed_byte function_bits>
      // speed byte: bit 7 = direction (1=fwd), bits 0-6 = speed (0=stop, 1=eStop, 2..127)
      const speedByte = num(tokens[3]);
      const direction: 'fwd' | 'rev' = (speedByte & 0x80) ? 'fwd' : 'rev';
      const rawSpeed = speedByte & 0x7f;
      const stop = rawSpeed === 0 || rawSpeed === 1;
      const speed = stop ? 0 : rawSpeed - 1;
      return {
        tag: 'loco',
        address: num(tokens[1]),
        speed,
        direction,
        stop,
        functions: num(tokens[4]),
      };
    }
    case 'O':
      return { tag: 'ok' };
    case 'X':
      return { tag: 'error', message: tokens.slice(1).join(' ') };
  }

  return { tag: 'unknown', raw };
}

/**
 * Stateful streaming parser. Feed it chunks (e.g. WebSocket messages or
 * WebSerial reads) and it emits typed events while buffering partial frames.
 */
export class StreamParser {
  private buffer = '';

  feed(chunk: string): DccExEvent[] {
    this.buffer += chunk;
    const { frames, rest } = frame(this.buffer);
    this.buffer = rest;
    return frames.map(parseFrame);
  }

  reset(): void {
    this.buffer = '';
  }
}

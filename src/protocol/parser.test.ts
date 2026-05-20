import { describe, expect, it } from 'vitest';
import { StreamParser, frame, parseFrame, tokenize } from './parser';

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('H 12 1')).toEqual(['H', '12', '1']);
  });
  it('keeps quoted strings as one token', () => {
    expect(tokenize('jA 7 R "My Route"')).toEqual(['jA', '7', 'R', 'My Route']);
  });
  it('handles multiple spaces', () => {
    expect(tokenize('H  12   1')).toEqual(['H', '12', '1']);
  });
});

describe('frame', () => {
  it('extracts complete frames', () => {
    expect(frame('<H 12 1><q 5>')).toEqual({ frames: ['H 12 1', 'q 5'], rest: '' });
  });
  it('buffers partial frames', () => {
    expect(frame('<H 12 1><Q 5')).toEqual({ frames: ['H 12 1'], rest: '<Q 5' });
  });
  it('ignores garbage between frames', () => {
    expect(frame('junk<H 12 1>\nmore<Q 5>')).toEqual({
      frames: ['H 12 1', 'Q 5'],
      rest: '',
    });
  });
});

describe('parseFrame', () => {
  it('parses turnout closed (CS broadcasts 0 for closed)', () => {
    expect(parseFrame('H 12 0')).toEqual({ tag: 'turnout', id: 12, closed: true });
  });
  it('parses turnout thrown (CS broadcasts 1 for thrown)', () => {
    expect(parseFrame('H 12 1')).toEqual({ tag: 'turnout', id: 12, closed: false });
  });
  it('parses sensor active/inactive', () => {
    expect(parseFrame('Q 42')).toEqual({ tag: 'sensor', id: 42, active: true });
    expect(parseFrame('q 42')).toEqual({ tag: 'sensor', id: 42, active: false });
  });
  it('parses output state', () => {
    expect(parseFrame('Y 5001 1')).toEqual({ tag: 'output', id: 5001, state: true });
    expect(parseFrame('Y 5001 0')).toEqual({ tag: 'output', id: 5001, state: false });
  });
  it('parses route info with name', () => {
    expect(parseFrame('jA 7 R "Pendelfahrt"')).toEqual({
      tag: 'route-info',
      id: 7,
      type: 'R',
      name: 'Pendelfahrt',
    });
  });
  it('parses route state', () => {
    expect(parseFrame('jB 7 2')).toEqual({ tag: 'route-state', id: 7, state: 2 });
  });
  it('parses route caption', () => {
    expect(parseFrame('jB 7 "active"')).toEqual({ tag: 'route-caption', id: 7, caption: 'active' });
  });
  it('parses reservation (jS, not jR which is roster)', () => {
    expect(parseFrame('jS 3 1234')).toEqual({ tag: 'reservation', id: 3, loco: 1234 });
    expect(parseFrame('jS 3 -1')).toEqual({ tag: 'reservation', id: 3, loco: -1 });
  });
  it('parses block enter/exit', () => {
    expect(parseFrame('K 2 99')).toEqual({ tag: 'block-enter', block: 2, loco: 99 });
    expect(parseFrame('k 2 99')).toEqual({ tag: 'block-exit', block: 2, loco: 99 });
  });
  it('parses power states', () => {
    expect(parseFrame('p0')).toEqual({ tag: 'power', track: 'ALL', on: false, joined: false });
    expect(parseFrame('p1')).toEqual({ tag: 'power', track: 'ALL', on: true, joined: false });
    expect(parseFrame('p1 MAIN')).toEqual({ tag: 'power', track: 'MAIN', on: true, joined: false });
    expect(parseFrame('p1 PROG')).toEqual({ tag: 'power', track: 'PROG', on: true, joined: false });
    expect(parseFrame('p1 JOIN')).toEqual({ tag: 'power', track: 'ALL', on: true, joined: true });
  });
  it('parses ok and error', () => {
    expect(parseFrame('O')).toEqual({ tag: 'ok' });
    expect(parseFrame('X bad command')).toEqual({ tag: 'error', message: 'bad command' });
  });
  it('returns unknown for unrecognized tags', () => {
    expect(parseFrame('Z9 weird')).toEqual({ tag: 'unknown', raw: '<Z9 weird>' });
  });
  it('parses loco speed byte (forward, speed step 50)', () => {
    // speedByte = 0x80 | (50+1) = 0xB3 = 179
    const ev = parseFrame('l 3 0 179 0');
    expect(ev).toMatchObject({ tag: 'loco', address: 3, speed: 50, direction: 'fwd', stop: false });
  });
  it('parses loco stop', () => {
    const ev = parseFrame('l 3 0 128 0'); // 0x80 | 0 = forward stop
    expect(ev).toMatchObject({ tag: 'loco', address: 3, speed: 0, stop: true });
  });
});

describe('StreamParser', () => {
  it('reassembles split frames across chunks', () => {
    const sp = new StreamParser();
    expect(sp.feed('<H 12')).toEqual([]);
    const events = sp.feed(' 0><Q 5>');
    expect(events).toEqual([
      { tag: 'turnout', id: 12, closed: true },
      { tag: 'sensor', id: 5, active: true },
    ]);
  });
  it('handles trailing newlines and junk', () => {
    const sp = new StreamParser();
    const events = sp.feed('\n<H 1 1>\r\n<Q 7>\n');
    expect(events).toEqual([
      { tag: 'turnout', id: 1, closed: false },
      { tag: 'sensor', id: 7, active: true },
    ]);
  });
});

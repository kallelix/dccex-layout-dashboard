import { StreamParser, type DccExEvent } from './parser';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface Transport {
  readonly state: ConnectionState;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(frame: string): void;
  onEvent(cb: (ev: DccExEvent) => void): void;
  onStateChange(cb: (s: ConnectionState) => void): void;
}

/**
 * Shared base: wires a StreamParser between the raw byte stream and typed
 * event listeners, and manages state transitions.
 */
abstract class BaseTransport implements Transport {
  protected parser = new StreamParser();
  protected eventCb: ((ev: DccExEvent) => void) | null = null;
  protected stateCb: ((s: ConnectionState) => void) | null = null;
  private _state: ConnectionState = 'disconnected';

  get state(): ConnectionState {
    return this._state;
  }

  protected setState(s: ConnectionState): void {
    if (s === this._state) return;
    this._state = s;
    this.stateCb?.(s);
  }

  protected ingest(chunk: string): void {
    const events = this.parser.feed(chunk);
    if (!this.eventCb) return;
    for (const ev of events) this.eventCb(ev);
  }

  onEvent(cb: (ev: DccExEvent) => void): void {
    this.eventCb = cb;
  }

  onStateChange(cb: (s: ConnectionState) => void): void {
    this.stateCb = cb;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(frame: string): void;
}

/**
 * WebSocket transport — talks to EX-CommandStation-WiFi or any TCP-to-WS bridge.
 * Default port for EX-CommandStation websocket service is configurable on the CS side.
 */
export class WebSocketTransport extends BaseTransport {
  private ws: WebSocket | null = null;
  constructor(private readonly url: string) {
    super();
  }

  connect(): Promise<void> {
    this.setState('connecting');
    return new Promise((resolve, reject) => {
      try {
        // DCC-EX always echoes back `Sec-WebSocket-Protocol: DCCEX` in its
        // 101 response (Websockets.cpp). Per RFC 6455 the browser will fail
        // the connection if we don't request that subprotocol ourselves.
        this.ws = new WebSocket(this.url, 'DCCEX');
      } catch (e) {
        this.setState('error');
        reject(e);
        return;
      }
      this.ws.addEventListener('open', () => {
        this.setState('connected');
        resolve();
      });
      this.ws.addEventListener('message', (ev) => {
        const data = typeof ev.data === 'string' ? ev.data : '';
        if (data) this.ingest(data);
      });
      this.ws.addEventListener('close', () => this.setState('disconnected'));
      this.ws.addEventListener('error', () => {
        this.setState('error');
        reject(new Error('websocket error'));
      });
    });
  }

  async disconnect(): Promise<void> {
    this.ws?.close();
    this.ws = null;
    this.setState('disconnected');
  }

  send(frame: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(frame);
    }
  }
}

/**
 * WebSerial transport — direct USB-serial to a wired CommandStation.
 * Only available in Chromium-based browsers.
 */
export class WebSerialTransport extends BaseTransport {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();
  private readLoopAbort = false;

  constructor(private readonly baudRate = 115200) {
    super();
  }

  async connect(): Promise<void> {
    if (!('serial' in navigator)) {
      throw new Error('WebSerial is not supported in this browser');
    }
    this.setState('connecting');
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: this.baudRate });
      this.writer = this.port.writable?.getWriter() ?? null;
      this.reader = this.port.readable?.getReader() ?? null;
      this.setState('connected');
      this.readLoop();
    } catch (e) {
      this.setState('error');
      throw e;
    }
  }

  private async readLoop(): Promise<void> {
    if (!this.reader) return;
    try {
      while (!this.readLoopAbort) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) this.ingest(this.decoder.decode(value, { stream: true }));
      }
    } catch {
      this.setState('error');
    }
  }

  async disconnect(): Promise<void> {
    this.readLoopAbort = true;
    try {
      await this.reader?.cancel();
    } catch {
      // ignore
    }
    try {
      await this.writer?.close();
    } catch {
      // ignore
    }
    try {
      await this.port?.close();
    } catch {
      // ignore
    }
    this.reader = null;
    this.writer = null;
    this.port = null;
    this.readLoopAbort = false;
    this.setState('disconnected');
  }

  send(frame: string): void {
    if (!this.writer) return;
    void this.writer.write(this.encoder.encode(frame + '\n'));
  }
}

/**
 * Mock transport — emits scripted frames for development without hardware.
 */
export class MockTransport extends BaseTransport {
  async connect(): Promise<void> {
    this.setState('connecting');
    await new Promise((r) => setTimeout(r, 100));
    this.setState('connected');
    // Initial state snapshot
    this.ingest('<p1 MAIN><H 1 1><H 2 0><H 12 1><Y 5001 0><Y 5002 1><jA 7 R "Pendelfahrt"><jA 8 R "Wende">');
  }

  async disconnect(): Promise<void> {
    this.setState('disconnected');
  }

  send(frame: string): void {
    // Echo back state changes the way the real CS would broadcast them.
    const m = frame.match(/^<T (\d+) (\d+)>$/);
    if (m) {
      const id = Number(m[1]);
      const closed = m[2] === '0';
      setTimeout(() => this.ingest(`<H ${id} ${closed ? 1 : 0}>`), 50);
      return;
    }
    const z = frame.match(/^<Z (\d+) (\d+)>$/);
    if (z) {
      setTimeout(() => this.ingest(`<Y ${z[1]} ${z[2]}>`), 50);
      return;
    }
    const r = frame.match(/^<\/ START (\d+)>$/);
    if (r) {
      setTimeout(() => this.ingest(`<jB ${r[1]} 2>`), 50);
      return;
    }
  }

  /** Test/dev helper to push arbitrary frames as if they came from the CS. */
  inject(raw: string): void {
    this.ingest(raw);
  }
}

// Web Serial types are not in lib.dom.d.ts in older TS versions — declare minimally.
declare global {
  interface Navigator {
    serial: {
      requestPort(): Promise<SerialPort>;
    };
  }
  interface SerialPort {
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
  }
}

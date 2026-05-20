<script lang="ts">
  import { store } from '../protocol/store.svelte';
  import { MockTransport, WebSerialTransport, WebSocketTransport } from '../protocol/transport';

  const LS_URL = 'dccex-dashboard-ws-url';
  const LS_MODE = 'dccex-dashboard-transport-mode';

  function readLs(key: string, fallback: string): string {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }
  function writeLs(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }

  let url = $state(readLs(LS_URL, 'ws://192.168.4.1:2560'));
  let mode: 'mock' | 'ws' | 'serial' = $state(
    (readLs(LS_MODE, 'mock') as 'mock' | 'ws' | 'serial')
  );
  let error = $state<string | null>(null);

  async function connect() {
    error = null;
    writeLs(LS_MODE, mode);
    if (mode === 'ws') writeLs(LS_URL, url);
    try {
      const transport =
        mode === 'mock'
          ? new MockTransport()
          : mode === 'ws'
            ? new WebSocketTransport(url)
            : new WebSerialTransport();
      store.attach(transport);
      await transport.connect();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function disconnect() {
    await store.transport?.disconnect();
  }

  const statusColor = $derived(
    store.connection === 'connected'
      ? 'bg-emerald-500'
      : store.connection === 'connecting'
        ? 'bg-amber-500'
        : store.connection === 'error'
          ? 'bg-red-500'
          : 'bg-slate-500'
  );
</script>

<header class="flex items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2">
  <span class="inline-flex items-center gap-2 text-sm">
    <span class="h-2 w-2 rounded-full {statusColor}"></span>
    <span class="text-slate-300">{store.connection}</span>
  </span>

  <select bind:value={mode} class="rounded bg-slate-800 px-2 py-1 text-xs text-slate-100">
    <option value="mock">Mock</option>
    <option value="ws">WebSocket</option>
    <option value="serial">WebSerial</option>
  </select>

  {#if mode === 'ws'}
    <input
      type="text"
      bind:value={url}
      class="w-64 rounded bg-slate-800 px-2 py-1 text-xs text-slate-100"
      placeholder="ws://host:port"
    />
  {/if}

  {#if store.connection === 'connected'}
    <button class="rounded bg-slate-700 hover:bg-slate-600 px-3 py-1 text-xs" onclick={disconnect}>
      Trennen
    </button>
  {:else}
    <button
      class="rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-xs"
      onclick={connect}
      disabled={store.connection === 'connecting'}
    >
      Verbinden
    </button>
  {/if}

  <div class="ml-auto flex items-center gap-3 text-xs">
    <span class="text-slate-400">
      Power: <span class="text-slate-100">{store.power.on ? store.power.track : 'OFF'}</span>
      {store.power.joined ? '· JOIN' : ''}
    </span>
    <button
      class="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs"
      onclick={() => store.setPower(!store.power.on)}
      disabled={store.connection !== 'connected'}
    >
      Power {store.power.on ? 'Aus' : 'An'}
    </button>
  </div>

  {#if error}
    <span class="text-xs text-red-400">{error}</span>
  {/if}
</header>

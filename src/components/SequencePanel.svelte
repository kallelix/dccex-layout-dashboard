<script lang="ts">
  import type { SequenceDef } from '../layout/schema';
  import { store } from '../protocol/store.svelte';

  let { sequences }: { sequences: SequenceDef[] } = $props();
</script>

<section class="flex flex-col gap-2">
  <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Sequenzen</h2>
  {#each sequences as seq (seq.routeId)}
    {@const info = store.routes.get(seq.routeId)}
    {@const active = (info?.state ?? 0) >= 2}
    <div class="flex items-center justify-between gap-2 rounded bg-slate-800 px-3 py-2">
      <div class="flex flex-col">
        <span class="text-sm">{seq.label}</span>
        <span class="text-xs text-slate-500">#{seq.routeId} · {info?.caption ?? '—'}</span>
      </div>
      <div class="flex gap-1">
        <button
          class="rounded px-2 py-1 text-xs font-medium {active
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-100'}"
          onclick={() => store.startRoute(seq.routeId)}
        >
          Start
        </button>
        <button
          class="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs text-slate-100"
          onclick={() => store.killRoute(seq.routeId)}
        >
          Stop
        </button>
      </div>
    </div>
  {/each}
</section>

<script lang="ts">
  import { store } from '../protocol/store.svelte';

  // Roster sorted by id.
  const locos = $derived([...store.roster.values()].sort((a, b) => a.id - b.id));

  // Reverse map loco -> reserved section ids, so each loco shows what it holds.
  const reservedByLoco = $derived.by(() => {
    const m = new Map<number, number[]>();
    for (const [section, loco] of store.reservations) {
      const arr = m.get(loco) ?? [];
      arr.push(section);
      m.set(loco, arr);
    }
    return m;
  });
</script>

<section class="flex flex-col gap-2">
  <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Loks</h2>

  {#each locos as loco (loco.id)}
    {@const sections = reservedByLoco.get(loco.id)}
    <div class="flex items-center gap-2 rounded bg-slate-800 px-3 py-2">
      <span
        class="h-3 w-3 shrink-0 rounded-full"
        style="background-color: {store.colorForLoco(loco.id)}"
      ></span>
      <div class="flex min-w-0 flex-col">
        <span class="truncate text-sm">{loco.name}</span>
        <span class="text-xs text-slate-500">
          #{loco.id}{sections ? ` · belegt ${sections.sort((a, b) => a - b).map((s) => `B${s}`).join(', ')}` : ''}
        </span>
      </div>
    </div>
  {/each}

  {#if locos.length === 0}
    <p class="text-xs text-slate-500">Kein Roster geladen (verbinden, um es von der CS zu holen)</p>
  {/if}
</section>

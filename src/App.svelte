<script lang="ts">
  import ConnectionBar from './components/ConnectionBar.svelte';
  import LayoutView from './components/LayoutView.svelte';
  import LayoutPicker from './components/LayoutPicker.svelte';
  import SequencePanel from './components/SequencePanel.svelte';
  import { layoutStore } from './layout/layoutStore.svelte';
</script>

<div class="flex h-screen flex-col">
  <ConnectionBar />
  <main class="flex flex-1 gap-3 overflow-hidden p-3">
    <section class="flex flex-1 flex-col gap-2">
      <h1 class="text-sm text-slate-400">{layoutStore.current.name}</h1>
      <div class="flex-1 overflow-hidden rounded border border-slate-800">
        {#key layoutStore.current}
          <LayoutView layout={layoutStore.current} />
        {/key}
      </div>
    </section>
    <aside class="flex w-72 flex-col gap-4 overflow-y-auto rounded border border-slate-800 bg-slate-900 p-3">
      <LayoutPicker />
      <SequencePanel sequences={layoutStore.current.sequences} />
    </aside>
  </main>
</div>

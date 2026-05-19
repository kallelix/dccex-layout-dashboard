<script lang="ts">
  import ConnectionBar from './components/ConnectionBar.svelte';
  import LayoutView from './components/LayoutView.svelte';
  import SequencePanel from './components/SequencePanel.svelte';
  import { getExampleLayout } from './layout/loader';

  const layout = getExampleLayout();
</script>

<div class="flex h-screen flex-col">
  <ConnectionBar />
  <main class="flex flex-1 gap-3 overflow-hidden p-3">
    <section class="flex flex-1 flex-col gap-2">
      <h1 class="text-sm text-slate-400">{layout.name}</h1>
      <div class="flex-1 overflow-hidden rounded border border-slate-800">
        <LayoutView {layout} />
      </div>
    </section>
    <aside class="w-72 overflow-y-auto rounded border border-slate-800 bg-slate-900 p-3">
      <SequencePanel sequences={layout.sequences} />
    </aside>
  </main>
</div>

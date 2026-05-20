<script lang="ts">
  import { layoutStore } from '../layout/layoutStore.svelte';
  import { loadLayoutFromFile } from '../layout/loader';

  let fileInput: HTMLInputElement | undefined = $state();
  let error = $state<string | null>(null);
  let dragOver = $state(false);

  async function handleFile(file: File) {
    error = null;
    try {
      const doc = await loadLayoutFromFile(file);
      layoutStore.set(doc, file.name);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function onPick(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) await handleFile(file);
    input.value = '';
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function onDragLeave() {
    dragOver = false;
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) await handleFile(file);
  }

  function reset() {
    layoutStore.reset();
    error = null;
  }

  const sourceLabel = $derived(
    layoutStore.source === 'example'
      ? 'Beispiel'
      : layoutStore.source === 'server'
        ? 'Server'
        : layoutStore.source === 'storage'
          ? `gespeichert · ${layoutStore.fileName ?? 'unbenannt'}`
          : layoutStore.fileName ?? 'Datei'
  );

  // Only a user-loaded layout (drag&drop / file) can be reset; example/server are defaults.
  const canReset = $derived(layoutStore.source === 'storage' || layoutStore.source === 'file');
</script>

<section class="flex flex-col gap-2">
  <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Layout</h2>

  <div class="flex items-center justify-between text-xs text-slate-300">
    <div class="flex flex-col">
      <span class="font-medium text-slate-100">{layoutStore.current.name}</span>
      <span class="text-slate-500">{sourceLabel}</span>
    </div>
    {#if canReset}
      <button
        class="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs"
        onclick={reset}
        title="Eigenes Layout verwerfen (zurück zum Server-/Beispiel-Layout)"
      >
        Reset
      </button>
    {/if}
  </div>

  <div
    role="button"
    tabindex="0"
    class="cursor-pointer rounded border-2 border-dashed {dragOver
      ? 'border-emerald-400 bg-emerald-500/10'
      : 'border-slate-700 hover:border-slate-500'} px-3 py-3 text-center text-xs text-slate-400"
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}
    onclick={() => fileInput?.click()}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput?.click()}
  >
    <div class="text-slate-300">JSON ablegen oder klicken</div>
    <div class="mt-0.5 text-[10px] text-slate-500">wird lokal gespeichert</div>
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept="application/json,.json"
    class="hidden"
    onchange={onPick}
  />

  {#if error}
    <p class="text-xs text-red-400">{error}</p>
  {/if}
</section>

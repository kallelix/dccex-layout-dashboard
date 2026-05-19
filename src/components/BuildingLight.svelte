<script lang="ts">
  import type { LightDef } from '../layout/schema';
  import { store } from '../protocol/store.svelte';

  let { light }: { light: LightDef } = $props();
  const on = $derived(store.outputs.get(light.outputId) ?? false);
  const fill = $derived(on ? '#fde047' : '#334155');

  function toggle() {
    store.toggleOutput(light.outputId);
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  }
</script>

<g transform="translate({light.x},{light.y})" class="cursor-pointer">
  <circle
    r={light.r ?? 7}
    {fill}
    stroke={on ? '#facc15' : '#475569'}
    stroke-width="2"
    onclick={toggle}
    onkeydown={onKey}
    role="button"
    tabindex="0"
    aria-label={light.label ?? `Toggle output ${light.outputId}`}
  />
  {#if light.label}
    <text y="-12" text-anchor="middle" fill="#cbd5e1" font-size="10">{light.label}</text>
  {/if}
  <title>{light.label ?? `Output ${light.outputId}`}: {on ? 'on' : 'off'}</title>
</g>

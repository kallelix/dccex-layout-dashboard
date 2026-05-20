<script lang="ts">
  import type { LightDef } from '../layout/schema';
  import { store } from '../protocol/store.svelte';

  let { light }: { light: LightDef } = $props();

  const isTurnout = $derived((light.protocol ?? 'output') === 'turnout');

  // Output protocol: on = output state. Turnout protocol (TURNOUTL): on = THROWN,
  // i.e. store.turnouts holds `closed`, so on = closed === false.
  const on = $derived(
    isTurnout
      ? light.turnoutId !== undefined && store.turnouts.get(light.turnoutId) === false
      : (light.outputId !== undefined && store.outputs.get(light.outputId)) ?? false
  );
  const fill = $derived(on ? '#fde047' : '#334155');
  const id = $derived(isTurnout ? light.turnoutId : light.outputId);

  function toggle() {
    if (isTurnout) {
      if (light.turnoutId !== undefined) store.toggleTurnout(light.turnoutId);
    } else if (light.outputId !== undefined) {
      store.toggleOutput(light.outputId);
    }
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
    aria-label={light.label ?? `Toggle light ${id}`}
  />
  {#if light.label}
    <text y="-12" text-anchor="middle" fill="#cbd5e1" font-size="10">{light.label}</text>
  {/if}
  <title>{light.label ?? `Light ${id}`}: {on ? 'on' : 'off'}</title>
</g>

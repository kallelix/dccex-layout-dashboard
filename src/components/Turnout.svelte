<script lang="ts">
  import type { TurnoutDef } from '../layout/schema';
  import { store } from '../protocol/store.svelte';

  let { turnout }: { turnout: TurnoutDef } = $props();
  const closed = $derived(store.turnouts.get(turnout.id));
  const fill = $derived(closed === undefined ? '#64748b' : closed ? '#22c55e' : '#ef4444');

  function toggle() {
    store.toggleTurnout(turnout.id);
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  }
</script>

<g transform="translate({turnout.x},{turnout.y}) rotate({turnout.rotation ?? 0})" class="cursor-pointer">
  <circle
    r="9"
    {fill}
    stroke="#0f172a"
    stroke-width="2"
    onclick={toggle}
    onkeydown={onKey}
    role="button"
    tabindex="0"
    aria-label="Toggle turnout {turnout.id}"
  />
  {#if turnout.label}
    <text y="-14" text-anchor="middle" fill="#e2e8f0" font-size="11">{turnout.label}</text>
  {/if}
  <title>Turnout {turnout.id}: {closed === undefined ? 'unknown' : closed ? 'closed' : 'thrown'}</title>
</g>

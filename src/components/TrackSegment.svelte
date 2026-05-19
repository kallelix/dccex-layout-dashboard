<script lang="ts">
  import type { Segment } from '../layout/schema';
  import { store } from '../protocol/store.svelte';

  let { segment }: { segment: Segment } = $props();

  const reservedBy = $derived(
    segment.sectionId !== undefined ? store.reservations.get(segment.sectionId) : undefined
  );
  const stroke = $derived(reservedBy !== undefined ? '#fbbf24' : segment.stroke ?? '#94a3b8');
</script>

<path
  d={segment.path}
  fill="none"
  {stroke}
  stroke-width={segment.strokeWidth ?? 6}
  stroke-linecap="round"
>
  {#if reservedBy !== undefined}
    <title>Section {segment.sectionId} reserved by loco {reservedBy}</title>
  {/if}
</path>

<script lang="ts">
  import type { Segment } from '../layout/schema';
  import { store } from '../protocol/store.svelte';

  let {
    segment,
    leg,
  }: {
    segment: Segment;
    /** Set when this segment is a turnout leg, so it can dim when not selected. */
    leg?: { turnoutId: number; role: 'closed' | 'thrown' };
  } = $props();

  const reservedBy = $derived(
    segment.sectionId !== undefined ? store.reservations.get(segment.sectionId) : undefined
  );

  // A turnout leg dims when the turnout is set the other way. Unknown state
  // (not yet broadcast) shows the leg normally so the track stays readable.
  const turnoutClosed = $derived(leg ? store.turnouts.get(leg.turnoutId) : undefined);
  const legActive = $derived(
    leg === undefined || turnoutClosed === undefined
      ? true
      : (leg.role === 'closed') === turnoutClosed
  );

  const stroke = $derived(
    reservedBy !== undefined ? store.colorForLoco(reservedBy) : segment.stroke ?? '#94a3b8'
  );
  const reservedByName = $derived(
    reservedBy !== undefined ? store.roster.get(reservedBy)?.name ?? `loco ${reservedBy}` : undefined
  );
</script>

<path
  d={segment.path}
  fill="none"
  {stroke}
  stroke-width={segment.strokeWidth ?? 6}
  stroke-linecap="round"
  opacity={legActive ? 1 : 0.2}
  stroke-dasharray={legActive ? undefined : '5 7'}
>
  {#if reservedBy !== undefined}
    <title>Section {segment.sectionId} reserviert von {reservedByName}</title>
  {/if}
</path>

<script lang="ts">
  import type { Segment } from '../layout/schema';
  import { store } from '../protocol/store.svelte';

  let {
    segment,
    leg,
    gbm,
  }: {
    segment: Segment;
    /** Set when this segment is a turnout leg, so it can dim when not selected. */
    leg?: { turnoutId: number; role: 'closed' | 'thrown' };
    /** Occupancy sensor (GBM) VPIN of this segment's section, if any. */
    gbm?: number;
  } = $props();

  const reservedBy = $derived(
    segment.sectionId !== undefined ? store.reservations.get(segment.sectionId) : undefined
  );
  const occupied = $derived(gbm !== undefined && store.sensors.get(gbm) === true);

  // Turnout leg dims/dashes when the turnout points the other way (= turnout status).
  const turnoutClosed = $derived(leg ? store.turnouts.get(leg.turnoutId) : undefined);
  const legActive = $derived(
    leg === undefined || turnoutClosed === undefined
      ? true
      : (leg.role === 'closed') === turnoutClosed
  );
  const dimmed = $derived(!legActive);

  // Three independent channels, all visible at once:
  //   stroke colour = reservation (loco colour)
  //   white glow    = occupancy (GBM)
  //   dim / dash    = turnout status
  const stroke = $derived(
    reservedBy !== undefined ? store.colorForLoco(reservedBy) : segment.stroke ?? '#94a3b8'
  );
  const dash = $derived(dimmed ? '5 7' : undefined);
  const glow = $derived(
    occupied
      ? 'drop-shadow(0 0 2px rgba(255,255,255,0.8)) drop-shadow(0 0 4px rgba(255,255,255,0.4))'
      : undefined
  );

  const reservedByName = $derived(
    reservedBy !== undefined ? store.roster.get(reservedBy)?.name ?? `loco ${reservedBy}` : undefined
  );
  const title = $derived(
    [
      segment.sectionId !== undefined ? `Section ${segment.sectionId}` : null,
      occupied ? 'belegt' : null,
      reservedByName ? `reserviert von ${reservedByName}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  );
</script>

<path
  d={segment.path}
  fill="none"
  {stroke}
  stroke-width={segment.strokeWidth ?? 6}
  stroke-linecap="round"
  opacity={dimmed ? 0.2 : 1}
  stroke-dasharray={dash}
  style:filter={glow}
>
  {#if title}
    <title>{title}</title>
  {/if}
</path>

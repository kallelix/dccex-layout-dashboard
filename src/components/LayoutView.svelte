<script lang="ts">
  import type { LayoutDocument } from '../layout/schema';
  import TrackSegment from './TrackSegment.svelte';
  import Turnout from './Turnout.svelte';
  import Sensor from './Sensor.svelte';
  import BuildingLight from './BuildingLight.svelte';

  let { layout }: { layout: LayoutDocument } = $props();
</script>

<svg viewBox={layout.viewBox} class="w-full h-full bg-slate-950 rounded-lg" preserveAspectRatio="xMidYMid meet">
  <g>
    {#each layout.segments as segment (segment.id)}
      <TrackSegment {segment} />
    {/each}
  </g>
  <g>
    {#each layout.sensors as sensor (sensor.id)}
      <Sensor {sensor} />
    {/each}
  </g>
  <g>
    {#each layout.turnouts as turnout (turnout.id)}
      <Turnout {turnout} />
    {/each}
  </g>
  <g>
    {#each layout.lights as light (light.outputId)}
      <BuildingLight {light} />
    {/each}
  </g>
</svg>

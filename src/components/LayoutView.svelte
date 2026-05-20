<script lang="ts">
  import svgPanZoom from 'svg-pan-zoom';
  import type { LayoutDocument } from '../layout/schema';
  import TrackSegment from './TrackSegment.svelte';
  import Turnout from './Turnout.svelte';
  import Sensor from './Sensor.svelte';
  import BuildingLight from './BuildingLight.svelte';
  import Building from './Building.svelte';

  let { layout }: { layout: LayoutDocument } = $props();

  // Map each turnout-leg segment back to its turnout, so TrackSegment can dim
  // the leg that is not currently selected.
  const legMap = $derived.by(() => {
    const m = new Map<string, { turnoutId: number; role: 'closed' | 'thrown' }>();
    for (const t of layout.turnouts) {
      if (t.closed) m.set(t.closed, { turnoutId: t.id, role: 'closed' });
      if (t.thrown) m.set(t.thrown, { turnoutId: t.id, role: 'thrown' });
    }
    return m;
  });

  let svgEl: SVGSVGElement | undefined = $state();
  let instance: SvgPanZoom.Instance | null = null;

  // Initialize after the SVG is in the DOM. Svelte renders the `{#each}`
  // children synchronously before $effect runs, so all turnouts/lights
  // already live inside the viewport <g> when pan-zoom takes over.
  $effect(() => {
    if (!svgEl) return;
    instance = svgPanZoom(svgEl, {
      viewportSelector: '.svg-pan-zoom_viewport',
      controlIconsEnabled: false,
      dblClickZoomEnabled: false,
      mouseWheelZoomEnabled: true,
      // Keep native DOM events alive so click handlers on turnouts/lights
      // inside the SVG still fire. Drag-to-pan still works.
      preventMouseEventsDefault: false,
      zoomScaleSensitivity: 0.3,
      minZoom: 0.4,
      maxZoom: 12,
      fit: true,
      center: true,
      contain: true,
    });
    return () => {
      instance?.destroy();
      instance = null;
    };
  });

  function reset() {
    instance?.resetZoom();
    instance?.resetPan();
  }
  function zoomIn() {
    instance?.zoomIn();
  }
  function zoomOut() {
    instance?.zoomOut();
  }
</script>

<div class="relative h-full w-full">
  <svg
    bind:this={svgEl}
    viewBox={layout.viewBox}
    class="h-full w-full bg-slate-950 rounded-lg"
    preserveAspectRatio="xMidYMid meet"
  >
    <g class="svg-pan-zoom_viewport">
      <g>
        {#each layout.segments as segment (segment.id)}
          <TrackSegment {segment} leg={legMap.get(segment.id)} />
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
        {#each layout.lights as light (`${light.protocol ?? 'output'}:${light.outputId ?? light.turnoutId}`)}
          <BuildingLight {light} />
        {/each}
      </g>
      <g>
        {#each layout.buildings ?? [] as building (building.id)}
          <Building {building} />
        {/each}
      </g>
    </g>
  </svg>

  <div class="absolute right-2 top-2 flex flex-col gap-1">
    <button
      class="rounded bg-slate-800/80 hover:bg-slate-700 text-slate-100 w-7 h-7 text-sm font-semibold"
      onclick={zoomIn}
      aria-label="Zoom in"
      title="Zoom in"
    >
      +
    </button>
    <button
      class="rounded bg-slate-800/80 hover:bg-slate-700 text-slate-100 w-7 h-7 text-sm font-semibold"
      onclick={zoomOut}
      aria-label="Zoom out"
      title="Zoom out"
    >
      −
    </button>
    <button
      class="rounded bg-slate-800/80 hover:bg-slate-700 text-slate-100 w-7 h-7 text-[10px]"
      onclick={reset}
      aria-label="Fit to view"
      title="Fit"
    >
      Fit
    </button>
  </div>
</div>

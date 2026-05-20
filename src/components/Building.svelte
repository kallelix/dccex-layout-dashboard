<script lang="ts">
  import type { BuildingDef, BuildingLightDef } from '../layout/schema';
  import { store } from '../protocol/store.svelte';

  let { building }: { building: BuildingDef } = $props();

  const WIN = 16; // window size
  const GAP = 5; // gap between windows
  const PAD = 8; // padding inside the box
  const ROOF = 13; // roof height

  const cols = $derived(building.cols ?? building.lights.length);
  const rows = $derived(Math.max(1, Math.ceil(building.lights.length / cols)));
  const w = $derived(cols * WIN + (cols - 1) * GAP + 2 * PAD);
  const h = $derived(rows * WIN + (rows - 1) * GAP + 2 * PAD);

  // TURNOUTL lights ride the turnout protocol; store.turnouts holds `closed`.
  // Which state counts as "on" depends on the decoder — see light.onState.
  function isOn(light: BuildingLightDef): boolean {
    const closed = store.turnouts.get(light.turnoutId);
    if (closed === undefined) return false;
    return (light.onState ?? 'thrown') === 'closed' ? closed : !closed;
  }
  const anyOn = $derived(building.lights.some((l) => isOn(l)));

  function toggleAll() {
    const target = !anyOn; // any on → switch all off; none on → switch all on
    for (const l of building.lights) {
      if (isOn(l) !== target) store.toggleTurnout(l.turnoutId);
    }
  }
  function masterKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleAll();
    }
  }
  function winKey(e: KeyboardEvent, id: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      store.toggleTurnout(id);
    }
  }
</script>

<g transform="translate({building.x},{building.y})">
  {#if building.label}
    <text x={w / 2} y={-ROOF - 6} text-anchor="middle" fill="#cbd5e1" font-size="11">
      {building.label}
    </text>
  {/if}

  <!-- roof + body double as the master (all on/off) toggle -->
  <g
    class="cursor-pointer"
    role="button"
    tabindex="0"
    aria-label="{building.label ?? 'Gebäude'}: alle Lichter umschalten"
    onclick={toggleAll}
    onkeydown={masterKey}
  >
    <polygon points="-4,0 {w + 4},0 {w / 2},{-ROOF}" fill="#64748b" stroke="#0f172a" stroke-width="1" />
    <rect
      width={w}
      height={h}
      rx="3"
      fill="#1e293b"
      stroke={anyOn ? '#facc15' : '#475569'}
      stroke-width="2"
    />
  </g>

  <!-- windows: one per LED -->
  {#each building.lights as light, i (light.turnoutId)}
    {@const c = i % cols}
    {@const r = Math.floor(i / cols)}
    <rect
      x={PAD + c * (WIN + GAP)}
      y={PAD + r * (WIN + GAP)}
      width={WIN}
      height={WIN}
      rx="2"
      fill={isOn(light) ? '#fde047' : '#334155'}
      stroke="#0f172a"
      stroke-width="1"
      class="cursor-pointer"
      role="button"
      tabindex="0"
      aria-label="{light.label ?? `Licht ${light.turnoutId}`}"
      onclick={(e) => {
        e.stopPropagation();
        store.toggleTurnout(light.turnoutId);
      }}
      onkeydown={(e) => winKey(e, light.turnoutId)}
    >
      <title>{light.label ?? `Licht ${light.turnoutId}`}: {isOn(light) ? 'an' : 'aus'}</title>
    </rect>
  {/each}
</g>

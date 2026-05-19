<script lang="ts">
  import type { SensorDef } from '../layout/schema';
  import { store } from '../protocol/store.svelte';

  let { sensor }: { sensor: SensorDef } = $props();
  const active = $derived(store.sensors.get(sensor.id) ?? false);
</script>

<g transform="translate({sensor.x},{sensor.y})">
  <rect
    x="-5"
    y="-5"
    width="10"
    height="10"
    fill={active ? '#0ea5e9' : '#1e293b'}
    stroke="#0ea5e9"
    stroke-width="2"
  />
  {#if sensor.label}
    <text y="20" text-anchor="middle" fill="#94a3b8" font-size="10">{sensor.label}</text>
  {/if}
  <title>Sensor {sensor.id}: {active ? 'active' : 'inactive'}</title>
</g>

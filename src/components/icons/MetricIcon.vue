
<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="icon.viewBox"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    class="metric-icon"
  >
    <path v-for="path in icon.paths" :key="path.d" v-bind="path" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type MetricName = 'wind' | 'pressure' | 'humidity' | 'visibility'

type IconPath = {
  d: string
  stroke?: string
  strokeWidth?: number | string
  strokeLinecap?: 'round' | 'butt' | 'square'
  strokeLinejoin?: 'round' | 'bevel' | 'miter'
  fill?: string
  fillRule?: string
  clipRule?: string
}

type IconDefinition = {
  viewBox: string
  paths: IconPath[]
}

const props = withDefaults(defineProps<{ name: MetricName; size?: number }>(), {
  size: 20,
})

const icons: Record<MetricName, IconDefinition> = {
  wind: {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M3 8h11a2.5 2.5 0 1 0-2.5-2.5',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      {
        d: 'M3 13h15a3 3 0 1 1-3 3',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      {
        d: 'M3 18h7',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
      },
    ],
  },
  pressure: {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M5 16a7 7 0 1 1 14 0',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      {
        d: 'M5 16h14',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
      },
      {
        d: 'M12 16V8l4 4',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    ],
  },
  humidity: {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
      },
      {
        d: 'M8.5 15a3.5 3.5 0 0 0 7 0',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
      },
    ],
  },
  visibility: {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M2.5 12s4-6.5 9.5-6.5S21.5 12 21.5 12 17.5 18.5 12 18.5 2.5 12 2.5 12Z',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
      },
      {
        d: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
      },
      {
        d: 'M12 12.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
        fill: 'currentColor',
      },
    ],
  },
}

const icon = computed(() => icons[props.name] ?? icons.wind)
const size = computed(() => props.size)
</script>

<style scoped>
.metric-icon {
  display: inline-block;
}
</style>

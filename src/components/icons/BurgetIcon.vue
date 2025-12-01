<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    class="burger-icon"
  >
    <path d="M3 6h18" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    <path
      d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path d="M10 11v5" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    <path d="M14 11v5" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    <path
      d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ size?: number; strokeWidth?: number | string }>(), {
  size: 24,
  strokeWidth: 1.5,
})
const size = props.size
const strokeWidth = props.strokeWidth
</script>

<style scoped>
.burger-icon {
  display: inline-block;
}
</style>
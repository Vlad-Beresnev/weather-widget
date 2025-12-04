<!-- src/components/Topbar.vue -->
<template>
  <nav class="navbar navbar-expand-lg topbar shadow-sm rounded-top">
    <div class="container-fluid d-flex justify-content-between align-items-center">

      <a class="navbar-brand d-flex align-items-center" href="#" @click.prevent>
        <span class="fw-semibold">{{ settingsOpen ? 'Settings' : title }}</span>
      </a>
      
      <div class="d-flex align-items-center">
        <button class="btn" v-if="!settingsOpen" @click="$emit('open-settings')" aria-label="Settings">
          <span class="drag-handle" aria-hidden>≡</span>
        </button>
        <button class="btn" v-else @click="$emit('close-settings')" aria-label="Close settings">
          ✕
        </button>
      </div>

    </div>
  </nav>
</template>

<script setup lang="ts">

const props = defineProps({
  title: { type: String, default: 'Weather Widget' },
  showLogo: { type: Boolean, default: false },
  links: { type: Array as () => Array<{ label: string; href?: string }>, default: () => [] },
  settingsOpen: { type: Boolean, default: false },
})

</script>

<style scoped>
.navbar-brand img {
  object-fit: cover;
  border-radius: 4px;
}

.drag-handle {
  font-size: 25px;
}
</style>
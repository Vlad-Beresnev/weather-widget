<!-- src/components/Topbar.vue -->
<template>
  <nav class="navbar navbar-expand-lg topbar shadow-sm rounded-top">
    <div class="container-fluid d-flex justify-content-between align-items-center">

      <a class="navbar-brand d-flex align-items-center" href="#" @click.prevent>
        <img :src="logoUrl" alt="logo" width="28" height="28" class="me-2" v-if="showLogo && !settingsOpen"/>
        <span class="fw-semibold">{{ settingsOpen ? 'Settings' : title }}</span>
      </a>

      <div class="d-flex align-items-center">
        <button class="btn" v-if="!settingsOpen" @click="$emit('open-settings')" aria-label="Settings">
          <i class="bi bi-gear"></i>
        </button>
        <button class="btn" v-else @click="$emit('close-settings')" aria-label="Close settings">
          ✕
        </button>
      </div>

    </div>
  </nav>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps({
  title: { type: String, default: 'Weather Widget' },
  showLogo: { type: Boolean, default: false },
  links: { type: Array as () => Array<{ label: string; href?: string }>, default: () => [] },
  settingsOpen: { type: Boolean, default: false },
})

// resolve a local asset in a build-friendly way
const logoUrl = new URL('../assets/vue.svg', import.meta.url).href

// emits: open-settings, close-settings
</script>

<style scoped>
/* small optional tweaks */
.navbar-brand img {
  object-fit: cover;
  border-radius: 4px;
}
</style>
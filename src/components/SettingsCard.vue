<template>
  <div class="card mb-3 d-flex flex-column gap-3 weather-card fixed-card">
    <div class="settings-card">
      <!-- Title and close are handled by AppBar; this component only contains settings body -->

      <section class="locations-list">
        <ul>
          <li
            v-for="(loc, idx) in locations"
            :key="idx"
            class="location-item"
            draggable="true"
            @dragstart="onDragStart($event, idx)"
            @dragover="onDragOver($event, idx)"
            @drop="onDrop($event, idx)"
            @dragend="onDragEnd"
            :class="{ dragging: idx === draggingIndex }"
          >
            <span class="drag-handle" aria-hidden>≡</span>
            <span class="location-text">{{ loc }}</span>
            <button class="delete-btn" @click="removeAt(idx)" :aria-label="`Remove ${loc}`">
              <!-- simple trash icon -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M3 6h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 11v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M14 11v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </li>
        </ul>
      </section>

      <section class="add-location">
        <label class="add-label">Add Location:</label>
        <div class="add-row">
          <input
            type="text"
            v-model="newLocation"
            @keydown.enter="addLocation"
            placeholder="New York"
            aria-label="New location"
          />
          <button class="add-btn" @click="addLocation" aria-label="Add location">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M5 12h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M12 5l7 7-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ locations?: string[] }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'add', location: string): void;
  (e: 'remove', index: number): void;
  (e: 'reorder', locations: string[]): void;
}>();

const newLocation = ref('');

// local copy of locations so we can optimistically update the UI
const localLocations = ref<string[]>(props.locations ? [...props.locations] : [])
watch(() => props.locations, (val) => {
  localLocations.value = val ? [...val] : []
})

// keep the same `locations` name used in template
const locations = localLocations

function addLocation() {
  const value = newLocation.value.trim();
  if (!value) return;

  // enforce max 5 locations
  const current = localLocations.value
  if (current.length >= 5) {
    // fail fast: don't emit when limit reached
    // caller/component can show a message if needed
    console.warn('Cannot add more than 5 locations')
    return
  }

  // prevent duplicates (case-insensitive)
  const exists = current.some((l: string) => l.trim().toLowerCase() === value.toLowerCase())
  if (exists) {
    console.warn('Location already exists')
    return
  }

  // optimistic UI update
  localLocations.value = [...localLocations.value, value]
  emit('add', value)
  newLocation.value = ''
}

function removeAt(i: number) {
  // optimistic removal from local list
  localLocations.value.splice(i, 1)
  emit('remove', i);
}

// Drag & drop state and handlers
const draggingIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
// whether pointer is in lower half of the hovered element
const dragOverAfter = ref<boolean>(false)

// thresholds control how much of an item counts as "before" or "after" when dropping.
// Increase DROP_BEFORE to make "drop up" easier (larger top area). Values are fractions of item height.
const DROP_BEFORE = 0.45
const DROP_AFTER = 0.55

function onDragStart(e: DragEvent, index: number) {
  draggingIndex.value = index
  e.dataTransfer?.setData('text/plain', String(index))
  // use default drag image to avoid invisible drag image issues
}

function onDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  dragOverIndex.value = index
  // determine pointer position fraction within the hovered element
  const target = e.currentTarget as HTMLElement | null
  if (target) {
    const rect = target.getBoundingClientRect()
    const clientY = e.clientY ?? 0
    const frac = (clientY - rect.top) / rect.height

  // Use two small thresholds instead of a single hard midpoint so both up and down
  // drops have reasonable hit areas. Use top-level DROP_BEFORE/DROP_AFTER for tuning.

    if (frac <= DROP_BEFORE) {
      // strongly in the top area -> treat as before
      dragOverAfter.value = false
    } else if (frac >= DROP_AFTER) {
      // strongly in the bottom area -> treat as after
      dragOverAfter.value = true
    } else {
      // middle area: use pointer direction / default to before to be conservative
      dragOverAfter.value = false
    }
  } else {
    dragOverAfter.value = false
  }
}

function onDrop(e: DragEvent, index: number) {
  e.preventDefault()
  const from = draggingIndex.value ?? Number(e.dataTransfer?.getData('text/plain'))
  if (from === undefined || from === null || isNaN(from)) return

  // compute insertion index based on exact drop position at drop time (more robust)
  let targetIndex = index
  const targetEl = e.currentTarget as HTMLElement | null
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect()
    const frac = ((e.clientY ?? 0) - rect.top) / rect.height

    if (frac <= DROP_BEFORE) {
      // insert before the hovered item
      targetIndex = index
    } else if (frac >= DROP_AFTER) {
      // insert after the hovered item
      targetIndex = index + 1
    } else {
      // middle: decide based on drag direction
      targetIndex = (from < index) ? index + 1 : index
    }
  } else {
    targetIndex = index + (dragOverAfter.value ? 1 : 0)
  }

  // no-op if inserting at same position
  if (from === targetIndex || from === targetIndex - 1) {
    draggingIndex.value = null
    dragOverIndex.value = null
    dragOverAfter.value = false
    return
  }

  const arr = [...localLocations.value]
  const [item] = arr.splice(from, 1)
  if (item === undefined) {
    draggingIndex.value = null
    dragOverIndex.value = null
    dragOverAfter.value = false
    return
  }

  // if we removed an item before the target, the target index decreases by 1
  if (from < targetIndex) targetIndex = targetIndex - 1

  // clamp
  targetIndex = Math.max(0, Math.min(arr.length, targetIndex))

  arr.splice(targetIndex, 0, item)
  localLocations.value = arr
  // inform parent about new order
  emit('reorder', [...localLocations.value])

  draggingIndex.value = null
  dragOverIndex.value = null
  dragOverAfter.value = false
}

function onDragEnd() {
  draggingIndex.value = null
  dragOverIndex.value = null
  dragOverAfter.value = false
}
</script>

<style scoped>
.settings-card{
  padding: 18px;
}
.locations-list{
  margin-top:12px;
}
.locations-list ul{
  list-style:none;
  padding:0;
  margin:0;
  display:flex;
  flex-direction:column;
  gap:12px;
}
.location-item{
  display:flex;
  align-items:center;
  justify-content:flex-start;
  gap:12px;
  background:#efebe9; /* light neutral */
  padding:12px 14px;
  border-radius:4px;
}
.drag-handle{
  color:#6b6b6b;
  font-size:18px;
  width:20px;
  display:inline-flex;
  align-items:center;
  justify-content: start;
}
.location-text{
  text-align: start;
  margin-right: auto;
  flex:1;
  color:#222;
}
.delete-btn{
  background:transparent;
  border:0;
  cursor:pointer;
  color:#555;
  display:inline-flex;
  align-items:center;
}
.delete-btn svg{width:18px;height:18px}

.add-location{
  margin-top:18px;
}
.add-label{
  display:block;
  font-weight:600;
  margin-bottom:8px;
}
.add-row{
  display:flex;
  gap:8px;
  align-items:center;
}
.add-row input{
  flex:1;
  padding:10px 12px;
  border:1px solid #79a7ff; /* blue focus-like border in screenshot */
  border-radius:4px;
  outline:none;
}
.add-row input::placeholder{color:#666}
.add-btn{
  background:transparent;
  border:0;
  cursor:pointer;
  display:inline-flex;
  padding:6px;
  align-items:center;
  justify-content:center;
  color: #333;
}
.add-btn svg{width:18px;height:18px}

/* small responsive tweak */
@media (max-width: 400px){
  .settings-card{padding:12px}
}

/* drag feedback */
.location-item.dragging{
  opacity:0.6;
  transform: scale(0.995);
}
</style>
<!-- filepath: /Users/vlad/dev/plumsail/weather-widget/src/components/WeatherWidget.vue -->
<template>
  <div class="weather-widget">
    <AppBar
      :settings-open="showSettings"
      :title="showSettings ? 'Settings' : 'Weather Widget'"
      @open-settings="openSettings"
      @close-settings="showSettings = false"
    />
  <!-- make sure items start at the top (justify-content controls vertical alignment in a column) -->

      <SettingsCard
        v-if="showSettings"
        :locations="locations"
        @close="showSettings = false"
        @add="onAddLocation"
        @remove="onRemoveLocation"
        @reorder="onReorder"
      />
      <WeatherCard
      v-if="!showSettings"
      v-for="city in cities"
      :key="city.id"
      :city="city"
      />
  </div>
</template>

<script setup lang="ts">
  import type { City } from '../models/city.model'
  import WeatherCard from './WeatherCard.vue'
  import SettingsCard from './SettingsCard.vue'
  import { ref, computed, onMounted } from 'vue'
  import { fetchWeather } from '../services/weatherService'
  import AppBar from './AppBar.vue'

  const showSettings = ref(false)
  function openSettings() {
    showSettings.value = true
  }

  // reactive list of cities (start empty or restore from localStorage)
  const cities = ref<Array<City>>(
    JSON.parse(localStorage.getItem('weather:cities') || 'null') ?? []
  )

  // expose a simple array of location names for SettingsCard (it expects string[])
  const locations = computed(() => cities.value.map((c) => c.name))

  const API_KEY = '4d130245e9df76b3c37dd66cdb984fd0'
  const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'

  function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  }

  async function onAddLocation(name: string) {
    // try to fetch full weather data for the new location
    const res = await fetchWeather(name, API_KEY, { baseUrl: BASE_URL, timeoutMs: 8000 })
    if (res.ok) {
      const city = res.city
      city.id = city.id ?? generateId()
      cities.value = [...cities.value, city]
    } else {
      // fallback: add minimal entry so UI is responsive
      const id = generateId()
      cities.value = [...cities.value, { id, name }]
    }
    try {
      localStorage.setItem('weather:cities', JSON.stringify(cities.value))
    } catch {}
  }

  async function onRemoveLocation(index: number) {
    cities.value = cities.value.filter((_, i) => i !== index)
    try {
      localStorage.setItem('weather:cities', JSON.stringify(cities.value))
    } catch {}
  }

  function onReorder(locNames: string[]) {
    // reorder cities to match the provided names array
    const map = new Map(cities.value.map((c) => [c.name, c]))
    const reordered: City[] = locNames.map((n) => map.get(n) ?? ({ id: generateId(), name: n }))
    cities.value = reordered
    try {
      localStorage.setItem('weather:cities', JSON.stringify(cities.value))
    } catch {}
  }

  // load saved cities and fetch their current weather on mount
  onMounted(async () => {
    const raw = localStorage.getItem('weather:cities')
    const stored: any[] = raw ? JSON.parse(raw) : []
    if (!Array.isArray(stored) || stored.length === 0) return

    const names = stored.map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean)
    const promises = names.map((n) => fetchWeather(n, API_KEY, { baseUrl: BASE_URL, timeoutMs: 8000 }))
    const results = await Promise.all(promises)
    const good = results.filter((r) => r.ok).map((r) => r.city)
    // ensure ids
    cities.value = good.map((c) => ({ ...c, id: c.id ?? generateId() }))
    try {
      localStorage.setItem('weather:cities', JSON.stringify(cities.value))
    } catch {}
  })

  // Attempt to get user's geolocation and add their city automatically.
  async function getUserLocationAndAdd() {
    // if we already have cities, don't auto-add
    if (cities.value.length > 0) return

    if (!('geolocation' in navigator)) return

    const getPosition = (): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      })

    try {
      const pos = await getPosition()
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude

      const url = `${BASE_URL}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${API_KEY}&units=metric`
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      // map response to City shape (defensive)
      const cityObj: City = {
        id: String(data.id ?? generateId()),
        name: data.name ?? 'Current location',
        country: data.sys?.country,
        temp: typeof data.main?.temp === 'number' ? data.main.temp : undefined,
        feels_like: typeof data.main?.feels_like === 'number' ? data.main.feels_like : undefined,
        weather: Array.isArray(data.weather) && data.weather[0]?.description ? data.weather[0].description : undefined,
        wind: { speed: data.wind?.speed, deg: data.wind?.deg },
        pressure: data.main?.pressure,
        humidity: data.main?.humidity,
        visibility: data.visibility,
      }
      cities.value = [cityObj, ...cities.value]
      try { localStorage.setItem('weather:cities', JSON.stringify(cities.value)) } catch {}
    } catch (err) {
      // geolocation failed or blocked — try IP-based fallback
      await ipFallbackAndAdd()
      return
    }
  }

  // Try to add user's location if we have no saved cities
  getUserLocationAndAdd()

  // IP-based fallback: approximate location from IP then fetch weather
  async function ipFallbackAndAdd() {
    try {
      // use ipapi.co which returns JSON with latitude/longitude
      const r = await fetch('https://ipapi.co/json/')
      if (!r.ok) return
      const info = await r.json()
      const lat = info.latitude ?? info.lat
      const lon = info.longitude ?? info.lon
      if (!lat || !lon) return

      const url = `${BASE_URL}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${API_KEY}&units=metric`
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      const cityObj: City = {
        id: String(data.id ?? generateId()),
        name: data.name ?? `${info.city ?? 'Your location'}`,
        country: data.sys?.country ?? info.country,
        temp: typeof data.main?.temp === 'number' ? data.main.temp : undefined,
        feels_like: typeof data.main?.feels_like === 'number' ? data.main.feels_like : undefined,
        weather: Array.isArray(data.weather) && data.weather[0]?.description ? data.weather[0].description : undefined,
        wind: { speed: data.wind?.speed, deg: data.wind?.deg },
        pressure: data.main?.pressure,
        humidity: data.main?.humidity,
        visibility: data.visibility,
      }
      cities.value = [cityObj, ...cities.value]
      try { localStorage.setItem('weather:cities', JSON.stringify(cities.value)) } catch {}
    } catch (e) {
      // swallow errors — fallback is best-effort
      return
    }
  }
</script>
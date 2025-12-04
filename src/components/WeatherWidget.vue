<template>
  <div class="weather-widget">
    <AppBar
      :settings-open="showSettings"
      :title="showSettings ? 'Settings' : 'Weather Widget'"
      @open-settings="openSettings"
      @close-settings="showSettings = false"
    />
    <div v-if="errorMsg" class="container-fluid p-2">
      <div class="alert alert-warning alert-dismissible" role="alert">
        {{ errorMsg }}
        <button type="button" class="btn-close" aria-label="Close" @click="errorMsg = null"></button>
      </div>
    </div>

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

  const cities = ref<Array<City>>(
    JSON.parse(localStorage.getItem('weather:cities') || 'null') ?? []
  )

  const locations = computed(() => cities.value.map((c) => c.name))

  const API_KEY = '4d130245e9df76b3c37dd66cdb984fd0' as string
  const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'
  
  const errorMsg = ref<string | null>(null)
  function showError(msg: string, timeout = 6000) {
    errorMsg.value = msg
    setTimeout(() => {
      if (errorMsg.value === msg) errorMsg.value = null
    }, timeout)
  }

  function friendlyReason(r: any) {
    if (!r) return 'Unknown error'
    if (typeof r === 'string') {
      if (r.startsWith('http-')) {
        const code = r.slice(5)
        return `Server returned ${code}`
      }
      switch (r) {
        case 'empty-city-name':
          return 'Please enter a city name.'
        case 'duplicate-city':
          return 'This city is already in your list.'
        case 'aborted':
          return 'Request timed out.'
        case 'network-or-parse-error':
          return 'Network error. Check your connection.'
      }
      return r
    }
    return String(r)
  }

  if (!API_KEY) {
    showError('OpenWeather API key not set. Set VITE_OPENWEATHER_KEY when building the bundle.')
  }

  function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  }

  async function onAddLocation(name: string) {
    const res = await fetchWeather(name, API_KEY, { baseUrl: BASE_URL, timeoutMs: 8000 })
    if (res.ok) {
      const city = res.city
      city.id = city.id ?? generateId()
      cities.value = [...cities.value, city]
    } else {
      const id = generateId()
      cities.value = [...cities.value, { id, name }]
      showError(`Could not add "${name}": ${friendlyReason(res.reason)}`)
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
    const map = new Map(cities.value.map((c) => [c.name, c]))
    const reordered: City[] = locNames.map((n) => map.get(n) ?? ({ id: generateId(), name: n }))
    cities.value = reordered
    try {
      localStorage.setItem('weather:cities', JSON.stringify(cities.value))
    } catch {}
  }

  onMounted(async () => {
    const raw = localStorage.getItem('weather:cities')
    const stored: any[] = raw ? JSON.parse(raw) : []
    if (!Array.isArray(stored) || stored.length === 0) return

    const names = stored.map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean)
    const promises = names.map((n) => fetchWeather(n, API_KEY, { baseUrl: BASE_URL, timeoutMs: 8000 }))
    const results = await Promise.all(promises)
    const good = results.filter((r) => r.ok).map((r) => r.city)
    if (good.length === 0 && stored.length > 0) {
      showError('Could not refresh saved locations. Check network or API key.')
    }
    cities.value = good.map((c) => ({ ...c, id: c.id ?? generateId() }))
    try {
      localStorage.setItem('weather:cities', JSON.stringify(cities.value))
    } catch {}
  })

  async function getUserLocationAndAdd() {
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
      showError('Unable to access precise location — trying IP-based fallback...')
      await ipFallbackAndAdd()
      return
    }
  }

  getUserLocationAndAdd()

  async function ipFallbackAndAdd() {
    try {
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
      showError('Could not determine your location via IP lookup.')
      return
    }
  }
</script>
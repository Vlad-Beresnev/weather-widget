<template>
    <div class="card mb-3 d-flex flex-column weather-card gap-3 fixed-card">

        <div class="d-flex flex-row align-items-center gap-3" >
            <div class=" flex-shrink-0">
                <img
                    class="icon-xl"
                    v-if="iconUrl"
                    :src="iconUrl"
                    :alt="iconAlt"
                    :width="iconSize"
                    :height="iconSize"
                />
                <div
                    v-else
                    class="icon-placeholder"
                    :style="{ width: iconSize + 'px', height: iconSize + 'px', fontSize: Math.max(12, iconSize/2.5) + 'px' }"
                    aria-hidden
                >🌤</div>
            </div>
            <div class="d-flex flex-column flex-grow-1" style="min-width: 0;">
                <div class="d-flex align-items-baseline gap-1">
                    <small class="city-name text-truncate" style="max-width:160px; display:inline-block;">
                        {{ city.name }},
                    </small>
                    <small class="text-muted flex-shrink-0">{{ city.country }}</small>
                </div>
                
                <div class="mt-2">
                    <div class="d-flex flex-column align-items-start">
                        <div class="fs-1">{{ Math.round(city.temp ?? 0) }}°C</div>
                        <div class="text-muted">Feels like {{ Math.round(city.feels_like ?? 0) }}°C</div>
                        <div class="text-muted">{{ city.weather }}</div>
                    </div>
                </div>
            </div>
            
            
        </div>
        <div class="card-body bg-light rounded">
            <div class="row g-2 align-items-start">
                <div
                class="col-6"
                v-for="metric in metrics"
                :key="metric.key"
                >
                <div class="d-flex align-items-center gap-2">
                    <i :class="['bi', metric.icon, 'fs-5']" aria-hidden="true"></i>


                    <div class="text-start">
                    <div class="small text-muted">{{ metric.label }}</div>
                    <div class="fw-semibold">{{ metric.value }}</div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { City } from '../models/city.model'
import { computed } from 'vue'
const props = defineProps<{ city: City; size?: number }>()
const city = props.city
const iconSize = computed(() => props.size ?? 128)

// Resolve icon code from multiple possible API shapes
const iconCode = computed(() => {
    const c: any = city as any

    // helper to normalize many XML/JSON shapes
    const extractValue = (v: any): string | null => {
        if (v == null) return null
        if (typeof v === 'string') return v
        if (typeof v === 'number') return String(v)
        if (Array.isArray(v)) return extractValue(v[0])
        if (typeof v === 'object') {
            // common xml2js/text wrappers
            if (v._ != null) return extractValue(v._)
            if (v['#text'] != null) return extractValue(v['#text'])
            if (v.$ != null) {
                // attributes object - try common attribute names
                const attrs = v.$
                if (attrs.value) return extractValue(attrs.value)
                if (attrs.icon) return extractValue(attrs.icon)
            }
            // try first primitive child
            for (const k of Object.keys(v)) {
                const val = extractValue((v as any)[k])
                if (val != null) return val
            }
            return null
        }
        return null
    }

    // 1) OpenWeather JSON: weather is an array with icon/code
    if (Array.isArray(c.weather) && c.weather[0]) {
        const code = extractValue(c.weather[0].icon) || extractValue(c.weather[0].number) || extractValue(c.weather[0].value)
        if (code) return code
    }

    // 2) object-shaped weather (XML->object mappers)
    if (c.weather && typeof c.weather === 'object') {
        const code = extractValue(c.weather.icon) || extractValue(c.weather.number) || extractValue(c.weather.value)
        if (code) return code
    }

    // 3) top-level fallbacks
    const top = extractValue(c.icon) || extractValue(c.weatherIcon) || extractValue(c.weather)
    if (top) return top

    return null
})

const iconUrl = computed(() => {
    const code = iconCode.value
    if (!code) return ''
        const s = String(code).trim()
        // if the code already looks like a URL, use it
        if (/^https?:\/\//i.test(s)) return s

        // OpenWeather icon ids are short codes like '10d' or '01n'
        const iconIdMatch = s.match(/^\d{2}[dn]$/i)
        if (iconIdMatch) return `https://openweathermap.org/img/wn/${s}@2x.png`

        // fallback: if we received a descriptive string (e.g. 'overcast clouds'), map common keywords to icon ids
        const desc = s.toLowerCase()
        const map: Record<string, string> = {
            clear: '01d',
            sunny: '01d',
            few: '02d',
            scattered: '03d',
            broken: '04d',
            overcast: '04d',
            cloud: '04d',
            clouds: '04d',
            shower: '09d',
            drizzle: '09d',
            rain: '10d',
            thunder: '11d',
            thunderstorm: '11d',
            snow: '13d',
            mist: '50d',
            fog: '50d',
            haze: '50d'
        }

        for (const k of Object.keys(map)) {
            if (desc.includes(k)) return `https://openweathermap.org/img/wn/${map[k]}@2x.png`
        }

        // nothing matched — don't attempt to request an invalid OpenWeather URL
        return ''
})

const iconAlt = computed(() => {
    const c: any = city as any
    const extract = (v: any): string | null => {
        if (v == null) return null
        if (typeof v === 'string') return v
        if (Array.isArray(v)) return extract(v[0])
        if (typeof v === 'object') {
            if (v._ != null) return extract(v._)
            if (v['#text'] != null) return extract(v['#text'])
            if (v.value) return extract(v.value)
            if (v.description) return extract(v.description)
            for (const k of Object.keys(v)) {
                const val = extract((v as any)[k])
                if (val != null) return val
            }
            return null
        }
        return null
    }

    // prefer description -> value -> string
    if (Array.isArray(c.weather) && c.weather[0]) {
        return extract(c.weather[0].description) || extract(c.weather[0].value) || extract(c.weather[0].name) || `${city.name} weather`
    }

    const alt = extract(c.weather) || extract(c.weather?.description) || extract(c.weather?.value) || extract(c.weather?.name)
    return alt ?? `${city.name} weather`
})

const metrics = computed(() => [
  { key: 'wind', label: 'Wind', icon: 'bi-wind', value: city.wind?.speed ? `${city.wind.speed} m/s` : '—' },
  { key: 'pressure', label: 'Pressure', icon: 'bi-speedometer2', value: city.pressure ? `${city.pressure} hPa` : '—' },
  { key: 'humidity', label: 'Humidity', icon: 'bi-droplet', value: city.humidity ? `${city.humidity}%` : '—' },
  { key: 'visibility', label: 'Visibility', icon: 'bi-eye', value: city.visibility ? `${city.visibility} km` : '—' },
])
</script>

<style scoped>
.icon-xl {
    /* keep intrinsic styling for the image; size is controlled via attributes or inline style */
    /* object-fit: contain; */
    display: block;
}

/* placeholder styling to match icon size */
.icon-placeholder {
    width: 64px;
    height: 64px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
}
</style>
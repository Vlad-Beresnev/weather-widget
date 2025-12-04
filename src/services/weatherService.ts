export interface City {
  id: string
  name: string
  country?: string
  temp?: number
  feels_like?: number
  weather?: string
  wind?: { speed?: number; deg?: number }
  pressure?: number
  humidity?: number
  dew_point?: number
  visibility?: number
}

export type FetchWeatherSuccess = { ok: true; city: City }
export type FetchWeatherFailure = { ok: false; reason: string; status?: number }
export type FetchWeatherResult = FetchWeatherSuccess | FetchWeatherFailure

const DEFAULT_BASE = 'https://api.openweathermap.org/data/2.5/weather'

function normalize(name: string) {
  return name.trim().toLowerCase()
}

function readStoredCities(key: string) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return [] as City[]
    return JSON.parse(raw) as City[]
  } catch {
    return [] as City[]
  }
}

function saveStoredCities(key: string, cities: City[]) {
  try {
    localStorage.setItem(key, JSON.stringify(cities))
  } catch {
  }
}

export async function fetchWeather(
  cityName: string,
  apiKey: string,
  options?: {
    baseUrl?: string
    timeoutMs?: number
    storageKey?: string
    existing?: Record<string, City> // optional map of normalizedName -> City to prevent duplicates
    signal?: AbortSignal
  }
): Promise<FetchWeatherResult> {
  const baseUrl = options?.baseUrl ?? DEFAULT_BASE
  const timeoutMs = options?.timeoutMs ?? 8000
  const storageKey = options?.storageKey

  const name = cityName?.trim()
  if (!name) return { ok: false, reason: 'empty-city-name' }

  const normalized = normalize(name)
  if (options?.existing && normalized in options.existing) {
    return { ok: false, reason: 'duplicate-city' }
  }

  const url = new URL(baseUrl)
  url.searchParams.set('q', name)
  url.searchParams.set('appid', apiKey)
  url.searchParams.set('units', 'metric')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const external = options?.signal
  const onExternalAbort = () => controller.abort()
  if (external) external.addEventListener('abort', onExternalAbort)

  try {
    const res = await fetch(url.toString(), { signal: controller.signal })
    if (!res.ok) {
      let reason = `http-${res.status}`
      try {
        const payload = await res.json()
        if (payload && payload.message) reason = String(payload.message)
      } catch {
      }
      return { ok: false, reason, status: res.status }
    }

    const data = await res.json()

    const weatherItem: City = {
      id: normalized,
      name: data.name ?? name,
      country: data.sys?.country,
      temp: typeof data.main?.temp === 'number' ? data.main.temp : undefined,
      feels_like: typeof data.main?.feels_like === 'number' ? data.main.feels_like : undefined,
      weather: Array.isArray(data.weather) && data.weather[0]?.description ? data.weather[0].description : undefined,
      wind: {
        speed: typeof data.wind?.speed === 'number' ? data.wind.speed : undefined,
        deg: typeof data.wind?.deg === 'number' ? data.wind.deg : undefined,
      },
      pressure: typeof data.main?.pressure === 'number' ? data.main.pressure : undefined,
      humidity: typeof data.main?.humidity === 'number' ? data.main.humidity : undefined,
      visibility: typeof data.visibility === 'number' ? data.visibility : undefined,
    }

    if (storageKey) {
      const list = readStoredCities(storageKey)
      const exists = list.find((c) => normalize(c.name) === normalized)
      if (!exists) {
        list.push(weatherItem)
        saveStoredCities(storageKey, list)
      }
    }

    return { ok: true, city: weatherItem }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return { ok: false, reason: 'aborted' }
    return { ok: false, reason: 'network-or-parse-error' }
  } finally {
    clearTimeout(timer)
    if (external) external.removeEventListener('abort', onExternalAbort)
  }
}

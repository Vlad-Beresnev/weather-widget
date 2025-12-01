import { chromium } from 'playwright'
import { pathToFileURL } from 'url'
import path from 'path'
import process from 'process'

const rootDir = path.resolve(process.cwd())
const fileUrl = pathToFileURL(path.join(rootDir, 'test.html')).toString()

const browser = await chromium.launch()
const page = await browser.newPage()

page.on('console', (msg) => {
  console.log('[page]', msg.type(), msg.text())
})

await page.addInitScript(() => {
  const sampleCity = {
    id: 'demo',
    name: 'Demo City',
    country: 'DC',
    temp: 20,
    feels_like: 18,
    weather: 'Clear sky',
    wind: { speed: 4 },
    pressure: 1011,
    humidity: 60,
    visibility: 10,
  }
  localStorage.setItem('weather:cities', JSON.stringify([sampleCity]))
})

await page.route('https://api.openweathermap.org/**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 123,
      name: 'Demo City',
      sys: { country: 'DC' },
      main: {
        temp: 21.5,
        feels_like: 20,
        pressure: 1010,
        humidity: 58,
      },
      weather: [{ description: 'Sunny', icon: '01d' }],
      wind: { speed: 3.5, deg: 90 },
      visibility: 10,
    }),
  })
})

await page.goto(fileUrl)
const storedValue = await page.evaluate(() => localStorage.getItem('weather:cities'))
console.log('stored localStorage:', storedValue)
await page.waitForSelector('weather-widget', { state: 'attached' })
await page.waitForFunction(() => {
  const host = document.querySelector('weather-widget')
  return host && host.shadowRoot && host.shadowRoot.querySelector('.bi')
}, { timeout: 10000 })

const data = await page.evaluate(() => {
  const host = document.querySelector('weather-widget')
  const shadow = host?.shadowRoot
  if (!shadow) return { error: 'no shadow root' }

  const queryInfo = (selector) => {
    const el = shadow.querySelector(selector)
    if (!el) return null
    const pseudo = window.getComputedStyle(el, '::before')
    return {
      selector,
      textContent: el.textContent,
      content: pseudo.content,
      fontFamily: pseudo.fontFamily,
      fontSize: pseudo.fontSize,
    }
  }

  const links = Array.from(shadow.querySelectorAll('link[rel="stylesheet"]')).map((link) => ({
    href: link.href,
    loaded: link.sheet != null,
  }))

  const iconClasses = Array.from(shadow.querySelectorAll('.bi')).map((el) => ({
    text: el.textContent,
    classes: el.className,
  }))

  const styleCount = shadow.querySelectorAll('style').length

  const cardCount = shadow.querySelectorAll('.weather-card').length

  return {
    gear: queryInfo('.bi-gear'),
    wind: queryInfo('.bi-wind'),
    links,
    iconClasses,
    cardCount,
    styleCount,
  }
})

await browser.close()

console.log(JSON.stringify(data, null, 2))

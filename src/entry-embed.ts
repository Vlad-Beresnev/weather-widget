import { createApp } from 'vue'
import WeatherWidget from './components/WeatherWidget.vue'

// Include global styles used by the widget so Vite emits the combined CSS asset.
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './styles/main.scss'

const WEATHER_WIDGET_FILENAME = /weather-widget(?:\.[a-z0-9]+)?\.js(?:$|\?)/i

const getBundleScript = (): HTMLScriptElement | null => {
  if (typeof document === 'undefined') return null

  const current = document.currentScript as HTMLScriptElement | null
  if (current) return current

  const allScripts = Array.from(document.getElementsByTagName('script')) as HTMLScriptElement[]

  const attrMatch = allScripts.find(script =>
    script.hasAttribute('data-weather-widget') ||
    script.hasAttribute('data-weather-widget-base') ||
    script.hasAttribute('data-weather-widget-css')
  )
  if (attrMatch) return attrMatch

  const filenameMatch = allScripts.find(script => script.src && WEATHER_WIDGET_FILENAME.test(script.src))
  if (filenameMatch) return filenameMatch

  return allScripts.length ? allScripts[allScripts.length - 1] ?? null : null
}

const toAbsoluteUrl = (maybeRelative: string, fallback?: string) => {
  try {
    return new URL(maybeRelative, fallback || (typeof document !== 'undefined' ? document.baseURI : undefined)).toString()
  } catch (error) {
    return maybeRelative
  }
}

const resolveAssetBaseUrl = (scriptEl: HTMLScriptElement | null) => {
  if (!scriptEl) return ''
  const explicitBase = scriptEl.getAttribute('data-weather-widget-base')
  if (explicitBase) {
    const absolute = toAbsoluteUrl(explicitBase, scriptEl.src)
    return absolute.endsWith('/') ? absolute : `${absolute}/`
  }
  if (scriptEl.src) {
    const idx = scriptEl.src.lastIndexOf('/')
    return idx >= 0 ? scriptEl.src.slice(0, idx + 1) : ''
  }
  return ''
}

const resolveWidgetCssUrl = () => {
  const scriptEl = getBundleScript()
  if (!scriptEl) return ''
  const explicitCss = scriptEl.getAttribute('data-weather-widget-css')
  if (explicitCss) return toAbsoluteUrl(explicitCss, scriptEl.src)
  const base = resolveAssetBaseUrl(scriptEl)
  return base ? `${base}weather-widget.css` : ''
}

const widgetCssUrl = resolveWidgetCssUrl()

const injectCssLink = (shadowRoot: ShadowRoot | null) => {
  if (!shadowRoot || !widgetCssUrl) return
  const alreadyInjected = shadowRoot.querySelector('link[data-weather-widget-style]')
  if (alreadyInjected) return
  const linkEl = document.createElement('link')
  linkEl.rel = 'stylesheet'
  linkEl.href = widgetCssUrl
  linkEl.setAttribute('data-weather-widget-style', '')
  shadowRoot.insertBefore(linkEl, shadowRoot.firstChild)
}


class WeatherWidgetElement extends HTMLElement {
  app: any = null
  mountPoint: HTMLElement | null = null
  shadowRootRef: ShadowRoot | null = null

  // connectedCallback can be async so we can fetch and inject CSS into the shadow root
  async connectedCallback() {
    if (this.app) return
    // create a simple mount point inside shadow DOM to avoid leaking markup
    this.shadowRootRef = this.attachShadow({ mode: 'open' })
    this.mountPoint = document.createElement('div')
    this.shadowRootRef.appendChild(this.mountPoint)

    // ensure the generated CSS is requested inside the shadow root so styles apply
    injectCssLink(this.shadowRootRef)

    // mount Vue app first (we'll copy styles into the shadow root shortly after).
    this.app = createApp(WeatherWidget)
    this.app.mount(this.mountPoint)

    // Try to copy any style tags inserted into document.head by the bundle into the shadow root.
    // Vite may inject styles slightly after this module runs; retry for a short while to catch them.
    const copied = new Set<string>()
    const copyStylesOnce = () => {
      try {
        const headStyles = Array.from(document.head.querySelectorAll('style'))
        // Copy component-scoped SFC styles as well as our bundled global CSS (bootstrap, icons, app variables).
        // We detect candidate style tags by looking for either the SFC scope marker (`[data-v-`) or
        // a few distinguishing strings we know live in our bundled CSS (CSS variables and common bootstrap selectors).
        const relevant = headStyles.filter(s => {
          if (typeof s.textContent !== 'string') return false
          const text = s.textContent
          return text.includes('[data-v-') || text.includes('--color-primary') || text.includes('.container-fluid') || text.includes('.navbar') || text.includes('.bi ')
        })
        let found = false
        for (const s of relevant) {
          const text = s.textContent || ''
          if (copied.has(text)) continue
          const copy = document.createElement('style')
          copy.textContent = text
          this.shadowRootRef!.appendChild(copy)
          copied.add(text)
          found = true
        }
        return found
      } catch (e) {
        return false
      }
    }

    // Immediate attempt, then a few retries in case Vite injects styles asynchronously.
    if (!copyStylesOnce()) {
      let attempts = 0
      const iv = setInterval(() => {
        attempts += 1
        if (copyStylesOnce() || attempts >= 8) {
          clearInterval(iv)
        }
      }, 100)
    }
  }

  disconnectedCallback() {
    if (this.app) {
      try { this.app.unmount() } catch (e) {}
      this.app = null
    }
  }
}

// Register the custom element if it's not already defined
if (!customElements.get('weather-widget')) {
  customElements.define('weather-widget', WeatherWidgetElement)
}

// Also export nothing by default (bundle will execute registration as side-effect)
export {}

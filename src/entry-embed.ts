import { createApp } from 'vue'
import WeatherWidget from './components/WeatherWidget.vue'
import embedStyles from './styles/embed.scss?inline'

const WEATHER_WIDGET_FILENAME = /weather-widget(?:\.[a-z0-9]+)?\.js(?:$|\?)/i
const STYLE_ATTR = 'data-weather-widget-style'
const SCOPED_STYLE_ATTR = 'data-weather-widget-scoped-style'
const supportsConstructableStylesheets = typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype
let sharedStylesheet: CSSStyleSheet | null = null
let scopedStyleId = 0

const getBundleScript = (): HTMLScriptElement | null => {
  if (typeof document === 'undefined') return null

  const current = document.currentScript as HTMLScriptElement | null
  if (current) return current

  const scripts = Array.from(document.getElementsByTagName('script')) as HTMLScriptElement[]

  const attrMatch = scripts.find((script) =>
    script.hasAttribute('data-weather-widget') ||
    script.hasAttribute('data-weather-widget-base') ||
    script.hasAttribute('data-weather-widget-css')
  )
  if (attrMatch) return attrMatch

  const filenameMatch = scripts.find((script) => script.src && WEATHER_WIDGET_FILENAME.test(script.src))
  if (filenameMatch) return filenameMatch

  return scripts.length ? scripts[scripts.length - 1] ?? null : null
}

const toAbsoluteUrl = (path: string, base?: string) => {
  try {
    return new URL(path, base || (typeof document !== 'undefined' ? document.baseURI : undefined)).toString()
  } catch {
    return path
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
  const script = getBundleScript()
  if (!script) return ''
  const explicitCss = script.getAttribute('data-weather-widget-css')
  if (explicitCss) return toAbsoluteUrl(explicitCss, script.src)

  const base = resolveAssetBaseUrl(script)
  return base ? `${base}weather-widget.css` : ''
}

if (supportsConstructableStylesheets) {
  sharedStylesheet = new CSSStyleSheet()
  sharedStylesheet.replaceSync(embedStyles)
}

const applyEmbedStyles = (shadowRoot: ShadowRoot | null) => {
  if (!shadowRoot) return

  if (sharedStylesheet && 'adoptedStyleSheets' in shadowRoot) {
    const sheets = shadowRoot.adoptedStyleSheets || []
    if (!sheets.includes(sharedStylesheet)) {
      shadowRoot.adoptedStyleSheets = [...sheets, sharedStylesheet]
    }
    return
  }

  const alreadyInjected = shadowRoot.querySelector(`style[${STYLE_ATTR}]`)
  if (alreadyInjected) return

  const styleEl = document.createElement('style')
  styleEl.textContent = embedStyles
  styleEl.setAttribute(STYLE_ATTR, '')
  shadowRoot.insertBefore(styleEl, shadowRoot.firstChild)
}

const isScopedStyle = (style: HTMLStyleElement) => {
  const text = style.textContent || ''
  if (!text) return false
  return text.includes('[data-v-') || text.includes(':host')
}

const copyScopedStyles = (shadowRoot: ShadowRoot | null, sourceStyles?: HTMLStyleElement[]) => {
  if (!shadowRoot || typeof document === 'undefined') return false

  const styles = sourceStyles ?? Array.from(document.querySelectorAll('style'))
  let copied = false

  for (const style of styles) {
    if (!(style instanceof HTMLStyleElement)) continue
    if (!isScopedStyle(style)) continue
    const text = style.textContent || ''

    let id = style.getAttribute(SCOPED_STYLE_ATTR)
    if (!id) {
      id = `scoped-${scopedStyleId++}`
      style.setAttribute(SCOPED_STYLE_ATTR, id)
    }

    if (shadowRoot.querySelector(`style[${SCOPED_STYLE_ATTR}="${id}"]`)) continue

  const clone = document.createElement('style')
  clone.textContent = text
    clone.setAttribute(SCOPED_STYLE_ATTR, id)
    shadowRoot.appendChild(clone)
    copied = true
  }

  return copied
}

const ensureScopedStyles = (shadowRoot: ShadowRoot | null) => {
  if (!shadowRoot) return

  if (copyScopedStyles(shadowRoot)) return

  let attempts = 0
  const maxAttempts = 10
  const interval = setInterval(() => {
    attempts += 1
    if (copyScopedStyles(shadowRoot) || attempts >= maxAttempts) {
      clearInterval(interval)
    }
  }, 100)
}

const observeScopedStyles = (shadowRoot: ShadowRoot | null) => {
  if (!shadowRoot || typeof MutationObserver === 'undefined') return null

  const observer = new MutationObserver((mutations) => {
    const added = mutations
      .flatMap((mutation) => Array.from(mutation.addedNodes))
      .filter((node): node is HTMLStyleElement => node instanceof HTMLStyleElement)
    if (added.length) {
      copyScopedStyles(shadowRoot, added)
    }
  })

  observer.observe(document.documentElement, { childList: true, subtree: true })
  return observer
}

const widgetCssUrl = resolveWidgetCssUrl()

const injectCssLink = (shadowRoot: ShadowRoot | null) => {
  if (!shadowRoot || !widgetCssUrl || typeof document === 'undefined') return
  if (shadowRoot.querySelector(`link[${STYLE_ATTR}]`)) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = widgetCssUrl
  link.setAttribute(STYLE_ATTR, '')
  shadowRoot.insertBefore(link, shadowRoot.firstChild)
}


class WeatherWidgetElement extends HTMLElement {
  app: any = null
  mountPoint: HTMLElement | null = null
  shadowRootRef: ShadowRoot | null = null
  styleObserver: MutationObserver | null = null

  // connectedCallback can be async so we can fetch and inject CSS into the shadow root
  async connectedCallback() {
    if (this.app) return
    // create a simple mount point inside shadow DOM to avoid leaking markup
    this.shadowRootRef = this.attachShadow({ mode: 'open' })
    this.mountPoint = document.createElement('div')
    this.shadowRootRef.appendChild(this.mountPoint)

    applyEmbedStyles(this.shadowRootRef)
  injectCssLink(this.shadowRootRef)

    // mount Vue app first (we'll copy styles into the shadow root shortly after).
    this.app = createApp(WeatherWidget)
    this.app.mount(this.mountPoint)

    ensureScopedStyles(this.shadowRootRef)
    this.styleObserver = observeScopedStyles(this.shadowRootRef)
  }

  disconnectedCallback() {
    if (this.styleObserver) {
      this.styleObserver.disconnect()
      this.styleObserver = null
    }
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

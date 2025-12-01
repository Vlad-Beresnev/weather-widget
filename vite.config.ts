import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Build an embeddable IIFE bundle that registers a <weather-widget> custom element.
// This keeps the existing dev/build setup (webpack) intact while adding a Vite
// library build that emits `dist/weather-widget.js` suitable for a single-<script>
// embed.
export default defineConfig({
  // emit relative asset URLs so the widget can be hosted from any path
  base: './',
  plugins: [vue()],
  define: {
    __VUE_OPTIONS_API__: false,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
  },
  build: {
    // Build a single-file IIFE bundle from our embed entry
    lib: {
      entry: resolve(__dirname, 'src/entry-embed.ts'),
      name: 'WeatherWidgetEmbed',
      formats: ['iife'],
      // produce a JS file named weather-widget.js for easier embedding
      fileName: () => 'weather-widget.js',
      cssFileName: 'weather-widget'
    },
    rollupOptions: {
      output: {
        // IIFE needs a global name (unused here but kept for clarity)
        name: 'WeatherWidgetEmbed',
        // Add a small shim so `process` references in third-party code don't throw in browsers
        // The bundle runs in browsers, so define a minimal process.env shim.
        banner: 'var process = { env: { NODE_ENV: "production" } };'
      }
    },
    outDir: 'dist',
    target: 'es2018'
  }
})

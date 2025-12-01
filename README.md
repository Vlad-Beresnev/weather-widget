# Weather Widget

Minimal weather widget. The component renders as a single `<weather-widget>` custom element and reads data from OpenWeather.

## Tech stack

- Vue 3 + TypeScript
- Webpack (dev build) & Vite (embed build)
- Bootstrap 5, SCSS, inline SVG icons

## Build & test the embed

```bash
npm run build:embed   # emits dist/weather-widget.{js,css}
open test.html        # loads the built bundle via <weather-widget>
```

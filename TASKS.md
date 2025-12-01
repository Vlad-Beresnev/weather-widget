# Project tasks (prioritized)

This file groups remaining work into three buckets: MUST (blocking), SHOULD (high priority) and NICE-TO-HAVE (optional polish).

Each item has a short acceptance criteria and a rough estimated effort (S/M/L).

---

## MUST

- Build an embeddable bundle & README with snippet
  - Acceptance: repository contains a `dist/` or published artifact and `README.md` shows how to embed the widget with a single <script> tag and the tag example `<weather-widget />`.
  - Effort: M

- Remove / hide the OpenWeather API key from client source
  - Acceptance: no hard-coded `API_KEY` in source; example uses `import.meta.env.VITE_OPENWEATHER_KEY` (or docs explain proxy). Provide `.env.example` and README instructions.
  - Effort: S

- Ensure initial user location is fetched and used (robust)
  - Acceptance: on first open the app attempts browser Geolocation; if denied/blocked it falls back to IP-based geolocation; a single city is added and persisted. Handle permission-denied gracefully.
  - Effort: S

- Persist full city objects consistently
  - Acceptance: `localStorage` key `weather:cities` stores an array of full city objects; load logic tolerates older formats (strings or partial objects).
  - Effort: S

- Surface errors/feedback to users
  - Acceptance: user-visible messages for: city-not-found, network error, rate-limit (429), geolocation denied (with brief help text). No silent console-only failures for user actions.
  - Effort: S

---

## SHOULD

- Use a stable service boundary for network code
  - Acceptance: central `src/services/weatherService.ts` is used for all fetches, supports city name and lat/lon lookups, includes timeout/cancellation and typed results.
  - Effort: S

- Improve drag & drop reliability and mobile support
  - Acceptance: either improve current HTML5 logic with touch handling and clear drop indicators or integrate a tested library (SortableJS / VueDraggable). Keyboard reorder support and ARIA attributes must be present.
  - Effort: M

- Add unit tests & basic CI
  - Acceptance: tests for `fetchWeather` (mock network), `SettingsCard` reorder logic, and `WeatherWidget` mount/restore. CI runs tests on PRs.
  - Effort: M

- Deduplicate & normalize location names
  - Acceptance: adding `New York` vs `new york` vs `New‑York` is prevented via normalization (trim, lowercase, Unicode normalize). Provide a user message on duplicates.
  - Effort: S

- Retry/backoff and rate-limit handling
  - Acceptance: handle 429 responses (show message and refrain from immediate retries). Consider exponential backoff for repeated failures.
  - Effort: M

---

## NICE-TO-HAVE

- Local icon sprite / SVG fallback
  - Acceptance: when OpenWeather icon URL is unavailable, fall back to local SVG sprite (no 404s). Provide crisp scaling for different card sizes.
  - Effort: S

- Make constants configurable
  - Acceptance: expose `MAX_CARDS`, drag thresholds, default icon size as props or via a config file / CSS variables.
  - Effort: S

- Accessibility improvements
  - Acceptance: full keyboard reorder support, screen-reader labels, focus management for settings modal, color contrast checks.
  - Effort: M

- Demo page and publish-ready README
  - Acceptance: a `demo/` page or `index.html` shows the widget usage and interaction flows; README contains build/publish instructions and a link to the live demo.
  - Effort: S

- Optional serverless proxy for API key
  - Acceptance: simple serverless function (Vercel/Lambda) that forwards requests to OpenWeather with the key stored server-side; README documents deploying it. This removes the public key from client bundles.
  - Effort: M

---

If you want, I can implement one of the SHOULD items next (recommend: move the API key to env/proxy or improve DnD with VueDraggable). Tell me which item to pick and I'll create a focused todo and start implementing it.

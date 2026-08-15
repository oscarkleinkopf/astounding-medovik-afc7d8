# BookmarkIQ

Smart bookmark organizer. Two client-side products share the core organizing logic:

- **Web app (PWA)** at the repo root: `index.html` + `index.css` + `app.js` (ES module) importing `src/core/*.js`. Pure vanilla JS, no framework, no build step. Persists state in `localStorage`. Installable PWA via `manifest.webmanifest` + `sw.js`.
- **Chrome extension** in `extension/`: Manifest V3 popup + background service worker.

Optional external integrations (all browser-side, all require user-supplied credentials/network, none needed to run the app): Google Gemini (AI categorization), GitHub REST API (cloud sync), Internet Archive Wayback + Google Favicons (link checker), Google Fonts CDN.

## Cursor Cloud specific instructions

- **No package manager / build step.** There is no `package.json`, lockfile, Makefile, or Dockerfile. Nothing to install; `python3` and `node` are preinstalled. Do not add a build step — the app is served as static files.
- **Run the web app (dev):** serve the repo root over HTTP (needed because ES modules and the service worker do not work from `file://`):
  - `python3 -m http.server 8080` (from repo root) → open `http://localhost:8080/`.
  - Alternative closer to production headers/CSP: `npx --yes netlify dev` (Netlify CLI default port 8888); `netlify.toml` defines the CSP/headers used in prod. Not required for local dev.
- **Hello-world smoke test:** on the landing page click the demo button ("✨ Try with sample bookmarks" / `upload.demo`) — it loads ~41 sample bookmarks and organizes them into ~12 categories with a chart. No upload or credentials needed.
- **Service worker caching gotcha:** `sw.js` caches assets (cache-first / stale-while-revalidate). After editing JS/CSS, a plain refresh may serve stale files. Hard-reload or unregister the SW (DevTools → Application → Service Workers) to see changes.
- **i18n:** UI strings live in inline `en`/`es` dictionaries in `src/core/i18n.js` and are applied to `data-i18n` / `data-i18n-placeholder` elements by `updateTranslations()` in `app.js`. `t()` falls back to a humanized version of the key if a translation is missing (so a missed key never surfaces a raw dotted key). Run `node scripts/check-i18n.js` to verify every referenced key is defined in both languages — it exits non-zero on any gap, so it is suitable for CI/pre-commit.
- **Live language switch:** `updateTranslations()` only re-scans `data-i18n` attributes, so `handleLanguageChange()` in `app.js` additionally re-renders dynamically-generated content (the "N bookmarks in M categories" summary via `renderResultsSummary()`, tree/stats, smart-collection chips, analytics, and the active Read Later / Gallery view) so `innerHTML`-built strings also update live without resetting user state (only `renderResults()` resets expanded categories).
- **No automated test framework or lint config** exists in the repo. "Linting" here is only `node --check` on individual JS files; the only test-like guard is `scripts/check-i18n.js`.
- **Extension testing** requires a Chromium browser: `chrome://extensions` → enable Developer mode → Load unpacked → select `extension/`.

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
- **Known existing app bug (not an env issue):** many UI labels render raw i18n keys (e.g. `upload.demo`, `results.expandAll`, `header.subtitle`) because those keys are missing from the inline dictionaries in `src/core/i18n.js`. The app is fully functional otherwise; this is unrelated to environment setup.
- **No automated tests or lint config** exist in the repo. "Linting" here is only what an editor/`node --check` would do on individual JS files.
- **Extension testing** requires a Chromium browser: `chrome://extensions` → enable Developer mode → Load unpacked → select `extension/`.

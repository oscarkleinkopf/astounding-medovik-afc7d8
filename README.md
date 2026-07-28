# BookmarkIQ

BookmarkIQ is a privacy-first browser bookmark organizer. Import a browser HTML export, organize bookmarks into categories, find duplicates, and export a cleaned collection. It is a static web application built with native ES modules, plus a Chrome extension (Manifest V3).

## Current capabilities

- Import Chrome, Firefox, Edge, Brave, and Safari HTML bookmark exports
- Rule-based categorization with optional Gemini-powered categorization
- Search, tags, duplicate detection, broken-link checks, analytics, and health reports
- Read Later queue, bulk editing, custom categories, themes, and English/Spanish UI
- Local JSON backups and optional GitHub repository synchronization
- PWA offline application shell and Chrome extension

## Run locally

No build step or runtime dependencies are required to use the site.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. A local HTTP server is required because the app uses ES modules and a service worker.

## Verify changes

Node 18 or later is required for the automated checks.

```bash
npm test
npm run check
```

## Chrome extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the `extension/` directory.

## Optional integrations and privacy

BookmarkIQ processes imported bookmarks in the browser. Bookmark collections are kept in memory unless you explicitly download a backup or use cloud sync.

- **Gemini:** enter an API key in Settings to enable AI features. The browser sends relevant bookmark data to Google Gemini.
- **GitHub Sync:** use a dedicated, private repository and a fine-grained personal access token restricted to that repository's Contents permission. The sync backup is stored unencrypted as `bookmarkiq_backup.json`.
- **Credential storage:** credentials are held only for the active browser session. Re-enter them after closing the tab.

Do not use cloud sync for sensitive bookmarks unless you understand the privacy and repository-access implications.

## Deployment

The repository is configured for Netlify as a static site. `netlify.toml` defines its publish directory, security headers, and caching. Deploy previews and production deploys run the same automated verification command before publishing.

## Project layout

```text
app.js               UI orchestration and application state
index.html/css       Static application shell and styles
src/core/            Domain logic and browser integration modules
extension/           Chrome Manifest V3 extension
tests/               Node native test suite
docs/                Roadmap and working agreements
```

## Contributing

Read [AGENTS.md](AGENTS.md) before changing the project. It defines architecture boundaries, validation, security rules, and the GitHub backup workflow.

See [docs/ROADMAP.md](docs/ROADMAP.md) for the prioritized stabilization backlog and recorded technical decisions.

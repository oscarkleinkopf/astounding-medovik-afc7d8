# Stabilization roadmap

## Product status

The four planned feature phases are implemented. The next stage prioritizes production readiness over new features.

## Priority backlog

### P0 — Safety and release confidence

- Keep AI keys and GitHub tokens session-only; never restore them into the DOM.
- Confirm and validate cloud restores before replacing current data.
- Maintain a restrictive Netlify CSP while allowing required network connections.
- Add automated unit tests for pure bookmark-domain logic.
- Run tests and static checks in GitHub Actions and Netlify builds.

### P1 — Resilience and user trust

- Add clear UI copy about Gemini data sharing and GitHub sync's unencrypted backup.
- Validate all bookmark URLs before rendering them as links.
- Use a versioned service-worker cache and network-first behavior for application code.
- Add accessible states and error recovery for import, cloud sync, and offline use.
- Establish a release checklist and manual browser smoke-test procedure.

### P2 — Maintainability

- Split `app.js` into focused UI modules after the test baseline is established.
- Share categorization rules between the web app and extension without duplicating them.
- Add parser round-trip tests in a browser-capable test environment.
- Define a versioned cloud-backup schema and migration strategy.

### Deferred product work

New integrations, stronger cloud encryption, and a server-side AI proxy require an explicit architecture decision because they change the static-only model.

## Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-07-28 | Keep the web app dependency-free for the first test baseline. | Node's built-in test runner covers the pure core modules without introducing a build pipeline. |
| 2026-07-28 | Treat browser-side Gemini and GitHub credentials as session-only. | Persistent browser storage increases exposure to XSS and shared-device access. |
| 2026-07-28 | Keep GitHub sync opt-in and recommend a private repository. | Sync backups contain bookmark data and are not encrypted. |

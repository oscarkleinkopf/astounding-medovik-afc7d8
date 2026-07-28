# Working agreement for agents

## Mission

BookmarkIQ is a static, client-side bookmark organizer. Preserve its zero-build browser experience while improving reliability, security, accessibility, and maintainability.

## Architecture boundaries

- `app.js` owns DOM event handling and transient UI state.
- `src/core/` contains reusable domain logic. Prefer adding testable, side-effect-free functions here rather than expanding `app.js`.
- `index.html` and `index.css` define the web UI.
- `extension/` is a separate Chrome Manifest V3 application; update it deliberately when behavior shared with the web app changes.
- `netlify.toml` controls Netlify deployment headers and static publishing.
- `sw.js` controls offline application-shell caching. Increment `CACHE_NAME` when shipping a security-sensitive cache change.

## Rules for changes

1. Do not add a framework or bundler without an explicit architectural decision.
2. Do not hardcode credentials, API keys, tokens, user bookmark data, or production URLs.
3. Do not persist Gemini keys or GitHub tokens beyond the current browser session.
4. Validate imported or remotely restored data before putting it into application state.
5. Escape user-derived text inserted into HTML and only render `http:` or `https:` URLs as links.
6. Keep CSP restrictive. Any new external connection must be justified and added to `connect-src` in `netlify.toml`.
7. Update `README.md` and `docs/ROADMAP.md` when a change alters setup, privacy, architecture, or the planned work.

## Validation

Run these commands before every commit:

```bash
npm test
npm run check
```

Perform a browser smoke test for UI, PWA, extension, CSP, service worker, or Netlify configuration changes.

## GitHub backup workflow

Every logical update must be recoverable in GitHub:

1. Work on a `cursor/<topic>-8de6` branch.
2. Keep commits focused and descriptive.
3. Run validation before committing.
4. Push using `git push -u origin <branch>`.
5. Create or update a draft pull request against `main`.
6. Record follow-up work in `docs/ROADMAP.md`; do not silently defer known risks.

Do not force-push, amend another author's commit, merge pull requests, or change a pull request's review state without explicit instruction.

## Current technical limitations

- Gemini uses a browser-side API integration. It cannot provide server-side secret protection.
- GitHub sync is client-side and stores an unencrypted JSON backup in the selected repository.
- The link checker depends on the target website's CORS policy and cannot reliably validate every URL.
- The PWA cache is an offline convenience, not an authoritative bookmark store.

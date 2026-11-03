# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Fresh worktrees require `npm ci` before tests or local development so declared dependencies such as Busboy are installed.
- `README.md` is the authority for routes, local commands, review deployment boundaries, rollback, the implemented HKT role-date contract, and the one separately deferred application-field blocker.
- The site is built from `site-src/` (Vite): edit there and run `npm run build:site`, never the built files at the root. `scripts/build-site.mjs` refuses to overwrite runtime owners.
- `scripts/careers-roles.js` owns all canonical role content, locations, homepage groups, and optional factual lifecycle fields; `api/_lib/role-state.js` is the single HKT lifecycle resolver used by `api/role-state.js`, `api/applications.js`, and `tests/careers-deadline.test.mjs`.
- `api/_lib/role-state-response.js` projects the canonical lifecycle for both `functions/api/role-state.js` on Cloudflare Pages and `api/role-state.js` on Vercel. The browser calls both APIs same-origin; `functions/api/applications.js` transparently relays production intake to the unchanged Vercel processor, whose application-specific CORS, limits, validation, dry-run, and Notion behavior remain authoritative. The v4 apply page sends only from carenbloom.com and treats unknown slugs as not found.
- Review application traffic must remain dry-run-only, and `npm test` proves the application boundary without a real Notion write.
- `scripts/package-deployment.mjs` owns the strict Vercel runtime allowlist for the existing `carenbloom-redesign-a` review project.
- `tests/site-contract.test.mjs` and `tests/site-browser.test.mjs` pin the published v4 site; the API and Cloudflare tests pin the runtime.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.

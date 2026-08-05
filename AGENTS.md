# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- `README.md` is the authority for routes, local commands, review deployment boundaries, rollback, and the unresolved `datePosted` production blocker.
- `scripts/careers-roles.js` owns all eleven canonical role records and their optional physical locations, and is imported by both the application page and `/api/applications` as the single server-side role authority.
- Review application traffic must remain dry-run-only, and `npm test` proves the application boundary without a real Notion write.
- `scripts/package-deployment.mjs` owns the strict Vercel runtime allowlist for the existing `carenbloom-redesign-a` review project.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.

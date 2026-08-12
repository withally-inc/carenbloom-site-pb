# Same-Origin Role-State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every browser role-state read same-origin while preserving the server-authoritative HKT response contract and existing application routing.

**Architecture:** A pure response builder projects canonical role data for both server runtimes.
The Cloudflare Pages Function computes the response locally, the Vercel handler remains supported, and browser endpoint resolution separates role-state from applications.

**Tech Stack:** JavaScript ES modules, Cloudflare Pages Functions, Vercel Functions, Node test runner, Playwright, and no-mistakes.

## Global Constraints

Role-state must preserve its current JSON shape, HKT boundary rules, and non-cacheable headers.
`/api/applications` must remain unchanged and cross-origin on production hosts.
The Vercel role-state endpoint must keep working.
Do not implement monitoring or a new bounded-recovery policy.
Use TDD for every behavior change.
Never push except through no-mistakes.

---

### Task 1: Same-origin endpoint routing

**Files:**

- Modify: `tests/api-endpoints.test.mjs`
- Modify: `tests/role-state-browser.test.mjs`
- Modify: `scripts/api-endpoints.js`

**Interfaces:**

- Consumes: `resolveRoleStateEndpoint(location, globals)` and `resolveApplicationsEndpoint(location, globals)`.
- Produces: `/api/role-state` for every normal host and the unchanged application endpoint policy.

- [ ] Add literal failing expectations that apex and `www` role-state resolve to `/api/role-state`, while their application endpoint remains `https://carenbloom-site-pb.vercel.app/api/applications`.
- [ ] Run `node --test tests/api-endpoints.test.mjs` and confirm the production role-state expectation fails against the Vercel URL.
- [ ] Split role-state and application resolution in `scripts/api-endpoints.js` without changing explicit overrides.
- [ ] Run `node --test tests/api-endpoints.test.mjs` and confirm all endpoint cases pass.
- [ ] Update the browser endpoint matrix with the same literal expectations and defer its green run until the full browser server is active.

### Task 2: Shared response builder and Cloudflare function

**Files:**

- Create: `api/_lib/role-state-response.js`
- Create: `functions/api/role-state.js`
- Create: `tests/cloudflare-role-state.test.mjs`
- Modify: `api/role-state.js`
- Modify: `tests/role-state-api.test.mjs`
- Modify: `scripts/test.mjs`
- Modify: `package.json`

**Interfaces:**

- Produces: `resolveRoleStateResponse({ serverNow, roles, slug }) -> { statusCode, payload }`.
- Produces: `onRequest({ request }) -> Response` for the Cloudflare route.

- [ ] Add failing Cloudflare function tests for collection, role, unknown, OPTIONS, POST, and exact non-cacheable headers.
- [ ] Run `node tests/cloudflare-role-state.test.mjs` and confirm the missing function import is the expected red state.
- [ ] Extract the existing projection helpers from `api/role-state.js` into `api/_lib/role-state-response.js` without changing payload fields.
- [ ] Implement the Pages Function with a captured server time and the shared response builder.
- [ ] Run `node tests/role-state-api.test.mjs && node tests/cloudflare-role-state.test.mjs` and confirm both runtimes pass the same contract.
- [ ] Register the new focused test in `package.json` and `scripts/test.mjs`.

### Task 3: Terminal retry cancellation

**Files:**

- Modify: `scripts/api-endpoints.js`
- Modify: `scripts/careers-apply.js`
- Modify: `tests/role-state-browser.test.mjs`

**Interfaces:**

- Consumes: `fetchRoleState(slug, fetchImpl, { signal })`.
- Produces: abortable fetch attempts and retry delays.

- [ ] Run the existing full browser test with the repository server and capture the `4 !== 3` terminal-polling failure.
- [ ] Add a controller for each application-page refresh and abort it inside terminal takedown.
- [ ] Pass the signal through `fetchRoleState`, check it before every attempt, and make retry waits reject on abort.
- [ ] Re-run `tests/role-state-browser.test.mjs` and confirm terminal takedown leaves the request count unchanged.

### Task 4: Runtime and documentation contracts

**Files:**

- Modify: `tests/repository-contract.test.mjs`
- Modify: `README.md`
- Modify: `AGENTS.md`

**Interfaces:**

- Produces: a documented two-runtime role-state architecture and a complete repository runtime inventory.

- [ ] Add the Cloudflare function and response builder to the repository runtime inventory.
- [ ] Update README routes and architecture to state that role-state is same-origin while applications alone use the Vercel production origin.
- [ ] Update AGENTS.md to point future agents at the new Pages Function and shared response builder.
- [ ] Run contract and deployment-package tests and confirm the Vercel package remains strict and unchanged in endpoint scope.

### Task 5: Validation and delivery

**Files:**

- Verify all modified and created files.

**Interfaces:**

- Produces: one committed feature branch and a no-mistakes-created PR with green CI.

- [ ] Run `node --test tests/api-endpoints.test.mjs tests/repository-contract.test.mjs tests/deployment-package.test.mjs`.
- [ ] Run `node tests/role-state-api.test.mjs && node tests/cloudflare-role-state.test.mjs`.
- [ ] Run the role-state browser test against the repository server.
- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run package:deployment` and verify the strict review bundle succeeds.
- [ ] Commit only the authorized implementation and documents.
- [ ] Run `no-mistakes axi` and then start the pipeline with the captain-approved intent: serve role-state same-origin through a Cloudflare Pages Function, preserve Vercel role-state, leave applications cross-origin, repair terminal retry polling, and exclude monitoring or recovery redesign.
- [ ] Drive every review/fix/test/docs/push/PR/CI gate until `checks-passed` or `passed` and record the PR URL.

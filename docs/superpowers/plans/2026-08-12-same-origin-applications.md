# Same-Origin Applications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make application submission same-origin on `carenbloom.com` while preserving the Vercel application processor and every existing intake protection.

**Architecture:** A transparent Cloudflare Pages Function streams the incoming request to the fixed Vercel applications endpoint and returns its response unchanged.
The browser resolver uses `/api/applications` everywhere, while explicit test overrides and direct Vercel access remain supported.

**Tech Stack:** JavaScript ES modules, Cloudflare Pages Functions, Vercel Functions, Fetch API streams, Node test runner, Playwright, and no-mistakes.

## Global Constraints

Implement Approach A only.
Do not move, copy, create, inspect, or expose credentials.
Keep `api/applications.js` and its stricter application CORS policy authoritative and unchanged.
Preserve method handling, multipart content type and bytes, exact 4 MiB limits, field validation, error responses, HKT lifecycle rejection, and `NOTION_INTAKE_DRY_RUN` behavior.
Keep the direct Vercel endpoint and review deployment working.
Never create a real application or perform a Notion smoke test.
Use TDD for every behavior change.
Never push except through no-mistakes.

---

### Task 1: Same-origin browser routing

**Files:**

- Modify: `tests/api-endpoints.test.mjs`
- Modify: `tests/role-state-browser.test.mjs`
- Modify: `scripts/api-endpoints.js`

**Interfaces:**

- Consumes: `resolveApplicationsEndpoint(location, globals)`.
- Produces: `/api/applications` for every normal host and the unchanged explicit `CB_TALENTS_ENDPOINT` override.

- [ ] Change the literal endpoint expectations for apex and `www` to `/api/applications` and keep review/local expectations unchanged.
- [ ] Run `node --test tests/api-endpoints.test.mjs` and confirm the production application expectation fails against the Vercel URL.
- [ ] Remove production-host branching from application resolution without changing override behavior.
- [ ] Run `node --test tests/api-endpoints.test.mjs` and confirm all endpoint cases pass.
- [ ] Update the browser endpoint matrix with the same literal production expectations.

### Task 2: Transparent Cloudflare relay

**Files:**

- Create: `functions/api/applications.js`
- Create: `tests/cloudflare-applications.test.mjs`
- Modify: `package.json`
- Modify: `scripts/test.mjs`

**Interfaces:**

- Produces: `createCloudflareApplicationsHandler({ fetchImpl }) -> onRequest({ request }) -> Promise<Response>`.
- Defaults: the fixed upstream URL `https://carenbloom-site-pb.vercel.app/api/applications` held as a module constant, and runtime `fetch`.

- [ ] Add a failing relay test that sends a multipart `POST` with a production `Origin`, asserts the fixed upstream URL, method, content type, origin, and literal body bytes, and verifies an upstream 400 upload-limit response returns unchanged.
- [ ] Add a failing relay test that sends an invalid `GET` and verifies the upstream 405 status, `Allow`, CORS, and JSON body return unchanged.
- [ ] Run `node tests/cloudflare-applications.test.mjs` and confirm the missing function import is the expected red state.
- [ ] Implement the minimal request-and-response relay with `new Request(VERCEL_APPLICATIONS_URL, request)` and injected `fetchImpl`.
- [ ] Run `node tests/cloudflare-applications.test.mjs` and confirm both contracts pass.
- [ ] Register the focused test in `package.json` and `scripts/test.mjs`.

### Task 3: Runtime documentation and setup pointer

**Files:**

- Modify: `README.md`
- Modify: `AGENTS.md`

**Interfaces:**

- Produces: current route/runtime guidance and a one-line `npm ci` setup pointer.

- [ ] Update README routing text and focused commands for the same-origin relay while preserving the direct Vercel and dry-run review boundaries.
- [ ] Replace the stale AGENTS routing note with a pointer to the Cloudflare relay and add one short setup line stating that fresh worktrees require `npm ci` before tests.
- [ ] Run `/Users/ivan/Projects/firstmate/bin/fm-ensure-agents-md.sh .` and confirm the maintaining section remains valid.

### Task 4: Validation and delivery

**Files:**

- Verify all modified and created files.

**Interfaces:**

- Produces: committed branch and a no-mistakes-created PR with green CI.

- [ ] Run focused endpoint, Cloudflare relay, Vercel applications, upload-limit, contract, and browser tests with dry-run-only infrastructure.
- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run package:deployment` and verify the direct Vercel runtime package remains complete.
- [ ] Run `git diff --check`, inspect the scoped diff, and commit the implementation.
- [ ] Drive no-mistakes with the full captain-approved intent until `checks-passed` or `passed`.
- [ ] Ensure the PR body includes the concrete Approach B assessment and the required post-merge production checks without exposing credentials.

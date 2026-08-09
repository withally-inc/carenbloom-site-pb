# Role-State Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make HKT Monday posting windows and factual role closure server-authoritative across every Care & Bloom recruiting surface.

**Architecture:** A pure resolver under `api/_lib/` consumes one injected server instant and canonical role data.
A non-cacheable endpoint exposes resolved role or collection state, while the application page and homepage render only from that response and the intake API resolves the same state before Notion work.

**Tech Stack:** Node.js ES modules, Vercel functions, browser ES modules, Node test runner, Playwright, and the repository dry-run HTTP server.

## Global Constraints

HKT is authoritative and each posting window refreshes Monday at `00:00 HKT`.
`datePosted` is that Monday's HKT calendar date, and the default close is exactly fourteen days after the Monday instant.
An earlier factual close or explicit inactive or filled state always wins.
Visitor clocks and timezones cannot affect role dates, countdowns, availability, counts, structured data, or application acceptance.
Unknown slugs never fall back.
Static and failed-authority surfaces do not advertise availability.
Review traffic remains dry-run-only, and this work does not deploy or alter Vercel state.
The deferred required-answer, resume, and portfolio blocker stays untouched.

---

### Task 1: Pure lifecycle authority

**Files:**

- Create: `api/_lib/role-state.js`
- Modify: `scripts/careers-roles.js`
- Replace: `tests/careers-deadline.test.mjs`

**Interfaces:**

- Consumes: `resolveRoleState(serverNow, role)` with a valid instant and canonical role object.
- Produces: `{ windowStart, datePosted, defaultClosesAt, effectiveClosesAt, validThrough, nextRefreshAt, isOpen }` using ISO strings except `datePosted` and `isOpen`.

- [ ] Write literal table-driven resolver tests for every calendar and closure boundary in the approved matrix.
- [ ] Run `npm run test:deadline` and preserve the expected missing-module or missing-export failure.
- [ ] Implement the minimal resolver and optional `status` and `closesAt` interpretation.
- [ ] Run `npm run test:deadline` and confirm every literal boundary passes.

### Task 2: Non-cacheable role-state endpoint

**Files:**

- Create: `api/role-state.js`
- Create: `tests/role-state-api.test.mjs`
- Modify: `scripts/dev-server.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: canonical `careerRoles` and `resolveRoleState(serverNow, role)`.
- Produces: `createRoleStateHandler({ now, roles })` for deterministic tests and a default Vercel handler.

- [ ] Write failing tests for GET collection, open role, closed role, unknown role, method rejection, and non-cacheable headers.
- [ ] Run the focused endpoint test and preserve the expected missing-handler failure.
- [ ] Implement the handler and local route with one captured server instant per request.
- [ ] Run the focused endpoint and deadline tests to green.

### Task 3: Intake closure enforcement

**Files:**

- Modify: `api/applications.js`
- Modify: `tests/applications-api.test.mjs`

**Interfaces:**

- Consumes: `resolveRoleState(now(), canonicalRole)`.
- Produces: `createApplicationsHandler({ now })`, with HTTP 410 before any Notion operation for closed roles.

- [ ] Add failing just-before, exact-close, after-close, inactive, unknown, and fake-client-state assertions.
- [ ] Run `npm run test:api` and preserve the expected acceptance-at-close failure.
- [ ] Add injected server-clock resolution before validation and Notion work.
- [ ] Run `npm run test:api` to green and confirm the existing dry-run and upload tests remain unchanged.

### Task 4: Authoritative application browser

**Files:**

- Modify: `careers/apply/index.html`
- Modify: `assets/pb-apply.css`
- Modify: `scripts/careers-apply.js`
- Modify: `tests/pb-role-apply.test.mjs`
- Modify: `tests/role-location-metadata.test.mjs`

**Interfaces:**

- Consumes: `GET /api/role-state?role=<slug>` and monotonic `performance.now()`.
- Produces: open, closed, unknown, and unavailable page states with JSON-LD only for open roles.

- [ ] Add failing browser assertions for authoritative field agreement, four timezones, clocks moved years forward and backward, no fallback, no form or JSON-LD when closed or unknown, and endpoint failure.
- [ ] Run the focused browser tests and preserve failures caused by browser-owned dates and fallback.
- [ ] Hide static active content and fetch authoritative role state before populating the page.
- [ ] Drive countdown elapsed time from the response anchor plus `performance.now()` and refresh at effective boundaries.
- [ ] Run the focused browser tests to green at desktop and mobile widths.

### Task 5: Authoritative homepage

**Files:**

- Create: `scripts/careers-home.js`
- Modify: `app.js`
- Modify: `index.html`
- Modify: `style.css`
- Regenerate: `critical.css`
- Modify: `tests/repository-contract.test.mjs`
- Modify: `tests/pb-role-apply.test.mjs`

**Interfaces:**

- Consumes: the role-state collection response.
- Produces: all role rows and every numeric role count from one response, or a neutral unavailable state.

- [ ] Add failing tests showing an earlier-filled role removes its row and decrements all aggregate counts together.
- [ ] Add failing no-JavaScript and endpoint-failure assertions proving there are no static active claims.
- [ ] Replace literal rows and counts with neutral placeholders and deterministic render targets.
- [ ] Render grouped open roles and synchronize every advertised count from the response.
- [ ] Regenerate `critical.css` from `style.css` with the repository's existing minification contract.
- [ ] Run contract and browser tests to green.

### Task 6: Runtime packaging and project documentation

**Files:**

- Modify: `scripts/package-deployment.mjs`
- Modify: `tests/deployment-package.test.mjs`
- Modify: `tests/repository-contract.test.mjs`
- Modify: `vercel.json`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Create: `evidence/role-state-r1/README.md`

**Interfaces:**

- Consumes: all new server and browser runtime owners.
- Produces: a strict deployment package with both API functions and their shared resolver.

- [ ] Add failing packaging assertions for the resolver, endpoint, browser owner, and executable packaged endpoint behavior.
- [ ] Update the allowlist and Vercel function declaration without invoking deployment commands.
- [ ] Update README and project memory to name the new authority and retire only the `datePosted` blocker.
- [ ] Record the observed red and green commands in the evidence README.
- [ ] Run packaging verification and focused tests to green.

### Task 7: Full validation and delivery

**Files:**

- Verify all task files and generated evidence.

- [ ] Run focused deadline, endpoint, API, contract, and browser tests.
- [ ] Run `npm test` and require pristine output.
- [ ] Run `NOTION_INTAKE_DRY_RUN=1 npm run package:deployment` and verify the packaged server behavior.
- [ ] Use `chrome-devtools-axi` against `npm run serve` for open, closed or unknown, endpoint-failure, and responsive visual checks.
- [ ] Run `/Users/ivan/Projects/firstmate/bin/fm-ensure-agents-md.sh .` and review its result.
- [ ] Commit the finished implementation on `fm/carenbloom-role-date-fix-r1` without deploying.
- [ ] Report the Firstmate implementation-complete gate, then drive `$no-mistakes` with the complete accepted intent through a green PR.


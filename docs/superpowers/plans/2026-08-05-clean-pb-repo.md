# Clean Care and Bloom Pattern Breaking Repository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap `withally-inc/carenbloom-site-pb` as the clean root-based canonical source for the approved Pattern Breaking home and direct application experience, apply the captain-approved physical-versus-remote metadata policy, validate it, and safely update the existing redesign-A Vercel review target.

**Architecture:** Import only the runtime dependency closure from integrated commit `c720871`, moving `pb-live/` to repository root and retaining the shared application route, API, role data, fonts, and referenced assets.
The Node development server provides static routing, byte-range media, and a dry-run API locally, while Vercel serves an explicit runtime allowlist with the same API dry-run protection.
Focused Node and Playwright tests protect root routing, dependency completeness, metadata agreement, application behavior, visual fallbacks, and deployment packaging.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node.js ESM, Playwright, Vercel Functions, Busboy, GitHub Actions, no-mistakes, Vercel CLI.

## Global Constraints

- Use `/Users/ivan/.treehouse/carenbloom-site2-557bfd/11/carenbloom-site2` at integration commit `c720871` as the read-only implementation source.
- Preserve the approved PB visual system and application behavior while changing only clean-repository ownership, root paths, and the approved role-location metadata policy.
- Keep all eleven canonical role records from `scripts/careers-roles.js`.
- Treat missing `locationType` as genuinely remote and preserve each explicit `locationType` verbatim for visible and metadata presentation.
- Preserve the existing dynamic `datePosted` behavior and document the unresolved factual policy as a production blocker.
- Keep every local and deployed application API dry-run-only and never perform a real submission or Notion write.
- Do not import legacy pages, experiments, reports, screenshots, evidence, Cloudflare wrappers, stale PRODUCT or DESIGN documents, or the unrelated `/talents/apply/` fixture.
- Do not modify or close `https://github.com/withally-inc/carenbloom-site2/pull/10`.
- Do not merge a PR, touch `carenbloom-site2.vercel.app`, create a Vercel project, add a custom domain, or deploy to the Care and Bloom production project.
- Run the Impeccable detector exactly once after the UI migration is complete, then make at most one bounded migration-defect pass.
- Use `gh-axi` for GitHub operations and `chrome-devtools-axi` for browser operations when those operations are performed directly outside no-mistakes.

---

### Task 1: Establish failing clean-repository contracts

**Files:**

- Create: `tests/repository-contract.test.mjs`
- Create: `tests/role-location-metadata.test.mjs`
- Create: `tests/deployment-package.test.mjs`
- Create: `package.json`

**Interfaces:**

- Consumes: The required root route map, runtime allowlist, and eleven-role policy from this brief.
- Produces: Executable red tests that later implementation tasks must satisfy.

- [ ] **Step 1: Write the repository path and dependency contract**

  Add Node tests that assert root `index.html`, `style.css`, `app.js`, `tokens.css`, the direct application route, runtime dependencies, and every referenced local URL exist inside the repository.
  Assert no runtime file or route contains `/pb-live/`, no duplicate `pb-live/` implementation exists, and the optional compatibility route is a single redirect.

- [ ] **Step 2: Write the metadata agreement contract**

  Add Playwright coverage for `product-project-manager` as the explicit Shenzhen role and `graphic-designer` as a genuinely remote role.
  Assert the visible hero location, accessible role-detail location, meta description, Open Graph description, and JSON-LD agree.
  Assert physical JSON-LD contains `jobLocation` with the exact canonical string and no remote-only fields.
  Assert remote JSON-LD contains `jobLocationType: "TELECOMMUTE"` plus remote applicant semantics and no physical `jobLocation`.
  Add a table-driven assertion covering all eleven role slugs and exact locations.

- [ ] **Step 3: Write the deployment allowlist contract**

  Assert the packaging script emits only runtime files and excludes `.git`, `.vercel`, tests, evidence, reports, environment files, local artifacts, and private material.
  Assert `NOTION_INTAKE_DRY_RUN=1` is required by the deployment command path.

- [ ] **Step 4: Run the tests and verify RED**

  Run `node --test tests/repository-contract.test.mjs tests/deployment-package.test.mjs`.
  Expected result: assertion failures identify the absent root implementation and deployment package rather than syntax or harness errors.

### Task 2: Import the minimal runtime dependency closure at root

**Files:**

- Create from integrated `pb-live/`: `index.html`, `style.css`, `app.js`, `tokens.css`, `hero-scroll.js`
- Create from integrated shared runtime: `careers/apply/index.html`, `assets/pb-apply.css`, `scripts/careers-apply.js`, `scripts/careers-deadline.js`, `scripts/careers-roles.js`, `scripts/header-scroll.js`
- Create from integrated API runtime: `api/applications.js`, `api/lib/application-payload.js`, `api/lib/notion-client.js`
- Create from integrated assets: `assets/`, `icons/`, `fonts/`, `images/`
- Create: `scripts/dev-server.mjs`
- Create: `vercel.json`

**Interfaces:**

- Consumes: Approved integrated source files and the red repository contract.
- Produces: Root PB page, direct role/application route, range-capable local server, and Vercel runtime configuration.

- [ ] **Step 1: Copy only the traced runtime owners**

  Copy the PB root implementation, eleven PB assets, nine SVG icons, four used fonts, two used brand images, three used logos, the application runtime, and the application API dependency closure.
  Preserve binary bytes and record source SHA-256 values for the final report.

- [ ] **Step 2: Normalize root ownership and URLs**

  Change the PB wordmark home URL to `/`.
  Keep same-page PB anchors as `#themes`, `#brands`, `#people`, and `#careers`.
  Change application-page navigation and back links to `/#themes`, `/#brands`, `/#people`, and `/#careers`.
  Change application stylesheet and script references to root-absolute runtime URLs.
  Change home image and font URLs so every local reference resolves from `/`.
  Configure only one `/pb-live/` redirect to `/` without retaining a nested implementation.

- [ ] **Step 3: Implement the minimal static and API server**

  Serve `/` and `/careers/apply/` from their canonical files.
  Preserve MP4 content type and valid `206` and `416` byte-range behavior.
  Route `/api/applications` through the imported handler with dry-run mode required for local commands.

- [ ] **Step 4: Run repository contracts and verify GREEN**

  Run `node --test tests/repository-contract.test.mjs`.
  Expected result: all root path, dependency completeness, and no-legacy-layout assertions pass.

### Task 3: Implement the captain-approved role-location metadata policy

**Files:**

- Modify: `scripts/careers-apply.js`
- Modify: `careers/apply/index.html`
- Modify: `tests/role-location-metadata.test.mjs`

**Interfaces:**

- Consumes: `window.careerRoles` records whose optional `locationType` is authoritative.
- Produces: One location presentation that feeds visible copy, accessible copy, meta descriptions, Open Graph description, and JobPosting JSON-LD.

- [ ] **Step 1: Run the focused browser test and verify RED**

  Start the local server with `NOTION_INTAKE_DRY_RUN=1 npm run serve`.
  Run `BASE_URL=http://127.0.0.1:49279 node tests/role-location-metadata.test.mjs`.
  Expected result: the Shenzhen page fails because its meta description still claims remote and its physical structured location does not preserve the canonical value consistently.

- [ ] **Step 2: Add one canonical location presentation helper**

  Derive `isRemote`, `displayLabel`, `metadataLabel`, and structured fields from `role.locationType` without inventing city, country, or hybrid data.
  Use exact explicit location wording for physical roles and `Remote` for missing locations.
  Update visible location, role-detail location, meta description, Open Graph description, and JSON-LD from that same presentation.
  Leave the existing `datePosted` expression unchanged.

- [ ] **Step 3: Run the focused browser test and verify GREEN**

  Re-run `BASE_URL=http://127.0.0.1:49279 node tests/role-location-metadata.test.mjs`.
  Expected result: physical Shenzhen and remote Graphic Designer assertions pass, followed by all eleven mapping assertions.

### Task 4: Port approved behavior tests and complete packaging

**Files:**

- Create from and update integrated tests: `tests/pb-integration.test.mjs`, `tests/pb-role-apply.test.mjs`, `tests/careers-apply-submit.test.mjs`, `tests/careers-deadline.test.mjs`, `tests/hero-scroll.test.mjs`, `tests/application-payload.test.mjs`, `tests/applications-api.test.mjs`
- Modify: `package.json`
- Create: `scripts/package-deployment.mjs`
- Create: `.vercelignore`
- Modify: `vercel.json`

**Interfaces:**

- Consumes: Root runtime, application API, existing approved assertions, and deployment contract.
- Produces: Complete focused test commands and a strict deterministic Vercel deployment directory.

- [ ] **Step 1: Port canonical integration tests to root URLs**

  Replace `/pb-live/` with `/` in runtime navigation, expected links, media cancellation classification, and anchor assertions.
  Keep the approved hero endpoints, chips, numbers, section order, Values 01 through 07, Teams, Careers, fallbacks, and runtime diagnostics assertions.

- [ ] **Step 2: Port focused application and API tests**

  Preserve all eleven distinct roles, Monday HKT deadline behavior, required and role-specific fields, uploads, validation, multipart payload, success and error handling, and API dry-run interception.
  Exclude the unrelated protected `/talents/apply/` fixture and its failing legacy server test.

- [ ] **Step 3: Implement and prove the deployment package**

  Build `.vercel-deploy/` from an explicit allowlist of runtime files.
  Copy only the Vercel configuration, API, HTML, CSS, browser JavaScript, fonts, icons, and runtime images/video.
  Run `node --test tests/deployment-package.test.mjs` and inspect the emitted manifest.

- [ ] **Step 4: Run all automated tests**

  Run `npm test` against a dry-run local server.
  Run `node --check` for every production JavaScript and test module.
  Run `git diff --check`.
  Expected result: clean output with no known-unrelated legacy fixture.

### Task 5: Verify the complete UI and run one Impeccable detector pass

**Files:**

- Modify only if genuine migration defects are found: root runtime files and their focused tests.

**Interfaces:**

- Consumes: Complete local root implementation.
- Produces: Browser evidence of functional and visual parity with at most one bounded migration-defect fix pass.

- [ ] **Step 1: Run exact viewport and fallback checks**

  Use `chrome-devtools-axi` against the dry-run local server at 1440 by 900, 1280 by 800, 900 by 800, and 390 by 844.
  Verify no horizontal overflow, clipped settled copy, broken anchors, failed assets, console errors, duplicate IDs, or form submission.
  Verify reduced motion, failed-video, and no-JavaScript fallbacks.

- [ ] **Step 2: Verify assets and media transport**

  Request representative fonts, images, icons, and the hero video.
  Request `Range: bytes=0-1023` and assert status `206`, a valid `Content-Range`, and exactly 1,024 bytes.

- [ ] **Step 3: Run the Impeccable detector exactly once**

  Load the Impeccable audit procedure for `/`, run the session context command once, and run the detector once after UI completion.
  Classify findings against the pinned approved PB system.
  Write a failing regression test before fixing any genuine migration defect, resolve all genuine migration defects in one bounded pass, and do not rerun the detector.

- [ ] **Step 4: Re-run the automated and browser confirmation suite**

  Run `npm test` and one confirmation viewport batch.
  Expected result: all functional and visual migration checks pass.

### Task 6: Complete repository documentation and clean import commit

**Files:**

- Create: `README.md`
- Create or normalize: `.gitignore`
- Create or normalize: `AGENTS.md`
- Create: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: Verified commands, route map, deployment mechanism, safety rules, and production blockers.
- Produces: Accurate project-intrinsic operating documentation and CI.

- [ ] **Step 1: Document operation and safety**

  Document install, local serve, test commands, root and application routes, dry-run application safety, Vercel redesign-A review deployment, and rollback.
  Name unresolved factual `datePosted` as a production blocker.

- [ ] **Step 2: Finalize ignored and excluded surfaces**

  Ignore `.vercel/`, `.vercel-deploy/`, `node_modules/`, local evidence, environment files, generated review artifacts, and browser outputs.
  Confirm excluded old-repository surfaces are absent.

- [ ] **Step 3: Generate concise project memory**

  Run `/Users/ivan/Projects/firstmate/bin/fm-ensure-agents-md.sh .`.
  Keep only project-intrinsic pointers and the required `## Maintaining this file` section.

- [ ] **Step 4: Verify and commit the clean import**

  Run `npm test`, JavaScript syntax checks, `git diff --check`, and `git status --short`.
  Commit every task-owned file as one clean import on `fm/carenbloom-site-pb-bootstrap-sol-b1`.

### Task 7: Drive no-mistakes through green PR and CI

**Files:**

- Pipeline-owned changes only while the no-mistakes run is active.

**Interfaces:**

- Consumes: Committed clean import and the complete accepted task intent.
- Produces: Pushed feature branch, PR URL, review/test/docs/lint results, and green CI without merging.

- [ ] **Step 1: Inspect the current gate state and CLI help**

  Run `no-mistakes axi` and `no-mistakes axi run --help`.
  Confirm there is no current-branch active run requiring reattachment.

- [ ] **Step 2: Start with complete accepted intent**

  Build the `--intent` value from the Task section of the launch brief plus every accepted task-specific constraint, exclusion, and decision recorded during execution, then run `no-mistakes axi run --intent "$task_intent"` without `--yes`.
  The value must preserve the root architecture, approved metadata policy, unresolved `datePosted`, dry-run safety, redesign-A reuse, and no-merge boundary.

- [ ] **Step 3: Drive every non-user gate**

  Respond to auto-fix findings through `no-mistakes axi respond` only.
  Never hand-edit while the run owns the worktree.
  Escalate any `ask-user` finding to Firstmate with a `needs-decision` status and stop until resolved.

- [ ] **Step 4: Stop pipeline driving at checks-passed**

  Record the exact PR URL, final green commit, pipeline fixes, and CI result.
  Do not merge the PR.

### Task 8: Safely update the existing redesign-A review target

**Files:**

- External write after green CI: existing Vercel project `carenbloom-redesign-a` only.
- External report: `/Users/ivan/Projects/firstmate/data/carenbloom-site-pb-bootstrap-sol-b1/report.md`

**Interfaces:**

- Consumes: Exact green branch head and `.vercel-deploy/` allowlist.
- Produces: Stable `https://carenbloom-redesign-a.vercel.app/` serving the green head with dry-run application safety.

- [ ] **Step 1: Inspect current Vercel help and project state**

  Consult current Vercel CLI help.
  Read the existing `carenbloom-redesign-a` identity, aliases, Git linkage, environment variables, and current rollback deployment without changing them.

- [ ] **Step 2: Prove the safe update path**

  Verify the deployed environment has `NOTION_INTAKE_DRY_RUN=1` without exposing values or secrets.
  If Git-linked to the old repository, use only a supported reversible Vercel/Git integration operation to reconnect it to `withally-inc/carenbloom-site-pb`.
  If the Git link cannot be proven safe, append an exact blocked status and stop before deployment.

- [ ] **Step 3: Deploy the exact green head from the allowlist**

  Rebuild the allowlist from the exact green commit and deploy it to the existing project.
  Assign only the existing stable redesign-A alias.
  Create no project, alias, custom domain, or production deployment.

- [ ] **Step 4: Verify the public review origin**

  Use `chrome-devtools-axi` to verify the root page, representative assets, font, video byte range, all eleven role URLs, one physical role, one remote role, dynamic location metadata, light application surface, and zero failed resources.
  Verify dry-run configuration without submitting the form.

- [ ] **Step 5: Write the durable report and done status**

  Record the source/import manifest and exclusions, path migration table, metadata policy and tests, no-mistakes PR and CI result, stable URL, deployment ID, exact commit, project and Git linkage, dry-run proof, public verification, unresolved `datePosted`, rollback procedure, and provenance PR.
  Append a done line containing the exact full PR URL followed by `checks green; https://carenbloom-redesign-a.vercel.app/ serves exact green head safely` only when both gates are true.

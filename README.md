# Care and Bloom site

This repository is the canonical source for carenbloom.com: the home page, the careers page, the direct role application page, and the role-state and application APIs behind them.

The v4 site (redesign by Melriver, November 2026) replaced the Pattern Breaking v3 front end.
The v3 pages, tests and evidence remain in the Git history before this change.

## Layout

| Path | Owner |
| --- | --- |
| `site-src/` | Source of the v4 site: Vite, TypeScript, Tailwind v4, GSAP. Sections live in `site-src/src/sections/`, copy decisions in `site-src/docs/COPY.md`. |
| repository root (`index.html`, `careers/`, `404.html`, `assets/`, `img/`, `brand/`, `fonts/`, favicons, `og*.png`) | Built output of `site-src/`, served by Cloudflare Pages and Vercel. Never edit it by hand: change `site-src/` and run `npm run build:site`. |
| `api/`, `functions/api/`, `scripts/careers-roles.js`, `scripts/api-endpoints.js` | Role-state and application runtime, unchanged by the v4 front end. |

## Routes

| Route | Owner |
| --- | --- |
| `/` | Home |
| `/careers/` | Open roles, listed from `/api/role-state` |
| `/careers/apply/?role=<slug>` | Authoritative open, closed, unknown, or unavailable state for one canonical role, with its JobPosting metadata |
| `/visit/hong-kong/` | Unlisted Hong Kong visitor guide; static `noindex, follow`, absent from navigation and sitemaps |
| `/robots.txt` | Plain-text crawl policy for all user agents: allows `/` and disallows `/api/`; source: `site-src/public/robots.txt` |
| `/api/role-state` | Non-cacheable canonical role lifecycle and open-role collection API |
| `/api/applications` | Same-origin Cloudflare relay to the Vercel application intake API |
| `/pb-live` and `/pb-live/` | Compatibility redirects to `/` |
| `/talents` and `/talents/` | Compatibility redirects to `/careers/`, preserving queries |
| `/#careers` | Careers footer anchor with a direct link to openings |

The application form submits only when served from `carenbloom.com` or `www.carenbloom.com`; on every other host it stays fail-closed and sends nothing.

## Changing the site

Use Node.js 22.12 or newer and pnpm 10.20.0, pinned in `site-src/package.json`.
The source package permits dependency install scripts only for Sharp and esbuild.
The build commands use npm to invoke that exact pnpm version without a global installation.

```sh
npm run build:site
```

`scripts/build-site.mjs` installs `site-src/` dependencies when needed, defaults to `VITE_SITE_URL=https://carenbloom.com`, and replaces the built entries at the repository root.
It refuses to overwrite any runtime owner (`api/`, `functions/`, `scripts/`, `tests/`, configuration).
For a live-reloading preview of the source alone, run `pnpm dev` inside `site-src/`.
Vite proxies `/api` to production according to `site-src/vite.config.ts`; use `npm run serve` below for the isolated dry-run runtime.

Run `npm run check:site` to check output without publishing.
It copies build inputs into a temporary directory inside the worktree, installs clean dependencies with the frozen lockfile and pinned pnpm, and builds twice with the production site URL.
Both builds must be byte-identical and match every published file, including file additions and removals.
The check runs as part of `npm test` and removes its temporary build directory afterward.

## Local development and tests

```sh
npm ci
npm run serve
```

The local server listens on `http://127.0.0.1:49279` by default and starts with `NOTION_INTAKE_DRY_RUN=1` through the package script. Do not bypass the package script with a real Notion configuration during review work.

Run the complete self-contained suite with:

```sh
npm test
```

The test command starts its own isolated dry-run server and checks published HTML and its direct asset references, same-origin API calls from the built client, server-authoritative role state on both runtimes, the transparent Cloudflare relay, payload mapping, API closure, and health checks.
Browser fixtures intercept every request, serve local build bytes at isolated production and preview origins, and mock submissions.
They cover required answers, role-specific uploads, multipart bytes, upload limits, duplicate submissions, recovery, preview guards, deadlines, accepted receipts after closure, synchronized counts, collection boundaries, and per-role indexability.
Home and careers remain indexable.
The shared apply template has no role canonical or active `JobPosting`; confirmed openings receive per-role metadata, while unknown, closed, and unavailable states set `noindex`.

No automated test performs a real application or Notion write.

After the fix branch deploys, run `PREVIEW_URL=https://<deployment>.care-and-bloom.pages.dev npm run test:preview` against that exact preview.
This checks real redirect status, destination, preserved queries, rendered pages, a genuine 404, same-origin endpoint availability, role metadata, and the preview submission guard.
An additional request interceptor blocks every application POST even if that guard fails.
Fixture-only zero, outage, no-script, and boundary scenarios remain in the local suite.

## Canonical role data and lifecycle

`scripts/careers-roles.js` is the authoritative owner of every role record, their optional physical locations, homepage groups, and any factual `closesAt` or explicit `inactive` or `filled` state.

`api/_lib/role-state.js` is the one server-safe lifecycle resolver used by `/api/role-state`, `/api/applications`, and the boundary tests.

It accepts an injected server instant and resolves the HKT Monday window start, HKT `datePosted`, the default close exactly fourteen days later, the earlier effective factual close, the next refresh boundary, and `isOpen`.

`api/_lib/role-state-response.js` projects that canonical lifecycle into the non-cacheable collection and single-role JSON contract shared by the Cloudflare and Vercel handlers.

`functions/api/role-state.js` supplies the production browser with that response from the same-origin Cloudflare Pages route and a captured server instant.

`api/role-state.js` keeps the equivalent Vercel endpoint available for review deployments and direct consumers.

`scripts/api-endpoints.js` remains available to legacy consumers with its explicit endpoint overrides.
The v4 browser calls `/api/role-state` and `/api/applications` same-origin directly and does not use those overrides.

`functions/api/applications.js` accepts the production browser request on Cloudflare Pages and streams its unchanged method, headers, and multipart body to `https://carenbloom-site-pb.vercel.app/api/applications`.

It returns the Vercel response unchanged, so `api/applications.js` remains the single owner of method handling, application CORS, Busboy parsing, upload limits, validation, lifecycle rejection, dry-run behavior, and Notion access.

The direct Vercel endpoint remains available to the `carenbloom-redesign-a` review deployment and existing consumers.

The `/api/health` cron probes the applicant-facing `${SITE_URL}/api/applications` route with a deliberately incomplete payload, so a broken relay alerts instead of reporting healthy and no Notion record is ever created.

`api/_lib/cors.js` keeps owning the direct Vercel functions' browser-origin allowlist: both functions echo an `Origin` of `https://carenbloom.com` or `https://www.carenbloom.com` back as `Access-Control-Allow-Origin`, always send `Vary: Origin`, and grant no other origin.

The Cloudflare application relay forwards that `Origin` header and does not add or widen CORS policy.

The shared collection owner refreshes home and careers counts at the server's `nextBoundaryAt`, including when no roles are open.
Every response updates desktop navigation, the mobile menu, the footer state, and the careers list without reloading the page.

The application countdown anchors its role response to monotonic elapsed time.
The dedicated careers page renders role rows and advertised counts from the same collection response.

Static collection surfaces make no numeric availability claim.
A collection failure removes stale counts and role rows; zero openings displays the confirmed zero state.
An unknown, closed, or unavailable application hides the form and exposes no active `JobPosting` or indexable role metadata.
A confirmed open role sets canonical and `og:url` to its production URL with `/careers/apply/?role=<slug>`.

`/api/applications` resolves the same canonical role state using its own server clock before any Notion operation, returns HTTP 410 at and after factual closure, and ignores client-supplied date or open-state claims.

Roles with an explicit physical `locationType` use that exact string in visible role copy, accessible role details, meta descriptions, Open Graph descriptions, and physical JobPosting data.

Roles without an explicit physical location are genuinely remote and use `Remote` wording with `TELECOMMUTE` structured semantics.

The implementation does not invent city, country, or hybrid data, so remote postings emit no `applicantLocationRequirements`.

Google requires a factual applicant-country restriction alongside `TELECOMMUTE` for remote-job rich results, so those roles are not yet eligible; the real hiring-eligible countries must be decided and added to the role records before that eligibility can be claimed.

`careers/apply/index.html` is one shared template for every role URL, so its static markup starts in a neutral availability-checking state and keeps role content and the form hidden until server authority confirms an open role.

Crawlers that do not execute JavaScript therefore never see a location, title, requirement, date, availability claim, application form, or active `JobPosting` asserted for a role.

## Vercel review deployment

The only authorized review target is the existing Vercel project `carenbloom-redesign-a` and stable URL https://carenbloom-redesign-a.vercel.app/.

Create the strict runtime deployment directory with:

```sh
npm run package:deployment
```

The generated `.vercel-deploy/` directory contains only runtime HTML, CSS, browser JavaScript, API files, fonts, favicons, icons, images, video, `robots.txt`, a minimal runtime package manifest, and Vercel configuration.

It excludes Git data, Vercel link state, tests, evidence, reports, environment files, local artifacts, and private material.

Before any review deployment, inspect current Vercel CLI help and the existing project configuration, prove the project identity and Git link, and verify `NOTION_INTAKE_DRY_RUN=1` in the deployed environment.

Never create another Vercel project or alias, add a custom domain, deploy to the Care and Bloom production project, or touch `carenbloom-site2.vercel.app`.

The `deploy:review` command sets `NOTION_INTAKE_DRY_RUN=1` only for the local packaging process; it does not configure the deployed function environment and proves nothing about it.

Deployed dry-run safety comes exclusively from the `NOTION_INTAKE_DRY_RUN=1` environment variable on the `carenbloom-redesign-a` Vercel project, which the operator must set and verify in that project before publishing, in addition to linking the generated directory to the exact existing project and assigning only the existing stable alias.

This repository deliberately keeps `vercel.json` free of a pinned dry-run value so the same source stays production-capable.

For rollback, identify the deployment that served `carenbloom-redesign-a.vercel.app` before the update and use the current Vercel rollback command for that exact project and deployment.

Never guess a deployment identifier or roll back another Care and Bloom project.

## Production blocker

One separately deferred blocker remains open and must be resolved and tested before this site is promoted to production.

### Server-side enforcement of required application answers, resume, and portfolio

`/api/applications` validates only the answers, resume, and portfolio material the client chooses to send: a direct POST that omits `questions` still passes validation, and `portfolioRequired` is not enforced server-side even though `scripts/careers-roles.js` already carries the canonical questions and portfolio flags the handler uses for `introVideoRequired`.

The captain deliberately deferred this work because publishing comes first and equivalent enforcement exists elsewhere.
Automated review submissions use mocks or the isolated dry-run server.
Preview-host application forms send nothing; the production relay retains its production intake behavior.

# Care and Bloom site

This repository is the canonical source for carenbloom.com: the home page, the careers page, the direct role application page, and the role-state and application APIs behind them.

The v4 site (redesign by Melriver, November 2026) replaced the Pattern Breaking v3 front end. The v3 pages, tests and evidence remain in the Git history before this change.

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
| `/careers` | Open roles, listed from `/api/role-state` |
| `/careers/apply?role=<slug>` | Authoritative open, closed, unknown, or unavailable state for one canonical role, with its JobPosting metadata |
| `/api/role-state` | Non-cacheable canonical role lifecycle and open-role collection API |
| `/api/applications` | Same-origin Cloudflare relay to the Vercel application intake API |
| `/pb-live/` | Compatibility redirect to `/` |

The application form submits only when served from `carenbloom.com` or `www.carenbloom.com`; on every other host it stays fail-closed and sends nothing.

## Changing the site

Use Node.js 22 or newer and pnpm.

```sh
npm run build:site
```

`scripts/build-site.mjs` installs `site-src/` dependencies when needed, builds it with `VITE_SITE_URL=https://carenbloom.com`, and replaces the built entries at the repository root. It refuses to overwrite any runtime owner (`api/`, `functions/`, `scripts/`, `tests/`, configuration). For a live-reloading preview of the source alone, run `pnpm dev` inside `site-src/` (its `/api` calls then need the local server below).

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

The test command starts its own isolated dry-run server and covers the published site (every page present, every local asset reference resolvable, no noindex, canonical production URLs, same-origin APIs), server-authoritative role state on both the Cloudflare Pages and Vercel runtimes, the transparent Cloudflare application relay, application payload and API closure behavior, the health check, and a browser pass over home, careers, a real role with its JobPosting, and an unknown role.

No automated test performs a real application or Notion write.

## Canonical role data and lifecycle

`scripts/careers-roles.js` is the authoritative owner of every role record, their optional physical locations, homepage groups, and any factual `closesAt` or explicit `inactive` or `filled` state.

`api/_lib/role-state.js` is the one server-safe lifecycle resolver used by `/api/role-state`, `/api/applications`, and the boundary tests.

It accepts an injected server instant and resolves the HKT Monday window start, HKT `datePosted`, the default close exactly fourteen days later, the earlier effective factual close, the next refresh boundary, and `isOpen`.

`api/_lib/role-state-response.js` projects that canonical lifecycle into the non-cacheable collection and single-role JSON contract shared by the Cloudflare and Vercel handlers.

`functions/api/role-state.js` supplies the production browser with that response from the same-origin Cloudflare Pages route and a captured server instant.

`api/role-state.js` keeps the equivalent Vercel endpoint available for review deployments and direct consumers.

`scripts/api-endpoints.js` resolves `/api/role-state` and `/api/applications` same-origin on every host, while honouring explicit `window.CB_ROLE_STATE_ENDPOINT` and `window.CB_TALENTS_ENDPOINT` overrides.

`functions/api/applications.js` accepts the production browser request on Cloudflare Pages and streams its unchanged method, headers, and multipart body to `https://carenbloom-site-pb.vercel.app/api/applications`.

It returns the Vercel response unchanged, so `api/applications.js` remains the single owner of method handling, application CORS, Busboy parsing, upload limits, validation, lifecycle rejection, dry-run behavior, and Notion access.

The direct Vercel endpoint remains available to the `carenbloom-redesign-a` review deployment and existing consumers.

The `/api/health` cron probes the applicant-facing `${SITE_URL}/api/applications` route with a deliberately incomplete payload, so a broken relay alerts instead of reporting healthy and no Notion record is ever created.

`api/_lib/cors.js` keeps owning the direct Vercel functions' browser-origin allowlist: both functions echo an `Origin` of `https://carenbloom.com` or `https://www.carenbloom.com` back as `Access-Control-Allow-Origin`, always send `Vary: Origin`, and grant no other origin.

The Cloudflare application relay forwards that `Origin` header and does not add or widen CORS policy.

The homepage reloads on the collection's `nextBoundaryAt`, which the API resolves from the canonical roles even when nothing is currently open.

The application countdown anchors that server instant to monotonic elapsed time, and the homepage renders every role row and advertised count from the same open-role response.

Static, unknown, closed, and endpoint-failure states contain no form, active `JobPosting`, role row, numeric open-role claim, or fallback role.

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

The generated `.vercel-deploy/` directory contains only runtime HTML, CSS, browser JavaScript, API files, fonts, favicons, icons, images, video, a minimal runtime package manifest, and Vercel configuration.

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

The captain deliberately deferred this work because publishing comes first and equivalent enforcement exists elsewhere. Review traffic is dry-run-only, so no incomplete application can reach Notion today.

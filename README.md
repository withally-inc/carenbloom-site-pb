# Care and Bloom Pattern Breaking site

This private repository is the canonical source for the approved Care and Bloom Pattern Breaking home and direct role application experience.

The site was imported cleanly from the integrated implementation at `withally-inc/carenbloom-site2` commit `c720871` without that repository's history, legacy pages, experiments, reports, screenshots, or deployment wrappers.

The provenance integration remains available at https://github.com/withally-inc/carenbloom-site2/pull/10 and must not be modified from this repository.

## Routes

| Route | Owner |
| --- | --- |
| `/` | Pattern Breaking home |
| `/careers/apply/?role=<slug>` | Authoritative open, closed, unknown, or unavailable state for one canonical role |
| `/api/role-state` | Non-cacheable canonical role lifecycle and open-role collection API |
| `/api/applications` | Same-origin Cloudflare relay to the Vercel application intake API |
| `/pb-live/` | Compatibility redirect to `/`; no duplicate implementation exists |

Application-page navigation returns to `/#themes`, `/#brands`, `/#people`, and `/#careers`.

## Local development

Use Node.js 22 or newer.

```sh
npm install
npm run serve
```

The local server listens on `http://127.0.0.1:49279` by default, serves byte-range video requests, and starts with `NOTION_INTAKE_DRY_RUN=1` through the package script.

Do not bypass the package script with a real Notion configuration during review work.

Run the complete self-contained suite with:

```sh
npm test
```

The test command starts its own isolated dry-run server and covers repository paths, dependency completeness, the approved favicon assets and their declarations, deployment packaging, hero behavior, slow-mobile homepage performance, the homepage opening reveal sequence, the single-line values heading, the footer sign-off wordmark, floating navigation, server-authoritative Monday HKT role state on both the Cloudflare Pages and Vercel runtimes, the transparent Cloudflare application relay, application payload and API closure behavior, all eleven role routes, location metadata, form validation and multipart submission, per-file and combined upload size limits, responsive layouts, reduced motion, failed-video behavior, and fail-closed no-JavaScript fallbacks.

Focused commands are also available:

```sh
npm run test:contracts
npm run test:api
npm run test:deadline
npm run test:role-state
npm run test:cloudflare-role-state
npm run test:cloudflare-applications
BASE_URL=http://127.0.0.1:49279 npm run test:metadata
BASE_URL=http://127.0.0.1:49279 npm run test:browser
```

The focused browser commands expect `npm run serve` to be running separately.

No automated test performs a real application or Notion write.

## Typography

The production type system is self-hosted PP Mori for display roles and body copy, with Azeret Mono for utility text.

PP Mori ships in regular and semibold weights, and `fonts/AzeretMono-VF.ttf` remains the exact utility-face runtime binary with its SIL Open Font License 1.1 text beside it as `fonts/OFL-AzeretMono.txt`.

The homepage header brand is no longer type: it renders the Care & Bloom SVG lockup, and the mobile navigation keeps that lockup whole at 320px by tightening the two-item gap and narrowing the mark to 114px.
The shared application page still carries the Azeret Mono text mark.

`tests/repository-contract.test.mjs` owns the font and licence dependency contract, and `tests/nav-float-browser.test.mjs` pins the complete mobile mark before and after the bar floats.

## Favicon

Both HTML entry points — the home page and the shared application page — carry the captain-approved Care & Bloom flower icon, which replaced the earlier full-wordmark favicon that was illegible at tab size.

Five durable assets ship from the repository root: `favicon.svg`, the optically strengthened `favicon-16.png`, `favicon-32.png`, `favicon-512.png`, and `apple-touch-icon-180.png`.

Every head declares all five, and no web app manifest is used.

The assets are approved artwork rather than build output, so they are pinned by SHA-256 and must not be regenerated or re-exported; `tests/repository-contract.test.mjs` owns those hashes and the exact declarations, `tests/deployment-package.test.mjs` proves all five reach the deployment tree, and `tests/pb-integration.test.mjs` proves each one resolves in a real browser on both pages.

## Homepage opening sequence

The home page does not arrive fully formed.
First paint is the type alone — wordmark, claim, and topbar — while the hero art side holds its reserved blank box, so nothing shifts when the art arrives.
After the existing readiness moment (fonts plus the bud frame) the wordmark keeps a 600ms beat, the art then emerges over 1200ms, and only once it has settled do the five satellite cards earn their entrances one at a time from scroll progress: hero first, cards second, never both at once.

`prefers-reduced-motion: reduce` presents everything immediately at rest.
A visitor who lands mid-page, follows a deep anchor, or reloads scrolled down is shown the already-earned state rather than a re-performed ceremony.
The pre-reveal hidden states exist only under a runtime-granted `.js-live` class with a 4s in-page release, so blocked, failed, or disabled JavaScript prints the page whole and the reveal can never trap content.

`tests/hero-reveal-browser.test.mjs` owns the behavioral contract and runs inside `npm test` and `npm run test:browser`.

## Homepage performance

The home page is tuned for a cold visit on a slow mobile connection, and `evidence/perf-slow-mobile-p1/README.md` holds the measured same-profile before and after baseline, the per-request waterfall, and the visual-quality crops.

`critical.css` is the only render-blocking stylesheet and is a generated minification of the whole of `style.css`, so no section can paint unstyled and deep anchors and restored scroll positions calculate against final geometry.
It must be regenerated whenever `style.css` changes, and `tests/repository-contract.test.mjs` fails when the two carry different rules.
`style.css` itself is loaded deferred on every path as the readable source of record.

Photographic stills ship as AVIF `<picture>` sources with narrow-viewport variants, and the original PNGs remain as fallbacks, so the design is unchanged where AVIF is unsupported.

The 1.8MB hero grow video is not fetched at all under `prefers-reduced-motion: reduce`, Save-Data, a viewport of 767px or narrower, or a `slow-2g`, `2g`, or `3g` connection — `shouldLoadHeroVideo` in `hero-scroll.js` owns that decision.
Those visits scrub the static bud and bloom stills instead, and a video that is fetched and then fails still falls back to the same stills.

`tests/hero-performance-browser.test.mjs` owns this contract and runs inside `npm test`.

## Operating-record lemon band

The (01) Operating record section carries the captain-approved Candidate 03 stepped lemon march (decision: five whole leafless lemons on exact `--color-sun` `#FDFF6D`, distinct stepped rotational phases, left-to-right), replacing the earlier dot-field mechanism.

`assets/lemon-march/lemon-rotation-sprite.png` holds all ten stepped rotational keyframes in one 3600×360 sheet, derived from the approved motion proof with the baked contact-shadow fringe removed at the alpha source. Each lemon picks its phase with `object-position` on a square `object-fit: cover` frame, so a phase step is a paint-only change with no refetch; translation is delta-time-based and transform-only, and the loop pauses offscreen and when the document is hidden.

The markup's default `object-position` values hold the five distinct phase offsets `[0,2,4,6,8]`, so a script failure leaves the static five-phase composition intact. `prefers-reduced-motion: reduce` swaps every lemon to `assets/lemon-march/lemon-print-master-static.png` (the static Candidate 03 print master) via `<picture>` sources, with no translation, rotation, or autoplaying media. The band has one concise `role="img"` description; the five lemons are `aria-hidden`.

The band keeps the approved 1400×500 proof aspect but caps its height so the first stat row's numbers are above the fold when the record section enters at desktop; `style.css` owns the exact caps (a 40vh cap, tightened on short desktops by an explicit entry reserve). Lemons are sized off the band height rather than its width, so the cap shrinks the march proportionally instead of clipping it, and mobile is unchanged because the proof aspect still governs below the cap. `tests/pb-integration.test.mjs` pins the above-the-fold, no-overlap, in-band, and legibility guarantees at 1440×900, 1280×800, and 390×844.

Focused behavioral coverage lives in `tests/lemon-band.test.mjs` (distinct phases, pause/resume, offscreen and hidden-document suspension, reduced-motion and failure fallbacks, exact yellow, overflow, stat-band preservation) and runs inside `npm test` and `npm run test:browser`.

## Footer sign-off wordmark

The page closes on the real Care & Bloom SVG lockup, rendered from the same inline `currentColor` symbol as the header brand and announced once by screen readers.

The sign-off is intentionally flat, static, and always visible: it carries no arrival motion, no observer, and no prepared or hidden state.
Every arrival path — a gradual scroll down, a restored-scroll reload, a `/#contact` landing, a history back navigation, reduced motion, and disabled or blocked JavaScript — renders the same finished sign-off, so it can never be caught mid-transition or stranded out of view.
Its oversized scale, subtle bottom crop, cobalt fill, and viewport-filling fit are owned entirely by the stylesheet.

`tests/footer-wordmark.test.mjs` owns the behavioral contract — inline SVG, single announcement, no raster request, no animation or transition on any of those arrival paths, the sign-off rendered from `critical.css` alone, and an overflow-free edge-to-edge fit from 320px to 2560px — and runs inside `npm test` and `npm run test:browser`.
`evidence/logo-header-footer-l2/README.md` holds the current before/after evidence, sizing, and breakpoint declarations for the lockup; `evidence/footer-wordmark-f1/README.md` remains the earlier type-era record of the divergences from the Mobbin reference.

## Canonical role data and lifecycle

`scripts/careers-roles.js` is the authoritative owner of all eleven role records, their optional physical locations, homepage groups, and any factual `closesAt` or explicit `inactive` or `filled` state.

`api/_lib/role-state.js` is the one server-safe lifecycle resolver used by `/api/role-state`, `/api/applications`, and the boundary tests.

It accepts an injected server instant and resolves the HKT Monday window start, HKT `datePosted`, the default close exactly fourteen days later, the earlier effective factual close, the next refresh boundary, and `isOpen`.

`api/_lib/role-state-response.js` projects that canonical lifecycle into the non-cacheable collection and single-role JSON contract shared by the Cloudflare and Vercel handlers.

`functions/api/role-state.js` supplies the production browser with that response from the same-origin Cloudflare Pages route and a captured server instant.

`api/role-state.js` keeps the equivalent Vercel endpoint available for review deployments and direct consumers.

`scripts/api-endpoints.js` resolves `/api/role-state` and `/api/applications` same-origin on every host, while honouring explicit `window.CB_ROLE_STATE_ENDPOINT` and `window.CB_TALENTS_ENDPOINT` overrides.

`functions/api/applications.js` accepts the production browser request on Cloudflare Pages and streams its unchanged method, headers, and multipart body to `https://carenbloom-site-pb.vercel.app/api/applications`.

It returns the Vercel response unchanged, so `api/applications.js` remains the single owner of method handling, application CORS, Busboy parsing, upload limits, validation, lifecycle rejection, dry-run behavior, and Notion access.

The direct Vercel endpoint remains available to the `carenbloom-redesign-a` review deployment and existing consumers.

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

`careers/apply/index.html` is one shared template for all eleven role URLs, so its static markup starts in a neutral availability-checking state and keeps all role content and the form hidden until server authority confirms an open role.

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

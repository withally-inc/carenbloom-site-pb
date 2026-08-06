# Care and Bloom Pattern Breaking site

This private repository is the canonical source for the approved Care and Bloom Pattern Breaking home and direct role application experience.

The site was imported cleanly from the integrated implementation at `withally-inc/carenbloom-site2` commit `c720871` without that repository's history, legacy pages, experiments, reports, screenshots, or deployment wrappers.

The provenance integration remains available at https://github.com/withally-inc/carenbloom-site2/pull/10 and must not be modified from this repository.

## Routes

| Route | Owner |
| --- | --- |
| `/` | Pattern Breaking home |
| `/careers/apply/?role=<slug>` | Continuous role details and application form for one of eleven canonical roles |
| `/api/applications` | Application intake API |
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

The test command starts its own isolated dry-run server and covers repository paths, dependency completeness, deployment packaging, hero behavior, the homepage opening reveal sequence, the footer sign-off wordmark, floating navigation, Monday HKT deadlines, application payload and API behavior, all eleven role routes, location metadata, form validation and multipart submission, responsive layouts, reduced motion, failed-video behavior, and no-JavaScript fallbacks.

Focused commands are also available:

```sh
npm run test:contracts
npm run test:api
npm run test:deadline
BASE_URL=http://127.0.0.1:49279 npm run test:metadata
BASE_URL=http://127.0.0.1:49279 npm run test:browser
```

The focused browser commands expect `npm run serve` to be running separately.

No automated test performs a real application or Notion write.

## Typography

The production type system is self-hosted Syne for display roles, PP Mori for body copy, and Azeret Mono for utility text.

`fonts/Syne-VF.ttf` and `fonts/AzeretMono-VF.ttf` are the exact runtime binaries, with their SIL Open Font License 1.1 texts beside them as `fonts/OFL-Syne.txt` and `fonts/OFL-AzeretMono.txt`.

The mobile navigation keeps the Azeret Mono Care & Bloom mark whole at 320px by tightening the two-item gap and setting the mark at a legible 12px with slight negative tracking.

`tests/repository-contract.test.mjs` owns the font and licence dependency contract, and `tests/nav-float-browser.test.mjs` pins the complete mobile mark before and after the bar floats.

## Homepage opening sequence

The home page does not arrive fully formed.
First paint is the type alone — wordmark, claim, and topbar — while the hero art side holds its reserved blank box, so nothing shifts when the art arrives.
After the existing readiness moment (fonts plus the bud frame) the wordmark keeps a 600ms beat, the art then emerges over 1200ms, and only once it has settled do the five satellite cards earn their entrances one at a time from scroll progress: hero first, cards second, never both at once.

`prefers-reduced-motion: reduce` presents everything immediately at rest.
A visitor who lands mid-page, follows a deep anchor, or reloads scrolled down is shown the already-earned state rather than a re-performed ceremony.
The pre-reveal hidden states exist only under a runtime-granted `.js-live` class with a 4s in-page release, so blocked, failed, or disabled JavaScript prints the page whole and the reveal can never trap content.

`tests/hero-reveal-browser.test.mjs` owns the behavioral contract and runs inside `npm test` and `npm run test:browser`.

## Operating-record lemon band

The (01) Operating record section carries the captain-approved Candidate 03 stepped lemon march (decision: five whole leafless lemons on exact `--color-sun` `#FDFF6D`, distinct stepped rotational phases, left-to-right), replacing the earlier dot-field mechanism.

`assets/lemon-march/lemon-rotation-sprite.png` holds all ten stepped rotational keyframes in one 3600×360 sheet, derived from the approved motion proof with the baked contact-shadow fringe removed at the alpha source. Each lemon picks its phase with `object-position` on a square `object-fit: cover` frame, so a phase step is a paint-only change with no refetch; translation is delta-time-based and transform-only, and the loop pauses offscreen and when the document is hidden.

The markup's default `object-position` values hold the five distinct phase offsets `[0,2,4,6,8]`, so a script failure leaves the static five-phase composition intact. `prefers-reduced-motion: reduce` swaps every lemon to `assets/lemon-march/lemon-print-master-static.png` (the static Candidate 03 print master) via `<picture>` sources, with no translation, rotation, or autoplaying media. The band has one concise `role="img"` description; the five lemons are `aria-hidden`.

The band keeps the approved 1400×500 proof aspect but caps its height so the first stat row's numbers are above the fold when the record section enters at desktop; `style.css` owns the exact caps (a 40vh cap, tightened on short desktops by an explicit entry reserve). Lemons are sized off the band height rather than its width, so the cap shrinks the march proportionally instead of clipping it, and mobile is unchanged because the proof aspect still governs below the cap. `tests/pb-integration.test.mjs` pins the above-the-fold, no-overlap, in-band, and legibility guarantees at 1440×900, 1280×800, and 390×844.

Focused behavioral coverage lives in `tests/lemon-band.test.mjs` (distinct phases, pause/resume, offscreen and hidden-document suspension, reduced-motion and failure fallbacks, exact yellow, overflow, stat-band preservation) and runs inside `npm test` and `npm run test:browser`.

## Footer sign-off wordmark

The page closes on an oversized `Care & Bloom` sign-off set in live, selectable Syne rather than the earlier raster halftone image, so it inherits the site type system, scales without a bitmap, and is announced once by screen readers.

The wordmark is present by default and arrives with a one-shot scroll-triggered transform-and-opacity motion in the homepage's unhurried character; it never loops.
`prefers-reduced-motion: reduce` and disabled, blocked, or failed JavaScript all leave it fully visible at rest, and the motion is armed only after the wordmark has been observed offscreen, so an already-painted sign-off is never retroactively hidden.

`tests/footer-wordmark.test.mjs` owns the behavioral contract — text, single announcement, no raster request, arrival, reduced-motion and no-JavaScript rest states, and an overflow-free edge-to-edge fit from 320px to 2560px — and runs inside `npm test` and `npm run test:browser`.
`evidence/footer-wordmark-f1/README.md` holds the captured evidence and the honest divergences from the Mobbin reference.

## Role-location metadata

`scripts/careers-roles.js` is the authoritative owner of all eleven role records.

The application page and `/api/applications` both import that module, so the API rejects unknown role slugs and decides the intro-video requirement from the canonical record rather than from client input.

Roles with an explicit physical `locationType` use that exact string in visible role copy, accessible role details, meta descriptions, Open Graph descriptions, and physical JobPosting data.

Roles without an explicit physical location are genuinely remote and use `Remote` wording with `TELECOMMUTE` structured semantics.

The implementation does not invent city, country, or hybrid data, so remote postings emit no `applicantLocationRequirements`.

Google requires a factual applicant-country restriction alongside `TELECOMMUTE` for remote-job rich results, so those roles are not yet eligible; the real hiring-eligible countries must be decided and added to the role records before that eligibility can be claimed.

`careers/apply/index.html` is one shared template for all eleven role URLs, so its static markup is role-agnostic throughout: the meta description, the Open Graph description, the visible location line, the accessible Location and Level entries, the role title, summary, mission, responsibilities, requirements, and the hidden role field all carry neutral placeholder copy rather than any single role's data.

Crawlers that do not execute JavaScript therefore never see a location, title, or requirement asserted for the wrong role; browsers receive the canonical per-role copy and metadata at runtime.

## Vercel review deployment

The only authorized review target is the existing Vercel project `carenbloom-redesign-a` and stable URL https://carenbloom-redesign-a.vercel.app/.

Create the strict runtime deployment directory with:

```sh
npm run package:deployment
```

The generated `.vercel-deploy/` directory contains only runtime HTML, CSS, browser JavaScript, API files, fonts, icons, images, video, a minimal runtime package manifest, and Vercel configuration.

It excludes Git data, Vercel link state, tests, evidence, reports, environment files, local artifacts, and private material.

Before any review deployment, inspect current Vercel CLI help and the existing project configuration, prove the project identity and Git link, and verify `NOTION_INTAKE_DRY_RUN=1` in the deployed environment.

Never create another Vercel project or alias, add a custom domain, deploy to the Care and Bloom production project, or touch `carenbloom-site2.vercel.app`.

The `deploy:review` command sets `NOTION_INTAKE_DRY_RUN=1` only for the local packaging process; it does not configure the deployed function environment and proves nothing about it.

Deployed dry-run safety comes exclusively from the `NOTION_INTAKE_DRY_RUN=1` environment variable on the `carenbloom-redesign-a` Vercel project, which the operator must set and verify in that project before publishing, in addition to linking the generated directory to the exact existing project and assigning only the existing stable alias.

This repository deliberately keeps `vercel.json` free of a pinned dry-run value so the same source stays production-capable.

For rollback, identify the deployment that served `carenbloom-redesign-a.vercel.app` before the update and use the current Vercel rollback command for that exact project and deployment.

Never guess a deployment identifier or roll back another Care and Bloom project.

## Production blockers

Two named blockers remain open. Neither is addressed by any change in this repository, and both must be resolved and tested before this site is promoted to production.

### 1. Unresolved factual `datePosted` policy

The factual `datePosted` policy for JobPosting structured data is unresolved.

The integrated implementation currently derives `datePosted` from the browser date, and this repository deliberately preserves that behavior pending a captain decision.

### 2. Server-side enforcement of required application answers, resume, and portfolio

`/api/applications` validates only the answers, resume, and portfolio material the client chooses to send: a direct POST that omits `questions` still passes validation, and `portfolioRequired` is not enforced server-side even though `scripts/careers-roles.js` already carries the canonical questions and portfolio flags the handler uses for `introVideoRequired`.

The captain deliberately deferred this work because publishing comes first and equivalent enforcement exists elsewhere. Review traffic is dry-run-only, so no incomplete application can reach Notion today.

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

The test command starts its own isolated dry-run server and covers repository paths, dependency completeness, deployment packaging, hero behavior, Monday HKT deadlines, application payload and API behavior, all eleven role routes, location metadata, form validation and multipart submission, responsive layouts, reduced motion, failed-video behavior, and no-JavaScript fallbacks.

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

## Role-location metadata

`scripts/careers-roles.js` is the authoritative owner of all eleven role records.

Roles with an explicit physical `locationType` use that exact string in visible role copy, accessible role details, meta descriptions, Open Graph descriptions, and physical JobPosting data.

Roles without an explicit physical location are genuinely remote and use `Remote`, `TELECOMMUTE`, and remote applicant structured semantics.

The implementation does not invent city, country, or hybrid data.

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

The `deploy:review` package command preserves the local dry-run safety flag, but the operator remains responsible for linking the generated directory to the exact existing project, verifying the remote environment setting, and assigning only the existing stable alias.

For rollback, identify the deployment that served `carenbloom-redesign-a.vercel.app` before the update and use the current Vercel rollback command for that exact project and deployment.

Never guess a deployment identifier or roll back another Care and Bloom project.

## Production blockers

The factual `datePosted` policy for JobPosting structured data is unresolved.

The integrated implementation currently derives `datePosted` from the browser date, and this repository deliberately preserves that behavior pending a captain decision.

Do not promote this site to production until that factual policy is resolved and tested.

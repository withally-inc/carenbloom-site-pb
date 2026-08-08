# Server-authoritative role-state evidence

Date: 2026-08-08 HKT.

## End-user reproduction before implementation

The dry-run server and `chrome-devtools-axi` reproduced the diagnosed browser ownership.

At the real 2026 browser time, Chief of Staff rendered an active form, `datePosted` of `2026-08-08`, and `validThrough` of `2026-08-16T16:00:00.000Z`.

Re-executing the real browser module with the client clock fixed to `2030-01-06T16:00:00.000Z` changed `datePosted` to `2030-01-06`, `validThrough` to `2030-01-20T16:00:00.000Z`, the visible date to January 21, 2030, and the countdown to fourteen days.

Opening `?role=definitely-closed-role` rendered Chief of Staff, populated its hidden role field, inserted Chief of Staff `JobPosting` data, and exposed the application form.

## Preserved red gates

`npm run test:deadline` failed with `ERR_MODULE_NOT_FOUND` for the not-yet-created shared `api/_lib/role-state.js` owner.

`node tests/role-state-api.test.mjs` failed with `ERR_MODULE_NOT_FOUND` for the not-yet-created `/api/role-state` handler.

The dry-run `tests/server-runtime.test.mjs` request returned HTTP 404 before the local server routed the new endpoint.

`npm run test:api` failed because `createApplicationsHandler` did not exist before injected server-clock closure enforcement was implemented.

`tests/careers-deadline.test.mjs` then failed because the resolver did not yet return the one authoritative visible close date and accessible Apply label.

`tests/role-state-browser.test.mjs` first timed out waiting for an authoritative open state because the old application browser never fetched the endpoint.

After the application surface passed, the same browser test timed out waiting for authoritative homepage state because rows and counts were still static.

The no-JavaScript browser assertion then failed because the static hero still said `Actively recruiting` before authority loaded.

`tests/deployment-package.test.mjs` failed because the new endpoint and shared resolver were absent from the packaged runtime and `vercel.json` declared only the application function.

The existing Pattern Breaking integration test failed when the authoritative homepage initially removed the approved eleven-mark recruiting visualization instead of regenerating it from the server count.

## Green gates

The following focused commands passed after their minimal implementation cycles:

```sh
npm run test:deadline
npm run test:role-state
npm run test:api
node --test tests/repository-contract.test.mjs
node --test tests/deployment-package.test.mjs
BASE_URL=http://127.0.0.1:58129 node tests/server-runtime.test.mjs
BASE_URL=http://127.0.0.1:58129 node tests/role-state-browser.test.mjs
BASE_URL=http://127.0.0.1:58129 node tests/pb-role-apply.test.mjs
BASE_URL=http://127.0.0.1:58129 node tests/role-location-metadata.test.mjs
BASE_URL=http://127.0.0.1:58129 node tests/careers-apply-submit.test.mjs
BASE_URL=http://127.0.0.1:58129 node tests/careers-upload-limits.test.mjs
```

The browser regression covers Hong Kong, Honolulu, New York, and Kiritimati, clocks moved from 2020 to 2035, matching visible and structured fields, explicit unknown and closed states, endpoint failure, no-JavaScript output, and an earlier-filled homepage role changing every row and count together.

The API regression covers one millisecond before factual close, the exact close instant, after close, explicit filled state, ignored client state, HTTP 410, and zero Notion activity.

The intake test also proves that a client-supplied 1900 submission date is replaced with the injected 2026 server instant before the Notion payload is built.

`npm test` completed with exit code 0 across the full repository suite after the role-state implementation.

`NOTION_INTAKE_DRY_RUN=1 npm run package:deployment` produced 29 runtime owners.

Executing the packaged resolver for Monday `2026-08-10 HKT` returned `datePosted` `2026-08-10`, `validThrough` `2026-08-23T16:00:00.000Z`, and `isOpen` true.

A generated-package search found no browser-owned `getClosingPresentation(new Date())`, `datePosted: new Date`, or first-role fallback.

## Review-round hardening

Six accepted review findings were fixed after the implementation cycle above, adding these behavioral contracts.

The application page no longer reloads at a window boundary: when the weekly HKT window extends and the role is still open it re-fetches `/api/role-state` and re-renders the visible close label, `time` `datetime`, accessible Apply label, countdown anchor, and `JobPosting` `datePosted`/`validThrough` in place, leaving the applicant's typed answers and file selections untouched.

At `effectiveClosesAt`, and on any server `closed` or `unknown` response, the page takes the form down at once, removes the `JobPosting` script, and resets the form so no draft or `File` selection survives in the hidden DOM. Closure is enforced from the monotonic `performance.now()` anchor, so an endpoint outage across the close instant still closes the page with no successful response at all.

The homepage endpoint-failure path now owns every surface the success path owns: `[data-open-role-count]` reads `Unavailable` with an `Open roles unavailable` accessible name, `[data-recruiting-status]` reads `Openings unavailable`, and the marks graphic gets a terminal `Open-role count unavailable` name instead of announcing loading forever.

The chip label is deliberately concise because the 320px floating bar holds the chip whole and lets the wordmark flex: the first attempt, `Open roles unavailable`, was measured in Chromium at a 215.6px chip that scaled the Care & Bloom lockup from 103.3px to 42.4px wide and 18px to 7.4px tall. The shipped label restores the full 114px lockup, and `tests/role-state-browser.test.mjs` now pins the failure lockup against the success lockup at 320px.

The `/api/role-state` collection response is projected to `slug`, `title`, `locationType`, `careerGroup`, `careerOrder`, and `state` rather than spreading every canonical role, and `tests/role-state-api.test.mjs` pins that shape.

`tests/repository-contract.test.mjs` now resolves every entry in `careerRoles` through the shared resolver, so a malformed lifecycle field fails at test time instead of failing every request at runtime.

The homepage browser assertions in `tests/pb-integration.test.mjs` and `tests/nav-float-browser.test.mjs` now wait on `[data-careers-state="ready"]`, and the apply-page assertions additionally wait on `[data-role-page-state="open"]`, because those surfaces are fetch-dependent rather than static.

These focused commands were run against a freshly started dry-run server on port 49279 and passed:

```sh
node --test tests/repository-contract.test.mjs
node tests/role-state-api.test.mjs
node --test tests/careers-deadline.test.mjs tests/applications-api.test.mjs
BASE_URL=http://127.0.0.1:49279 node tests/role-state-browser.test.mjs
BASE_URL=http://127.0.0.1:49279 node tests/nav-float-browser.test.mjs
BASE_URL=http://127.0.0.1:49279 node tests/pb-role-apply.test.mjs
BASE_URL=http://127.0.0.1:49279 node tests/pb-integration.test.mjs
```

The full `npm test` suite and packaging verification are owned by the pipeline's own test step and are not re-claimed here.

A second review round closed three further residuals in the same state machine.

Takedown is now terminal: a `takenDown` flag short-circuits `refreshAuthority`'s continuation, `retryRefresh`, `scheduleBoundary`, and `enforceClosure`, so a role-state response still in flight when closure lands cannot reopen the role, restore the form or structured data, or re-arm polling.

`effectiveClosesAt` is now the single field behind both the monotonic closure guard and the boundary scheduler; `validThrough` is used only for display and `JobPosting` output, so relaxing the resolver's current alias between the two cannot silently move the enforced cutoff.

An application accepted before closure now surfaces its reference in a standalone `role="status"` confirmation inside the closed panel, outside the removed form. The role stays closed, the form stays unavailable, active `JobPosting` data stays removed, and the draft and file selections are still cleared rather than restored.

A third round corrected that confirmation's presentation and announcement. The live region is declared empty in `careers/apply/index.html` so it is already in the accessibility tree. It stays rendered while empty — collapsed to a zero box by moving its margin, padding, and border onto a `:not(:empty)` rule rather than removing it with `display: none`, which would have taken it back out of the accessibility tree and defeated the announcement. Its text is written after a frame and a macrotask, so the change is a live-region update rather than a mutation bundled with the takedown. The generic `.role-unavailable > p` rule now excludes the receipt, so the confirmation keeps its intended ink colour and 16px size instead of losing the cascade to the muted secondary copy declared after it. `tests/role-state-browser.test.mjs` now asserts the region is mounted and invisible before submission and compares the confirmation's computed colour and size against the muted state message.

These focused commands were run against a freshly started dry-run server on port 49279 and passed, with `tests/role-state-browser.test.mjs` repeated three times to check the new timing-sensitive cases for flakiness:

```sh
BASE_URL=http://127.0.0.1:49279 node tests/role-state-browser.test.mjs
BASE_URL=http://127.0.0.1:49279 node tests/pb-role-apply.test.mjs
BASE_URL=http://127.0.0.1:49279 node tests/careers-apply-submit.test.mjs
BASE_URL=http://127.0.0.1:49279 node tests/careers-upload-limits.test.mjs
BASE_URL=http://127.0.0.1:49279 node tests/pb-integration.test.mjs
```

## Fresh Chrome verification

Fresh `chrome-devtools-axi` checks against a newly started dry-run server showed eleven homepage rows, synchronized counts `11 / 1 / 5 / 3 / 2`, eleven generated role marks, and zero horizontal overflow.

The Chief of Staff page showed authoritative `datePosted` `2026-08-03`, `validThrough` `2026-08-16T16:00:00.000Z`, matching visible and accessible close fields, an open form, and zero horizontal overflow.

The unknown-role page showed `Role not found`, no form, no `JobPosting`, no fallback role, and no console messages.

The 320px mobile checks showed zero horizontal overflow for both the homepage and open role page.

The inspected browser captures are `home-320.png`, `careers-320.png`, `careers-rows-320.png`, and `role-open-320.png` in this directory.

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

## Fresh Chrome verification

Fresh `chrome-devtools-axi` checks against a newly started dry-run server showed eleven homepage rows, synchronized counts `11 / 1 / 5 / 3 / 2`, eleven generated role marks, and zero horizontal overflow.

The Chief of Staff page showed authoritative `datePosted` `2026-08-03`, `validThrough` `2026-08-16T16:00:00.000Z`, matching visible and accessible close fields, an open form, and zero horizontal overflow.

The unknown-role page showed `Role not found`, no form, no `JobPosting`, no fallback role, and no console messages.

The 320px mobile checks showed zero horizontal overflow for both the homepage and open role page.

The inspected browser captures are `home-320.png`, `careers-320.png`, `careers-rows-320.png`, and `role-open-320.png` in this directory.

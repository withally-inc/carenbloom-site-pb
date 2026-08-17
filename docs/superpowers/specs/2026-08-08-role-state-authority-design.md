# Care & Bloom Role-State Authority Design

**Status:** Captain-approved contract translated into repository architecture.

**Scope:** Correct role posting dates, deadlines, availability, homepage counts, structured data, and application acceptance without changing role copy or inventing lifecycle facts.

## Verified problem

The current browser calls `new Date()` before invoking HKT calendar logic, so the helper masks the visitor's timezone but still trusts the visitor's clock.
The page separately derives `datePosted` from the browser's UTC calendar date.
An unknown slug falls back to the first canonical role, homepage rows and counts are static, and the application API does not evaluate closure.
The dry-run browser reproduction confirmed that a 2030 client clock moves every advertised date and that an unknown slug renders Chief of Staff with an open form.

## Considered approaches

1. Correct only the browser-side HKT formatter.
This would repair the calendar label but would leave the visitor's wall clock authoritative and would not coordinate the API or homepage.

2. Materialize dates during deployment packaging.
This would make a build clock authoritative, but the Monday refresh and factual closure policy would go stale between deployments.

3. Resolve canonical role state on each server request and make every browser surface consume that response.
This is the selected approach because it gives the endpoint, application intake, homepage, and tests one lifecycle owner while preserving the static site architecture.

## Canonical data and resolver

`scripts/careers-roles.js` remains the single canonical role-content authority and gains only optional lifecycle fields plus a stable homepage group identifier.
No currently open role receives an invented closure date or inactive status.

`api/_lib/role-state.js` becomes the server-safe lifecycle owner.
`resolveRoleState(serverNow, role)` accepts an injected authoritative instant and a canonical role.
It returns the HKT Monday window start, HKT `datePosted`, the default close exactly fourteen days later, the earlier effective close, `validThrough`, the next Monday refresh instant, and `isOpen`.
An explicit `inactive` or `filled` status makes `isOpen` false immediately.
An absolute-offset `closesAt` competes with the default close, and the earlier instant always wins.
The close boundary is exclusive: the role is closed when `serverNow >= effectiveClose`.

## Server endpoint

`GET /api/role-state` resolves all canonical roles with one captured server instant and returns only open roles plus authoritative aggregate counts for the homepage.
`GET /api/role-state?role=<slug>` returns the canonical role content, its resolved lifecycle state, the total open-role count, and the captured server instant.
Unknown slugs return a non-error response with an explicit `unknown` status and no substitute role, avoiding a handled request being reported as a browser resource error.
All responses set non-cacheable headers.
The local dry-run server routes the same handler used by the packaged Vercel function.

## Application page

Static HTML starts in a neutral availability-checking state with the role content and form hidden.
The browser fetches the role endpoint before rendering role content, dates, form availability, or `JobPosting` JSON-LD.
An open role renders all date surfaces from the returned state.
The countdown anchors the response's `serverNow` to `performance.now()` and subtracts only monotonic elapsed time.
The browser refreshes authoritative state at the earlier of the next HKT Monday boundary and effective close.
Browser `Date.now()` and zero-argument `new Date()` are never used for role dates or availability.
Unknown, closed, malformed, and failed endpoint responses render explicit unavailable states with no form and no active `JobPosting`.

## Homepage

Static HTML contains no role rows and no numeric open-role claim.
The homepage fetches the collection response, renders only authoritative open roles, and derives the section label, group counts, navigation chips, and hero recruiting count from that same response.
Endpoint failure leaves a neutral unavailable message and no role links.
The endpoint response carries the stable group identifiers needed to preserve the approved group order and labels.

## Application intake

`/api/applications` resolves the submitted canonical slug against its own server clock before payload validation performs any Notion work.
Submissions whose role title matches no canonical slug skip lifecycle resolution and continue normal validation, preserving the submitted title and slug rather than inventing a replacement.
Closed roles return HTTP 410 at and after the effective close only when a canonical role matches.
Client-supplied dates, status flags, titles, and open-state claims cannot override canonical role state.
The separately deferred required-answer, resume, and portfolio enforcement remains unchanged.

## Packaging and failure safety

The strict runtime allowlist includes the endpoint and shared resolver.
Vercel configuration declares the new function without changing any project, alias, domain, environment, or deployment state.
Review application traffic remains dry-run-only.
Generated package tests execute the resolver and endpoint rather than merely searching source text.

## Verification

Pure tests cover HKT reset boundaries, successive Mondays, month and year rollover, exact fourteen-day math, earlier and later factual closes, the exact close instant, and explicit inactive or filled states.
Endpoint tests cover open, closed, unknown, collection, cache headers, and identical results regardless of browser timezone.
Browser tests cover clock manipulation, matching visible and structured fields, closed and unknown states, homepage aggregate synchronization, no-JavaScript output, and endpoint failure.
Application API tests prove acceptance just before close and HTTP 410 with no Notion activity at and after close.
Packaging tests prove that all runtime owners ship and that browser wall-clock changes cannot change packaged role dates or availability.

# Same-Origin Role-State Design

**Status:** Captain approved report option 1 and promoted the diagnosis to ship.

**Scope:** Serve homepage and role-page lifecycle data from the same browser origin without changing application submission routing, monitoring, or recovery policy.

## Problem

The production page is served by Cloudflare at `carenbloom.com`, but browser role-state requests currently cross to `carenbloom-site-pb.vercel.app`.
That CORS boundary can fail for selected WebView or network contexts even while the page itself loads.
The exact visible fallback was reproduced when the document had an opaque origin.

## Considered approaches

1. Proxy the role-state request from Cloudflare to Vercel.
This removes browser CORS but retains Vercel as a synchronous dependency and adds another network hop.

2. Duplicate the Vercel handler logic inside a Cloudflare Pages Function.
This removes the network dependency but creates two response implementations that can drift.

3. Compute role state in both runtimes through one platform-neutral response builder.
This is selected because it removes the cross-provider request while keeping one canonical projection of roles, counts, lifecycle state, and boundary times.

## Architecture

`api/_lib/role-state-response.js` owns the pure role-state response projection.
It consumes a server instant, canonical roles, and an optional role slug, and returns the existing HTTP status code and JSON payload.

`api/role-state.js` remains the Vercel Node handler.
It continues to own Node response headers, method handling, and the existing CORS contract, while delegating payload assembly to the shared response builder.

`functions/api/role-state.js` is the Cloudflare Pages Function for `GET /api/role-state`.
It captures the Cloudflare runtime clock, invokes the same response builder, and returns the exact JSON shape with `Cache-Control: no-store, max-age=0`, `Pragma: no-cache`, and `Expires: 0`.
It accepts `GET` and `OPTIONS`, rejects other methods with HTTP 405, and does not need CORS for the same-origin browser path.

`scripts/api-endpoints.js` resolves role-state to `/api/role-state` on every host unless an explicit test or runtime override is present.
It keeps the current absolute Vercel application endpoint only on the two Cloudflare production hosts.

## Retry lifecycle repair

`fetchRoleState` accepts an optional abort signal and makes its retry delay abortable.
The application page creates one controller for each authoritative refresh and aborts it during terminal takedown.
This ensures that closure, unknown-role takedown, or another terminal state cannot leave retry requests running after the page has stopped polling.

The existing initial-load behavior and retry count stay unchanged.
No new recovery policy, backoff strategy, or application routing is introduced.

## Verification

Tests will prove:

- apex, `www`, review, and local pages all resolve role-state to `/api/role-state`;
- application submission routing is unchanged;
- the Cloudflare function matches the established collection, role, unknown, method, and cache contracts;
- the Vercel endpoint retains its existing behavior;
- the homepage browser path requests only its serving origin;
- terminal role takedown aborts in-flight retry work and starts no further request;
- the strict Vercel package remains complete without treating the Cloudflare function as a Vercel endpoint.

The full repository test suite and the `no-mistakes` pipeline remain the release gates.

## Explicit follow-ups

The application POST remains cross-origin by captain instruction and should receive a separately authorized same-origin design.
Browser-level production synthetics and bounded fallback recovery remain separate follow-up work.

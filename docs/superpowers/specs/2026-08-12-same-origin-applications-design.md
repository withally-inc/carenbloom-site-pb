# Same-Origin Applications Design

**Status:** Captain approved Approach A in the launch brief.

**Scope:** Make production application submission same-origin in the browser by relaying the unchanged request through Cloudflare Pages to the existing Vercel processor.

## Problem

The production application page is served by Cloudflare at `carenbloom.com`, but its browser POST currently targets `carenbloom-site-pb.vercel.app`.
Restrictive browser and network contexts can block that cross-origin hop after a candidate has completed the form.

## Selected approach

`functions/api/applications.js` will be a transparent Cloudflare Pages Function.
It will rebuild the incoming request with the fixed Vercel applications URL and pass it to `fetch` without parsing or buffering the multipart body.
It will return the upstream `Response` unchanged.

This keeps `api/applications.js` as the only application processor and therefore preserves its application-specific CORS headers, method handling, Busboy parsing, two-file and 4 MiB limits, validation errors, HKT lifecycle gate, `NOTION_INTAKE_DRY_RUN`, and Notion behavior.
The request `Origin` remains intact so the Vercel handler continues to apply its existing allowlist rather than adopting the role-state policy.

`scripts/api-endpoints.js` will resolve application submissions to `/api/applications` on every normal host while retaining the explicit `CB_TALENTS_ENDPOINT` override.
The direct Vercel endpoint and review deployment remain unchanged and reachable.

## Failure behavior

The relay will not invent Cloudflare-side validation or fallback responses.
Vercel status codes, response headers, error bodies, and dry-run responses pass through unchanged.
Upstream transport failures remain failed requests so the client keeps its existing error path.

## Verification

Tests will prove that production clients resolve the application endpoint to the same-origin path and that a browser submission does not target `vercel.app`.
A Cloudflare relay test will prove that the method, multipart content type, origin, and exact body bytes reach the fixed upstream URL and that upstream size-limit errors and headers return unchanged.
Existing Vercel API and upload-limit tests will continue to prove field validation, exact per-file and combined limits, dry-run behavior, lifecycle rejection, and direct handler support without a real Notion write.

## Full-port follow-up

Approach B is intentionally excluded from this change.
It would replace Busboy with Workers-native `request.formData()`, reproduce every validation and size boundary before any Notion request, port the Notion client to the Workers runtime, and configure `NOTION_KEY` or `NOTION_API_KEY` plus `NOTION_CB_TALENTS_DB_ID` in Cloudflare.
That migration has higher memory, upload-limit, runtime-compatibility, credential, and production-cutover risk and requires a separate commission.

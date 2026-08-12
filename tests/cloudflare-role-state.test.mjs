import assert from "node:assert/strict";
import { createCloudflareRoleStateHandler } from "../functions/api/role-state.js";

const serverNow = "2026-08-12T09:00:00.000Z";
const roles = [
  {
    slug: "open-role",
    title: "Open Role",
    careerGroup: "launch",
    careerOrder: 1,
    locationType: "Remote",
  },
  {
    slug: "closed-role",
    title: "Closed Role",
    careerGroup: "scale",
    careerOrder: 1,
    locationType: "On-site, Hong Kong",
    closesAt: "2026-08-12T08:00:00.000Z",
  },
];

const handler = createCloudflareRoleStateHandler({
  now: () => new Date(serverNow),
  roles,
});

async function request(path = "/api/role-state", method = "GET") {
  return handler({
    request: new Request(`https://carenbloom.com${path}`, { method }),
  });
}

function assertAuthoritativeHeaders(response) {
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("expires"), "0");
}

{
  const response = await request();
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assertAuthoritativeHeaders(response);
  assert.deepEqual(json, {
    status: "ok",
    serverNow,
    openRoleCount: 1,
    groupCounts: { launch: 1 },
    nextBoundaryAt: "2026-08-16T16:00:00.000Z",
    roles: [{
      slug: "open-role",
      title: "Open Role",
      locationType: "Remote",
      careerGroup: "launch",
      careerOrder: 1,
      state: {
        windowStart: "2026-08-09T16:00:00.000Z",
        datePosted: "2026-08-10",
        defaultClosesAt: "2026-08-23T16:00:00.000Z",
        effectiveClosesAt: "2026-08-23T16:00:00.000Z",
        validThrough: "2026-08-23T16:00:00.000Z",
        nextRefreshAt: "2026-08-16T16:00:00.000Z",
        visibleCloseDate: "August 24, 2026",
        visibleCloseLabel: "Closes August 24, 2026",
        applyLabel: "Apply for Open Role before applications close August 24, 2026 at 12:00 AM HKT",
        isOpen: true,
      },
    }],
  });
}

{
  const response = await request("/api/role-state?role=closed-role");
  const json = await response.json();
  assert.equal(response.status, 200);
  assertAuthoritativeHeaders(response);
  assert.equal(json.status, "closed");
  assert.equal(json.serverNow, serverNow);
  assert.equal(json.openRoleCount, 1);
  assert.equal(json.role.slug, "closed-role");
  assert.equal(json.state.isOpen, false);
  assert.equal(json.state.effectiveClosesAt, "2026-08-12T08:00:00.000Z");
}

{
  const response = await request("/api/role-state?role=missing-role");
  const json = await response.json();
  assert.equal(response.status, 200);
  assertAuthoritativeHeaders(response);
  assert.deepEqual(json, {
    status: "unknown",
    serverNow,
    openRoleCount: 1,
    groupCounts: { launch: 1 },
  });
}

{
  const response = await request("/api/role-state", "OPTIONS");
  assert.equal(response.status, 204);
  assertAuthoritativeHeaders(response);
  assert.equal(await response.text(), "");
}

{
  const response = await request("/api/role-state", "POST");
  const json = await response.json();
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, OPTIONS");
  assertAuthoritativeHeaders(response);
  assert.deepEqual(json, { status: "error", error: "Method not allowed." });
}

console.log("Cloudflare role-state function test passed");

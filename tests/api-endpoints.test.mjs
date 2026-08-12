import assert from "node:assert/strict";
import { test } from "node:test";
import { CLOUDFLARE_PRODUCTION_HOSTS, resolveApplicationsEndpoint, resolveRoleStateEndpoint } from "../scripts/api-endpoints.js";
import { ALLOWED_BROWSER_ORIGINS } from "../api/_lib/cors.js";

const productionHosts = [...CLOUDFLARE_PRODUCTION_HOSTS];
const sameOriginHosts = ["carenbloom-redesign-a.vercel.app", "127.0.0.1", "localhost"];

test("the shared resolver owns the canonical Cloudflare production host set", () => {
  assert.deepEqual(productionHosts, ["carenbloom.com", "www.carenbloom.com"]);
});

test("production role-state stays same-origin while applications keep their Vercel route", () => {
  for (const hostname of productionHosts) {
    assert.equal(resolveRoleStateEndpoint({ hostname }, {}), "/api/role-state");
    assert.equal(resolveApplicationsEndpoint({ hostname }, {}), "https://carenbloom-site-pb.vercel.app/api/applications");
  }
});

test("review and local hosts serve their own functions and stay same-origin", () => {
  for (const hostname of sameOriginHosts) {
    assert.equal(resolveRoleStateEndpoint({ hostname }, {}), "/api/role-state");
    assert.equal(
      resolveApplicationsEndpoint({ hostname }, {}),
      "/api/applications",
      "review and local application traffic must reach the dry-run function it is served by",
    );
  }
});

test("the Vercel API keeps allowing exactly the production origins used by applications", () => {
  assert.deepEqual(
    [...ALLOWED_BROWSER_ORIGINS].sort(),
    productionHosts.map((hostname) => `https://${hostname}`).sort(),
    "a host routed to the Vercel API without a matching allowed browser origin is blocked by the browser",
  );
});

test("an explicit endpoint override wins on every host", () => {
  const globals = {
    CB_ROLE_STATE_ENDPOINT: "https://example.test/api/role-state",
    CB_TALENTS_ENDPOINT: "https://example.test/api/applications",
  };
  for (const hostname of [...productionHosts, ...sameOriginHosts]) {
    assert.equal(resolveRoleStateEndpoint({ hostname }, globals), globals.CB_ROLE_STATE_ENDPOINT);
    assert.equal(resolveApplicationsEndpoint({ hostname }, globals), globals.CB_TALENTS_ENDPOINT);
  }
  assert.equal(resolveRoleStateEndpoint({ hostname: "localhost" }, { CB_ROLE_STATE_ENDPOINT: "" }), "/api/role-state");
  assert.equal(resolveApplicationsEndpoint({ hostname: "localhost" }, { CB_TALENTS_ENDPOINT: "" }), "/api/applications");
});

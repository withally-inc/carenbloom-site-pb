import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveApplicationsEndpoint, resolveRoleStateEndpoint } from "../scripts/api-endpoints.js";
import { ALLOWED_BROWSER_ORIGINS } from "../api/_lib/cors.js";

const productionHosts = ["carenbloom.com", "www.carenbloom.com"];
const sameOriginHosts = ["carenbloom-redesign-a.vercel.app", "127.0.0.1", "localhost"];

test("the statically hosted production pages address the API host directly", () => {
  for (const hostname of productionHosts) {
    assert.equal(resolveRoleStateEndpoint({ hostname }, {}), "https://carenbloom-site-pb.vercel.app/api/role-state");
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

test("every production host the resolver routes cross-origin is CORS-allowed by the API", () => {
  for (const hostname of productionHosts) {
    assert.equal(ALLOWED_BROWSER_ORIGINS.has(`https://${hostname}`), true, `https://${hostname} must be an allowed browser origin`);
  }
  assert.equal(ALLOWED_BROWSER_ORIGINS.size, productionHosts.length, "no origin may be allowed that the resolver never routes cross-origin");
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

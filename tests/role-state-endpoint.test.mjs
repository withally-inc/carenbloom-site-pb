import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveRoleStateEndpoint } from "../scripts/role-state-endpoint.js";

const vercelEndpoint = "https://carenbloom-site-pb.vercel.app/api/role-state";

test("the statically hosted production pages address the API host directly", () => {
  for (const hostname of ["carenbloom.com", "www.carenbloom.com"]) {
    assert.equal(resolveRoleStateEndpoint({ hostname }, {}), vercelEndpoint);
  }
});

test("hosts that serve the functions themselves stay same-origin", () => {
  for (const hostname of ["carenbloom-redesign-a.vercel.app", "127.0.0.1", "localhost"]) {
    assert.equal(resolveRoleStateEndpoint({ hostname }, {}), "/api/role-state");
  }
});

test("an explicit endpoint override wins on every host", () => {
  const globals = { CB_ROLE_STATE_ENDPOINT: "https://example.test/api/role-state" };
  assert.equal(resolveRoleStateEndpoint({ hostname: "carenbloom.com" }, globals), globals.CB_ROLE_STATE_ENDPOINT);
  assert.equal(resolveRoleStateEndpoint({ hostname: "localhost" }, globals), globals.CB_ROLE_STATE_ENDPOINT);
  assert.equal(resolveRoleStateEndpoint({ hostname: "localhost" }, { CB_ROLE_STATE_ENDPOINT: "" }), "/api/role-state");
});

import assert from "node:assert/strict";
import { createRoleStateHandler } from "../api/role-state.js";

const serverNow = "2026-08-12T09:00:00.000Z";
const roles = [
  {
    slug: "open-role",
    title: "Open Role",
    careerGroup: "launch",
    careerOrder: 1,
    locationType: "Remote",
    level: "Contributor",
    summary: "Open role summary.",
    mission: "Open role mission.",
    responsibilities: ["Ship work."],
    requirements: ["Use judgment."],
    questions: ["Why this role?"],
  },
  {
    slug: "closed-role",
    title: "Closed Role",
    careerGroup: "scale",
    closesAt: "2026-08-12T08:00:00.000Z",
  },
  {
    slug: "filled-role",
    title: "Filled Role",
    careerGroup: "launch",
    status: "filled",
  },
];

function makeReq(url, method = "GET") {
  return { method, url, headers: { host: "careers.example" } };
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value = "") {
      this.body += value;
    },
  };
}

async function request(url, method = "GET", handlerRoles = roles) {
  const response = makeRes();
  const handler = createRoleStateHandler({ now: () => new Date(serverNow), roles: handlerRoles });
  await handler(makeReq(url, method), response);
  return { response, json: response.body ? JSON.parse(response.body) : null };
}

{
  const { response, json } = await request("/api/role-state");
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["cache-control"], "no-store, max-age=0");
  assert.equal(response.headers.pragma, "no-cache");
  assert.equal(response.headers.expires, "0");
  assert.equal(json.status, "ok");
  assert.equal(json.serverNow, serverNow);
  assert.equal(json.openRoleCount, 1);
  assert.deepEqual(json.groupCounts, { launch: 1 });
  assert.deepEqual(json.roles.map(({ slug }) => slug), ["open-role"]);
  assert.equal(json.roles[0].state.datePosted, "2026-08-10");
  assert.equal(json.roles[0].state.validThrough, "2026-08-23T16:00:00.000Z");
  assert.equal(json.nextBoundaryAt, "2026-08-16T16:00:00.000Z");
  // The collection is deliberately no-store, so it is refetched on every homepage visit: it must
  // carry only what the homepage renders, never the full role prose.
  assert.deepEqual(
    Object.keys(json.roles[0]).sort(),
    ["careerGroup", "careerOrder", "locationType", "slug", "state", "title"],
  );
}

{
  const { response, json } = await request("/api/role-state?role=open-role");
  assert.equal(response.statusCode, 200);
  assert.equal(json.status, "open");
  assert.equal(json.serverNow, serverNow);
  assert.equal(json.openRoleCount, 1);
  assert.equal(json.role.slug, "open-role");
  assert.equal(json.state.isOpen, true);
  assert.equal(json.state.datePosted, "2026-08-10");
  assert.equal(json.state.validThrough, "2026-08-23T16:00:00.000Z");
}

for (const slug of ["closed-role", "filled-role"]) {
  const { response, json } = await request(`/api/role-state?role=${slug}`);
  assert.equal(response.statusCode, 200);
  assert.equal(json.status, "closed");
  assert.equal(json.role.slug, slug);
  assert.equal(json.state.isOpen, false);
  assert.equal(json.openRoleCount, 1);
}

{
  const { response, json } = await request("/api/role-state?role=does-not-exist");
  assert.equal(response.statusCode, 200, "an explicit unknown state should not create a browser resource error");
  assert.equal(json.status, "unknown");
  assert.equal(json.role, undefined);
  assert.equal(json.openRoleCount, 1);
}

{
  const closedRoles = roles.filter((role) => role.slug !== "open-role");
  const { json } = await request("/api/role-state", "GET", closedRoles);
  assert.equal(json.openRoleCount, 0);
  assert.deepEqual(json.roles, []);
  assert.equal(json.nextBoundaryAt, "2026-08-16T16:00:00.000Z");
  assert.ok(Date.parse(json.nextBoundaryAt) > Date.parse(serverNow));
}

{
  const { json } = await request("/api/role-state", "GET", []);
  assert.equal(json.openRoleCount, 0);
  assert.equal(json.nextBoundaryAt, null);
}

{
  const { response, json } = await request("/api/role-state", "POST");
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.allow, "GET, OPTIONS");
  assert.equal(json.status, "error");
}

{
  const { response } = await request("/api/role-state", "OPTIONS");
  assert.equal(response.statusCode, 204);
  assert.equal(response.headers["access-control-allow-origin"], "https://carenbloom.com");
  assert.equal(response.headers["access-control-allow-methods"], "GET, OPTIONS");
}

{
  const { response } = await request("/api/role-state?role=open-role");
  assert.equal(response.headers["access-control-allow-origin"], "https://carenbloom.com");
}

console.log("role-state API test passed");

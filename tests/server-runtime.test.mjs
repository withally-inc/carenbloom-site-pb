import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";

const otf = await fetch(`${baseUrl}/fonts/PPMori-Regular.otf`);
assert.equal(otf.status, 200);
assert.equal(otf.headers.get("content-type"), "font/otf");

for (const page of ["/", "/careers", "/careers/apply?role=chief-of-staff"]) {
  const response = await fetch(`${baseUrl}${page}`);
  assert.equal(response.status, 200, `${page} should be served`);
  assert.match(response.headers.get("content-type") || "", /text\/html/);
}

const roleState = await fetch(`${baseUrl}/api/role-state?role=chief-of-staff`);
assert.equal(roleState.status, 200, "the dry-run server should route the authoritative role-state endpoint");
assert.equal(roleState.headers.get("cache-control"), "no-store, max-age=0");
const authoritativeRole = await roleState.json();
assert.equal(authoritativeRole.status, "open");
assert.equal(authoritativeRole.role.slug, "chief-of-staff");
assert.equal(authoritativeRole.state.datePosted.length, 10);
assert.equal(authoritativeRole.state.isOpen, true);

console.log("server content-type and role-state tests passed");

import assert from "node:assert/strict";
import { chromium } from "playwright";
import { resolveRoleState } from "../api/_lib/role-state.js";
import { careerRoles } from "../scripts/careers-roles.js";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";
const serverNow = "2026-08-12T09:00:00.000Z";
const chiefOfStaff = careerRoles.find((role) => role.slug === "chief-of-staff");
const openState = resolveRoleState(serverNow, chiefOfStaff);
const groupBySlug = {
  "product-project-manager": "source-build",
  "product-marketing-lead": "launch",
  "graphic-designer": "launch",
  "video-editor": "launch",
  "creative-strategist-performance-marketing": "launch",
  "social-media-strategist": "launch",
  "head-of-performance-marketing": "scale",
  "growth-lead-mobile-apps": "scale",
  "ai-native-product-manager-apps": "scale",
  "chief-of-staff": "platform",
  "entrepreneur-in-residence": "platform",
};

const openRoleResponse = {
  status: "open",
  serverNow,
  openRoleCount: 11,
  groupCounts: { "source-build": 1, launch: 5, scale: 3, platform: 2 },
  role: chiefOfStaff,
  state: openState,
};

function fulfillJson(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "Cache-Control": "no-store, max-age=0" },
    body: JSON.stringify(body),
  });
}

async function installRoleResponse(context, response = openRoleResponse, status = 200) {
  await context.route("**/api/role-state?role=*", (route) => fulfillJson(route, status, response));
}

async function newTestPage(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  return page;
}

async function waitForOpenRole(page) {
  await page.locator('[data-role-page-state="open"]').waitFor();
  await page.locator("#application-form").waitFor({ state: "visible" });
}

async function roleSnapshot(page) {
  const jsonLd = await page.locator('script[type="application/ld+json"]').evaluate((node) => JSON.parse(node.textContent));
  return {
    title: await page.locator("[data-role-title]").textContent(),
    closeLabel: await page.locator("[data-close-date]").textContent(),
    dateTime: await page.locator("[data-close-countdown]").getAttribute("datetime"),
    applyLabel: await page.locator("[data-close-apply]").getAttribute("aria-label"),
    datePosted: jsonLd.datePosted,
    validThrough: jsonLd.validThrough,
    formVisible: await page.locator("#application-form").isVisible(),
  };
}

const browser = await chromium.launch({ headless: true });

const timezoneSnapshots = [];
for (const timezoneId of ["Asia/Hong_Kong", "Pacific/Honolulu", "America/New_York", "Pacific/Kiritimati"]) {
  const context = await browser.newContext({ timezoneId, viewport: { width: 1440, height: 900 } });
  await installRoleResponse(context);
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "networkidle" });
  await waitForOpenRole(page);
  timezoneSnapshots.push(await roleSnapshot(page));
  await context.close();
}

assert.deepEqual(timezoneSnapshots, timezoneSnapshots.map(() => timezoneSnapshots[0]), "client timezone must not change authoritative role fields");
assert.deepEqual(timezoneSnapshots[0], {
  title: "Chief of Staff",
  closeLabel: openState.visibleCloseLabel,
  dateTime: openState.validThrough,
  applyLabel: openState.applyLabel,
  datePosted: openState.datePosted,
  validThrough: openState.validThrough,
  formVisible: true,
});

const clockSnapshots = [];
for (const clientTime of ["2020-01-01T00:00:00.000Z", "2035-01-01T00:00:00.000Z"]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installRoleResponse(context);
  const page = await newTestPage(context);
  await page.clock.setFixedTime(new Date(clientTime));
  await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "networkidle" });
  await waitForOpenRole(page);
  clockSnapshots.push(await roleSnapshot(page));
  await context.close();
}
assert.deepEqual(clockSnapshots[0], clockSnapshots[1], "moving the browser wall clock years backward or forward must change nothing");

{
  const context = await browser.newContext();
  await installRoleResponse(context, {
    status: "unknown",
    serverNow,
    openRoleCount: 11,
    groupCounts: openRoleResponse.groupCounts,
  }, 200);
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/careers/apply/?role=not-a-role`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Role not found" }).waitFor();
  assert.equal(await page.locator("#application-form").isVisible(), false);
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0);
  assert.notEqual(await page.locator("[data-role-title]").textContent(), "Chief of Staff");
  await context.close();
}

{
  const context = await browser.newContext();
  await installRoleResponse(context, {
    ...openRoleResponse,
    status: "closed",
    state: { ...openState, isOpen: false },
  });
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "This role is closed" }).waitFor();
  assert.equal(await page.locator("#application-form").isVisible(), false);
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0);
  await context.close();
}

{
  const context = await browser.newContext();
  await context.route("**/api/role-state?role=*", (route) => route.abort("failed"));
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Role unavailable" }).waitFor();
  assert.equal(await page.locator("#application-form").isVisible(), false);
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0);
  await context.close();
}

{
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator("#application-form").isVisible(), false, "no-JavaScript output must not expose an application form");
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0);
  assert.equal(await page.getByText(/Closes [A-Z][a-z]+ \d+/).count(), 0);
  await context.close();
}

{
  const homepageRoles = careerRoles
    .filter((role) => role.slug !== "graphic-designer")
    .map((role) => ({
      ...role,
      careerGroup: groupBySlug[role.slug],
      state: resolveRoleState(serverNow, role),
    }));
  const collection = {
    status: "ok",
    serverNow,
    openRoleCount: 10,
    groupCounts: { "source-build": 1, launch: 4, scale: 3, platform: 2 },
    roles: homepageRoles,
  };
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route("**/api/role-state", (route) => fulfillJson(route, 200, collection));
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.locator('[data-careers-state="ready"]').waitFor();
  assert.equal(await page.locator("a.job-row").count(), 10);
  assert.equal(await page.locator('a.job-row[href*="graphic-designer"]').count(), 0);
  assert.deepEqual(
    await page.locator("[data-open-role-count]").allTextContents(),
    await page.locator("[data-open-role-count]").allTextContents().then((values) => values.map(() => "Open roles (10)")),
  );
  assert.equal(await page.locator("[data-careers-summary]").textContent(), "(07) Careers · 10 roles open");
  assert.deepEqual(await page.locator("[data-career-group-count]").allTextContents(), ["1", "4", "3", "2"]);
  await context.close();
}

{
  const context = await browser.newContext();
  await context.route("**/api/role-state", (route) => route.abort("failed"));
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.locator('[data-careers-state="unavailable"]').waitFor();
  assert.equal(await page.locator("a.job-row").count(), 0);
  assert.equal(await page.locator("body").getByText(/Open roles \(\d+\)/).count(), 0);
  await context.close();
}

{
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator("a.job-row").count(), 0);
  assert.equal(await page.locator("body").getByText(/Open roles \(\d+\)/).count(), 0);
  assert.equal(await page.getByText("Actively recruiting", { exact: true }).count(), 0);
  await context.close();
}

await browser.close();
console.log("authoritative role-state browser test passed");

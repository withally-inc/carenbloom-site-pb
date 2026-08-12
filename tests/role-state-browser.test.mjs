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
  openRoleCount: 12,
  groupCounts: { "source-build": 1, launch: 6, scale: 3, platform: 2 },
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

async function installRoleSequence(context, responses) {
  let index = 0;
  await context.route("**/api/role-state?role=*", (route) => {
    const body = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return fulfillJson(route, 200, body);
  });
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
    openRoleCount: 12,
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

// A weekly HKT window boundary re-derives the posting dates from the server; it must never
// discard an applicant's in-progress answers or file selections the way a page reload would.
{
  const nextWindowNow = "2026-08-17T09:00:00.000Z";
  const nextWindowState = resolveRoleState(nextWindowNow, chiefOfStaff);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installRoleSequence(context, [
    { ...openRoleResponse, state: { ...openState, nextRefreshAt: "2026-08-12T09:00:00.800Z" } },
    { ...openRoleResponse, serverNow: nextWindowNow, state: nextWindowState },
  ]);
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "domcontentloaded" });
  await waitForOpenRole(page);
  const answer = page.locator('#application-form textarea[name="role_question_1"]');
  await answer.fill("A long answer that must survive the weekly window boundary.");
  await page.locator("[data-close-date]").filter({ hasText: nextWindowState.visibleCloseDate }).waitFor();
  const refreshed = await roleSnapshot(page);
  assert.equal(refreshed.closeLabel, nextWindowState.visibleCloseLabel, "the extended window should re-render the authoritative close label");
  assert.equal(refreshed.dateTime, nextWindowState.validThrough);
  assert.equal(refreshed.applyLabel, nextWindowState.applyLabel);
  assert.equal(refreshed.datePosted, nextWindowState.datePosted, "the JobPosting must carry the new authoritative datePosted");
  assert.equal(refreshed.validThrough, nextWindowState.validThrough);
  assert.equal(refreshed.formVisible, true, "the application form must stay up across a weekly window boundary");
  assert.equal(await answer.inputValue(), "A long answer that must survive the weekly window boundary.", "in-progress answers must survive the boundary refresh");
  await context.close();
}

// Reaching effectiveClosesAt is the opposite case: the form comes down at once, with no active
// JobPosting left behind and nothing about the draft preserved.
{
  const closesSoon = "2026-08-12T09:00:00.800Z";
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installRoleSequence(context, [
    { ...openRoleResponse, state: { ...openState, effectiveClosesAt: closesSoon, validThrough: closesSoon } },
    { ...openRoleResponse, status: "closed", state: { ...openState, isOpen: false } },
  ]);
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "domcontentloaded" });
  await waitForOpenRole(page);
  await page.locator('#application-form textarea[name="role_question_1"]').fill("Answer written just before the close instant.");
  await page.getByRole("heading", { name: "This role is closed" }).waitFor();
  assert.equal(await page.locator("#application-form").isVisible(), false, "the form must come down at the close instant");
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0, "no active JobPosting may survive closure");
  assert.equal(
    await page.locator('#application-form textarea[name="role_question_1"]').inputValue(),
    "",
    "the applicant's draft must not survive in the taken-down form",
  );
  // isVisible() cannot tell a removed element from a rendered zero box, and only the latter stays
  // in the accessibility tree as a live region.
  const emptyReceipt = await page.locator("[data-submission-receipt]").evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      display: style.display,
      visibility: style.visibility,
      height: node.getBoundingClientRect().height,
      borderWidth: style.borderTopWidth,
      text: node.textContent,
    };
  });
  assert.notEqual(emptyReceipt.display, "none", "the empty live region must stay in the accessibility tree");
  assert.notEqual(emptyReceipt.visibility, "hidden", "the empty live region must not be visibility-hidden either");
  assert.equal(emptyReceipt.height, 0, "the empty live region must occupy no layout on a closed page");
  assert.equal(emptyReceipt.borderWidth, "0px", "the empty live region must not paint a callout rule");
  assert.equal(emptyReceipt.text, "", "the empty live region must make no claim before a submission is accepted");
  await context.close();
}

// An endpoint outage at the weekly boundary must not outlive the role's own close instant: the
// monotonic anchor closes the page with no successful response at all.
{
  const closesSoon = "2026-08-12T09:00:01.500Z";
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let served = 0;
  await context.route("**/api/role-state?role=*", (route) => {
    served += 1;
    if (served === 1) {
      return fulfillJson(route, 200, {
        ...openRoleResponse,
        state: { ...openState, nextRefreshAt: "2026-08-12T09:00:00.500Z", effectiveClosesAt: closesSoon, validThrough: closesSoon },
      });
    }
    return route.abort("failed");
  });
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "domcontentloaded" });
  await waitForOpenRole(page);
  await page.locator('#application-form textarea[name="role_question_1"]').fill("Draft typed during the outage.");
  await page.getByRole("heading", { name: "This role is closed" }).waitFor();
  assert.equal(await page.locator("#application-form").isVisible(), false, "an outage must not keep the form up past the close instant");
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0, "an outage must not keep an active JobPosting past the close instant");
  const servedAtTakedown = served;
  await page.waitForTimeout(2500);
  assert.equal(served, servedAtTakedown, "a taken-down page must stop polling the role-state endpoint");
  await context.close();
}

// A closed page is terminal: a role-state response still in flight when closure lands must not
// resurrect the countdown, the role content, the JobPosting, or the polling loop.
{
  const closesSoon = "2026-08-12T09:00:01.200Z";
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let served = 0;
  await context.route("**/api/role-state?role=*", async (route) => {
    served += 1;
    if (served === 1) {
      return fulfillJson(route, 200, {
        ...openRoleResponse,
        state: { ...openState, nextRefreshAt: "2026-08-12T09:00:00.400Z", effectiveClosesAt: closesSoon, validThrough: closesSoon },
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return fulfillJson(route, 200, {
      ...openRoleResponse,
      serverNow: "2026-08-12T09:00:00.900Z",
      state: { ...openState, nextRefreshAt: "2026-08-12T09:00:30.000Z" },
    });
  });
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "domcontentloaded" });
  await waitForOpenRole(page);
  await page.getByRole("heading", { name: "This role is closed" }).waitFor({ timeout: 6000 });
  await page.waitForTimeout(3000);
  assert.equal(await page.locator('[data-role-page-state="closed"]').count(), 1, "a late open response must not reopen the role");
  assert.equal(await page.locator("#application-form").isVisible(), false, "a late open response must not restore the form");
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0, "a late open response must not restore active JobPosting data");
  assert.equal(served, 2, "a late open response must not re-arm the polling loop");
  await context.close();
}

// An application accepted just before closure still has to hand the applicant their reference,
// outside the form that closure removed.
{
  const closesSoon = "2026-08-12T09:00:01.200Z";
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installRoleSequence(context, [
    { ...openRoleResponse, state: { ...openState, nextRefreshAt: closesSoon, effectiveClosesAt: closesSoon, validThrough: closesSoon } },
    { ...openRoleResponse, status: "closed", state: { ...openState, isOpen: false } },
  ]);
  await context.route("**/api/applications", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return fulfillJson(route, 200, { success: true, ref: "CB-TEST-4821" });
  });
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "domcontentloaded" });
  await waitForOpenRole(page);
  const receipt = page.locator("[data-submission-receipt]");
  // The empty region must already be mounted and live before the reference arrives, or the change
  // is never announced.
  assert.equal(await receipt.count(), 1, "the live region must be mounted before the reference lands");
  assert.equal(await receipt.getAttribute("role"), "status", "the standalone confirmation must be announced");
  assert.equal(await receipt.isVisible(), false, "the empty live region must not paint an empty callout");
  assert.notEqual(
    await receipt.evaluate((node) => getComputedStyle(node).display),
    "none",
    "the live region must not be removed from the accessibility tree while it waits for a reference",
  );
  await page.evaluate(() => {
    document.querySelectorAll("#application-form [required]").forEach((field) => field.removeAttribute("required"));
  });
  await page.locator('#application-form button[type="submit"]').click();
  await page.getByRole("heading", { name: "This role is closed" }).waitFor({ timeout: 6000 });
  await receipt.waitFor({ timeout: 6000 });
  assert.match(await receipt.textContent(), /CB-TEST-4821/, "the reference must reach the applicant outside the removed form");
  assert.equal(await receipt.isVisible(), true, "the confirmation must be visible outside the hidden form");
  const receiptStyle = await receipt.evaluate((node) => {
    const style = getComputedStyle(node);
    const message = getComputedStyle(document.querySelector("[data-role-state-message]"));
    return {
      color: style.color,
      fontSize: style.fontSize,
      borderWidth: style.borderTopWidth,
      mutedColor: message.color,
      mutedFontSize: message.fontSize,
    };
  });
  assert.equal(receiptStyle.borderWidth, "1px", "the populated confirmation should gain its callout rule");
  assert.notEqual(receiptStyle.color, receiptStyle.mutedColor, "the confirmation must not read as de-emphasised secondary copy");
  assert.equal(receiptStyle.fontSize, "16px", "the confirmation should keep its intended type size");
  assert.notEqual(receiptStyle.fontSize, receiptStyle.mutedFontSize);
  assert.equal(await page.locator("#application-form").isVisible(), false, "the confirmation must not reopen the application form");
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0, "the confirmation must not restore active JobPosting data");
  assert.equal(await page.locator('[data-role-page-state="closed"]').count(), 1, "the role must stay closed after a late acceptance");
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
  const context = await browser.newContext();
  const requestedRoleStateUrls = [];
  await context.route("**/api/role-state?role=*", (route) => {
    requestedRoleStateUrls.push(route.request().url());
    return fulfillJson(route, 200, openRoleResponse);
  });
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "domcontentloaded" });
  await waitForOpenRole(page);
  assert.deepEqual(
    [...new Set(requestedRoleStateUrls)],
    [`${baseUrl}/api/role-state?role=chief-of-staff`],
    "a locally served page must read the authority from the function it is served by",
  );

  const resolved = await page.evaluate(async () => {
    const endpoints = await import("/scripts/api-endpoints.js");
    return ["carenbloom.com", "www.carenbloom.com", "carenbloom-redesign-a.vercel.app", "127.0.0.1"].map((hostname) => ({
      hostname,
      roleState: endpoints.resolveRoleStateEndpoint({ hostname }, {}),
      applications: endpoints.resolveApplicationsEndpoint({ hostname }, {}),
    }));
  });
  assert.deepEqual(resolved, [
    {
      hostname: "carenbloom.com",
      roleState: "/api/role-state",
      applications: "/api/applications",
    },
    {
      hostname: "www.carenbloom.com",
      roleState: "/api/role-state",
      applications: "/api/applications",
    },
    {
      hostname: "carenbloom-redesign-a.vercel.app",
      roleState: "/api/role-state",
      applications: "/api/applications",
    },
    {
      hostname: "127.0.0.1",
      roleState: "/api/role-state",
      applications: "/api/applications",
    },
  ]);
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route("**/api/role-state", (route) => fulfillJson(route, 200, {
    status: "ok",
    serverNow,
    openRoleCount: 0,
    groupCounts: {},
    nextBoundaryAt: "2026-08-16T16:00:00.000Z",
    roles: [],
  }));
  const page = await newTestPage(context);
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.locator('[data-careers-state="ready"]').waitFor();
  assert.equal(await page.locator("a.job-row").count(), 0);
  assert.equal(
    await page.locator("[data-career-group-count]").count(),
    0,
    "a group with no open role must not print an empty heading and a zero chip",
  );
  assert.equal(await page.locator("[data-careers-list]").textContent(), "No current openings.");
  assert.equal(await page.locator("[data-careers-summary]").textContent(), "(07) Careers · 0 roles open");
  assert.deepEqual(
    [...new Set(await page.locator("[data-recruiting-status]").allTextContents())],
    ["No current openings"],
  );
  assert.equal(await page.locator("[data-role-marks] circle").count(), 0);
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
  assert.deepEqual(
    [...new Set(await page.locator("[data-open-role-count]").allTextContents())],
    ["Unavailable"],
    "an endpoint failure must not leave the count chips on their pre-authority placeholder",
  );
  assert.deepEqual(
    [...new Set(await page.locator("[data-open-role-count]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label"))))],
    ["Open roles unavailable"],
    "the concise failure chip must still carry the full accessible unavailable status",
  );
  assert.deepEqual(
    [...new Set(await page.locator("[data-recruiting-status]").allTextContents())],
    ["Openings unavailable"],
  );
  assert.equal(
    await page.locator("[data-role-marks]").getAttribute("aria-label"),
    "Open-role count unavailable",
    "the marks graphic must not announce loading forever",
  );
  await context.close();
}

// The 320px floating bar holds the chip whole and lets the wordmark flex, so an over-long failure
// label silently scales the approved lockup down instead of clipping.
{
  const lockupWidth = async (install) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 720 } });
    await install(context);
    const page = await newTestPage(context);
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await page.locator("[data-careers-list]:not([data-careers-state='loading'])").waitFor({ timeout: 6000 });
    await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
    await page.waitForTimeout(500);
    const width = await page.locator(".topbar .brand-logo").evaluate((logo) => logo.getBoundingClientRect().width);
    await context.close();
    return width;
  };

  const readyLockup = await lockupWidth((context) => context.route("**/api/role-state", (route) => fulfillJson(route, 200, {
    status: "ok",
    serverNow,
    openRoleCount: careerRoles.length,
    groupCounts: { "source-build": 1, launch: 6, scale: 3, platform: 2 },
    roles: careerRoles.map((role) => ({ ...role, careerGroup: groupBySlug[role.slug], state: resolveRoleState(serverNow, role) })),
  })));
  const failedLockup = await lockupWidth((context) => context.route("**/api/role-state", (route) => route.abort("failed")));
  assert.ok(readyLockup >= 100, `the 320px lockup should print at its optical width when authority lands (${readyLockup}px)`);
  assert.ok(
    failedLockup >= readyLockup,
    `the endpoint-failure chip must not shrink the 320px Care & Bloom lockup (${failedLockup}px vs ${readyLockup}px)`,
  );
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

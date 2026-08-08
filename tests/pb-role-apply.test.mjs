import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://localhost:49279";
const expectedRoles = [
  ["Product & Project Manager", "product-project-manager"],
  ["Product Marketing Lead", "product-marketing-lead"],
  ["Graphic Designer", "graphic-designer"],
  ["Video Editor", "video-editor"],
  ["Creative Strategist, Performance Marketing", "creative-strategist-performance-marketing"],
  ["Social Media Strategist", "social-media-strategist"],
  ["Head of Performance Marketing", "head-of-performance-marketing"],
  ["Growth Lead, Mobile Apps", "growth-lead-mobile-apps"],
  ["AI-Native Product Manager, Apps", "ai-native-product-manager-apps"],
  ["Chief of Staff", "chief-of-staff"],
  ["Entrepreneur-in-Residence", "entrepreneur-in-residence"],
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
const roleRows = page.locator("a.job-row");
assert.equal(await roleRows.count(), 11);
assert.equal(await page.locator('a[href="#"]').count(), 0);
assert.equal(await page.locator('.topbar a[href="#careers"]').count(), 2);

const renderedRoles = await roleRows.evaluateAll((rows) => rows.map((row) => [
  row.querySelector(".j-name")?.textContent?.trim(),
  new URL(row.href).searchParams.get("role"),
]));
assert.deepEqual(renderedRoles, expectedRoles);

const pbHeaderMetrics = await page.evaluate(() => {
  const header = document.querySelector(".topbar");
  const headerRect = header.getBoundingClientRect();
  return { x: headerRect.x, width: headerRect.width, height: headerRect.height };
});

await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "networkidle" });
const applicationHeader = page.locator(".application-topbar");
assert.equal(await applicationHeader.count(), 1);
assert.deepEqual(
  await applicationHeader.locator("nav a").evaluateAll((links) => links.map((link) => [link.textContent, link.getAttribute("href")])),
  [
    ["Themes", "/#themes"],
    ["Brands", "/#brands"],
    ["People", "/#people"],
    ["Careers", "/#careers"],
  ],
);
const applicationHeaderMetrics = await applicationHeader.evaluate((header) => {
  const headerRect = header.getBoundingClientRect();
  return { x: headerRect.x, width: headerRect.width, height: headerRect.height };
});
assert.deepEqual(applicationHeaderMetrics, pbHeaderMetrics, "the application header should retain the integrated home geometry");
assert.equal(await applicationHeader.locator(':scope > a[aria-label="Care and Bloom home"] svg').count(), 0, "the logo replacement should stay within the two homepage locations in scope");
assert.equal((await applicationHeader.locator(':scope > a[aria-label="Care and Bloom home"]').textContent()).trim(), "Care & Bloom");
await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });

for (const [, slug] of expectedRoles) {
  const response = await page.request.get(`${baseUrl}/careers/apply/?role=${slug}`);
  assert.equal(response.status(), 200, `${slug} should resolve to a valid application page`);
}

await roleRows.first().focus();
assert.equal(await roleRows.first().evaluate((row) => row.matches(":focus-visible")), true);
assert.notEqual(await roleRows.first().evaluate((row) => getComputedStyle(row).outlineStyle), "none");
await page.keyboard.press("Tab");
assert.equal(await roleRows.nth(1).evaluate((row) => document.activeElement === row), true);

const roleCases = [
  {
    slug: "product-project-manager",
    title: "Product & Project Manager",
    mission: "co-pilot alongside the Head of Product",
    question: "complex product launch",
  },
  {
    slug: "creative-strategist-performance-marketing",
    title: "Creative Strategist, Performance Marketing",
    mission: "Bridge between data and creative that converts",
    question: "paid social ad",
  },
];

for (const roleCase of roleCases) {
  await page.goto(`${baseUrl}/careers/apply/?role=${roleCase.slug}`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("[data-role-title]").textContent(), roleCase.title);
  assert.match(await page.locator("[data-role-mission]").textContent(), new RegExp(roleCase.mission, "i"));
  assert.match(await page.locator('[name="role_question_1"]').locator("xpath=preceding-sibling::span").textContent(), new RegExp(roleCase.question, "i"));
  assert.equal(await page.locator('[name="role_question_1"]').getAttribute("required"), "");
}

const unlabeledControls = await page.locator("#application-form input:not([type=hidden]), #application-form select, #application-form textarea").evaluateAll((controls) => controls
  .filter((control) => control.labels.length === 0 && !control.getAttribute("aria-label"))
  .map((control) => control.getAttribute("name")));
assert.deepEqual(unlabeledControls, []);

await page.locator('button[type="submit"]').click();
assert.equal(await page.locator('[name="first_name"]').evaluate((input) => input.matches(":invalid")), true);
assert.notEqual(await page.locator('[name="first_name"]').evaluate((input) => input.validationMessage), "");
assert.equal(await page.locator('[name="first_name"]').evaluate((input) => document.activeElement === input), true);

async function fillRequiredApplication(targetPage) {
  await targetPage.locator('[name="first_name"]').fill("Ada");
  await targetPage.locator('[name="last_name"]').fill("Lovelace");
  await targetPage.locator('[name="email"]').fill("ada@example.com");
  await targetPage.locator('[name="phone_country_code"]').selectOption("+1");
  await targetPage.locator('[name="phone_number"]').fill("5551234567");
  await targetPage.locator('[name="resume"]').setInputFiles({
    name: "cb-test-resume.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("test resume"),
  });
  await targetPage.locator('[name="intro_video_url"]').fill("https://www.loom.com/share/test");
  await targetPage.locator('[name="monthly_income_usd"]').fill("12000");
  await targetPage.locator('[name="open_time_zone"][value="US"]').check();
  await targetPage.locator('[name="location"]').selectOption("United States");
  await targetPage.locator('[name="role_question_1"]').fill("Answer one.");
  await targetPage.locator('[name="role_question_2"]').fill("Answer two.");
  await targetPage.locator('[name="role_question_3"]').fill("Answer three.");
}

await page.unroute("**/api/applications");
await page.route("**/api/applications", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: false, error: "Review service unavailable. Try again." }),
  });
});
await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "networkidle" });
await fillRequiredApplication(page);
await page.locator('button[type="submit"]').click();
await page.getByText("Review service unavailable. Try again.").waitFor();
assert.equal(await page.locator(".application-form-status").getAttribute("data-state"), "error");

await page.unroute("**/api/applications");
await page.route("**/api/applications", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, ref: "CB-PB-TEST" }),
  });
});
await page.reload({ waitUntil: "networkidle" });
await fillRequiredApplication(page);
await page.locator('button[type="submit"]').click();
await page.getByText("Application received. Reference: CB-PB-TEST.").waitFor();
assert.equal(await page.locator(".application-form-status").getAttribute("data-state"), "success");

const fixedNow = new Date("2026-08-02T16:00:00.000Z");
const deadlinePage = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
deadlinePage.setDefaultTimeout(3000);
await deadlinePage.clock.setFixedTime(fixedNow);
for (const [, slug] of expectedRoles) {
  const authoritativeResponse = await deadlinePage.request.get(`${baseUrl}/api/role-state?role=${slug}`);
  assert.equal(authoritativeResponse.status(), 200);
  const authoritative = await authoritativeResponse.json();
  const expected = authoritative.state;
  await deadlinePage.goto(`${baseUrl}/careers/apply/?role=${slug}`, { waitUntil: "networkidle" });
  assert.equal(await deadlinePage.locator("[data-close-date]").textContent(), expected.visibleCloseLabel);
  assert.match(await deadlinePage.locator("[data-close-countdown]").textContent(), /^\d+d \d+h \d+m \d+s$/);
  assert.equal(await deadlinePage.locator("[data-close-countdown]").getAttribute("datetime"), expected.validThrough);
  assert.equal(await deadlinePage.locator("[data-close-apply]").getAttribute("aria-label"), expected.applyLabel);
  const structuredData = await deadlinePage.locator('script[type="application/ld+json"]').evaluate((script) => JSON.parse(script.textContent));
  assert.equal(structuredData.validThrough, expected.validThrough);
  assert.equal(structuredData.datePosted, expected.datePosted);
}
await deadlinePage.close();

await browser.close();
console.log("PB role routing, rendering, focus, validation, and stubbed status test passed");

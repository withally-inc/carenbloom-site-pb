import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  const home = await page.goto(`${baseUrl}/`, { waitUntil: "load" });
  assert.equal(home?.status(), 200, "the home page should render");
  assert.match(await page.title(), /Care & Bloom/);
  assert.equal(await page.locator("h1").first().isVisible(), true, "the home headline should be visible");

  const roleState = await (await fetch(`${baseUrl}/api/role-state`)).json();
  assert.ok(roleState.openRoleCount > 0, "the dry-run API should report open roles");

  await page.goto(`${baseUrl}/careers`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("[data-careers-list]")?.dataset.state !== "loading", null, { timeout: 15000 });
  const rows = await page.locator('[data-careers-list] a[href^="/careers/apply?role="]').count();
  assert.equal(rows, roleState.openRoleCount, "careers should list every open role from the API");

  await page.goto(`${baseUrl}/careers/apply?role=chief-of-staff`, { waitUntil: "load" });
  await page.waitForFunction(
    () => [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => s.textContent.includes("JobPosting")),
    null,
    { timeout: 15000 },
  );
  const posting = await page.evaluate(() =>
    [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => JSON.parse(s.textContent))
      .find((entry) => entry["@type"] === "JobPosting"),
  );
  assert.equal(posting.title, "Chief of Staff", "the apply page should publish the role's JobPosting");

  await page.goto(`${baseUrl}/careers/apply?role=not-a-real-role`, { waitUntil: "load" });
  await page.getByText("Role not found").first().waitFor({ timeout: 15000 });

  assert.deepEqual(pageErrors, [], "no page should throw");
  console.log("v4 site browser tests passed");
} finally {
  await browser.close();
}

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

  await page.goto(`${baseUrl}/#careers`, { waitUntil: "load" });
  const careersAnchor = page.locator('#careers');
  assert.equal(await careersAnchor.count(), 1, "legacy careers fragments reach a meaningful section");
  const openings = careersAnchor.locator('a[href="/careers"]').first();
  await openings.click();
  await page.waitForURL(/\/careers\/?$/);
  await page.locator('[data-careers-list][data-state="ready"]').waitFor();
  assert.equal(await page.locator('[data-careers-list] a[href*="role="]').count() > 0, true);

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

  const visit = await page.goto(`${baseUrl}/visit/hong-kong/`, { waitUntil: "load" });
  assert.equal(visit?.status(), 200);
  await page.waitForFunction(() => document.documentElement.classList.contains("ready"));
  assert.match(await page.title(), /Visit Hong Kong/);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, follow");
  assert.equal(await page.locator("main h1").count(), 1);
  assert.equal(await page.locator("[data-hotel]").count(), 7);
  assert.equal(await page.locator("[data-place]").count(), 8);
  // Exercise the rendered image contract: each photo must actually decode when scrolled into view.
  // This catches broken files and lazy-loading failures, not just the presence of image markup.
  let photoBytes = 0;
  const photoUrls = new Set();
  for (const card of await page.locator("[data-hotel], [data-place]").all()) {
    const photo = card.locator("figure img");
    assert.equal(await photo.count(), 1, "each named venue has one photo");
    assert.ok((await photo.getAttribute("alt"))?.trim().length > 20, "photos have descriptive alt text");
    assert.equal(await photo.getAttribute("loading"), "lazy");
    assert.equal(await photo.getAttribute("decoding"), "async");
    await photo.scrollIntoViewIfNeeded();
    await photo.evaluate((image) => image.decode());
    const image = await photo.evaluate((element) => ({
      width: element.naturalWidth, height: element.naturalHeight,
      reservedWidth: Number(element.getAttribute("width")), reservedHeight: Number(element.getAttribute("height")),
      url: element.currentSrc, candidates: element.srcset.split(",").map((entry) => entry.trim().split(/\s+/)[0]),
    }));
    // srcset density-corrects naturalWidth; check physical pixels below on the standalone file.
    assert.ok(image.width > 0 && image.height > 0, "the rendered card photo decoded");
    assert.ok(Math.abs(image.reservedWidth / image.reservedHeight - image.width / image.height) < 0.01, "intrinsic dimensions reserve the correct aspect ratio");
    for (const url of [image.url, ...image.candidates]) photoUrls.add(new URL(url, baseUrl).href);
    assert.equal(await card.locator('figcaption a[href^="https://commons.wikimedia.org/"]').count(), 1, "photo credit links to its source");
    assert.equal(await card.locator('figcaption a[href^="https://creativecommons.org/"]').count(), 1, "photo credit links to its licence");
  }
  for (const url of photoUrls) {
    assert.equal(new URL(url).origin, new URL(baseUrl).origin, "photos are self-hosted");
    const response = await fetch(url);
    assert.equal(response.status, 200, "every responsive variant is served");
    assert.match(response.headers.get("content-type"), /image\/webp/);
    photoBytes += (await response.arrayBuffer()).byteLength;
    const pixels = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }, url);
    assert.ok(pixels.width >= 384 && pixels.height >= 288, "every responsive file has sufficient physical resolution");
  }
  assert.ok(photoBytes < 1.5 * 1024 * 1024, "all photo variants stay within a 1.5 MiB budget");
  assert.equal(await page.locator("main iframe").count(), 0);
  for (const link of await page.locator('main a[href^="#"]').all()) {
    const hash = await link.getAttribute("href");
    assert.equal(await page.locator(hash).count(), 1, `${hash} jump target exists`);
  }
  await page.getByRole("link", { name: "Where to stay" }).click();
  await page.waitForFunction(() => document.activeElement?.id === "stay");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const theme of ["light", "violet"]) {
      await page.evaluate((value) => document.documentElement.dataset.theme = value, theme);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px ${theme} has no horizontal overflow`);
    }
  }
  // The full guide and navigation remain available when enhancement is unavailable.
  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const staticPage = await noScript.newPage();
    await staticPage.goto(`${baseUrl}/visit/hong-kong/`);
    assert.equal(await staticPage.getByRole("heading", { name: "See you in Hong Kong." }).isVisible(), true);
    assert.equal(await staticPage.locator("[data-hotel]").count(), 7);
    const staticPhoto = staticPage.locator("[data-hotel] img").first();
    await staticPhoto.scrollIntoViewIfNeeded();
    assert.ok(await staticPhoto.isVisible(), "venue photography is present without page JavaScript");
    await staticPage.getByRole("link", { name: "Lunch · 02" }).click();
    assert.match(staticPage.url(), /#lunch$/);
    assert.equal(await staticPage.locator("#lunch").isVisible(), true);
  } finally {
    await noScript.close();
  }
  assert.deepEqual(pageErrors, [], "no page should throw");
  console.log("v4 site browser tests passed");
} finally {
  await browser.close();
}

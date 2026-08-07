import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mediaRequests = [];
  page.on("request", (request) => {
    if (request.resourceType() === "media") mediaRequests.push(request.url());
  });

  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(250);

  assert.deepEqual(mediaRequests, [], "the small-viewport hero should not fetch the 1.8MB video");
  assert.equal(await page.locator("#heroMedia").getAttribute("data-state"), "static");
  assert.match(
    await page.locator(".hero-frame-start").evaluate((image) => image.currentSrc),
    /hero-grow-start(?:-448)?\.avif$/,
    "the mobile hero should select an optimized AVIF still",
  );
} finally {
  await browser.close();
}

console.log("mobile hero performance browser tests passed");

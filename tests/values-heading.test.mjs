import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";
const viewports = [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
];
const browser = await chromium.launch({ headless: true });

async function waitForFonts(page) {
  await page.evaluate(() => Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]));
}

async function headingMetrics(page) {
  return page.locator("#values .vt-display").evaluate((heading) => {
    const text = heading.querySelector(":scope > .line > span");
    const textRect = text.getBoundingClientRect();
    const textStyle = getComputedStyle(text);
    return {
      childLines: heading.querySelectorAll(":scope > .line").length,
      text: text.textContent.trim(),
      height: textRect.height,
      lineHeight: Number.parseFloat(textStyle.lineHeight),
      left: textRect.left,
      right: textRect.right,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      transform: textStyle.transform,
      transitionDuration: textStyle.transitionDuration,
      revealed: heading.classList.contains("in"),
    };
  });
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await waitForFonts(page);

    const initial = await headingMetrics(page);
    assert.equal(initial.childLines, 1, `${viewport.width}px heading should contain one reveal line`);
    assert.equal(initial.text, "Our operating values", `${viewport.width}px heading should use the approved copy`);
    assert.ok(initial.height <= initial.lineHeight * 1.1, `${viewport.width}px heading should remain one visual line`);
    assert.ok(initial.left >= -1 && initial.right <= viewport.width + 1, `${viewport.width}px heading should stay inside the viewport`);
    assert.equal(initial.overflow, 0, `${viewport.width}px page should not overflow horizontally`);
    assert.equal(initial.revealed, false, `${viewport.width}px offscreen heading should begin staged`);
    assert.notEqual(initial.transform, "none", `${viewport.width}px staged heading should begin translated`);
    assert.notEqual(initial.transform, "matrix(1, 0, 0, 1, 0, 0)", `${viewport.width}px staged heading should begin translated`);

    await page.locator("#values .vt-display").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector("#values .vt-display")?.classList.contains("in"));
    await page.waitForTimeout(900);
    const revealed = await headingMetrics(page);
    const restOffset = revealed.transform === "none"
      ? 0
      : Number.parseFloat(revealed.transform.match(/^matrix\(1, 0, 0, 1, 0, (-?[\d.e+-]+)\)$/)?.[1] ?? "NaN");
    assert.ok(Math.abs(restOffset) < 0.5, `${viewport.width}px reveal should finish at rest, got ${revealed.transform}`);
    assert.notEqual(revealed.transitionDuration, "0s", `${viewport.width}px reveal should retain its staged transition`);
    await page.close();
  }

  for (const viewport of [viewports[0], viewports[4]]) {
    const context = await browser.newContext({ viewport, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    const noJs = await headingMetrics(page);
    assert.equal(noJs.text, "Our operating values");
    assert.equal(noJs.childLines, 1);
    assert.ok(noJs.height <= noJs.lineHeight * 1.1, `${viewport.width}px no-JavaScript heading should remain one visual line`);
    assert.equal(noJs.transform, "none", `${viewport.width}px no-JavaScript heading should be fully visible`);
    await context.close();
  }
} finally {
  await browser.close();
}

console.log("values heading checks passed");

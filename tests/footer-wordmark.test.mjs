import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";
const browser = await chromium.launch({ headless: true });
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 720 },
];

async function scrollToFooter(page) {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
}

async function wordmarkProbe(page) {
  return page.evaluate(() => {
    const wordmark = document.querySelector("[data-footer-wordmark]");
    const text = wordmark?.querySelector(".footer-wordmark-text");
    if (!wordmark || !text) return null;
    const wordmarkRect = wordmark.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();
    const style = getComputedStyle(text);
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      viewportWidth: innerWidth,
      wordmarkRect: { left: wordmarkRect.left, right: wordmarkRect.right, width: wordmarkRect.width, height: wordmarkRect.height },
      textRect: { left: textRect.left, right: textRect.right, width: textRect.width, height: textRect.height },
      fontFamily: style.fontFamily,
      opacity: Number.parseFloat(style.opacity),
      transform: style.transform,
      userSelect: style.userSelect,
    };
  });
}

try {
  const motionPage = await browser.newPage({ viewport: viewports[0] });
  const requestedUrls = [];
  motionPage.on("request", (request) => requestedUrls.push(request.url()));
  await motionPage.goto(`${baseUrl}/`, { waitUntil: "load" });
  await motionPage.evaluate(() => document.fonts.ready);

  const wordmark = motionPage.locator("[data-footer-wordmark]");
  assert.equal(await wordmark.count(), 1, "the footer should expose one live wordmark");
  assert.equal(await wordmark.evaluate((element) => element.tagName), "P", "the wordmark should be semantic text, not an image role");
  assert.equal((await wordmark.textContent()).replace(/\s+/g, " ").trim(), "Care & Bloom");
  assert.equal(await motionPage.locator("#contact img.wordmark").count(), 0, "the footer should not render the raster wordmark");
  assert.equal(await motionPage.locator("#contact .cf-mark").getAttribute("aria-hidden"), "true", "the compact duplicate mark should not be announced twice");

  await motionPage.waitForFunction(() => document.querySelector("[data-footer-wordmark]")?.classList.contains("is-motion-ready"));
  const before = await wordmarkProbe(motionPage);
  assert.equal(before.opacity, 0, "the prepared offscreen wordmark should wait below its crop");
  assert.notEqual(before.transform, "none", "the prepared offscreen wordmark should have an arrival transform");

  await scrollToFooter(motionPage);
  await motionPage.waitForFunction(() => document.querySelector("[data-footer-wordmark]")?.classList.contains("is-visible"));
  await motionPage.waitForTimeout(180);
  const during = await wordmarkProbe(motionPage);
  assert.ok(during.opacity > 0 && during.opacity < 1, `the arrival should be visibly running, received opacity ${during.opacity}`);
  assert.notEqual(during.transform, "none", "the wordmark should still be settling during the captured transition");

  await motionPage.waitForTimeout(1100);
  const after = await wordmarkProbe(motionPage);
  assert.equal(after.opacity, 1, "the wordmark should finish fully present");
  assert.equal(after.transform, "none", "the wordmark should finish on its natural layout geometry");
  assert.equal(await wordmark.evaluate((element) => element.classList.contains("is-visible")), true, "the arrival should complete once");
  assert.equal(requestedUrls.some((url) => url.includes("wordmark-dither-stacked.png")), false, "the removed raster must never be requested");
  await motionPage.close();

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await scrollToFooter(page);
    await page.waitForFunction(() => document.querySelector("[data-footer-wordmark]")?.classList.contains("is-visible"));
    await page.waitForTimeout(1200);
    const state = await wordmarkProbe(page);
    assert.ok(state, `${viewport.width}px should render the live wordmark`);
    assert.equal(state.overflow, 0, `${viewport.width}px must not overflow horizontally`);
    assert.ok(state.wordmarkRect.left >= -0.5 && state.wordmarkRect.right <= viewport.width + 0.5, `${viewport.width}px wordmark container should stay inside the viewport`);
    assert.ok(state.textRect.left >= -0.5 && state.textRect.right <= viewport.width + 0.5, `${viewport.width}px wordmark ink should stay inside the viewport`);
    assert.ok(state.textRect.width >= viewport.width * 0.88, `${viewport.width}px wordmark should fill the footer width`);
    assert.match(state.fontFamily, /Syne/, `${viewport.width}px wordmark should inherit the display face`);
    assert.notEqual(state.userSelect, "none", `${viewport.width}px wordmark should remain selectable`);
    assert.equal(state.opacity, 1, `${viewport.width}px wordmark should finish visible`);
    if (viewport.width === 320) {
      const conversationLine = await page.locator(".contact-display .line:nth-child(2) > span").evaluate((line) => {
        const style = getComputedStyle(line);
        return { height: line.getBoundingClientRect().height, lineHeight: Number.parseFloat(style.lineHeight) };
      });
      assert.ok(
        conversationLine.height <= conversationLine.lineHeight * 1.1,
        `the 320px contact heading should keep “conversation.” on one line (${conversationLine.height}px / ${conversationLine.lineHeight}px)`,
      );
    }
    await page.close();
  }

  const reducedPage = await browser.newPage({ viewport: viewports[0], reducedMotion: "reduce" });
  await reducedPage.goto(`${baseUrl}/`, { waitUntil: "load" });
  await reducedPage.evaluate(() => document.fonts.ready);
  const reducedWordmark = reducedPage.locator("[data-footer-wordmark]");
  assert.equal(await reducedWordmark.evaluate((element) => element.classList.contains("is-motion-ready")), false, "reduced motion should not prepare choreography");
  const reducedState = await wordmarkProbe(reducedPage);
  assert.equal(reducedState.opacity, 1, "reduced motion should render the final state immediately");
  assert.equal(reducedState.transform, "none");
  await reducedPage.close();

  const noJsContext = await browser.newContext({ viewport: viewports[0], javaScriptEnabled: false });
  const noJsPage = await noJsContext.newPage();
  await noJsPage.goto(`${baseUrl}/`, { waitUntil: "load" });
  const noJsState = await wordmarkProbe(noJsPage);
  assert.equal(noJsState.opacity, 1, "without JavaScript the wordmark should remain fully visible");
  assert.equal(noJsState.transform, "none");
  assert.equal(await noJsPage.locator("html").getAttribute("class"), null, "the no-JavaScript state should not depend on a stale enhancement class");
  const noJsContactHeading = await noJsPage.locator(".contact-display .line > span").evaluateAll((lines) => lines.map((line) => ({
    opacity: getComputedStyle(line).opacity,
    transform: getComputedStyle(line).transform,
  })));
  assert.deepEqual(
    noJsContactHeading,
    [{ opacity: "1", transform: "none" }, { opacity: "1", transform: "none" }],
    "the footer contact heading should remain present when JavaScript is disabled",
  );
  await noJsContext.close();
} finally {
  await browser.close();
}

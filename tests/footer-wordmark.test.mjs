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
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
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

async function installMotionSampler(page) {
  await page.addInitScript(() => {
    window.__wordmarkSamples = [];
    addEventListener("DOMContentLoaded", () => {
      const startedAt = performance.now();
      const timer = setInterval(() => {
        const text = document.querySelector("[data-footer-wordmark] .footer-wordmark-text");
        if (text) {
          const style = getComputedStyle(text);
          window.__wordmarkSamples.push({
            opacity: Number.parseFloat(style.opacity),
            transform: style.transform,
            animations: text.getAnimations().length,
          });
        }
        if (performance.now() - startedAt > 1500) clearInterval(timer);
      }, 16);
    }, { once: true });
  });
}

async function assertSampledMotion(page, message) {
  await page.waitForTimeout(500);
  const samples = await page.evaluate(() => window.__wordmarkSamples);
  assert.ok(
    samples.some((sample) => sample.animations > 0 || (sample.opacity > 0 && sample.opacity < 1)),
    `${message}; sampled ${JSON.stringify(samples.slice(0, 8))}`,
  );
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

  const restoredPage = await browser.newPage({ viewport: viewports[0] });
  await installMotionSampler(restoredPage);
  await restoredPage.goto(`${baseUrl}/`, { waitUntil: "load" });
  await scrollToFooter(restoredPage);
  await restoredPage.waitForFunction(() => scrollY > 0 && document.querySelector("[data-footer-wordmark]")?.getBoundingClientRect().top < innerHeight);
  await restoredPage.reload({ waitUntil: "load" });
  assert.ok(await restoredPage.evaluate(() => scrollY > 0), "reload should restore the footer scroll position");
  await assertSampledMotion(restoredPage, "a reload restored at the footer should animate");
  await restoredPage.close();

  const contactPage = await browser.newPage({ viewport: viewports[0] });
  await installMotionSampler(contactPage);
  await contactPage.goto(`${baseUrl}/#contact`, { waitUntil: "load" });
  await scrollToFooter(contactPage);
  await assertSampledMotion(contactPage, "a #contact arrival should animate");
  await contactPage.close();

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

  /* A deferred module runs after the wordmark has already painted, so hiding it may only be armed
     once the observer proves it is fully offscreen — never while it is on screen below threshold. */
  const raceContext = await browser.newContext({ viewport: viewports[0] });
  const racePage = await raceContext.newPage();
  await racePage.addInitScript(() => {
    window.__observers = [];
    window.IntersectionObserver = class {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options || {};
        this.targets = [];
        window.__observers.push(this);
      }
      observe(target) { this.targets.push(target); }
      unobserve(target) { this.targets = this.targets.filter((candidate) => candidate !== target); }
      disconnect() { this.targets = []; }
      takeRecords() { return []; }
    };
  });
  await racePage.goto(`${baseUrl}/`, { waitUntil: "load" });
  await racePage.evaluate(() => document.fonts.ready);

  const deliver = (ratio) => racePage.evaluate((intersectionRatio) => {
    const wordmark = document.querySelector("[data-footer-wordmark]");
    const observer = window.__observers.find((candidate) => candidate.targets.includes(wordmark));
    if (!observer) return null;
    const thresholds = [].concat(observer.options.threshold ?? 0);
    observer.callback([{ target: wordmark, intersectionRatio, isIntersecting: thresholds.some((value) => intersectionRatio >= value && intersectionRatio > 0) }], observer);
    return {
      thresholds,
      motionReady: wordmark.classList.contains("is-motion-ready"),
      visible: wordmark.classList.contains("is-visible"),
      observed: observer.targets.includes(wordmark),
      opacity: getComputedStyle(wordmark.querySelector(".footer-wordmark-text")).opacity,
    };
  }, ratio);

  const onScreenBelowThreshold = await deliver(0.1);
  assert.ok(onScreenBelowThreshold, "the wordmark should register an intersection observer");
  assert.ok(onScreenBelowThreshold.thresholds.includes(0), "the observer must watch the fully-offscreen boundary");
  assert.equal(onScreenBelowThreshold.motionReady, false, "an on-screen wordmark must not be armed for hiding");
  assert.equal(onScreenBelowThreshold.opacity, "1", "an already-painted, on-screen wordmark must never pop out of view");

  const initialContext = await browser.newContext({ viewport: viewports[0] });
  const initialPage = await initialContext.newPage();
  await initialPage.addInitScript(() => {
    window.__observers = [];
    window.IntersectionObserver = class {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options || {};
        this.targets = [];
        window.__observers.push(this);
      }
      observe(target) { this.targets.push(target); }
      unobserve(target) { this.targets = this.targets.filter((candidate) => candidate !== target); }
      disconnect() { this.targets = []; }
      takeRecords() { return []; }
    };
  });
  await initialPage.goto(`${baseUrl}/`, { waitUntil: "load" });
  await initialPage.evaluate(async () => {
    const wordmark = document.querySelector("[data-footer-wordmark]");
    const text = wordmark.querySelector(".footer-wordmark-text");
    getComputedStyle(text).opacity;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const observer = window.__observers.find((candidate) => candidate.targets.includes(wordmark));
    observer.callback([{ target: wordmark, intersectionRatio: 0.5, isIntersecting: true }], observer);
  });
  await initialPage.waitForTimeout(180);
  const initialDuring = await wordmarkProbe(initialPage);
  assert.ok(initialDuring.opacity > 0 && initialDuring.opacity < 1, `an initially intersecting wordmark should animate, received opacity ${initialDuring.opacity}`);
  assert.notEqual(initialDuring.transform, "none", "an initially intersecting wordmark should visibly settle");
  await initialContext.close();

  const offScreen = await deliver(0);
  assert.equal(offScreen.motionReady, true, "a fully offscreen wordmark should arm the arrival");
  assert.equal(offScreen.opacity, "0", "the armed wordmark should wait below its crop");

  const arrived = await deliver(0.5);
  assert.equal(arrived.observed, false, "the arrival should be one-shot");
  await racePage.waitForTimeout(180);
  const arrivedDuring = await wordmarkProbe(racePage);
  assert.ok(arrivedDuring.opacity > 0 && arrivedDuring.opacity < 1, `crossing the arrival ratio should animate, received opacity ${arrivedDuring.opacity}`);
  assert.equal(await racePage.locator("[data-footer-wordmark]").evaluate((element) => element.classList.contains("is-visible")), true, "crossing the arrival ratio should reveal the wordmark");
  await raceContext.close();

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

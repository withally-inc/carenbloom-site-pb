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

/* A real reader travels the page in frames, not in one jump: the sign-off must cross every
   threshold the old arming machinery watched without ever moving, fading or transitioning. */
async function scrollToFooterGradually(page) {
  await page.evaluate(async () => {
    const step = Math.max(40, Math.round(innerHeight / 8));
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    while (scrollY + innerHeight < document.documentElement.scrollHeight - 1) {
      const before = scrollY;
      window.scrollBy({ top: step, behavior: "instant" });
      await frame();
      if (scrollY === before) break;
    }
    await frame();
  });
}

async function wordmarkProbe(page) {
  return page.evaluate(() => {
    const wordmark = document.querySelector("[data-footer-wordmark]");
    const text = wordmark?.querySelector(".footer-wordmark-text");
    const clip = wordmark?.querySelector(".footer-wordmark-clip");
    if (!wordmark || !text || !clip) return null;
    const wordmarkRect = wordmark.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();
    const clipRect = clip.getBoundingClientRect();
    const style = getComputedStyle(text);
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      wordmarkRect: { left: wordmarkRect.left, right: wordmarkRect.right, width: wordmarkRect.width, height: wordmarkRect.height },
      textRect: { left: textRect.left, right: textRect.right, top: textRect.top, bottom: textRect.bottom, width: textRect.width, height: textRect.height },
      clipRect: { top: clipRect.top, bottom: clipRect.bottom, height: clipRect.height },
      fontFamily: style.fontFamily,
      fontSize: Number.parseFloat(style.fontSize),
      textStroke: style.webkitTextStrokeWidth,
      opacity: Number.parseFloat(style.opacity),
      transform: style.transform,
      transition: style.transitionProperty,
      animationName: style.animationName,
      animations: text.getAnimations().length,
      classes: wordmark.className,
      userSelect: style.userSelect,
    };
  });
}

/* Samples the sign-off from the first paint onward: any frame that is not fully present,
   or that carries a running animation or a declared transition, is a regression. */
async function installStaticSampler(page) {
  await page.addInitScript(() => {
    window.__wordmarkSamples = [];
    const sample = () => {
      const text = document.querySelector("[data-footer-wordmark] .footer-wordmark-text");
      if (!text) return;
      const style = getComputedStyle(text);
      window.__wordmarkSamples.push({
        opacity: style.opacity,
        transform: style.transform,
        transition: style.transitionProperty,
        animationName: style.animationName,
        animations: text.getAnimations().length,
      });
    };
    const timer = setInterval(sample, 16);
    addEventListener("load", () => setTimeout(() => clearInterval(timer), 2000), { once: true });
  });
}

function assertSampledStatic(samples, message) {
  assert.ok(samples.length > 0, `${message}; no samples were captured`);
  const moving = samples.filter(
    (sample) =>
      sample.opacity !== "1" ||
      sample.transform !== "none" ||
      sample.animations > 0 ||
      sample.animationName !== "none" ||
      (sample.transition !== "none" && sample.transition !== "all"),
  );
  assert.equal(moving.length, 0, `${message}; ${JSON.stringify(moving.slice(0, 4))}`);
}

async function readSamples(page) {
  return page.evaluate(() => window.__wordmarkSamples);
}

async function stylesheetLinkState(page) {
  return page.evaluate(() => {
    const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find((candidate) => candidate.getAttribute("href") === "style.css");
    if (!link) return null;
    return { media: link.getAttribute("media"), deferred: link.hasAttribute("onload") };
  });
}

try {
  const staticPage = await browser.newPage({ viewport: viewports[0] });
  await installStaticSampler(staticPage);
  const requestedUrls = [];
  staticPage.on("request", (request) => requestedUrls.push(request.url()));
  await staticPage.goto(`${baseUrl}/`, { waitUntil: "load" });
  await staticPage.evaluate(() => document.fonts.ready);

  const wordmark = staticPage.locator("[data-footer-wordmark]");
  assert.equal(await wordmark.count(), 1, "the footer should expose one live wordmark");
  assert.equal(await wordmark.evaluate((element) => element.tagName), "P", "the wordmark should be semantic text, not an image role");
  assert.equal((await wordmark.textContent()).replace(/\s+/g, " ").trim(), "Care & Bloom");
  assert.equal(await staticPage.locator("#contact img.wordmark").count(), 0, "the footer should not render the raster wordmark");
  assert.equal(await staticPage.locator("#contact .cf-mark").getAttribute("aria-hidden"), "true", "the compact duplicate mark should not be announced twice");
  assert.equal(requestedUrls.some((url) => url.includes("wordmark-dither-stacked.png")), false, "the removed raster must never be requested");

  const onLoad = await wordmarkProbe(staticPage);
  assert.equal(onLoad.opacity, 1, "the sign-off should be fully present on a fresh load");
  assert.equal(onLoad.transform, "none", "the sign-off should sit on its natural layout geometry");
  assert.equal(onLoad.animations, 0, "the sign-off should carry no animation");
  assert.equal(onLoad.animationName, "none", "the sign-off should declare no keyframe animation");
  assert.equal(onLoad.classes, "footer-wordmark", "no arming state should ever be applied to the sign-off");

  await scrollToFooterGradually(staticPage);
  const afterGradualScroll = await wordmarkProbe(staticPage);
  assert.equal(afterGradualScroll.opacity, 1, "a gradual scroll-down should leave the sign-off fully present");
  assert.equal(afterGradualScroll.transform, "none", "a gradual scroll-down should never displace the sign-off");
  assert.equal(afterGradualScroll.classes, "footer-wordmark", "a gradual scroll-down should not arm any state");
  assertSampledStatic(await readSamples(staticPage), "a fresh load and gradual scroll must never animate the sign-off");
  await staticPage.close();

  /* critical.css is the whole stylesheet, so a reader who scrolls before style.css lands sees the
     finished page: below-fold sections must already carry their styled geometry without it. */
  const criticalOnlyPage = await browser.newPage({ viewport: viewports[0] });
  await criticalOnlyPage.route("**/style.css", (route) => route.abort());
  await criticalOnlyPage.goto(`${baseUrl}/`, { waitUntil: "load" });
  await criticalOnlyPage.evaluate(() => document.fonts.ready);
  await scrollToFooter(criticalOnlyPage);
  const criticalOnly = await wordmarkProbe(criticalOnlyPage);
  assert.match(criticalOnly.fontFamily, /PP Mori/, "critical.css alone should carry the sign-off's display face");
  assert.ok(criticalOnly.textRect.width >= viewports[0].width * 0.88, "critical.css alone should carry the sign-off's oversize scale");
  assert.equal(criticalOnly.opacity, 1, "critical.css alone should leave the sign-off visible");
  const criticalOnlyBelowFold = await criticalOnlyPage.evaluate(() => {
    const probe = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      return { display: style.display, maxWidth: style.maxWidth, position: style.position };
    };
    return { wrap: probe("#contact .wrap"), band: probe(".stat-band"), deck: probe(".value-deck") };
  });
  assert.notEqual(criticalOnlyBelowFold.wrap, null, "the contact section should exist below the fold");
  assert.notEqual(criticalOnlyBelowFold.wrap.maxWidth, "none", "below-fold sections must not paint unstyled before style.css arrives");
  assert.notEqual(criticalOnlyBelowFold.band, null, "the stat band should exist below the fold");
  assert.equal(criticalOnlyBelowFold.band.position, "relative", "the stat band must already be laid out by critical.css");
  await criticalOnlyPage.close();

  const restoredPage = await browser.newPage({ viewport: viewports[0] });
  await restoredPage.goto(`${baseUrl}/`, { waitUntil: "load" });
  await scrollToFooter(restoredPage);
  await restoredPage.waitForFunction(() => scrollY > 0 && document.querySelector("[data-footer-wordmark]")?.getBoundingClientRect().top < innerHeight);
  await installStaticSampler(restoredPage);
  await restoredPage.reload({ waitUntil: "load" });
  assert.ok(await restoredPage.evaluate(() => scrollY > 0), "reload should restore the footer scroll position");
  assert.deepEqual(await stylesheetLinkState(restoredPage), { media: "all", deferred: true }, "a reload should keep the source-of-record stylesheet off the render path");
  const restoredState = await wordmarkProbe(restoredPage);
  assert.equal(restoredState.opacity, 1, "a reload restored at the footer should render the sign-off present");
  assert.equal(restoredState.transform, "none", "a reload restored at the footer should render the sign-off static");
  assertSampledStatic(await readSamples(restoredPage), "a reload restored at the footer must not animate the sign-off");
  await restoredPage.close();

  const contactPage = await browser.newPage({ viewport: viewports[0] });
  await installStaticSampler(contactPage);
  await contactPage.goto(`${baseUrl}/#contact`, { waitUntil: "load" });
  await contactPage.evaluate(() => document.fonts.ready);
  assert.deepEqual(await stylesheetLinkState(contactPage), { media: "all", deferred: true }, "a hash arrival should keep the source-of-record stylesheet off the render path");
  const contactState = await wordmarkProbe(contactPage);
  assert.equal(contactState.opacity, 1, "a #contact arrival should render the sign-off present");
  assert.equal(contactState.transform, "none", "a #contact arrival should render the sign-off static");
  assertSampledStatic(await readSamples(contactPage), "a #contact arrival must not animate the sign-off");
  await contactPage.close();

  /* A history re-parse restores the viewport, so the blocking sheet alone must already carry the
     final geometry — the deferred source-of-record sheet may never be needed for layout. */
  const historyPage = await browser.newPage({ viewport: viewports[0] });
  await historyPage.goto(`${baseUrl}/`, { waitUntil: "load" });
  await scrollToFooter(historyPage);
  await historyPage.waitForFunction(() => scrollY > 0);
  await historyPage.goto(`${baseUrl}/careers/apply/`, { waitUntil: "load" });
  await installStaticSampler(historyPage);
  await historyPage.goBack({ waitUntil: "load" });
  assert.deepEqual(await stylesheetLinkState(historyPage), { media: "all", deferred: true }, "a back/forward navigation should keep the source-of-record stylesheet off the render path");
  assert.ok(await historyPage.evaluate(() => scrollY > 0), "back should restore the footer scroll position");
  const historyState = await wordmarkProbe(historyPage);
  assert.equal(historyState.opacity, 1, "a restored back navigation should render the sign-off present");
  assert.equal(historyState.transform, "none", "a restored back navigation should render the sign-off static");
  assertSampledStatic(await readSamples(historyPage), "a restored back navigation must not animate the sign-off");
  await historyPage.close();

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await scrollToFooter(page);
    const state = await wordmarkProbe(page);
    assert.ok(state, `${viewport.width}px should render the live wordmark`);
    assert.equal(state.overflow, 0, `${viewport.width}px must not overflow horizontally`);
    assert.ok(state.wordmarkRect.left >= -0.5 && state.wordmarkRect.right <= viewport.width + 0.5, `${viewport.width}px wordmark container should stay inside the viewport`);
    assert.ok(state.textRect.left >= -0.5 && state.textRect.right <= viewport.width + 0.5, `${viewport.width}px wordmark ink should stay inside the viewport`);
    assert.ok(state.textRect.width >= viewport.width * 0.88, `${viewport.width}px wordmark should fill the footer width`);
    assert.ok(state.textRect.top >= state.clipRect.top - 0.5, `${viewport.width}px wordmark should preserve every letter top`);
    const bottomCrop = state.textRect.bottom - state.clipRect.bottom;
    assert.ok(bottomCrop >= state.fontSize * 0.04, `${viewport.width}px wordmark should keep an intentional bottom crop`);
    assert.ok(bottomCrop <= state.fontSize * 0.1, `${viewport.width}px wordmark crop should not cut too deeply into PP Mori`);
    assert.match(state.fontFamily, /PP Mori/, `${viewport.width}px wordmark should inherit the display face`);
    assert.ok(Number.parseFloat(state.textStroke) >= 1, `${viewport.width}px wordmark should keep its ink stroke`);
    assert.notEqual(state.userSelect, "none", `${viewport.width}px wordmark should remain selectable`);
    assert.equal(state.opacity, 1, `${viewport.width}px wordmark should render fully present`);
    assert.equal(state.transform, "none", `${viewport.width}px wordmark should render static`);
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
  await installStaticSampler(reducedPage);
  await reducedPage.goto(`${baseUrl}/`, { waitUntil: "load" });
  await reducedPage.evaluate(() => document.fonts.ready);
  await scrollToFooter(reducedPage);
  const reducedState = await wordmarkProbe(reducedPage);
  assert.equal(reducedState.opacity, 1, "reduced motion should render the sign-off present");
  assert.equal(reducedState.transform, "none", "reduced motion should render the sign-off static");
  assert.equal(reducedState.classes, "footer-wordmark", "reduced motion should not apply any arming state");
  assertSampledStatic(await readSamples(reducedPage), "reduced motion must not animate the sign-off");
  await reducedPage.close();

  const noJsContext = await browser.newContext({ viewport: viewports[0], javaScriptEnabled: false });
  const noJsPage = await noJsContext.newPage();
  await noJsPage.goto(`${baseUrl}/`, { waitUntil: "load" });
  const noJsState = await wordmarkProbe(noJsPage);
  assert.equal(noJsState.opacity, 1, "without JavaScript the wordmark should remain fully visible");
  assert.equal(noJsState.transform, "none");
  assert.equal(noJsState.classes, "footer-wordmark", "the no-JavaScript state should carry no arming class");
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

console.log("footer sign-off browser tests passed");

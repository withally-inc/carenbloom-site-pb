import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";
const browser = await chromium.launch({ headless: true });

const SPRITE = "lemon-rotation-sprite.png";
const STATIC_MASTER = "lemon-print-master-static.png";
// the five default phases [0,2,4,6,8] as object-position percentages of the 10-frame sprite
const DEFAULT_POSITIONS = ["0% 50%", "22.2222% 50%", "44.4444% 50%", "66.6667% 50%", "88.8889% 50%"];

async function newPage(context, viewport = { width: 1440, height: 900 }) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.goto(baseUrl, { waitUntil: "load" });
  return page;
}

async function scrollBandIntoView(page) {
  await page.evaluate(() => {
    document.getElementById("lemonBand").scrollIntoView({ block: "center", behavior: "instant" });
  });
}

async function lemonState(page) {
  return page.evaluate(() => {
    const band = document.getElementById("lemonBand");
    return {
      running: band.classList.contains("is-running"),
      srcs: Array.from(band.querySelectorAll(".lemon img"), (img) => img.currentSrc.split("/").pop()),
      positions: Array.from(band.querySelectorAll(".lemon img"), (img) => img.style.objectPosition || "0% 50%"),
      transforms: Array.from(band.querySelectorAll(".lemon"), (lemon) => lemon.style.transform),
      willChange: Array.from(band.querySelectorAll(".lemon"), (lemon) => getComputedStyle(lemon).willChange),
    };
  });
}

const uniqueCount = (list) => new Set(list).size;
const phaseOf = (position) => Math.round((parseFloat(position) / 100) * 9);

// ---------- 1. ground, geometry, and the replaced mechanism ----------
{
  const context = await browser.newContext();
  const page = await newPage(context);

  const ground = await page.locator(".record").evaluate((el) => getComputedStyle(el).backgroundColor);
  assert.equal(ground, "rgb(253, 255, 109)", "the evidence band must stay exact #FDFF6D");

  assert.equal(await page.locator("#dotfield").count(), 0, "the dot field must be removed");
  assert.equal(await page.locator("#liveChip").count(), 0, "the mark-coupled live chip must be removed");
  assert.equal(await page.locator(".dotfield .mark").count(), 0, "no dot-field marks may remain");
  const bodyText = await page.locator("#record").textContent();
  assert.equal(bodyText.includes("1 mark"), false, "mark-specific copy must not survive");
  assert.equal(bodyText.includes("47 seconds"), false, "the mark-growth footnote must not survive");

  // the verified record facts and full-width stat bands stay
  assert.equal(await page.locator(".stat-band").count(), 3, "the three stat bands must be preserved");
  const statText = await page.locator(".stat-bands").textContent();
  for (const fact of ["1,000,000+", "9 figures", "months", "Customers", "Revenue", "Elapsed"]) {
    assert.ok(statText.includes(fact), `stat bands must keep “${fact}”`);
  }

  // five lemons, one accessible description for the whole band, no per-lemon announcements
  assert.equal(await page.locator("#lemonBand .lemon").count(), 5, "exactly five lemons");
  assert.equal(await page.locator("#lemonBand").getAttribute("role"), "img");
  const label = await page.locator("#lemonBand").getAttribute("aria-label");
  assert.ok(label && label.length > 12 && label.length < 160, "the band needs one concise useful description");
  assert.equal(label.toLowerCase().includes("march"), true, "the description should name the march");
  const lemonAlts = await page.locator("#lemonBand .lemon img").evaluateAll((imgs) => imgs.map((img) => img.alt));
  assert.deepEqual(lemonAlts, ["", "", "", "", ""], "individual lemons must not announce redundant images");

  await context.close();
}

// ---------- 2. motion: distinct stepped phases, translation, pause/resume, hidden document ----------
{
  const context = await browser.newContext();
  const page = await newPage(context);

  // offscreen at load: no motion, static default composition holds five distinct phases
  await page.waitForTimeout(900);
  const idle = await lemonState(page);
  assert.equal(idle.running, false, "the loop must not run while the band is offscreen");
  assert.equal(idle.srcs.every((src) => src === SPRITE), true, "all lemons share the one sprite");
  assert.deepEqual(idle.positions, DEFAULT_POSITIONS, "the default composition holds the five phase offsets");

  await scrollBandIntoView(page);
  await page.waitForFunction(() => document.getElementById("lemonBand").classList.contains("is-running"), null, { timeout: 4000 });

  const first = await lemonState(page);
  assert.equal(uniqueCount(first.positions.map(phaseOf)), 5, "every visible lemon must hold a distinct rotational phase");
  assert.equal(first.willChange.every((value) => value === "transform"), true, "will-change applies only while running");

  await page.waitForTimeout(650);
  const second = await lemonState(page);
  assert.equal(uniqueCount(second.positions.map(phaseOf)), 5, "phases must stay pairwise distinct while stepping");
  assert.notDeepEqual(second.positions, first.positions, "the stepped rotation must advance the phases");
  assert.notDeepEqual(second.transforms, first.transforms, "the lemons must be translating");
  // stepped, not smooth: phases advance by one shared rotation step, offsets [0,2,4,6,8] hold
  const phaseDelta = second.positions.map((position, i) => (phaseOf(position) - phaseOf(first.positions[i]) + 10) % 10);
  assert.equal(uniqueCount(phaseDelta), 1, "all lemons share one stepped clock — offsets never synchronize");

  // offscreen suspension
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForFunction(() => !document.getElementById("lemonBand").classList.contains("is-running"));
  const parked = await lemonState(page);
  await page.waitForTimeout(600);
  const parkedLater = await lemonState(page);
  assert.deepEqual(parkedLater.positions, parked.positions, "phases must freeze offscreen");
  assert.deepEqual(parkedLater.transforms, parked.transforms, "translation must freeze offscreen");
  assert.equal(parkedLater.willChange.every((value) => value === "auto"), true, "will-change must release when parked");

  // resume restores motion from the parked state
  await scrollBandIntoView(page);
  await page.waitForFunction(() => document.getElementById("lemonBand").classList.contains("is-running"));
  await page.waitForTimeout(500);
  const resumed = await lemonState(page);
  assert.notDeepEqual(resumed.transforms, parked.transforms, "the march must resume on re-entry");

  // hidden-document suspension
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(120);
  const hiddenState = await lemonState(page);
  assert.equal(hiddenState.running, false, "a hidden document must suspend the loop");
  await page.waitForTimeout(450);
  assert.deepEqual(await lemonState(page), hiddenState, "no phase or translation drift while hidden");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(400);
  assert.equal((await lemonState(page)).running, true, "returning to the tab must resume the loop");

  await context.close();
}

// ---------- 3. reduced motion: the static Candidate 03 print master, nothing moves ----------
{
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await newPage(context);
  await scrollBandIntoView(page);
  await page.waitForTimeout(700);
  const state = await lemonState(page);
  assert.equal(state.running, false, "reduced motion must never start the loop");
  assert.equal(
    state.srcs.every((src) => src === STATIC_MASTER),
    true,
    "reduced motion shows the static Candidate 03 print master",
  );
  assert.equal(state.transforms.every((t) => t === ""), true, "no scripted translation under reduced motion");
  const before = await page.locator("#lemonBand .lemon").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x));
  await page.waitForTimeout(600);
  const after = await page.locator("#lemonBand .lemon").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x));
  assert.deepEqual(after, before, "no translation under reduced motion");
  await context.close();
}

// ---------- 4. failure fallbacks: no JavaScript, and a failed sprite load ----------
{
  // no JavaScript: the static five-phase composition stands on its own
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const page = await newPage(noJs);
  await scrollBandIntoView(page);
  const state = await lemonState(page);
  assert.equal(state.srcs.every((src) => src === SPRITE), true);
  assert.deepEqual(state.positions, DEFAULT_POSITIONS, "the no-JS fallback holds the five distinct default phases");
  const boxes = await page.locator("#lemonBand .lemon img").evaluateAll((imgs) =>
    imgs.map((img) => {
      const rect = img.getBoundingClientRect();
      return { width: rect.width, height: rect.height, complete: img.complete && img.naturalWidth > 0 };
    }),
  );
  assert.equal(boxes.every((box) => box.width > 40 && box.height > 40 && box.complete), true, "the static composition must be visible");
  await noJs.close();

  // the sprite fails: the animation stands down and the record's content stays
  const partial = await browser.newContext();
  const partialPage = await partial.newPage();
  await partialPage.setViewportSize({ width: 1440, height: 900 });
  await partialPage.route(`**/assets/lemon-march/${SPRITE}`, (route) => route.abort());
  await partialPage.goto(baseUrl, { waitUntil: "load" });
  await partialPage.evaluate(() => {
    document.getElementById("lemonBand").scrollIntoView({ block: "center", behavior: "instant" });
  });
  await partialPage.waitForTimeout(1200);
  const fallbackState = await lemonState(partialPage);
  assert.equal(fallbackState.running, false, "a failed sprite must not start a broken loop");
  assert.deepEqual(fallbackState.transforms, ["", "", "", "", ""], "no scripted motion without the sprite");
  const statText = await partialPage.locator(".stat-bands").textContent();
  assert.ok(statText.includes("1,000,000+"), "the record's facts stay visible when media fails");
  await partial.close();
}

// ---------- 5. responsive: no horizontal overflow, legible composition at every width ----------
{
  const context = await browser.newContext();
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
    { width: 375, height: 812 },
    { width: 320, height: 720 },
  ]) {
    const page = await newPage(context, viewport);
    await scrollBandIntoView(page);
    await page.waitForTimeout(350);
    const metrics = await page.evaluate(() => {
      const band = document.getElementById("lemonBand").getBoundingClientRect();
      const lemons = Array.from(document.querySelectorAll("#lemonBand .lemon img"), (img) => img.getBoundingClientRect());
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        band: { width: band.width, height: band.height },
        lemons: lemons.map((rect) => ({ width: rect.width, height: rect.height })),
      };
    });
    assert.ok(
      metrics.scrollWidth <= metrics.clientWidth + 1,
      `${viewport.width}px: no horizontal page overflow (scrollWidth ${metrics.scrollWidth})`,
    );
    assert.ok(metrics.band.height > 0, `${viewport.width}px: the band renders`);
    for (const lemon of metrics.lemons) {
      assert.ok(lemon.width >= 60, `${viewport.width}px: every lemon stays legible (${Math.round(lemon.width)}px wide)`);
      assert.ok(Math.abs(lemon.height - lemon.width) < 2, `${viewport.width}px: lemons keep their square frame`);
    }
    await page.close();
  }
  await context.close();
}

await browser.close();
console.log("lemon-band: all behavioral checks passed");

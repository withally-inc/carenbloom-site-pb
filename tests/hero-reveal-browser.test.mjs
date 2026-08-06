import assert from "node:assert/strict";
import { chromium } from "playwright";

/* The opening-sequence contract (captain, hero-reveal): first paint is the type alone with a
   blank reserved art box, the hero art emerges after the wordmark's beat, and the five cards
   stay down until the art has fully arrived AND the visitor scrolls — earned in order, never
   both at once. Reduced motion, no-JS, and mid-page landings print everything immediately. */

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";
const browser = await chromium.launch({ headless: true });

const heroOpacity = (page) =>
  page.locator("#heroMedia").evaluate((media) => Number(getComputedStyle(media).opacity));

const chipStates = (page) =>
  page.locator(".chip").evaluateAll((chips) => chips.map((chip) => ({
    revealed: chip.classList.contains("chip-in"),
    opacity: Number(getComputedStyle(chip).opacity),
    display: getComputedStyle(chip).display,
  })));

const heroLayoutBox = (page) =>
  page.locator("#heroMedia").evaluate((media) => ({
    top: media.offsetTop,
    left: media.offsetLeft,
    width: media.offsetWidth,
    height: media.offsetHeight,
  }));

async function scrollInstant(page, y) {
  await page.evaluate((target) => window.scrollTo({ top: target, behavior: "instant" }), y);
}

try {
  // ---------- desktop fresh landing: type first, blank art side, cards down ----------
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  assert.equal(
    await desktop.locator(".word-top").evaluate((word) => Number(getComputedStyle(word).opacity)),
    1,
    "the wordmark type must be printed from first paint",
  );
  assert.equal(await heroOpacity(desktop), 0, "the art side must begin blank");
  const blankBox = await heroLayoutBox(desktop);
  assert.ok(blankBox.width > 0 && blankBox.height > 0, "the blank art side must hold its reserved box");
  assert.equal(
    await desktop.locator("#heroMedia").getAttribute("aria-label"),
    "A hand grows a flower from a true-stem bud into a yellow-breaking-through bloom",
    "the accessible name must survive the reveal rework",
  );
  assert.equal(await desktop.locator("#heroMedia").getAttribute("role"), "img");

  // ---------- the art emerges on its own, and the cards do NOT ----------
  await desktop.waitForFunction(
    () => Number(getComputedStyle(document.querySelector("#heroMedia")).opacity) === 1,
    undefined,
    { timeout: 6000 },
  );
  assert.deepEqual(await heroLayoutBox(desktop), blankBox, "the art must arrive into the exact box the blank side reserved");
  await desktop.waitForTimeout(400); // outlast HERO_BEAT_MS + HERO_EMERGE_MS bookkeeping
  const cardsAtRest = await chipStates(desktop);
  assert.equal(cardsAtRest.length, 5);
  assert.ok(cardsAtRest.every((chip) => !chip.revealed && chip.opacity === 0), "no card may emerge before the visitor scrolls");

  // ---------- scroll earns the cards in order ----------
  const metrics = await desktop.evaluate(() => {
    const pin = document.querySelector("#heroPin");
    return { start: window.scrollY + pin.getBoundingClientRect().top };
  });
  await scrollInstant(desktop, metrics.start + 100); // p = 0.10 — only card 1 is earned
  await desktop.waitForFunction(() => document.querySelector(".chip-1").classList.contains("chip-in"));
  await desktop.waitForTimeout(900); // outlast one full card entrance
  const cardsEarly = await chipStates(desktop);
  assert.deepEqual(cardsEarly.map((chip) => chip.revealed), [true, false, false, false, false],
    "10% of the scrub earns exactly the first card");
  assert.equal(cardsEarly[0].opacity, 1, "an earned card completes its entrance once started");

  await scrollInstant(desktop, metrics.start + 400); // p = 0.40 — the whole set is earned
  await desktop.waitForFunction(() =>
    Array.from(document.querySelectorAll(".chip")).every((chip) => chip.classList.contains("chip-in")));
  const cardsAll = await chipStates(desktop);
  assert.ok(cardsAll.every((chip) => chip.revealed), "deeper scrub earns the remaining cards in order");
  await desktop.close();

  // ---------- never both at once: scrolling during the emergence still waits ----------
  const eager = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await eager.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await scrollInstant(eager, 400); // p = 0.4 immediately, while the hero is still emerging
  await eager.waitForFunction(() => document.querySelector(".chip")?.classList.contains("chip-in"), undefined, { timeout: 6000 });
  assert.equal(await heroOpacity(eager), 1, "no card may begin emerging until the hero art has fully arrived");
  await eager.close();

  // ---------- a mid-page landing prints the earned state immediately ----------
  const deep = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await deep.goto(`${baseUrl}/#brands`, { waitUntil: "domcontentloaded" });
  await deep.waitForFunction(
    () => window.scrollY > 0 && document.querySelector("#heroStage").classList.contains("settled"),
    undefined,
    { timeout: 1000 }, // immediacy is the contract: far sooner than the ~2s ceremony could finish
  ).catch(() => assert.fail("a deep landing must skip the ceremony and print the earned state immediately"));
  assert.equal(await heroOpacity(deep), 1, "a deep landing prints the hero immediately");
  const deepCards = await chipStates(deep);
  assert.ok(deepCards.every((chip) => chip.revealed && chip.opacity === 1),
    "a visitor landing mid-page must never find unrevealed cards above them");
  await deep.close();

  // ---------- phones: the same sequence at 390px and 320px ----------
  for (const width of [390, 320]) {
    const phone = await browser.newPage({ viewport: { width, height: 844 } });
    await phone.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    assert.equal(await heroOpacity(phone), 0, `${width}px must open with the blank art side`);
    const phoneBlankBox = await heroLayoutBox(phone);
    await phone.waitForFunction(
      () => Number(getComputedStyle(document.querySelector("#heroMedia")).opacity) === 1,
      undefined,
      { timeout: 6000 },
    );
    assert.deepEqual(await heroLayoutBox(phone), phoneBlankBox, `${width}px must not shift when the art arrives`);
    assert.equal(
      await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      0,
      `${width}px must never overflow horizontally during the opening`,
    );
    await phone.waitForTimeout(400);
    const phoneRest = await chipStates(phone);
    assert.ok(phoneRest.every((chip) => !chip.revealed), `${width}px cards must wait for scroll`);
    await scrollInstant(phone, 500);
    await phone.waitForFunction(() =>
      Array.from(document.querySelectorAll(".chip")).slice(0, 4).every((chip) => chip.classList.contains("chip-in")));
    const phoneCards = await chipStates(phone);
    assert.ok(phoneCards.slice(0, 4).every((chip) => chip.opacity === 1 || chip.revealed),
      `${width}px scroll must earn the visible cards`);
    assert.equal(phoneCards[4].display, "none", "card 5 stays out of the phone composition as designed");
    await phone.close();
  }

  // ---------- reduced motion: everything present at once, no choreography ----------
  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await reduced.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await reduced.waitForTimeout(200);
  assert.equal(await heroOpacity(reduced), 1, "reduced motion prints the hero art immediately");
  assert.equal(await reduced.locator("#heroMedia").getAttribute("data-state"), "reduced");
  const reducedCards = await chipStates(reduced);
  assert.ok(reducedCards.every((chip) => chip.opacity === 1), "reduced motion prints every card immediately");
  await reduced.close();

  // ---------- no JavaScript: nothing is ever trapped behind the reveal ----------
  const noJsContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const noJs = await noJsContext.newPage();
  await noJs.goto(`${baseUrl}/`, { waitUntil: "load" });
  assert.equal(await heroOpacity(noJs), 1, "without JavaScript the hero art must be printed at paint");
  assert.equal(
    await noJs.locator(".hero-frame-start").evaluate((frame) => Number(getComputedStyle(frame).opacity)),
    1,
    "without JavaScript the bud still must be visible inside the art box",
  );
  const noJsCards = await chipStates(noJs);
  assert.ok(noJsCards.every((chip) => chip.opacity === 1), "without JavaScript every card must be printed at paint");
  await noJsContext.close();
} finally {
  await browser.close();
}

import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";
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

const counterText = (page) => page.locator("#deckCounter").textContent();

async function scrollInstant(page, y) {
  await page.evaluate((target) => scrollTo({ top: target, behavior: "instant" }), y);
  await page.waitForTimeout(100);
}

async function verifyHeldValuesStage(page, viewport) {
  await page.waitForFunction(() => document.querySelector("#values")?.classList.contains("is-held"));
  const valuesTop = await page.locator("#values").evaluate((section) => scrollY + section.getBoundingClientRect().top);
  await scrollInstant(page, valuesTop);
  assert.equal(await counterText(page), "01 / 07", `${viewport.width}px held entry should begin on card 01`);

  const fit = await page.evaluate(() => {
    const bounds = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      label: bounds("#values .section-label"),
      heading: bounds("#values .vt-display"),
      rows: Array.from(document.querySelectorAll("#values .value-index li"), (row) => bounds(`#values .value-index li:nth-child(${Array.from(row.parentElement.children).indexOf(row) + 1})`)),
      card: bounds("#value-01"),
      controls: bounds("#values .deck-controls"),
      stageTop: bounds("#valuesStage").top,
    };
  });
  const inside = (box) => box.top >= -1 && box.bottom <= fit.viewport.height + 1 && box.left >= -1 && box.right <= fit.viewport.width + 1;
  assert.equal([fit.label, fit.heading, fit.card, fit.controls, ...fit.rows].every(inside), true, `${viewport.width}px held composition should fit one viewport`);

  const open = viewport.height * 0.35;
  const share = viewport.height * 0.5;
  const counters = [];
  const stageTops = [];
  for (let index = 0; index < 7; index += 1) {
    const local = index === 0 ? 1 : open + share * index + 1;
    await scrollInstant(page, valuesTop + local);
    counters.push(await counterText(page));
    stageTops.push(await page.locator("#valuesStage").evaluate((stage) => Math.round(stage.getBoundingClientRect().top)));
  }
  assert.deepEqual(counters, ["01 / 07", "02 / 07", "03 / 07", "04 / 07", "05 / 07", "06 / 07", "07 / 07"]);
  assert.equal(Math.max(...stageTops) - Math.min(...stageTops), 0, `${viewport.width}px stage should remain held through all cards`);

  const dwellLocal = open + 7 * share + viewport.height * 0.2;
  await scrollInstant(page, valuesTop + dwellLocal);
  assert.equal(await counterText(page), "07 / 07", "card 07 should dwell before release");
  assert.equal(await page.locator("#valuesStage").evaluate((stage) => Math.round(stage.getBoundingClientRect().top)), 0);

  const sectionHeight = await page.locator("#values").evaluate((section) => section.getBoundingClientRect().height);
  await scrollInstant(page, valuesTop + sectionHeight - viewport.height + 20);
  assert.ok(await page.locator("#valuesStage").evaluate((stage) => stage.getBoundingClientRect().top) < 0, "the held stage should release into Teams");
  assert.ok(await page.locator("#teams").evaluate((teams) => teams.getBoundingClientRect().top) < viewport.height, "Teams should enter after release");

  const reverseCounters = [];
  for (let index = 6; index >= 0; index -= 1) {
    const local = index === 0 ? 1 : open + share * index + 1;
    await scrollInstant(page, valuesTop + local);
    reverseCounters.push(await counterText(page));
  }
  assert.deepEqual(reverseCounters, ["07 / 07", "06 / 07", "05 / 07", "04 / 07", "03 / 07", "02 / 07", "01 / 07"]);

  await scrollInstant(page, valuesTop + open + share * 2 + 1);
  await page.locator("#deckNext").click();
  const manualCounter = await counterText(page);
  await scrollInstant(page, valuesTop + open + share * 5 + 1);
  assert.equal(await counterText(page), manualCounter, "manual ownership should survive a scroll nudge");
  await page.locator("#valueDeck").focus();
  await page.keyboard.press("ArrowRight");
  assert.notEqual(await counterText(page), manualCounter, "keyboard control should step the deck");

  await scrollInstant(page, 0);
  await page.waitForTimeout(250);
  await scrollInstant(page, valuesTop + open + share * 5 + 1);
  assert.equal(await counterText(page), "06 / 07", "leaving and re-entering should re-arm scroll ownership");
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText || "failed";
    const isCancelledHeroSeek = request.resourceType() === "media"
      && errorText === "net::ERR_ABORTED"
      && request.url().endsWith("/assets/hero-grow.mp4");
    if (!isCancelledHeroSeek) pageErrors.push(`request: ${request.url()} ${errorText}`);
  });
  const response = await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  assert.equal(response?.status(), 200, "the canonical PB review route should resolve");
  assert.equal(await page.locator('link[rel="icon"][href="/images/cb-logo-white.svg"]').count(), 1, "the PB page should declare a valid shared favicon");
  assert.equal((await page.request.get(`${baseUrl}/images/cb-logo-white.svg`)).status(), 200, "the shared favicon should resolve without a browser console error");
  assert.equal(
    await page.locator("body > .hero-pin").count(),
    1,
    "the canonical route should render the PB hero",
  );
  assert.equal(await page.locator("#heroGrowVideo").count(), 1, "the hero should have one GROW video owner");
  assert.equal(await page.locator(".hero-frame-start").count(), 1, "the exact bud still should own zero progress");
  assert.equal(await page.locator(".hero-frame-end").count(), 1, "the exact bloom still should own full progress");
  assert.equal(
    await page.locator(".claim h1").textContent(),
    "We move fast. We experiment. We build enormous brands.",
    "the hero claim should use the captain-approved operating statement",
  );

  const approvedChipCopy = [
    "Actively recruiting",
    "9 figures in sexual health",
    "2 consumer brands",
    "Led by experienced operators",
    "1,000,000 customers",
  ];
  assert.deepEqual(
    await page.locator(".chip .face-a .lab").allTextContents(),
    approvedChipCopy,
    "all five approved calm chip faces should coexist with GROW",
  );
  assert.equal(await page.locator(".chip").count(), 5);
  assert.equal(await page.locator(".chip .face-b").count(), 5);
  assert.equal(
    await page.locator(".chip-2 .face-b .lab").textContent(),
    "Expanding into 3 verticals",
    "the revenue chip should retain its original expansion flip face",
  );
  assert.equal(await page.locator(".cb-mark").count(), 11);
  assert.equal(await page.locator(".chip .casetify").count(), 1);

  await page.waitForFunction(() => document.querySelector("#heroStage")?.classList.contains("arrived"));
  await page.waitForTimeout(1700);
  const chipGeometryAtStart = await page.locator(".chip").evaluateAll((chips) => chips.map((chip) => ({
    height: chip.getBoundingClientRect().height,
    rotation: getComputedStyle(chip).getPropertyValue("--rot").trim(),
  })));
  assert.deepEqual(chipGeometryAtStart.map(({ rotation }) => rotation), ["-2deg", "1.5deg", "-1.25deg", "2deg", "-1.5deg"]);

  const heroMetrics = await page.evaluate(() => {
    const pin = document.querySelector("#heroPin");
    const stage = document.querySelector("#heroStage");
    return {
      start: pin.offsetTop,
      distance: pin.offsetHeight - stage.offsetHeight,
      scrub: Math.min(1000, pin.offsetHeight - stage.offsetHeight),
      hold: Math.max(0, pin.offsetHeight - stage.offsetHeight - 1000),
    };
  });
  assert.ok(Math.abs(heroMetrics.hold / 900 - 0.4) < 0.002, "desktop final hold should be 40vh");

  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    await page.evaluate(({ y }) => scrollTo({ top: y, behavior: "instant" }), {
      y: heroMetrics.start + heroMetrics.scrub * progress,
    });
    await page.waitForFunction((expected) => {
      const actual = Number.parseFloat(document.querySelector("#heroStage")?.style.getPropertyValue("--p"));
      return Math.abs(actual - expected) < 0.005;
    }, progress);
    const state = await page.locator("#heroMedia").getAttribute("data-state");
    if (progress === 0) assert.equal(state, "start");
    if (progress === 1) assert.equal(state, "end");
    if (progress > 0 && progress < 1) {
      await page.waitForFunction((expected) => {
        const video = document.querySelector("#heroGrowVideo");
        return Number.isFinite(video?.duration) && Math.abs(video.currentTime - expected * video.duration) < 0.16;
      }, progress);
    }
  }

  for (const progress of [0.75, 0.5, 0.25]) {
    await page.evaluate(({ y }) => scrollTo({ top: y, behavior: "instant" }), {
      y: heroMetrics.start + heroMetrics.scrub * progress,
    });
    await page.waitForFunction((expected) => {
      const actual = Number.parseFloat(document.querySelector("#heroStage")?.style.getPropertyValue("--p"));
      return Math.abs(actual - expected) < 0.005;
    }, progress);
  }

  await page.evaluate(({ y }) => scrollTo({ top: y, behavior: "instant" }), {
    y: heroMetrics.start + heroMetrics.scrub + heroMetrics.hold / 2,
  });
  await page.waitForFunction(() => document.querySelector("#heroStage")?.dataset.scrollPhase === "hold");
  assert.equal(await page.locator("#heroStage").evaluate((stage) => stage.style.getPropertyValue("--p")), "1.0000");
  assert.equal(await page.locator("#heroMedia").getAttribute("data-state"), "end");
  assert.deepEqual(
    await page.locator(".chip").evaluateAll((chips) => chips.map((chip) => chip.getBoundingClientRect().height)),
    chipGeometryAtStart.map(({ height }) => height),
    "chip boxes should not jump between scrub and hold states",
  );

  const statBands = page.locator(".stat-band");
  assert.equal(await statBands.count(), 3, "the record should contain three full-bleed bands");
  assert.deepEqual(await statBands.locator(".stat-support strong").allTextContents(), ["Customers", "Revenue", "Elapsed"]);
  assert.deepEqual(
    await statBands.locator(".stat-value").evaluateAll((values) => values.map((value) => value.textContent.trim())),
    ["1,000,000+", "9 figures", "18months"],
  );
  assert.equal(await statBands.getByText(/source/i).count(), 0, "decorative Source markup should be absent");
  assert.equal(await page.locator('[aria-label="Elapsed: Under 18 months"]').count(), 1);
  const desktopBandGeometry = await statBands.evaluateAll((bands) => bands.map((band) => ({
    height: band.getBoundingClientRect().height,
    position: getComputedStyle(band).position,
    gridline: getComputedStyle(band, "::after").backgroundImage,
  })));
  assert.deepEqual(desktopBandGeometry.map(({ height }) => height), [320, 320, 320]);
  assert.deepEqual(desktopBandGeometry.map(({ position }) => position), ["relative", "relative", "relative"]);
  assert.deepEqual(desktopBandGeometry.map(({ gridline }) => gridline), ["none", "none", "none"]);
  assert.equal(await page.locator(".stat-bands").evaluate((bands) => getComputedStyle(bands, "::after").height), "100px");

  const recordEnd = await page.locator(".stat-bands").evaluate((bands) => scrollY + bands.getBoundingClientRect().bottom);
  await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), recordEnd);
  await page.waitForFunction(() => Array.from(document.querySelectorAll(".stat-band"))
    .every((band) => Number.parseFloat(band.style.getPropertyValue("--band-reveal")) > 0.999));
  assert.deepEqual(
    await statBands.evaluateAll((bands) => bands.map((band) => Number.parseFloat(new DOMMatrix(getComputedStyle(band, "::before").transform).a.toFixed(2)))),
    [1, 0.95, 0.7],
  );
  const recordEntry = await page.locator(".stat-bands").evaluate((bands) => scrollY + bands.getBoundingClientRect().top - innerHeight);
  await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), recordEntry);
  await page.waitForFunction(() => Number.parseFloat(document.querySelector(".stat-band")?.style.getPropertyValue("--band-reveal")) < 0.05);

  assert.equal(await page.locator("#values").count(), 1, "the final Round 4 Values section should be present");
  assert.equal(await page.locator("#teams").count(), 1, "the final Round 4 Teams section should be present");
  assert.equal(await page.locator("#valueDeck .value-card").count(), 7);
  assert.equal(await page.locator("#deckCounter").textContent(), "01 / 07");
  assert.deepEqual(
    await page.locator("#record, #themes, #brands, #people, #values, #teams, #careers").evaluateAll((sections) => sections.map((section) => section.id)),
    ["record", "themes", "brands", "people", "values", "teams", "careers"],
    "the approved whole-page section order should be preserved",
  );
  assert.deepEqual(
    await page.locator("#values .section-label, #teams .section-label, #careers .section-label").allTextContents(),
    ["(05) How we raise the ceiling", "(06) How we work together", "(07) Careers · 11 roles open"],
  );

  const brandCarousels = page.locator("[data-brand-carousel]");
  assert.equal(await brandCarousels.count(), 2, "both brands should have an automatic image carousel");
  assert.deepEqual(
    await brandCarousels.evaluateAll((carousels) => carousels.map((carousel) => ({
      interval: carousel.dataset.interval,
      slides: Array.from(carousel.querySelectorAll(".brand-slide"), (slide) => slide.querySelector("img")?.getAttribute("src")),
    }))),
    [
      {
        interval: "4500",
        slides: [
          "images/carenbloom-v3/nancy-lem.jpg",
          "assets/tile-nancy-sharp.png",
          "assets/tile-nancy2-sharp.png",
        ],
      },
      {
        interval: "4500",
        slides: [
          "images/carenbloom-v3/biird-ohwii-branch.jpg",
          "assets/tile-biird-sharp.png",
          "assets/tile-biird2-sharp.png",
        ],
      },
    ],
    "each brand carousel should use three distinct approved repository assets",
  );
  assert.equal(
    await brandCarousels.evaluateAll((carousels) => carousels.every((carousel) => {
      const { width, height } = carousel.getBoundingClientRect();
      return Math.abs(width - height) < 1;
    })),
    true,
    "brand carousels should use a square crop",
  );
  assert.deepEqual(
    await brandCarousels.evaluateAll((carousels) => carousels.map((carousel) => carousel.dataset.activeSlide)),
    ["0", "0"],
    "both carousels should start on their first approved image",
  );
  await brandCarousels.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(4700);
  assert.deepEqual(
    await brandCarousels.evaluateAll((carousels) => carousels.map((carousel) => carousel.dataset.activeSlide)),
    ["1", "1"],
    "both carousels should advance on Mother Fable's 4.5-second cadence",
  );
  await brandCarousels.first().hover();
  const pausedSlide = await brandCarousels.first().getAttribute("data-active-slide");
  await page.waitForTimeout(4700);
  assert.equal(
    await brandCarousels.first().getAttribute("data-active-slide"),
    pausedSlide,
    "hover should pause automatic carousel advancement",
  );

  const marquee = page.locator(".tile-marquee");
  assert.equal(await marquee.count(), 1, "the product tile band should have one continuous marquee owner");
  assert.equal(await marquee.locator(":scope > .tilerow").count(), 2, "the marquee should duplicate one complete track for a seamless loop");
  const marqueeTracks = await marquee.locator(":scope > .tilerow").evaluateAll((tracks) => tracks.map((track) => ({
    sources: Array.from(track.querySelectorAll("img"), (image) => image.getAttribute("src")),
    left: track.getBoundingClientRect().left,
    right: track.getBoundingClientRect().right,
    width: track.getBoundingClientRect().width,
  })));
  assert.deepEqual(marqueeTracks[1].sources, marqueeTracks[0].sources, "both marquee tracks should be byte-for-byte equivalent sequences");
  assert.ok(Math.abs(marqueeTracks[0].width - marqueeTracks[1].width) < 1, "marquee tracks should have equal widths");
  assert.ok(Math.abs(marqueeTracks[0].right - marqueeTracks[1].left) < 1, "marquee tracks should meet without a visible seam");
  assert.equal(await marquee.evaluate((node) => getComputedStyle(node).animationName), "tile-marquee");
  assert.equal(await page.locator("#teams .model").count(), 2);
  assert.equal(await page.locator("#teams .coach-col").count(), 2);
  await verifyHeldValuesStage(page, { width: 1440, height: 900 });

  const shortLaptopPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await shortLaptopPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await verifyHeldValuesStage(shortLaptopPage, { width: 1280, height: 800 });
  await shortLaptopPage.close();

  const anchorPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await anchorPage.goto(`${baseUrl}/#values`, { waitUntil: "domcontentloaded" });
  await anchorPage.waitForFunction(() => document.querySelector("#values")?.classList.contains("is-held"));
  assert.equal(await counterText(anchorPage), "01 / 07", "direct Values anchor arrival should preserve card 01");
  await anchorPage.close();

  const roleRows = page.locator("a.job-row");
  assert.equal(await roleRows.count(), 11, "all eleven roles should be direct application links");
  assert.deepEqual(
    await roleRows.evaluateAll((rows) => rows.map((row) => [
      row.querySelector(".j-name")?.textContent?.trim(),
      new URL(row.href).searchParams.get("role"),
    ])),
    expectedRoles,
  );
  assert.equal(await page.locator(".careers-cta").count(), 0, "the direct flow should not require an intermediary careers landing");
  const documentDiagnostics = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll("[id]"), (node) => node.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const internalAnchors = Array.from(document.querySelectorAll('a[href^="#"]'), (anchor) => anchor.getAttribute("href"));
    return {
      duplicateIds: [...new Set(duplicateIds)],
      brokenAnchors: internalAnchors.filter((href) => href.length < 2 || !document.getElementById(decodeURIComponent(href.slice(1)))),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      failedImages: Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
    };
  });
  assert.deepEqual(documentDiagnostics, { duplicateIds: [], brokenAnchors: [], overflow: 0, failedImages: [] });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    const headerPage = await browser.newPage({ viewport });
    await headerPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    const homeMetrics = await headerPage.locator(".topbar").evaluate((header) => {
      const logo = header.querySelector(":scope > a");
      const headerRect = header.getBoundingClientRect();
      const logoRect = logo.getBoundingClientRect();
      const logoStyle = getComputedStyle(logo);
      return {
        header: { x: headerRect.x, width: headerRect.width, height: headerRect.height },
        logo: { width: logoRect.width, height: logoRect.height, fontSize: logoStyle.fontSize, fontWeight: logoStyle.fontWeight, letterSpacing: logoStyle.letterSpacing },
      };
    });
    await headerPage.goto(`${baseUrl}/careers/apply/?role=creative-strategist-performance-marketing`, { waitUntil: "domcontentloaded" });
    assert.equal(await headerPage.locator('link[rel="icon"][href="/images/cb-logo-white.svg"]').count(), 1, `${viewport.width}px application page should declare the shared favicon`);
    const applicationMetrics = await headerPage.locator(".application-topbar").evaluate((header) => {
      const logo = header.querySelector(":scope > a");
      const headerRect = header.getBoundingClientRect();
      const logoRect = logo.getBoundingClientRect();
      const logoStyle = getComputedStyle(logo);
      return {
        header: { x: headerRect.x, width: headerRect.width, height: headerRect.height },
        logo: { width: logoRect.width, height: logoRect.height, fontSize: logoStyle.fontSize, fontWeight: logoStyle.fontWeight, letterSpacing: logoStyle.letterSpacing },
      };
    });
    assert.deepEqual(applicationMetrics, homeMetrics, `${viewport.width}px application header should match the integrated home`);
    const applicationSurfaces = await headerPage.locator("body, .application-header-surface, .application-form, .site-footer").evaluateAll((surfaces) => surfaces.map((surface) => getComputedStyle(surface).backgroundColor));
    assert.equal(applicationSurfaces.every((color) => color === "rgb(220, 237, 245)" || color === "rgb(234, 244, 250)"), true, `${viewport.width}px application surfaces should remain entirely light`);
    assert.equal(await headerPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
    await headerPage.close();
  }

  const rangeResponse = await page.request.get(`${baseUrl}/assets/hero-grow.mp4`, {
    headers: { Range: "bytes=0-1023" },
  });
  assert.equal(rangeResponse.status(), 206, "the shared review server should honor media byte ranges");
  assert.equal((await rangeResponse.body()).byteLength, 1024);

  const fallbackPage = await browser.newPage({ viewport: { width: 900, height: 800 } });
  await fallbackPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await fallbackPage.waitForFunction(() => document.querySelector("#valueDeck")?.classList.contains("is-live"));
  assert.equal(await fallbackPage.locator("#values").evaluate((section) => section.classList.contains("is-held")), false);
  assert.equal(await fallbackPage.locator("#values").getAttribute("style"), null, "900px fallback should have no held runway");
  const fallbackBounds = await fallbackPage.evaluate(() => ({
    start: scrollY + document.querySelector("#values").getBoundingClientRect().top,
    end: scrollY + document.querySelector("#teams").getBoundingClientRect().top,
  }));
  await scrollInstant(fallbackPage, fallbackBounds.start);
  assert.equal(await counterText(fallbackPage), "01 / 07");
  const fallbackSeen = new Set();
  for (let y = fallbackBounds.start; y <= fallbackBounds.end; y += 100) {
    await scrollInstant(fallbackPage, y);
    fallbackSeen.add(await counterText(fallbackPage));
  }
  assert.deepEqual([...fallbackSeen], ["01 / 07", "02 / 07", "03 / 07", "04 / 07", "05 / 07", "06 / 07", "07 / 07"]);
  await fallbackPage.close();

  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  assert.equal(await mobilePage.locator("#valueDeck").evaluate((deck) => deck.classList.contains("is-live")), false);
  assert.equal(await mobilePage.locator("#values").evaluate((section) => Boolean(section.style.height) || section.classList.contains("is-held")), false);
  assert.equal(await mobilePage.locator("#deckPrev").isHidden(), true);
  assert.equal(await mobilePage.locator("#deckNext").isHidden(), true);
  assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
  await mobilePage.close();

  const noJsContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const noJsPage = await noJsContext.newPage();
  await noJsPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  assert.equal(await noJsPage.locator("#valueDeck .value-card").count(), 7);
  assert.equal(await noJsPage.locator("#valueDeck").evaluate((deck) => deck.classList.contains("is-live")), false);
  assert.equal(await noJsPage.locator("#values").evaluate((section) => Boolean(section.style.height) || section.classList.contains("is-held")), false);
  assert.deepEqual(
    await noJsPage.locator("[data-brand-carousel]").evaluateAll((carousels) => carousels.map((carousel) => {
      const slides = Array.from(carousel.querySelectorAll(".brand-slide"));
      return slides.map((slide) => getComputedStyle(slide).opacity);
    })),
    [["1", "0", "0"], ["1", "0", "0"]],
    "without JavaScript, each carousel should present its first image as a complete static fallback",
  );
  await noJsContext.close();

  const reducedPage = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await reducedPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  assert.equal(await reducedPage.locator("#heroMedia").getAttribute("data-state"), "reduced");
  assert.equal(await reducedPage.locator("#heroGrowVideo").getAttribute("src"), null);
  assert.equal(await reducedPage.locator(".hero-frame-end").evaluate((node) => getComputedStyle(node).opacity), "1");
  assert.equal(await reducedPage.locator(".chip").evaluateAll((chips) => chips.every((chip) => getComputedStyle(chip).opacity === "1")), true);
  assert.equal(await reducedPage.locator(".tile-marquee").evaluate((node) => getComputedStyle(node).animationName), "none");
  assert.equal(await reducedPage.locator(".tile-marquee > .tilerow").nth(1).evaluate((node) => getComputedStyle(node).display), "none");
  await reducedPage.waitForTimeout(4700);
  assert.deepEqual(
    await reducedPage.locator("[data-brand-carousel]").evaluateAll((carousels) => carousels.map((carousel) => carousel.dataset.activeSlide)),
    ["0", "0"],
    "reduced motion should keep both carousels on their static first image",
  );
  await reducedPage.waitForFunction(() => document.querySelector("#values")?.classList.contains("is-held"));
  const reducedValuesTop = await reducedPage.locator("#values").evaluate((section) => scrollY + section.getBoundingClientRect().top);
  await scrollInstant(reducedPage, reducedValuesTop + 900 * 0.35 + 900 * 0.5 * 6 + 1);
  assert.equal(await counterText(reducedPage), "07 / 07");
  assert.equal(await reducedPage.locator("#value-01").evaluate((card) => getComputedStyle(card).transitionDuration), "0.001s");
  await reducedPage.close();

  const mobileReducedPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await mobileReducedPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  assert.deepEqual(
    await mobileReducedPage.locator(".stat-band").evaluateAll((bands) => bands.map((band) => band.getBoundingClientRect().height)),
    [224, 198, 250],
    "mobile bands should use the approved responsive heights",
  );
  assert.deepEqual(
    await mobileReducedPage.locator(".stat-band").evaluateAll((bands) => bands.map((band) => Number.parseFloat(new DOMMatrix(getComputedStyle(band, "::before").transform).a.toFixed(2)))),
    [1, 0.95, 0.7],
    "reduced motion should render exact terminal reveals immediately",
  );
  await mobileReducedPage.close();
  assert.deepEqual(pageErrors, [], "the integrated natural-scroll journey should have no console, page, or request errors");
} finally {
  await browser.close();
}

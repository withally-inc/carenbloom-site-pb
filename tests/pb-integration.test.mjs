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

// Every geometry assertion here measures laid-out glyphs, and the display face loads with
// font-display: swap over a Helvetica Neue fallback: measuring before it settles measures the
// wrong typeface, which is a silent false pass on the tight split-band boundary cases.
async function openPage(page, url = `${baseUrl}/`) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]));
  return response;
}

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
  const response = await openPage(page, `${baseUrl}/`);
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
          "images/carenbloom-v3/nancy-raspberry.png",
          "images/carenbloom-v3/nancy-avocado.png",
        ],
      },
      {
        interval: "4500",
        slides: [
          "images/carenbloom-v3/biird-ohwii-branch.jpg",
          "images/carenbloom-v3/biird-glass-sky.png",
          "images/carenbloom-v3/biird-lilac-first-timer.png",
        ],
      },
    ],
    "each brand carousel should use three distinct approved repository assets",
  );
  assert.equal(
    await brandCarousels.evaluateAll((carousels) => carousels.every((carousel) =>
      carousel.closest(".brand-card").querySelectorAll(".progress > span").length === carousel.querySelectorAll(".brand-slide").length)),
    true,
    "each carousel should render exactly one progress bar per slide",
  );
  assert.equal(
    await brandCarousels.evaluateAll((carousels) => carousels.every((carousel) => {
      const { width, height } = carousel.getBoundingClientRect();
      return Math.abs(width - height) < 1;
    })),
    true,
    "brand carousels should use a square crop",
  );
  await scrollInstant(page, 0);
  assert.deepEqual(
    await brandCarousels.evaluateAll((carousels) => carousels.map((carousel) => carousel.dataset.activeSlide)),
    ["0", "0"],
    "both carousels should start on their first approved image",
  );
  const runningBars = (carousels) => carousels.map((carousel) =>
    Array.from(carousel.closest(".brand-card").querySelectorAll(".progress > span"), (bar) => bar.classList.contains("running")));
  assert.deepEqual(
    await brandCarousels.evaluateAll(runningBars),
    [[false, false, false], [false, false, false]],
    "no progress bar should run before its carousel has been scrolled into view",
  );
  assert.equal(
    await page.locator(".brand-card .progress > span i").evaluateAll((fills) =>
      fills.every((fill) => getComputedStyle(fill).animationName === "none")),
    true,
    "no progress fill should animate before its carousel has been scrolled into view",
  );
  await brandCarousels.first().scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("[data-brand-carousel]")).every((carousel) =>
      carousel.closest(".brand-card").querySelector(".progress > span").classList.contains("running")));
  assert.deepEqual(
    await brandCarousels.evaluateAll(runningBars),
    [[true, false, false], [true, false, false]],
    "each carousel should start its first progress bar once scrolled into view",
  );
  await brandCarousels.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(4700);
  assert.deepEqual(
    await brandCarousels.evaluateAll((carousels) => carousels.map((carousel) => carousel.dataset.activeSlide)),
    ["1", "1"],
    "both carousels should advance on Mother Fable's 4.5-second cadence",
  );
  assert.deepEqual(
    await brandCarousels.evaluateAll(runningBars),
    [[false, true, false], [false, true, false]],
    "the active progress bar should advance with its slide",
  );
  const nancyCard = page.locator(".brand-card").first();
  await brandCarousels.first().hover();
  assert.equal(
    await nancyCard.locator(".progress > span.running i").evaluate((fill) => getComputedStyle(fill).animationPlayState),
    "paused",
    "hover should pause the active progress fill",
  );
  const pausedSlide = await brandCarousels.first().getAttribute("data-active-slide");
  await page.waitForTimeout(4700);
  assert.equal(
    await brandCarousels.first().getAttribute("data-active-slide"),
    pausedSlide,
    "hover should pause automatic carousel advancement",
  );
  await page.mouse.move(0, 0);
  await brandCarousels.first().focus();
  assert.equal(await brandCarousels.first().evaluate((carousel) => carousel.classList.contains("paused")), true);
  assert.equal(
    await nancyCard.locator(".progress > span.running i").evaluate((fill) => getComputedStyle(fill).animationPlayState),
    "paused",
    "focus should pause the active progress fill",
  );
  await page.evaluate(() => document.activeElement?.blur());

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
  await openPage(shortLaptopPage, `${baseUrl}/`);
  await verifyHeldValuesStage(shortLaptopPage, { width: 1280, height: 800 });
  await shortLaptopPage.close();

  const anchorPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await openPage(anchorPage, `${baseUrl}/#values`);
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
    { width: 320, height: 720 },
  ]) {
    const headerPage = await browser.newPage({ viewport });
    await openPage(headerPage, `${baseUrl}/`);
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
    await openPage(headerPage, `${baseUrl}/careers/apply/?role=creative-strategist-performance-marketing`);
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
    if (viewport.width === 320) {
      const applicationBrand = await headerPage.locator('.application-topbar > a[aria-label="Care and Bloom home"]').evaluate((brand) => ({
        clientWidth: brand.clientWidth,
        scrollWidth: brand.scrollWidth,
      }));
      assert.ok(
        applicationBrand.scrollWidth <= applicationBrand.clientWidth + 1,
        "the application header should print the full Care & Bloom mark at 320px",
      );
    }
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
  await openPage(fallbackPage, `${baseUrl}/`);
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
  await openPage(mobilePage, `${baseUrl}/`);
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
  await openPage(reducedPage, `${baseUrl}/`);
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
  assert.equal(
    await reducedPage.locator("[data-brand-carousel]").evaluateAll((carousels) => carousels.every((carousel) =>
      Array.from(carousel.closest(".brand-card").querySelectorAll(".progress > span"), (bar) => bar.classList.contains("running")).every((running) => !running))),
    true,
    "reduced motion should leave every progress fill stopped",
  );
  await reducedPage.locator("[data-brand-carousel]").first().scrollIntoViewIfNeeded();
  await reducedPage.waitForTimeout(4700);
  assert.deepEqual(
    await reducedPage.locator("[data-brand-carousel]").evaluateAll((carousels) => carousels.map((carousel) => carousel.dataset.activeSlide)),
    ["0", "0"],
    "reduced motion should never auto-advance, even after the carousels are scrolled into view",
  );
  await reducedPage.close();

  /* start-on-view independence: on the stacked single-column layout each carousel
     owns its observer, so revealing Hello Nancy must not start Biird, and starting
     is one-way — leaving and returning never resets a started carousel. */
  const stackedPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openPage(stackedPage, `${baseUrl}/`);
  const stackedCarousels = stackedPage.locator("[data-brand-carousel]");
  const stackedRunning = () => stackedCarousels.evaluateAll((carousels) => carousels.map((carousel) =>
    Array.from(carousel.closest(".brand-card").querySelectorAll(".progress > span"), (bar) => bar.classList.contains("running"))));
  const stackedSlides = () => stackedCarousels.evaluateAll((carousels) => carousels.map((carousel) => carousel.dataset.activeSlide));
  assert.deepEqual(await stackedRunning(), [[false, false, false], [false, false, false]], "stacked: both carousels inert before view");
  const nancyOnlyY = await stackedCarousels.first().evaluate((carousel) =>
    scrollY + carousel.getBoundingClientRect().bottom - innerHeight);
  await scrollInstant(stackedPage, nancyOnlyY);
  await stackedPage.waitForFunction(() =>
    document.querySelector("[data-brand-carousel]").closest(".brand-card").querySelector(".progress > span").classList.contains("running"));
  assert.deepEqual(await stackedRunning(), [[true, false, false], [false, false, false]], "Hello Nancy starting must not start Biird");
  await stackedPage.waitForTimeout(4700);
  assert.deepEqual(await stackedSlides(), ["1", "0"], "only the revealed carousel should advance on the 4.5s cadence");
  await stackedCarousels.nth(1).scrollIntoViewIfNeeded();
  await stackedPage.waitForFunction(() =>
    document.querySelectorAll("[data-brand-carousel]")[1].closest(".brand-card").querySelector(".progress > span").classList.contains("running"));
  assert.deepEqual((await stackedRunning())[1], [true, false, false], "Biird starts on its own first bar when it enters view");
  assert.equal((await stackedSlides())[1], "0", "Biird should begin on its first slide, not catch up to Hello Nancy");
  const beforeLeave = await stackedSlides();
  await scrollInstant(stackedPage, 0);
  await scrollInstant(stackedPage, await stackedCarousels.nth(1).evaluate((carousel) =>
    scrollY + carousel.getBoundingClientRect().top));
  assert.deepEqual(await stackedSlides(), beforeLeave, "a started carousel must not reset when scrolled away and back");
  await stackedPage.close();

  const reducedPage2Values = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await openPage(reducedPage2Values, `${baseUrl}/`);
  await reducedPage2Values.waitForFunction(() => document.querySelector("#values")?.classList.contains("is-held"));
  const reducedValuesTop = await reducedPage2Values.locator("#values").evaluate((section) => scrollY + section.getBoundingClientRect().top);
  await scrollInstant(reducedPage2Values, reducedValuesTop + 900 * 0.35 + 900 * 0.5 * 6 + 1);
  assert.equal(await counterText(reducedPage2Values), "07 / 07");
  assert.equal(await reducedPage2Values.locator("#value-01").evaluate((card) => getComputedStyle(card).transitionDuration), "0.001s");
  await reducedPage2Values.close();

  const mobileReducedPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await openPage(mobileReducedPage, `${baseUrl}/`);
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

  // regression (captain report 2026-08-05): the split band's sun fill terminally covers only
  // the left 70%, and the mobile rule right-aligned the ink “18 months” value onto the
  // remaining ink ground, where it was invisible. The value must stay inside the sun field
  // and inside the viewport at mobile widths.
  const splitGeometry = async (target) => target.locator(".stat-band-split").evaluate((band) => {
    const bandRect = band.getBoundingClientRect();
    const valueRect = band.querySelector(".stat-value").getBoundingClientRect();
    const supportRect = band.querySelector(".stat-support").getBoundingClientRect();
    const box = (rect) => ({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
    return {
      bandLeft: bandRect.left,
      bandWidth: bandRect.width,
      valueLeft: valueRect.left,
      valueRight: valueRect.right,
      valueWidth: valueRect.width,
      value: box(valueRect),
      support: box(supportRect),
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  const assertValueOnSun = (geometry, width) => {
    const sunEdge = geometry.bandLeft + geometry.bandWidth * 0.7;
    assert.ok(geometry.valueWidth > 0, `${width}px: the Elapsed value must render`);
    assert.ok(geometry.valueLeft >= geometry.bandLeft - 1, `${width}px: the value must not bleed left of the band`);
    assert.ok(
      geometry.valueRight <= sunEdge + 1,
      `${width}px: “18 months” must sit inside the 70% sun field, not ink-on-ink (right ${geometry.valueRight.toFixed(1)} vs sun edge ${sunEdge.toFixed(1)})`,
    );
    assert.ok(geometry.valueRight <= geometry.clientWidth + 1, `${width}px: the value must not be viewport-clipped`);
    assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, `${width}px: no horizontal overflow`);
    // the value track is minmax(0, 8fr): a value too wide for its column overruns leftward
    // onto the support column instead of past the sun edge, so containment alone is not enough
    const { value, support } = geometry;
    assert.equal(
      value.left < support.right && value.right > support.left && value.top < support.bottom && value.bottom > support.top,
      false,
      `${width}px: the value must not collide with the support column`,
    );
  };
  // the same geometry is marginal through the tablet range, where the desktop rule centres
  // the value and pulls it -6vw while the sun still stops at 70% of the viewport. 901px is
  // the tightest point of the untouched desktop composition — just above the containment
  // rule's 900px boundary — so the range is bracketed from both sides, not only from inside.
  for (const splitViewport of [
    { width: 390, height: 844 },
    { width: 320, height: 720 },
    { width: 768, height: 1024 },
    { width: 800, height: 1024 },
    { width: 850, height: 1024 },
    { width: 900, height: 1024 },
    { width: 901, height: 1024 },
    { width: 950, height: 1024 },
    { width: 991, height: 1024 },
  ]) {
    // reduced motion renders the exact terminal fill immediately, so geometry is deterministic
    const splitPage = await browser.newPage({ viewport: splitViewport, reducedMotion: "reduce" });
    await openPage(splitPage, `${baseUrl}/`);
    assertValueOnSun(await splitGeometry(splitPage), splitViewport.width);
    await splitPage.close();
  }
  // the reported path: real scroll at 390px to the terminal reveal
  const splitScrollPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openPage(splitScrollPage, `${baseUrl}/`);
  const splitTop = await splitScrollPage.locator(".stat-band-split").evaluate((band) => scrollY + band.getBoundingClientRect().top);
  await scrollInstant(splitScrollPage, splitTop - 844 * 0.2);
  await splitScrollPage.waitForFunction(() =>
    Number.parseFloat(document.querySelector(".stat-band-split")?.style.getPropertyValue("--band-reveal")) > 0.999);
  assertValueOnSun(await splitGeometry(splitScrollPage), 390);
  await splitScrollPage.close();

  // captain 2026-08-05: the lemon band's height is capped so the first stat row's numbers
  // are above the fold when the record section enters (section top at viewport top),
  // while the band still reads as a full band — every lemon fully inside it.
  // 1366x768 and 1280x720 are the short-laptop heights where a bare viewport-proportional
  // cap stops covering the fixed-pixel lead-in, trailing margin and stat-band number row.
  for (const entryViewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 800 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
    { width: 320, height: 720 },
  ]) {
    const entryPage = await browser.newPage({ viewport: entryViewport });
    await openPage(entryPage, `${baseUrl}/`);
    const entryGeometry = await entryPage.evaluate(() => {
      const record = document.querySelector(".record");
      scrollTo({ top: scrollY + record.getBoundingClientRect().top, behavior: "instant" });
      const band = document.getElementById("lemonBand").getBoundingClientRect();
      const stat1 = document.querySelector(".stat-band").getBoundingClientRect();
      const value = document.querySelector(".stat-band .stat-value").getBoundingClientRect();
      const lemons = Array.from(document.querySelectorAll("#lemonBand .lemon img"), (img) => img.getBoundingClientRect());
      return {
        viewportH: innerHeight,
        band: { top: band.top, bottom: band.bottom, height: band.height },
        stat1: { top: stat1.top, bottom: stat1.bottom },
        value: { top: value.top, bottom: value.bottom, height: value.height },
        lemons: lemons.map((rect) => ({ top: rect.top, bottom: rect.bottom, width: rect.width })),
      };
    });
    const label = `${entryViewport.width}x${entryViewport.height}`;
    assert.ok(entryGeometry.value.height > 0, `${label}: the first stat row's value must render`);
    assert.ok(
      entryGeometry.value.bottom <= entryGeometry.viewportH + 1,
      `${label}: the first numbers row must be above the fold on record entry (value bottom ${entryGeometry.value.bottom.toFixed(1)} vs fold ${entryGeometry.viewportH})`,
    );
    assert.ok(entryGeometry.value.top >= 0, `${label}: the first numbers row must not start above the viewport`);
    assert.ok(
      entryGeometry.band.bottom <= entryGeometry.stat1.top + 1,
      `${label}: the lemon band must not overlap the first stat row`,
    );
    for (const lemon of entryGeometry.lemons) {
      assert.ok(lemon.width >= 60, `${label}: lemons stay legible (${Math.round(lemon.width)}px)`);
      assert.ok(
        lemon.top >= entryGeometry.band.top - 1 && lemon.bottom <= entryGeometry.band.bottom + 1,
        `${label}: every lemon must stay fully inside the capped band`,
      );
    }
    await entryPage.close();
  }

  assert.deepEqual(pageErrors, [], "the integrated natural-scroll journey should have no console, page, or request errors");
} finally {
  await browser.close();
}

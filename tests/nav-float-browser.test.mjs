import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";
const browser = await chromium.launch({ headless: true });

// The nav chip's role count is painted only after /api/role-state answers, and the careers section
// height that the float threshold measures depends on the same response.
async function openHome(page, url = `${baseUrl}/`) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator('[data-careers-list][data-careers-state="ready"]').waitFor();
}

async function scrollInstant(page, y) {
  await page.evaluate((target) => window.scrollTo({ top: target, behavior: "instant" }), y);
  await page.waitForTimeout(450); // outlast the 300ms material transition
}

const floating = (page) =>
  page.locator(".nav-shell").evaluate((shell) => shell.classList.contains("is-floating"));

const navProbe = (page) =>
  page.evaluate(() => {
    const shell = document.querySelector(".nav-shell");
    const bar = document.querySelector(".topbar");
    const rect = bar.getBoundingClientRect();
    const style = getComputedStyle(bar);
    return {
      floating: shell.classList.contains("is-floating"),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      background: style.backgroundColor,
      radius: style.borderRadius,
      borderWidth: style.borderTopWidth,
      backdrop: style.backdropFilter === "none" ? style.webkitBackdropFilter : style.backdropFilter,
      shellTransform: getComputedStyle(shell).transform,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

try {
  // ---------- desktop top state: the bar begins naturally with the page ----------
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await openHome(desktop, `${baseUrl}/`);
  await desktop.waitForTimeout(300);
  const topState = await navProbe(desktop);
  assert.equal(topState.floating, false, "the bar should begin inline, not floating");
  assert.equal(topState.background, "rgba(0, 0, 0, 0)", "the inline bar should carry no surface");
  assert.equal(topState.radius, "0px", "the inline bar should have no rounding");
  assert.equal(topState.borderWidth, "0px", "the inline bar should have no rule");
  assert.equal(topState.rect.x, 168, "the inline bar should sit exactly on the content grid");
  assert.equal(topState.rect.y, 0);
  assert.equal(topState.rect.width, 1104, "the inline bar should match the shared topbar measure");
  assert.equal(topState.rect.height, 66.1875, "the inline bar should keep its natural height");
  const wordTop = await desktop.locator(".word-top").evaluate((word) => word.getBoundingClientRect().y);
  assert.equal(wordTop, 59.5, "the hero composition should be pixel-identical to the inline header");
  assert.equal(await desktop.locator(".topbar > a").first().getAttribute("aria-label"), "Care and Bloom home");
  const desktopLogo = await desktop.locator('.topbar > a[aria-label="Care and Bloom home"] svg').evaluate((logo) => ({
    role: logo.getAttribute("aria-hidden"),
    fill: getComputedStyle(logo.querySelector("use")).fill,
    color: getComputedStyle(logo).color,
    width: logo.getBoundingClientRect().width,
    height: logo.getBoundingClientRect().height,
  }));
  assert.equal(desktopLogo.role, "true", "the labelled home link should hide its decorative inline logo from assistive technology");
  assert.equal(desktopLogo.fill, desktopLogo.color, "the inline logo should inherit the active nav theme through currentColor");
  assert.ok(desktopLogo.width > 100 && desktopLogo.width < 150, "the desktop lockup should retain an optical wordmark scale");
  assert.ok(desktopLogo.height >= 20 && desktopLogo.height <= 24, "the desktop lockup should align to the old type's visual line box");
  const inheritedThemeFills = await desktop.locator('.topbar > a[aria-label="Care and Bloom home"]').evaluate((brand) => {
    const logoUse = brand.querySelector("use");
    const sample = (color) => {
      brand.style.color = color;
      return { color: getComputedStyle(brand).color, fill: getComputedStyle(logoUse).fill };
    };
    const light = sample("var(--color-accent)");
    const dark = sample("var(--color-ink-2)");
    brand.style.removeProperty("color");
    return { light, dark };
  });
  assert.equal(inheritedThemeFills.light.fill, inheritedThemeFills.light.color, "the light-theme logo should inherit cobalt");
  assert.equal(inheritedThemeFills.dark.fill, inheritedThemeFills.dark.color, "the dark-theme logo should inherit the pale-white ink");
  assert.notEqual(inheritedThemeFills.light.fill, inheritedThemeFills.dark.fill, "the two theme states should resolve to distinct logo fills");
  assert.deepEqual(
    await desktop.locator('.topbar nav[aria-label="Primary"] a').evaluateAll((links) => links.map((link) => [link.textContent, link.getAttribute("href")])),
    [["Themes", "#themes"], ["Brands", "#brands"], ["People", "#people"], ["Careers", "#careers"]],
    "every existing destination and accessible name should be preserved",
  );
  assert.equal(await desktop.locator(".topbar .roles-chip").textContent(), "Open roles (12)");

  // ---------- desktop floating state: one paper bar, elevated, inset ----------
  await scrollInstant(desktop, 700);
  const floatState = await navProbe(desktop);
  assert.equal(floatState.floating, true, "scrolling past the threshold should float the bar");
  assert.match(floatState.background, /0\.86\)$/, "the floating bar should be a considered translucent paper");
  assert.equal(floatState.radius, "16px", "the floating bar should be rounded");
  assert.equal(floatState.borderWidth, "1px", "the floating bar should carry the hairline rule");
  assert.match(floatState.backdrop, /blur\(10px\)/, "the floating bar should blur modestly, never excessively");
  assert.equal(floatState.rect.y, 12, "the floating bar should settle inset from the viewport top");
  assert.ok(floatState.rect.x > 168, "the floating bar should gather in from the content grid");
  assert.ok(floatState.rect.width < 1104, "the floating bar should be inset, not full-bleed");
  assert.equal(floatState.overflow, 0, "the floating bar must never cause horizontal overflow");

  // ---------- hysteresis: no jitter around the threshold ----------
  await scrollInstant(desktop, 40);
  assert.equal(await floating(desktop), true, "the bar should hold floating through the dead zone");
  await scrollInstant(desktop, 10);
  assert.equal(await floating(desktop), false, "the bar should re-dock only near the page head");

  // ---------- keyboard focus stays visible on the paper bar ----------
  // (runs before any scrollIntoView, which would move Chromium's sequential
  // focus navigation start point away from the document head)
  await scrollInstant(desktop, 700);
  await desktop.keyboard.press("Tab");
  const focusProbe = await desktop.evaluate(() => {
    const active = document.activeElement;
    const style = getComputedStyle(active);
    return { tag: active.tagName, label: active.getAttribute("aria-label") || active.textContent, outline: style.outlineColor, width: style.outlineWidth };
  });
  assert.equal(focusProbe.tag, "A", "keyboard entry should land on a nav link");
  assert.equal(focusProbe.width, "2px", "the focus ring should keep its ledger weight");
  assert.equal(focusProbe.outline, "rgb(35, 49, 228)", "the focus ring should be cobalt on the paper bar");

  // ---------- persistence: the bar travels without obscuring targets ----------
  await desktop.evaluate(() => document.querySelector("#careers").scrollIntoView({ behavior: "instant" }));
  await desktop.waitForTimeout(500);
  const careersState = await navProbe(desktop);
  assert.equal(careersState.floating, true, "the bar should remain floating down the page");
  assert.ok(careersState.rect.y >= 12 && careersState.rect.y < 60, "the bar should stay pinned in view");
  const careersTop = await desktop.locator("#careers").evaluate((section) => section.getBoundingClientRect().top);
  assert.ok(careersTop >= 66.1875 + 12, "scroll-margin should land anchored sections clear of the floating bar");

  // ---------- the hero CTA anchor lands clear too ----------
  await desktop.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await desktop.waitForTimeout(450);
  await desktop.locator('a[href="#record"]').click();
  await desktop.waitForTimeout(600);
  const recordState = await navProbe(desktop);
  assert.equal(recordState.floating, true, "the record anchor sits well past the float threshold");
  const recordTop = await desktop.locator("#record").evaluate((section) => section.getBoundingClientRect().top);
  assert.ok(
    recordTop >= recordState.rect.y + recordState.rect.height,
    `the record anchor should clear the floating bar (top ${recordTop} vs bar bottom ${recordState.rect.y + recordState.rect.height})`,
  );

  // ---------- the shell rail never swallows clicks outside the bar ----------
  const railHit = await desktop.evaluate(() => {
    const bar = document.querySelector(".topbar").getBoundingClientRect();
    const outside = document.elementFromPoint(4, bar.y + bar.height / 2);
    const inside = document.elementFromPoint(bar.x + 4, bar.y + bar.height / 2);
    return { outside: outside?.closest(".nav-shell") !== null, inside: inside?.closest(".nav-shell") !== null };
  });
  assert.equal(railHit.outside, false, "the transparent shell must not intercept pointer events beside the bar");
  assert.equal(railHit.inside, true, "the bar itself must stay interactive");
  await desktop.close();

  // ---------- mobile: compact stable bar, same material ----------
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openHome(mobile, `${baseUrl}/`);
  await mobile.waitForTimeout(300);
  const mobileRest = await navProbe(mobile);
  assert.equal(mobileRest.floating, false);
  const restHeight = mobileRest.rect.height;
  assert.equal(await mobile.locator(".topbar nav").evaluate((nav) => getComputedStyle(nav).display), "none", "mobile keeps the compact two-item bar");
  await scrollInstant(mobile, 700);
  const mobileFloat = await navProbe(mobile);
  assert.equal(mobileFloat.floating, true, "mobile should float the same material");
  assert.equal(mobileFloat.rect.height, restHeight, "the mobile bar should hold its height stable — no morph");
  assert.match(mobileFloat.background, /0\.86\)$/, "the mobile bar should use the same translucent paper");
  assert.ok(mobileFloat.rect.width <= 390 - 20, "the mobile bar should stay inset from both viewport edges");
  assert.equal(mobileFloat.overflow, 0);
  const chipTarget = await mobile.locator(".topbar .roles-chip").evaluate((chip) => chip.getBoundingClientRect().height);
  assert.ok(chipTarget >= 34, "the mobile roles chip should keep a comfortable tap target");
  const mobileBrand = await mobile.locator('.topbar > a[aria-label="Care and Bloom home"]').evaluate((brand) => brand.getBoundingClientRect().height);
  assert.ok(mobileBrand <= 20, "the mobile brand should hold one line inside the floating bar");
  await mobile.close();

  // ---------- direct in-page anchors stay below the floating bar at every review width ----------
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
    { width: 320, height: 720 },
  ]) {
    const anchored = await browser.newPage({ viewport });
    await openHome(anchored, `${baseUrl}/#careers`);
    await anchored.evaluate(() => document.fonts.ready);
    await anchored.waitForTimeout(500);
    const anchoredBar = await navProbe(anchored);
    const targetTop = await anchored.locator("#careers").evaluate((section) => section.getBoundingClientRect().top);
    assert.equal(anchoredBar.floating, true, `${viewport.width}px direct anchor arrival should float the nav`);
    assert.ok(
      targetTop >= anchoredBar.rect.y + anchoredBar.rect.height,
      `${viewport.width}px direct anchor should clear the floating nav`,
    );
    await anchored.close();
  }

  // ---------- narrow phones: the bar's own contents stay on the paper ----------
  for (const width of [360, 320]) {
    const narrow = await browser.newPage({ viewport: { width, height: 800 } });
    await openHome(narrow, `${baseUrl}/`);
    await narrow.evaluate(() => document.fonts.ready);
    const restBrand = await narrow.locator('.topbar > a[aria-label="Care and Bloom home"]').evaluate((brand) => ({
      clientWidth: brand.clientWidth,
      scrollWidth: brand.scrollWidth,
    }));
    assert.ok(
      restBrand.scrollWidth <= restBrand.clientWidth + 1,
      `the full Care & Bloom mark should render before floating at ${width}px`,
    );
    await scrollInstant(narrow, 900);
    const narrowFloat = await navProbe(narrow);
    assert.equal(narrowFloat.floating, true);
    assert.equal(narrowFloat.overflow, 0, `${width}px phones should never overflow horizontally`);
    assert.ok(narrowFloat.rect.width <= width - 20, `the ${width}px bar should stay inset`);
    const contained = await narrow.evaluate(() => {
      const bar = document.querySelector(".topbar").getBoundingClientRect();
      const chip = document.querySelector(".topbar .roles-chip").getBoundingClientRect();
      const brand = document.querySelector('.topbar > a[aria-label="Care and Bloom home"]').getBoundingClientRect();
      return {
        barLeft: bar.left,
        barRight: bar.right,
        chipLeft: chip.left,
        chipRight: chip.right,
        chipWidth: chip.width,
        brandLeft: brand.left,
        brandClientWidth: document.querySelector('.topbar > a[aria-label="Care and Bloom home"]').clientWidth,
        brandScrollWidth: document.querySelector('.topbar > a[aria-label="Care and Bloom home"]').scrollWidth,
      };
    });
    assert.ok(
      contained.chipRight <= contained.barRight,
      `the roles chip should stay inside the ${width}px floating bar (chip ${contained.chipRight} / bar ${contained.barRight})`,
    );
    assert.ok(contained.brandLeft >= contained.barLeft, `the wordmark should stay inside the ${width}px floating bar`);
    assert.ok(contained.chipLeft > contained.brandLeft, "the bar should keep its wordmark-then-chip order");
    assert.ok(contained.chipWidth >= 147, `the ${width}px chip should keep its full legible label, not shrink`);
    assert.ok(
      contained.brandScrollWidth <= contained.brandClientWidth + 1,
      `the full Care & Bloom mark should render at ${width}px, not ellipsize (${contained.brandScrollWidth}px ink / ${contained.brandClientWidth}px box)`,
    );
    assert.equal(await narrow.locator('.topbar > a[aria-label="Care and Bloom home"]').getAttribute("aria-label"), "Care and Bloom home");
    assert.equal(await narrow.locator(".topbar .roles-chip").textContent(), "Open roles (12)");
    await narrow.close();
  }

  // ---------- reduced motion: instant state change, same geometry ----------
  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await openHome(reduced, `${baseUrl}/`);
  await reduced.waitForTimeout(300);
  assert.equal(await reduced.locator(".nav-shell").evaluate((shell) => getComputedStyle(shell).transitionDuration), "0.001s");
  assert.equal(await reduced.locator(".topbar").evaluate((bar) => getComputedStyle(bar).transitionDuration), "0.001s");
  await scrollInstant(reduced, 700);
  const reducedFloat = await navProbe(reduced);
  assert.equal(reducedFloat.floating, true, "reduced motion should keep the floating behavior, minus the motion");
  assert.match(reducedFloat.background, /0\.86\)$/);
  assert.equal(reducedFloat.rect.y, 12, "reduced motion should land directly on the floating geometry");
  await reduced.close();

  // ---------- no JavaScript: the natural inline header remains ----------
  const noJsContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const noJs = await noJsContext.newPage();
  await noJs.goto(`${baseUrl}/`, { waitUntil: "load" });
  await noJs.waitForTimeout(300);
  const noJsState = await navProbe(noJs);
  assert.equal(noJsState.floating, false, "without JavaScript the bar should remain in its natural inline state");
  assert.equal(noJsState.background, "rgba(0, 0, 0, 0)");
  assert.equal(noJsState.rect.x, 168);
  assert.equal(
    await noJs.locator(".nav-shell").evaluate((shell) => getComputedStyle(shell).position),
    "absolute",
    "without JavaScript the header must not be pinned over the page",
  );
  await noJs.evaluate(() => window.scrollTo({ top: 900, behavior: "instant" }));
  await noJs.waitForTimeout(300);
  const noJsScrolled = await navProbe(noJs);
  assert.ok(
    noJsScrolled.rect.y + noJsScrolled.rect.height <= 0,
    `without JavaScript the header should scroll away, not obscure the page (bottom ${noJsScrolled.rect.y + noJsScrolled.rect.height})`,
  );
  await noJsContext.close();
} finally {
  await browser.close();
}

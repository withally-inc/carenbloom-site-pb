import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";

const hotels = [
  ["Mini Central", "https://www.minicentral.hk/", 2818982, "mini", 370823],
  ["Garden View Hong Kong", "https://yhk.com.hk/templates/show.aspx?i=740", 1999095, "the-garden-view-ywca", 532864],
  ["iclub Sheung Wan Hotel", "https://www.iclub-hotels.com/en/iclub-sheung-wan-hotel/About", 7593728, "iclub-sheung-wan", 968753],
  ["Ying’nFlo, Wesley Admiralty", "https://www.yingnflo.com/en/locations/hong-kong-admiralty/", 22825, "ying-39-nflo-wesley-admiralty-hong-kong", 110421339],
  ["Butterfly on LKF", "https://www.butterflyhk.com/en/butterfly-on-lkf", 31351916, "butterfly-on-lkf", 24640469],
  ["Butterfly on Wellington", "https://www.butterflyhk.com/en/butterfly-on-wellington", 3849819, "butterfly-on-wellington", 392662],
  ["The Putman", "https://www.theputman.com/", 8841142, "the-putman", 6639482],
  ["Mandarin Oriental, Hong Kong", "https://www.mandarinoriental.com/en/hong-kong/victoria-harbour", 6095, "mandarin-oriental-hong-kong", 344946],
];
const hotelNames = hotels.map(([name]) => name);

async function venueLink(card, label) {
  const link = card.getByRole("link", { name: label, exact: true });
  assert.equal(await link.count(), 1, `the venue has one ${label} link`);
  const url = new URL(await link.getAttribute("href"), baseUrl);
  assert.equal(url.protocol, "https:");
  return url;
}

async function assertMapLink(card, label, venue) {
  const url = await venueLink(card, label);
  assert.equal(`${url.origin}${url.pathname}`, "https://www.google.com/maps/search/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.ok(url.searchParams.get("query")?.startsWith(`${venue}, `), `Maps search names ${venue}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  const home = await page.goto(`${baseUrl}/`, { waitUntil: "load" });
  assert.equal(home?.status(), 200, "the home page should render");
  assert.match(await page.title(), /Care & Bloom/);
  assert.equal(await page.locator("h1").first().isVisible(), true, "the home headline should be visible");

  await page.goto(`${baseUrl}/#careers`, { waitUntil: "load" });
  const careersAnchor = page.locator('#careers');
  assert.equal(await careersAnchor.count(), 1, "legacy careers fragments reach a meaningful section");
  const openings = careersAnchor.locator('a[href="/careers"]').first();
  await openings.click();
  await page.waitForURL(/\/careers\/?$/);
  await page.locator('[data-careers-list][data-state="ready"]').waitFor();
  assert.equal(await page.locator('[data-careers-list] a[href*="role="]').count() > 0, true);

  const roleState = await (await fetch(`${baseUrl}/api/role-state`)).json();
  assert.ok(roleState.openRoleCount > 0, "the dry-run API should report open roles");

  await page.goto(`${baseUrl}/careers`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("[data-careers-list]")?.dataset.state !== "loading", null, { timeout: 15000 });
  const rows = await page.locator('[data-careers-list] a[href^="/careers/apply?role="]').count();
  assert.equal(rows, roleState.openRoleCount, "careers should list every open role from the API");

  await page.goto(`${baseUrl}/careers/apply?role=chief-of-staff`, { waitUntil: "load" });
  await page.waitForFunction(
    () => [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => s.textContent.includes("JobPosting")),
    null,
    { timeout: 15000 },
  );
  const posting = await page.evaluate(() =>
    [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => JSON.parse(s.textContent))
      .find((entry) => entry["@type"] === "JobPosting"),
  );
  assert.equal(posting.title, "Chief of Staff", "the apply page should publish the role's JobPosting");

  await page.goto(`${baseUrl}/careers/apply?role=not-a-real-role`, { waitUntil: "load" });
  await page.getByText("Role not found").first().waitFor({ timeout: 15000 });

  const visit = await page.goto(`${baseUrl}/visit/hong-kong/`, { waitUntil: "load" });
  assert.equal(visit?.status(), 200);
  await page.waitForFunction(() => document.documentElement.classList.contains("ready"));
  assert.match(await page.title(), /Visit Hong Kong/);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, follow");
  assert.equal(await page.locator("main h1").count(), 1);
  const visibleHotels = page.locator("[data-hotel]:visible");
  const visibleHotelNames = visibleHotels.getByRole("heading", { level: 3 });
  const disclosure = page.locator(".visit-more summary");
  const places = page.locator("[data-place]");
  const stayJump = page.getByRole("link", { name: /^Where to stay/ });
  assert.equal(await places.count(), 8);
  assert.equal(await stayJump.getByText("08", { exact: true }).isVisible(), true);
  assert.equal(await page.getByText("Where to stay / 08 options", { exact: true }).count(), 1);
  assert.deepEqual(await visibleHotelNames.allTextContents(), hotelNames.slice(0, 3));
  assert.equal(await disclosure.getByText("Expand more", { exact: true }).isVisible(), true);
  await disclosure.focus();
  await page.keyboard.press("Enter");
  assert.equal(await disclosure.getByText("Show less", { exact: true }).isVisible(), true);
  assert.deepEqual(await visibleHotelNames.allTextContents(), hotelNames);
  for (const [name, officialUrl, expediaId, bookingSlug, tripId] of hotels) {
    const hotel = visibleHotels.filter({ has: page.getByRole("heading", { name, exact: true }) });
    assert.equal((await venueLink(hotel, "Official site")).href, officialUrl);
    await assertMapLink(hotel, "Maps", name);

    const expedia = await venueLink(hotel, "Expedia");
    assert.equal(expedia.origin, "https://www.expedia.com");
    assert.ok(expedia.pathname.endsWith(`.h${expediaId}.Hotel-Information`), `Expedia links to ${name}`);
    const booking = await venueLink(hotel, "Booking.com");
    assert.equal(booking.origin, "https://www.booking.com");
    assert.equal(booking.pathname, `/hotel/hk/${bookingSlug}.html`);
    const trip = await venueLink(hotel, "Trip.com");
    assert.equal(trip.origin, "https://us.trip.com");
    assert.ok(trip.pathname.startsWith(`/hotels/hong-kong-hotel-detail-${tripId}/`), `Trip.com links to ${name}`);
  }
  for (const place of await places.all()) {
    await assertMapLink(place, "Maps", await place.getByRole("heading", { level: 4 }).innerText());
    await venueLink(place, /^(Official site|Menu & booking|Venue guide)$/);
  }
  await assertMapLink(page.locator("#office"), "Open office in Maps", "LKF 29");
  const scenicHotel = page.locator("[data-hotel]").filter({ has: page.getByRole("heading", { name: "Garden View Hong Kong", exact: true }) });
  assert.equal(await scenicHotel.count(), 1, "the supplied scenic hotel is a full hotel card");
  assert.match(await scenicHotel.innerText(), /Mid-Levels/);
  assert.match(await scenicHotel.innerText(), /10 to 15 min walk/);
  assert.match(await scenicHotel.innerText(), /return from the office is uphill/);
  assert.equal(await page.getByText("One more to come", { exact: true }).count(), 0);

  // Exercise the rendered image contract: each photo must actually decode when scrolled into view.
  // This catches broken files and lazy-loading failures, not just the presence of image markup.
  const hotelPromotionalPhotoSources = new Map([
    ["Mini Central", "https://www.minicentral.hk/"],
    ["The Putman", "https://www.theputman.com/"],
  ]);
  let photoBytes = 0;
  const photoUrls = new Set();
  for (const card of await page.locator("[data-hotel], [data-place]").all()) {
    const photo = card.locator("figure img");
    assert.equal(await photo.count(), 1, "each named venue has one photo");
    assert.ok((await photo.getAttribute("alt"))?.trim().length > 20, "photos have descriptive alt text");
    assert.equal(await photo.getAttribute("loading"), "lazy");
    assert.equal(await photo.getAttribute("decoding"), "async");
    await photo.scrollIntoViewIfNeeded();
    await photo.evaluate((image) => image.decode());
    const image = await photo.evaluate((element) => ({
      width: element.naturalWidth, height: element.naturalHeight,
      reservedWidth: Number(element.getAttribute("width")), reservedHeight: Number(element.getAttribute("height")),
      url: element.currentSrc, fallback: element.src, candidates: element.srcset.split(",").map((entry) => entry.trim().split(/\s+/)[0]),
    }));
    // srcset density-corrects naturalWidth; check physical pixels below on the standalone file.
    assert.ok(image.width > 0 && image.height > 0, "the rendered card photo decoded");
    assert.ok(Math.abs(image.reservedWidth / image.reservedHeight - image.width / image.height) < 0.01, "intrinsic dimensions reserve the correct aspect ratio");
    for (const url of [image.url, image.fallback, ...image.candidates]) photoUrls.add(new URL(url, baseUrl).href);
    const promotionalPhoto = hotelPromotionalPhotoSources.get(await card.locator("h3, h4").innerText());
    if (promotionalPhoto) {
      assert.equal(await card.locator("figcaption a").getAttribute("href"), promotionalPhoto);
    } else {
      assert.equal(await card.locator('figcaption a[href^="https://commons.wikimedia.org/"]').count(), 1, "photo credit links to its source");
      assert.equal(await card.locator('figcaption a[href^="https://creativecommons.org/"]').count(), 1, "photo credit links to its licence");
    }
  }
  await disclosure.focus();
  await page.keyboard.press("Space");
  assert.equal(await page.locator("[data-hotel]:visible").count(), 3);
  for (const url of photoUrls) {
    assert.equal(new URL(url).origin, new URL(baseUrl).origin, "photos are self-hosted");
    const response = await fetch(url);
    assert.equal(response.status, 200, "every responsive variant is served");
    assert.match(response.headers.get("content-type"), /image\/webp/);
    photoBytes += (await response.arrayBuffer()).byteLength;
    const pixels = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }, url);
    assert.ok(pixels.width >= 384 && pixels.height >= 288, "every responsive file has sufficient physical resolution");
  }
  assert.ok(photoBytes < 1.5 * 1024 * 1024, "all photo variants stay within a 1.5 MiB budget");
  assert.equal(await page.locator("main iframe").count(), 0);
  for (const link of await page.locator('main a[href^="#"]').all()) {
    const hash = await link.getAttribute("href");
    assert.equal(await page.locator(hash).count(), 1, `${hash} jump target exists`);
  }
  await stayJump.click();
  await page.waitForFunction(() => document.activeElement?.id === "stay");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const theme of ["light", "violet"]) {
      await page.evaluate((value) => document.documentElement.dataset.theme = value, theme);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px ${theme} has no horizontal overflow`);
      const rolesLink = await page.locator('header .nav__roles').boundingBox();
      assert.ok(rolesLink && rolesLink.x >= 0 && rolesLink.x + rolesLink.width <= width,
        `${width}px ${theme}: the header's open-roles link must fit inside the viewport`);
    }
  }
  // The full guide and navigation remain available when enhancement is unavailable.
  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const staticPage = await noScript.newPage();
    await staticPage.goto(`${baseUrl}/visit/hong-kong/`);
    assert.equal(await staticPage.getByRole("heading", { name: "See you in Hong Kong." }).isVisible(), true);
    assert.equal(await staticPage.locator("[data-hotel]").count(), hotelNames.length);
    const staticPhoto = staticPage.locator("[data-hotel] img").first();
    await staticPhoto.scrollIntoViewIfNeeded();
    assert.ok(await staticPhoto.isVisible(), "venue photography is present without page JavaScript");
    await staticPage.emulateMedia({ media: "print" });
    const printedStay = (await staticPage.locator("#stay").innerText()).split("\n");
    assert.deepEqual(printedStay.filter((line) => hotelNames.includes(line)), hotelNames, "the collapsed guide prints every hotel");
    assert.equal(await staticPage.getByText("Expand more", { exact: true }).isVisible(), false);
    await staticPage.emulateMedia({ media: null });
    assert.equal(await staticPage.locator("[data-hotel]:visible").count(), 3);
    const bookingLinks = await staticPage.locator("[data-hotel] a").evaluateAll((links) =>
      links.filter((link) => /^(Expedia|Booking\.com|Trip\.com)\b/.test(link.textContent.trim())).map((link) => link.href),
    );
    assert.equal(bookingLinks.length, hotels.length * 3);
    const pdf = (await staticPage.pdf()).toString("latin1");
    for (const url of bookingLinks) assert.ok(pdf.includes(`/URI (${url})`), `the print export links to ${url}`);
    assert.equal(await staticPage.locator("[data-hotel]:visible").count(), 3);
    await staticPage.getByRole("link", { name: "Lunch · 02" }).click();
    assert.match(staticPage.url(), /#lunch$/);
    assert.equal(await staticPage.locator("#lunch").isVisible(), true);
  } finally {
    await noScript.close();
  }
  assert.deepEqual(pageErrors, [], "no page should throw");
  console.log("v4 site browser tests passed");
} finally {
  await browser.close();
}

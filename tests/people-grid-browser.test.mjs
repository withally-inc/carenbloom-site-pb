import assert from "node:assert/strict";
import { chromium } from "playwright";

/* The People cards wrap each portrait in a <picture> for AVIF delivery, and `.person > picture`
   carries `display: contents` so the portrait stays a direct grid item. That promotion also hands
   the sibling <source> to the grid, where it would claim column one and shove the portrait into the
   meta column on desktop and add a whole extra gap row on mobile. Pin the shipped geometry. */

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";
const browser = await chromium.launch({ headless: true });

async function personGeometry(page) {
  return page.evaluate(() => {
    const person = document.querySelector(".people-grid .person");
    const box = (el) => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    };
    const style = getComputedStyle(person);
    return {
      sourceDisplays: Array.from(
        document.querySelectorAll(".people-grid .person > picture > source"),
        (source) => getComputedStyle(source).display,
      ),
      person: box(person),
      portrait: box(person.querySelector(".p-img")),
      meta: box(person.querySelector(".p-meta")),
      grid: box(document.querySelector(".people-grid")),
      leadingSpace: Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.paddingTop),
    };
  });
}

try {
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(baseUrl, { waitUntil: "load" });
    const desktop = await personGeometry(page);

    assert.ok(desktop.sourceDisplays.length > 0, "each desktop person card should still ship an AVIF <source>");
    assert.deepEqual(
      [...new Set(desktop.sourceDisplays)],
      ["none"],
      "a <source> hoisted by `display: contents` must not lay out as a grid item",
    );
    assert.ok(
      Math.abs(desktop.portrait.left - desktop.person.left) <= 1,
      "the desktop portrait should occupy the card's first column",
    );
    assert.ok(
      desktop.meta.left >= desktop.portrait.right - 1,
      "the desktop meta column should sit to the right of the portrait, not below it",
    );
    assert.ok(
      Math.abs(desktop.meta.top - desktop.portrait.top) <= 1,
      "the desktop portrait and meta should share one row",
    );
    assert.ok(
      Math.abs(desktop.grid.height - desktop.person.height) <= 1,
      "the desktop people grid should be a single card tall",
    );
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(baseUrl, { waitUntil: "load" });
    const mobile = await personGeometry(page);

    assert.deepEqual(
      [...new Set(mobile.sourceDisplays)],
      ["none"],
      "a <source> hoisted by `display: contents` must not lay out as a grid item",
    );
    assert.ok(
      Math.abs(mobile.portrait.left - mobile.person.left) <= 1,
      "the mobile portrait should start at the card's left edge",
    );
    assert.ok(
      Math.abs(mobile.portrait.top - mobile.person.top - mobile.leadingSpace) <= 1,
      "the mobile top rule should sit one padding step above the portrait, with no stray grid row between them",
    );
    assert.ok(
      mobile.meta.top >= mobile.portrait.top + mobile.portrait.height - 1,
      "the mobile meta block should stack directly under the portrait",
    );
    await page.close();
  }
} finally {
  await browser.close();
}

console.log("people grid geometry checks passed");

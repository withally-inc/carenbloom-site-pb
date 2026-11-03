import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { fixture, json, collection, deferred, roleResponse, serverNow } from './helpers/site-browser.mjs';

const browser = await chromium.launch();
const counts = [15, 14, 9, 10];
const now = Date.parse(serverNow);

async function assertDigits(locator, expected) {
  const values = await locator.evaluateAll((els) => els.map((el) => ({
    accessible: el.getAttribute('aria-label'),
    visible: el.checkVisibility() ? [...el.querySelectorAll('.odo__cell')].map((cell) => {
      const strip = cell.querySelector('.odo__strip');
      const y = new DOMMatrix(getComputedStyle(strip).transform).m42;
      const height = parseFloat(getComputedStyle(strip.firstElementChild).height);
      return String(Math.round(-y / height) % 10);
    }).join('') : null,
  })));
  assert.ok(values.length);
  assert.ok(values.some((value) => value.visible !== null));
  for (const value of values) {
    assert.equal(value.accessible, String(expected));
    if (value.visible !== null) assert.equal(value.visible, String(expected), 'the digit in each clipping window must match its announced value');
  }
}

try {
  for (const path of ['/', '/careers/', '/careers/apply/?role=chief-of-staff']) {
    for (const early of [true, false]) {
      const responseGate = deferred();
      const f = await fixture(browser, { clock: true,
        collection: async (route, n) => {
          if (!early) await responseGate.promise;
          return json(route, { ...collection(), openRoleCount: counts[Math.min(n - 1, counts.length - 1)], nextBoundaryAt: new Date(now + 5000).toISOString() });
        },
        role: async (route, n) => {
          if (!early) await responseGate.promise;
          const body = roleResponse();
          body.state.effectiveClosesAt = new Date(now + (n === 1 ? 183845 : 93784) * 1000).toISOString();
          body.state.nextRefreshAt = new Date(now + 5000).toISOString();
          return json(route, body);
        },
      });
      try {
        if (early) await f.page.addInitScript(() => Object.defineProperty(document.fonts, 'ready', {
          value: new Promise((resolve) => { window.releaseFonts = resolve; }),
        }));
        await f.open(path);
        if (early) {
          await f.page.locator('html[data-roles="15"]').waitFor();
          if (path.includes('/apply/')) await f.page.locator('[data-cd="m"][aria-label="4"]').waitFor();
          assert.equal(await f.page.locator('html').evaluate((el) => el.classList.contains('ready')), false);
          await f.page.evaluate(() => window.releaseFonts());
        }
        await f.page.locator('html.ready').waitFor();
        responseGate.resolve();
        await f.page.locator('html[data-roles="15"]').waitFor();
        await f.page.clock.runFor(50);
        await assertDigits(f.page.locator('[data-role-count]'), 15);
        for (const count of counts.slice(1)) {
          await f.page.clock.runFor(5000);
          await f.page.locator(`html[data-roles="${count}"]`).waitFor();
          await f.page.clock.runFor(50);
          await assertDigits(f.page.locator('[data-role-count]'), count);
          await f.page.setViewportSize({ width: 390, height: 844 });
          await f.page.locator('.nav__menu').click();
          await f.page.locator('.panel[data-open]').waitFor();
          await assertDigits(f.page.locator('.panel__roles [data-role-count]'), count);
          await f.page.locator('.panel__close').click();
          await f.page.setViewportSize({ width: 1440, height: 900 });
        }
        if (path.includes('/apply/')) {
          for (const [part, count] of [['d', 1], ['h', 2], ['m', 3]]) {
            await assertDigits(f.page.locator(`[data-cd="${part}"]`), count);
          }
        }
      } finally {
        responseGate.resolve();
        await f.close();
      }
    }
  }
  console.log('Visible role counts and countdown digits update before and after reveals');
} finally {
  await browser.close();
}

import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { fixture, json, collection, roleResponse, metadata, posting, serverNow } from './helpers/site-browser.mjs';

const browser = await chromium.launch();
const countValues = (page) => page.locator('[data-role-count]').evaluateAll((els) => els.map((el) => el.querySelector('.odo__sr')?.textContent ?? el.textContent));
const zero = () => ({ ...collection(), openRoleCount: 0, roles: [], groupCounts: {} });
const one = () => ({ ...collection(), openRoleCount: 1, roles: collection().roles.slice(0, 1), groupCounts: { platform: 1 } });
async function assertCounts(f, count) {
  await f.page.waitForFunction((n) => document.documentElement.dataset.roles === String(n), count);
  assert.deepEqual(await countValues(f.page), Array(3).fill(String(count)), 'desktop, mobile, and footer must agree');
  await f.page.setViewportSize({ width: 390, height: 844 });
  await f.page.locator('.nav__menu').click();
  await f.page.locator('.panel[data-open]').waitFor();
  assert.equal(await f.page.locator('.panel__roles').getAttribute('href'), '/careers');
  assert.equal(await f.page.locator('.panel__roles [data-role-count]').getAttribute('aria-label'), String(count));
  assert.equal(await f.page.locator('.panel__roles [data-role-count-fold]').isVisible(), true);
  await f.page.locator('.panel__close').click();
  await f.page.setViewportSize({ width: 1440, height: 900 });
}

try {
  for (const path of ['/', '/careers/']) {
    for (const state of ['zero', 'error']) {
      const f = await fixture(browser, { collection: (route) => json(route, state === 'zero' ? zero() : { error: 'unavailable' }, state === 'zero' ? 200 : 503) });
      try {
        await f.open(path);
        await f.page.locator(`html[data-roles-state="${state}"]`).waitFor();
        assert.equal(f.calls.collections.length, 1);
        if (state === 'zero') await assertCounts(f, 0);
        else {
          assert.deepEqual(await countValues(f.page), ['', '', '']);
          assert.equal(await f.page.locator('html').getAttribute('data-roles'), null);
          assert.equal(await f.page.locator('.nav__countfold').isVisible(), false);
          await f.page.setViewportSize({ width: 390, height: 844 });
          await f.page.locator('.nav__menu').click();
          await f.page.locator('.panel[data-open]').waitFor();
          assert.equal(await f.page.locator('.panel__roles').innerText(), 'Open roles');
        }
        assert.equal(await f.page.locator(`[data-role-slot] [data-slot-item="${state}"]`).getAttribute('aria-hidden'), null);
        if (path === '/careers/') {
          await f.page.locator(`[data-careers-list][data-state="${state === 'zero' ? 'empty' : 'error'}"]`).waitFor();
          assert.equal(await f.page.locator('[data-careers-list] a[href*="role="]').count(), 0);
          assert.equal(await f.page.locator('[data-careers-list]').getAttribute('data-state'), state === 'zero' ? 'empty' : 'error');
        }
      } finally { await f.close(); }
    }
    const f = await fixture(browser, { context: { javaScriptEnabled: false } });
    try {
      await f.open(path);
      assert.equal(f.calls.collections.length, 0);
      assert.deepEqual(await countValues(f.page), ['', '', '']);
      assert.equal(await f.page.locator('[data-slot-item="loading"]').getAttribute('data-on'), '');
      assert.match(await f.page.locator('[data-slot-item="loading"]').innerText(), /Checking current openings/);
      assert.equal(await f.page.locator('.nav__countfold').isVisible(), false);
    } finally { await f.close(); }
  }

  // A single collection owner refreshes home and careers through zero, reopening,
  // and outage. No consumer may keep the previous numeric claim after failure.
  for (const path of ['/', '/careers/']) {
    const f = await fixture(browser, { clock: true, collection: (route, n) => {
      const body = n === 1 ? collection() : n === 2 ? zero() : one();
      body.nextBoundaryAt = new Date(Date.parse(body.serverNow) + 5000).toISOString();
      return n > 3 ? json(route, { error: 'unavailable' }, 503) : json(route, body);
    } });
    try {
      await f.open(path);
      await assertCounts(f, collection().openRoleCount);
      for (const [n, state] of [[0, 'zero'], [1, 'ready']]) {
        await f.page.clock.runFor(5000);
        await f.page.locator(`html[data-roles-state="${state}"]`).waitFor();
        await assertCounts(f, n);
        if (path === '/careers/') {
          await f.page.waitForFunction((expected) => document.querySelector('[data-careers-list]')?.dataset.state === expected, n ? 'ready' : 'empty');
          assert.equal(await f.page.locator('[data-careers-list] a[href*="role="]').count(), n);
        }
      }
      assert.equal(f.calls.collections.length, 3, 'one request at each collection boundary');
      await f.page.clock.runFor(5000);
      await f.page.locator('html[data-roles-state="error"]').waitFor();
      assert.deepEqual(await countValues(f.page), ['', '', '']);
      assert.equal(await f.page.locator('[data-role-slot] [data-slot-item="error"]').getAttribute('aria-hidden'), null);
      if (path === '/careers/') {
        await f.page.locator('[data-careers-list][data-state="error"]').waitFor();
        assert.equal(await f.page.locator('[data-careers-list] a[href*="role="]').count(), 0);
      }
    } finally { await f.close(); }
  }

  // Retrying the careers list also republishes its result to every count surface.
  {
    const f = await fixture(browser, { collection: (route, n) => n === 1 ? json(route, {}, 503) : json(route, one()) });
    try {
      await f.open('/careers/');
      await f.page.locator('[data-careers-list][data-state="error"]').waitFor();
      await f.page.getByRole('button', { name: 'Try again' }).click();
      await assertCounts(f, 1);
      await f.page.locator('[data-careers-list][data-state="ready"]').waitFor();
      assert.equal(await f.page.locator('[data-careers-list] a[href*="role="]').count(), 1);
    } finally { await f.close(); }
  }

  for (const slug of ['chief-of-staff', 'graphic-designer']) {
    const f = await fixture(browser);
    try {
      await f.open(`/careers/apply/?role=${slug}`);
      await f.page.locator('[data-role-content]:not([hidden])').waitFor();
      assert.deepEqual(await metadata(f.page), { canonical: `https://carenbloom.com/careers/apply/?role=${slug}`, og: `https://carenbloom.com/careers/apply/?role=${slug}`, robots: 'index, follow' });
      assert.equal((await posting(f.page)).title, roleResponse(slug).role.title);
      assert.match(await f.page.locator('[data-role-content]').textContent(), /crossed 9-figure revenue/);
    } finally { await f.close(); }
  }

  for (const state of ['missing', 'unknown', 'closed', 'unavailable']) {
    const f = await fixture(browser, { role: (route) => state === 'unavailable' ? json(route, {}, 503) : json(route, state === 'closed' ? { ...roleResponse(), status: 'closed', state: { ...roleResponse().state, isOpen: false } } : roleResponse('not-real')) });
    try {
      await f.open(state === 'missing' ? '/careers/apply/' : `/careers/apply/?role=${state === 'unknown' ? 'not-real' : 'chief-of-staff'}`);
      await f.page.locator(`[data-role-unavailable][data-state="${state === 'missing' ? 'unknown' : state}"]`).waitFor();
      assert.match((await metadata(f.page)).robots, /noindex/);
      assert.equal((await metadata(f.page)).canonical, null);
      assert.equal((await metadata(f.page)).og, null);
      assert.equal(await posting(f.page), null);
      assert.equal(await f.page.locator('#application-form').isVisible(), false);
      if (state === 'missing') assert.equal(f.calls.roles.length, 0);
    } finally { await f.close(); }
  }

  // Metadata follows later authority changes, including recovery from an outage.
  for (const state of ['unknown', 'closed']) {
    const f = await fixture(browser, { clock: true, role: (route, n) => json(route, n === 1 ? { ...roleResponse(), state: { ...roleResponse().state, nextRefreshAt: new Date(Date.parse(serverNow) + 5000).toISOString() } } : state === 'unknown' ? { ...roleResponse(), role: { slug: 'chief-of-staff', title: 'Chief of Staff' }, state: { isOpen: true } } : { ...roleResponse(), status: 'closed', state: { ...roleResponse().state, isOpen: false } }) });
    try {
      await f.open();
      await f.page.locator('[data-role-content]:not([hidden])').waitFor();
      await f.page.clock.runFor(5000);
      await f.page.locator(`[data-role-unavailable][data-state="${state}"]`).waitFor();
      assert.match((await metadata(f.page)).robots, /noindex/);
      assert.equal((await metadata(f.page)).canonical, null);
      assert.equal((await metadata(f.page)).og, null);
      assert.equal(await posting(f.page), null);
    } finally { await f.close(); }
  }
  {
    const f = await fixture(browser, { role: (route, n) => n <= 3 ? json(route, {}, 503) : json(route, roleResponse()) });
    try {
      await f.open();
      await f.page.locator('[data-role-unavailable][data-state="unavailable"]').waitFor();
      await f.page.getByRole('button', { name: 'Try again' }).click();
      await f.page.locator('[data-role-content]:not([hidden])').waitFor();
      assert.doesNotMatch((await metadata(f.page)).robots, /noindex/);
      assert.match((await metadata(f.page)).canonical, /\?role=chief-of-staff$/);
    } finally { await f.close(); }
  }
  console.log('v4 role counts, collection boundaries, and role metadata browser tests passed');
} finally { await browser.close(); }

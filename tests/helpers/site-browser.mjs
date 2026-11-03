import assert from 'node:assert/strict';
import { careerRoles } from '../../scripts/careers-roles.js';
import { resolveRoleStateResponse } from '../../api/_lib/role-state-response.js';

export const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:49279';
export const serverNow = '2026-11-03T06:00:00.000Z';
export const roleResponse = (slug = 'chief-of-staff', now = serverNow) =>
  resolveRoleStateResponse({ roles: careerRoles, serverNow: now, slug }).payload;
export const collection = () => roleResponse(null);
export const file = (name = 'resume.pdf', size = 32) => ({ name, mimeType: 'application/pdf', buffer: Buffer.alloc(size, 65) });
export const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
export const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

// Serve the committed build at an isolated origin. Every request is intercepted;
// production-origin POSTs can only reach the mock, never a live intake or Notion.
export async function fixture(browser, options = {}) {
  const origin = options.origin || 'https://carenbloom.com';
  const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block', viewport: { width: 1440, height: 900 }, ...options.context });
  const calls = { collections: [], roles: [], applications: [], errors: [], unexpected: [] };
  let roleCalls = 0;
  let collectionCalls = 0;
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) {
      calls.unexpected.push(request.url());
      return route.abort('blockedbyclient');
    }
    if (url.pathname === '/api/applications') {
      calls.applications.push(request);
      if (options.application) return options.application(route, calls.applications.length);
      return json(route, { success: true, ref: 'CB-MOCK' });
    }
    if (url.pathname === '/api/role-state') {
      if (url.searchParams.has('role')) {
        calls.roles.push(request);
        if (options.role) return options.role(route, ++roleCalls);
        return json(route, roleResponse(url.searchParams.get('role')));
      }
      calls.collections.push(request);
      if (options.collection) return options.collection(route, ++collectionCalls);
      return json(route, collection());
    }
    assert.notEqual(request.method(), 'POST', 'only the application mock accepts POST');
    const response = await fetch(`${baseUrl}${url.pathname}${url.search}`);
    return route.fulfill({ status: response.status, headers: { 'content-type': response.headers.get('content-type') || 'application/octet-stream' }, body: Buffer.from(await response.arrayBuffer()) });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror', (error) => calls.errors.push(error.message));
  if (options.clock) {
    await page.clock.install({ time: new Date(serverNow) });
    await page.clock.pauseAt(new Date(Date.parse(serverNow) + 1000));
  }
  return {
    context, page, calls, origin,
    async open(path = '/careers/apply/?role=chief-of-staff') {
      await page.goto(origin + path, { waitUntil: 'load' });
    },
    async close() {
      await context.close();
      assert.deepEqual(calls.errors, [], 'the built client must not throw');
      assert.deepEqual(calls.unexpected, [], 'the isolated browser must never request a live service');
    },
  };
}

export async function fillApplication(page) {
  await page.locator('[data-role-content]:not([hidden])').waitFor();
  const values = {
    first_name: 'Test', last_name: 'Applicant', email: 'applicant@example.invalid', phone_number: '5550100',
    linkedin: 'https://example.invalid/profile', intro_video_url: 'https://example.invalid/intro', monthly_income_usd: '12000',
    role_question_1: 'First synthetic answer.', role_question_2: 'Second synthetic answer.', role_question_3: 'Third synthetic answer.',
  };
  for (const [name, value] of Object.entries(values)) await page.locator(`[name="${name}"]`).fill(value);
  await page.locator('[name="phone_country_code"]').selectOption('+1');
  await page.locator('[name="location"]').selectOption('United States');
  await page.locator('[name="open_time_zone"][value="US"]').check();
  await page.locator('[name="open_time_zone"][value="Europe"]').check();
  await page.locator('[name="resume"]').setInputFiles(file());
}

export const submit = (page) => page.locator('[data-submit]').click();
export const posting = (page) => page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).find((s) => s['@type'] === 'JobPosting') || null);
export const metadata = (page) => page.evaluate(() => ({
  canonical: document.querySelector('link[rel="canonical"]')?.href || null,
  og: document.querySelector('meta[property="og:url"]')?.content || null,
  robots: document.querySelector('meta[name="robots"]')?.content || '',
}));

import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { fillApplication, metadata } from './helpers/site-browser.mjs';

const preview = new URL(process.env.PREVIEW_URL || 'http://missing-preview.invalid');
assert.match(preview.hostname, /^[a-z0-9-]+\.care-and-bloom\.pages\.dev$/, 'PREVIEW_URL must name the task Cloudflare Pages preview');
const origin = preview.origin;

for (const [path, status, destination] of [
  ['/talents', 301, '/careers/'], ['/talents/', 301, '/careers/'],
  ['/pb-live', 308, '/'], ['/pb-live/', 308, '/'],
  ['/talents/apply', 301, '/careers/apply'],
]) {
  const search = '?role=chief-of-staff&source=compatibility-check';
  const response = await fetch(origin + path + search, { redirect: 'manual' });
  assert.equal(response.status, status, `${path} redirect status`);
  const target = new URL(response.headers.get('location'), origin);
  assert.equal(target.origin, origin);
  assert.equal(target.pathname, destination, `${path} redirect destination`);
  assert.equal(target.search, search, `${path} preserves the query`);
  assert.equal((await fetch(target)).status, 200, `${path} renders its destination`);
  console.log(`${path}: ${status} -> ${target.pathname}${target.search}`);
}

const roleState = await fetch(origin + '/api/role-state');
assert.equal(roleState.status, 200);
assert.match(roleState.headers.get('cache-control'), /no-store/);
const roles = await roleState.json();
assert.ok(roles.openRoleCount > 0);
assert.equal((await fetch(origin + '/api/applications')).status, 405, 'the deployed relay remains reachable without submitting');
assert.equal((await fetch(origin + '/genuinely-unknown-route')).status, 404);

const browser = await chromium.launch();
const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
let posts = 0;
const errors = [];
await context.route('**/api/applications', (route) => {
  posts++;
  return route.abort('blockedbyclient'); // fail closed even if the preview host guard regresses
});
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
try {
  for (const path of ['/talents', '/talents/']) {
    await page.goto(origin + path + '?source=compatibility-check');
    await page.locator('[data-careers-list][data-state="ready"]').waitFor();
    assert.equal(new URL(page.url()).pathname, '/careers/');
    assert.equal(new URL(page.url()).searchParams.get('source'), 'compatibility-check');
    assert.equal(await page.locator('[data-careers-list] a[href*="role="]').count(), roles.openRoleCount);
  }
  for (const path of ['/pb-live', '/pb-live/']) {
    await page.goto(origin + path);
    assert.equal(new URL(page.url()).pathname, '/');
    assert.equal(await page.locator('body').getAttribute('data-page'), 'home');
  }
  await page.goto(origin + '/#careers');
  assert.equal(await page.locator('#careers a[href="/careers"]').count() > 0, true);
  await page.locator('#careers a[href="/careers"]').first().click();
  await page.locator('[data-careers-list][data-state="ready"]').waitFor();
  await page.goto(origin + '/genuinely-unknown-route');
  await page.getByRole('heading', { name: 'This page never bloomed.' }).waitFor();
  for (const slug of ['chief-of-staff', 'graphic-designer']) {
    await page.goto(`${origin}/careers/apply/?role=${slug}`);
    await page.locator('[data-role-content]:not([hidden])').waitFor();
    const meta = await metadata(page);
    assert.equal(meta.canonical, `https://carenbloom.com/careers/apply/?role=${slug}`);
    assert.equal(meta.og, meta.canonical);
    assert.doesNotMatch(meta.robots, /noindex/);
  }
  await page.goto(origin + '/careers/apply/?role=chief-of-staff');
  await fillApplication(page);
  await page.locator('[data-submit]').click();
  await page.locator('[data-form-status][data-state="preview"]').waitFor();
  assert.equal(posts, 0, 'the preview must never attempt a submission');
  assert.deepEqual(errors, []);
  console.log(`Cloudflare preview checks passed: ${origin}`);
} finally { await browser.close(); }

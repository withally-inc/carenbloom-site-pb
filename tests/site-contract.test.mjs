import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = ["index.html", "careers/index.html", "careers/apply/index.html", "visit/hong-kong/index.html", "404.html"];

test("robots.txt is served as plain text with the public crawl policy", async () => {
  const { baseUrl } = await import("./helpers/site-browser.mjs");
  const response = await fetch(`${baseUrl}/robots.txt`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^text\/plain(?:;|$)/i);
  assert.equal(await response.text(), "User-agent: *\nAllow: /\nDisallow: /api/\n");
});

function localReferences(html) {
  const refs = new Set();
  for (const match of html.matchAll(/\b(?:href|src|content)="(\/[^"#?]*)/g)) {
    const ref = match[1];
    if (ref === "/" || ref.startsWith("//") || ref.startsWith("/api/")) continue;
    refs.add(ref);
  }
  return refs;
}

function resolves(ref) {
  const target = path.join(root, decodeURIComponent(ref));
  return existsSync(target) || existsSync(path.join(target, "index.html")) || existsSync(`${target}.html`);
}

test("every page of the v4 site ships at the repository root", () => {
  for (const page of pages) assert.ok(existsSync(path.join(root, page)), `${page} should be published`);
});

test("every local asset a page references is published", () => {
  for (const page of pages) {
    const missing = [...localReferences(readFileSync(path.join(root, page), "utf8"))].filter((ref) => !resolves(ref));
    assert.deepEqual(missing, [], `${page} references files that are not published`);
  }
});

test("pages are indexable and canonical to the production domain", () => {
  for (const page of ["index.html", "careers/index.html"]) {
    const html = readFileSync(path.join(root, page), "utf8");
    assert.doesNotMatch(html, /noindex/i, `${page} must not ship a noindex directive`);
    assert.match(html, /<link rel="canonical" href="https:\/\/carenbloom\.com\//, `${page} should be canonical to carenbloom.com`);
    assert.doesNotMatch(html, /\.vercel\.app/, `${page} must not point at a preview host`);
  }
});

test("the built browser calls both same-origin APIs", async () => {
  const { chromium } = await import("playwright");
  const { fixture, fillApplication, submit } = await import("./helpers/site-browser.mjs");
  const browser = await chromium.launch();
  try {
    const f = await fixture(browser);
    await f.open();
    await fillApplication(f.page);
    await submit(f.page);
    await f.page.locator("[data-success]:not([hidden])").waitFor();
    assert.equal(f.calls.collections.length, 1);
    assert.equal(f.calls.collections[0].url(), `${f.origin}/api/role-state`);
    assert.equal(f.calls.roles[0].url(), `${f.origin}/api/role-state?role=chief-of-staff`);
    assert.equal(f.calls.applications.length, 1);
    assert.equal(f.calls.applications[0].url(), `${f.origin}/api/applications`);
    assert.equal(f.calls.applications[0].method(), "POST");
    await f.close();
  } finally {
    await browser.close();
  }
});

test("the runtime owners stay in place beside the site", () => {
  for (const owner of [
    "api/applications.js", "api/role-state.js", "api/health.js", "functions/api/applications.js",
    "functions/api/role-state.js", "scripts/careers-roles.js", "scripts/api-endpoints.js", "_redirects", "vercel.json",
  ]) {
    assert.ok(existsSync(path.join(root, owner)), `${owner} should remain`);
  }
});

test("the visitor guide is a direct-link, noindex page with useful outbound links", async () => {
  const { baseUrl } = await import("./helpers/site-browser.mjs");
  const response = await fetch(`${baseUrl}/visit/hong-kong/`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<meta name="robots" content="noindex, follow"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/carenbloom\.com\/visit\/hong-kong\/"/);
  assert.match(html, /29 Wyndham Street/);
  assert.equal((html.match(/data-hotel/g) || []).length, 8);
  assert.equal((html.match(/data-place/g) || []).length, 8);
  assert.equal((html.match(/https:\/\/www\.google\.com\/maps\/search\//g) || []).length, 17);
  for (const host of ["iclub-hotels.com", "yingnflo.com", "butterflyhk.com", "ovolohotels.com", "theputman.com.hk", "mandarinoriental.com", "yhk.com.hk"]) {
    assert.ok(html.includes(host), `${host} official hotel link is present`);
  }
  assert.doesNotMatch(html, /<iframe|<script[^>]+src="https?:|[\u2013\u2014]/);
  for (const page of ["index.html", "careers/index.html", "careers/apply/index.html"]) {
    assert.doesNotMatch(readFileSync(path.join(root, page), "utf8"), /href="\/visit\//, "guide stays out of existing public pages and chrome");
  }
  // The page must remain crawlable for its noindex directive to be discoverable.
  assert.doesNotMatch(readFileSync(path.join(root, "robots.txt"), "utf8"), /Disallow:.*visit/);
});

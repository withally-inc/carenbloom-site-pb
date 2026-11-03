import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = ["index.html", "careers/index.html", "careers/apply/index.html", "404.html"];

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

test("the browser talks to the same-origin role-state and applications APIs", () => {
  const bundles = readFileSync(path.join(root, "careers/apply/index.html"), "utf8").match(/\/assets\/[\w.-]+\.js/g) ?? [];
  const code = bundles.map((bundle) => readFileSync(path.join(root, bundle), "utf8")).join("\n");
  assert.match(code, /\/api\/role-state/);
  assert.match(code, /\/api\/applications/);
});

test("the runtime owners stay in place beside the site", () => {
  for (const owner of [
    "api/applications.js", "api/role-state.js", "api/health.js", "functions/api/applications.js",
    "functions/api/role-state.js", "scripts/careers-roles.js", "scripts/api-endpoints.js", "_redirects", "vercel.json",
  ]) {
    assert.ok(existsSync(path.join(root, owner)), `${owner} should remain`);
  }
});

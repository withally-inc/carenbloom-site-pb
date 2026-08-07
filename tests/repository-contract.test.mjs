import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { careerRoles } from "../scripts/careers-roles.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const decodeEntities = (value) => value.replace(/&amp;/g, "&");
const faviconAssets = {
  "favicon.svg": "a2e3aceeee7439b4df0a7ae619c5df16441b11968286f561aa2039f8c6b34cf2",
  "favicon-16.png": "3df6cd3925d90752e8e25250e7eb041849a991e973dd9c41d98efc2073667e8d",
  "favicon-32.png": "a1dc5a0165f8f95d500979c82bafb6129db53dc1d316c8059d32258053d35286",
  "favicon-512.png": "cb52f30b187e47cf2df5522b16f867c365deb6083a08b67ecdab2ee25e0e1413",
  "apple-touch-icon-180.png": "a8c8d7a6c0ef8f01a37b89265407427d52fbbdad7acb3a7b54cdfa3e525bfccc",
};
const faviconTags = [
  '<link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">',
  '<link rel="icon" href="/favicon-16.png" type="image/png" sizes="16x16">',
  '<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">',
  '<link rel="icon" href="/favicon-512.png" type="image/png" sizes="512x512">',
  '<link rel="apple-touch-icon" href="/apple-touch-icon-180.png" sizes="180x180">',
];

const runtimeFiles = [
  "index.html",
  ...Object.keys(faviconAssets),
  "style.css",
  "app.js",
  "tokens.css",
  "hero-scroll.js",
  "nav-float.js",
  "careers/apply/index.html",
  "assets/pb-apply.css",
  "scripts/careers-apply.js",
  "scripts/careers-deadline.js",
  "scripts/careers-roles.js",
  "scripts/header-scroll.js",
  "scripts/dev-server.mjs",
  "api/applications.js",
  "api/_lib/application-payload.js",
  "api/_lib/notion-client.js",
  "vercel.json",
];

test("the clean repository owns the PB home at root", () => {
  assert.equal(existsSync(path.join(root, "index.html")), true, "root index.html should exist");
  assert.equal(existsSync(path.join(root, "pb-live")), false, "a duplicate pb-live implementation must not exist");
});

test("the runtime dependency closure is complete", () => {
  const missing = runtimeFiles.filter((file) => !existsSync(path.join(root, file)));
  assert.deepEqual(missing, [], `missing runtime files: ${missing.join(", ")}`);
});

test("the approved favicon assets and declarations ship unchanged", () => {
  for (const [file, expectedHash] of Object.entries(faviconAssets)) {
    const contents = readFileSync(path.join(root, file));
    const actualHash = createHash("sha256").update(contents).digest("hex");
    assert.equal(actualHash, expectedHash, `${file} should match the captain-approved durable asset`);
  }

  for (const file of ["index.html", "careers/apply/index.html"]) {
    const html = readFileSync(path.join(root, file), "utf8");
    for (const tag of faviconTags) {
      assert.equal(html.split(tag).length - 1, 1, `${file} should declare ${tag} exactly once`);
    }
    assert.doesNotMatch(html, /<link rel="icon" href="\/images\/cb-logo-white\.svg"/, `${file} should not declare the obsolete wordmark favicon`);
  }
});

test("production owns only the approved PP Mori and Azeret typography", () => {
  const tokens = readFileSync(path.join(root, "tokens.css"), "utf8");
  const home = readFileSync(path.join(root, "index.html"), "utf8");
  const apply = readFileSync(path.join(root, "careers/apply/index.html"), "utf8");
  const required = [
    "fonts/AzeretMono-VF.ttf",
    "fonts/OFL-AzeretMono.txt",
  ];

  assert.deepEqual(required.filter((file) => !existsSync(path.join(root, file))), [], "approved font binaries and OFL licences must ship together");
  assert.match(tokens, /--font-display:\s*"PP Mori"/);
  assert.match(tokens, /--font-body:\s*"PP Mori"/);
  assert.match(tokens, /--font-mono:\s*"Azeret Mono"/);
  assert.doesNotMatch(`${tokens}\n${home}\n${apply}`, /type-lab|Space Mono|Syne/);
  assert.equal(existsSync(path.join(root, "fonts/Syne-VF.ttf")), false, "the unused Syne binary must not ship");
  assert.equal(existsSync(path.join(root, "fonts/OFL-Syne.txt")), false, "the unused Syne licence must not ship");
  assert.equal(existsSync(path.join(root, "type-lab.css")), false, "the exploratory switcher must not ship");
  assert.equal(existsSync(path.join(root, "type-lab.js")), false, "the exploratory switcher must not ship");
  assert.equal(existsSync(path.join(root, "type-lab-compare.html")), false, "the exploratory comparison page must not ship");
});

test("runtime text files contain no old canonical path", () => {
  const redirectOwners = new Set(["vercel.json", "scripts/dev-server.mjs"]);
  const existing = runtimeFiles.filter((file) => !redirectOwners.has(file) && existsSync(path.join(root, file)));
  const stale = existing.filter((file) => readFileSync(path.join(root, file), "utf8").includes("/pb-live/"));
  assert.deepEqual(stale, [], `stale /pb-live/ references: ${stale.join(", ")}`);
});

test("the old PB bookmark has only a root redirect", () => {
  const config = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.deepEqual(config.redirects, [
    { source: "/pb-live", destination: "/", permanent: true },
    { source: "/pb-live/", destination: "/", permanent: true },
  ]);
});

test("the home careers list agrees with the canonical role authority", () => {
  const home = readFileSync(path.join(root, "index.html"), "utf8");
  const rows = [...home.matchAll(
    /<a class="job-row" href="\/careers\/apply\/\?role=([^"]+)"><span class="j-name">([^<]+)<\/span><span class="j-loc">([^<]+)<\/span><\/a>/g
  )].map(([, slug, title, location]) => ({ slug, title: decodeEntities(title), location: decodeEntities(location) }));

  const bySlug = (a, b) => a.slug.localeCompare(b.slug);
  const expected = careerRoles.map((role) => ({
    slug: role.slug,
    title: role.title,
    location: role.locationType || "Remote",
  }));

  assert.deepEqual(
    [...rows].sort(bySlug),
    [...expected].sort(bySlug),
    "every home job row must use the slug, title, and canonical location from scripts/careers-roles.js"
  );
  assert.equal(rows.length, careerRoles.length, "the home page must list every canonical role exactly once");
});

test("every advertised open-role count matches the canonical role authority", () => {
  const total = careerRoles.length;
  const home = readFileSync(path.join(root, "index.html"), "utf8");
  const apply = readFileSync(path.join(root, "careers/apply/index.html"), "utf8");

  const advertised = [...home.matchAll(/Open roles \((\d+)\)/g), ...apply.matchAll(/Open roles \((\d+)\)/g)]
    .map(([, count]) => Number(count));
  assert.notEqual(advertised.length, 0, "the open-role chips should exist");
  assert.deepEqual(advertised, advertised.map(() => total), `every "Open roles (n)" chip should read ${total}`);

  const sectionLabel = home.match(/\(07\) Careers · (\d+) roles open/);
  assert.equal(Number(sectionLabel?.[1]), total, "the careers section label should count every canonical role");

  const groupCounts = [...home.matchAll(/<span class="count-chip">(\d+)<\/span>/g)].map(([, count]) => Number(count));
  assert.equal(
    groupCounts.reduce((sum, count) => sum + count, 0),
    total,
    "the careers group counts should sum to every canonical role"
  );
});

test("all local HTML and CSS dependencies resolve inside the repository", () => {
  assert.equal(existsSync(path.join(root, "index.html")), true, "root index.html should exist before dependencies can be traced");
  const sourceFiles = ["index.html", "careers/apply/index.html", "style.css", "tokens.css", "assets/pb-apply.css"];
  const missing = [];

  for (const sourceFile of sourceFiles) {
    const sourcePath = path.join(root, sourceFile);
    if (!existsSync(sourcePath)) continue;
    const source = readFileSync(sourcePath, "utf8");
    const matches = [...source.matchAll(/(?:href|src|poster|data-src)=["']([^"'#?]+)|url\(["']?([^"')]+)["']?\)/g)];
    for (const match of matches) {
      const reference = match[1] || match[2];
      if (!reference || /^(?:https?:|mailto:|data:)/.test(reference)) continue;
      const target = reference.startsWith("/")
        ? path.join(root, reference.slice(1))
        : path.resolve(path.dirname(sourcePath), reference);
      if (!existsSync(target)) missing.push(`${sourceFile} -> ${reference}`);
    }
  }

  assert.deepEqual(missing, [], `missing local dependencies: ${missing.join(", ")}`);
});

/* critical.css is the sole blocking sheet that governs first paint for the whole page, and it is a
   generated minification of style.css. If the two ever disagree the page paints from the stale copy
   and then reflows when the deferred sheet activates, so hold them to the same rules. */
test("critical.css carries exactly the rules of style.css", () => {
  const normalize = (css) =>
    css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*([{};,>~])\s*/g, "$1")
      .replace(/:\s+/g, ":")
      .replace(/;\}/g, "}")
      .trim();

  const critical = normalize(readFileSync(path.join(root, "critical.css"), "utf8"));
  const full = normalize(readFileSync(path.join(root, "style.css"), "utf8"));

  assert.equal(
    critical,
    full,
    "critical.css has drifted from style.css — regenerate it so the blocking sheet is the whole stylesheet",
  );
});

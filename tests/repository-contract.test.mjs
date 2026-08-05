import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const runtimeFiles = [
  "index.html",
  "style.css",
  "app.js",
  "tokens.css",
  "hero-scroll.js",
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

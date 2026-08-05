import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("deployment packaging has an explicit runtime owner", () => {
  assert.equal(existsSync(path.join(root, "scripts/package-deployment.mjs")), true, "deployment packaging script should exist");
});

test("deployment commands require dry-run application safety", () => {
  const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const scripts = packageJson.scripts || {};
  assert.match(scripts["deploy:review"] || "", /NOTION_INTAKE_DRY_RUN=1/, "review deployment command must require dry-run mode");
});

test("the emitted deployment tree contains runtime files and no private development surfaces", () => {
  const result = spawnSync(process.execPath, ["scripts/package-deployment.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const deploymentRoot = path.join(root, ".vercel-deploy");
  const files = readdirSync(deploymentRoot, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(deploymentRoot, path.join(entry.parentPath, entry.name)))
    .sort();
  for (const required of ["index.html", "careers/apply/index.html", "api/applications.js", "assets/hero-grow.mp4", "package.json", "vercel.json"]) {
    assert.equal(files.includes(required), true, `${required} should be packaged`);
  }
  assert.equal(files.some((file) => /(?:^|\/)(?:\.git|\.vercel|tests?|evidence|reports?)(?:\/|$)/i.test(file)), false, `forbidden development surface packaged: ${files.join(", ")}`);
  assert.equal(files.some((file) => /(?:^|\/)\.env(?:\.|$)/i.test(file)), false, `environment file packaged: ${files.join(", ")}`);
  const runtimePackage = JSON.parse(readFileSync(path.join(deploymentRoot, "package.json"), "utf8"));
  assert.deepEqual(runtimePackage, {
    name: "carenbloom-site-pb-runtime",
    version: "1.0.0",
    private: true,
    type: "module",
    dependencies: { busboy: "^1.6.0" },
  });
});

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

test("the local packaging command runs in dry-run mode", () => {
  const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const scripts = packageJson.scripts || {};
  assert.match(
    scripts["deploy:review"] || "",
    /NOTION_INTAKE_DRY_RUN=1/,
    "review packaging must run dry-run locally; the deployed function environment is set and verified separately in the Vercel project"
  );
});

test("Vercel declares both bounded server functions", () => {
  const config = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.deepEqual(Object.keys(config.functions).sort(), ["api/applications.js", "api/role-state.js"]);
  assert.equal(config.functions["api/applications.js"].maxDuration, 30);
  assert.equal(config.functions["api/role-state.js"].maxDuration, 10);
});

test("the emitted deployment tree contains runtime files and no private development surfaces", () => {
  const result = spawnSync(process.execPath, ["scripts/package-deployment.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const deploymentRoot = path.join(root, ".vercel-deploy");
  const files = readdirSync(deploymentRoot, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(deploymentRoot, path.join(entry.parentPath, entry.name)))
    .sort();
  for (const required of [
    "index.html",
    "favicon.svg",
    "favicon-16.png",
    "favicon-32.png",
    "favicon-512.png",
    "apple-touch-icon-180.png",
    "critical.css",
    "careers/apply/index.html",
    "api/applications.js",
    "api/role-state.js",
    "api/_lib/role-state.js",
    "api/_lib/role-state-response.js",
    "api/_lib/cors.js",
    "scripts/careers-home.js",
    "scripts/api-endpoints.js",
    "assets/hero-grow.mp4",
    "assets/hero-grow-start.avif",
    "assets/hero-grow-start-448.avif",
    "assets/hero-grow-end.avif",
    "assets/hero-grow-end-448.avif",
    "assets/leader-rahul.avif",
    "assets/leader-rahul-540.avif",
    "assets/leader-momoko.avif",
    "assets/leader-momoko-540.avif",
    "images/carenbloom-v3/nancy-raspberry.avif",
    "images/carenbloom-v3/nancy-avocado.avif",
    "images/carenbloom-v3/biird-glass-sky.avif",
    "images/carenbloom-v3/biird-lilac-first-timer.avif",
    "package.json",
    "vercel.json",
  ]) {
    assert.equal(files.includes(required), true, `${required} should be packaged`);
  }
  assert.equal(files.some((file) => /(?:^|\/)(?:\.git|\.vercel|tests?|evidence|reports?)(?:\/|$)/i.test(file)), false, `forbidden development surface packaged: ${files.join(", ")}`);
  assert.equal(files.some((file) => /(?:^|\/)\.env(?:\.|$)/i.test(file)), false, `environment file packaged: ${files.join(", ")}`);
  const approvedEndpoints = new Set([path.join("api", "applications.js"), path.join("api", "role-state.js")]);
  const accidentalEndpoints = files.filter((file) => file.startsWith(`api${path.sep}`) && !file.startsWith(`api${path.sep}_`) && !approvedEndpoints.has(file));
  assert.deepEqual(accidentalEndpoints, [], "only the application and role-state endpoints may be detected as functions; shared helpers belong under api/_lib/");
  const packagedApply = readFileSync(path.join(deploymentRoot, "scripts/careers-apply.js"), "utf8");
  assert.doesNotMatch(packagedApply, /getClosingPresentation\(new Date|datePosted:\s*new Date/);
  const runtimePackage = JSON.parse(readFileSync(path.join(deploymentRoot, "package.json"), "utf8"));
  assert.deepEqual(runtimePackage, {
    name: "carenbloom-site-pb-runtime",
    version: "1.0.0",
    private: true,
    type: "module",
    dependencies: { busboy: "^1.6.0" },
  });
});

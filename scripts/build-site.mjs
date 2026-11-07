import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Builds site-src/ (Vite) and publishes its dist/ at the repository root, which is
// what Cloudflare Pages and Vercel serve. Only the paths the build emits are replaced;
// the runtime owners below are never touched.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "site-src");
const dist = path.join(source, "dist");
const check = process.argv.includes("--check");
const packageManager = JSON.parse(readFileSync(path.join(source, "package.json"), "utf8")).packageManager;
const cache = path.join(root, "node_modules", ".cache");

const protectedEntries = new Set([
  ".git", ".github", ".gitignore", ".no-mistakes.yaml", ".vercelignore", "AGENTS.md", "CLAUDE.md",
  "README.md", "_redirects", "api", "docs", "functions", "node_modules", "package.json",
  "package-lock.json", "scripts", "site-src", "tests", "vercel.json",
]);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, VITE_SITE_URL: check ? "https://carenbloom.com" : process.env.VITE_SITE_URL || "https://carenbloom.com" },
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed in ${path.relative(root, cwd) || "."}`);
}

function pnpm(args, cwd) {
  run("npm", ["exec", "--yes", `--package=${packageManager}`, "--", "pnpm", ...args], cwd);
}

function emittedEntries(directory) {
  const entries = readdirSync(directory);
  const clash = entries.filter((entry) => protectedEntries.has(entry));
  if (clash.length > 0) throw new Error(`The site build would overwrite runtime owners: ${clash.join(", ")}`);
  return entries;
}

function snapshot(directory, entries) {
  const files = new Map();
  const visit = (relative) => {
    const file = path.join(directory, relative);
    if (!existsSync(file)) return;
    if (statSync(file).isDirectory()) {
      for (const entry of readdirSync(file)) visit(path.join(relative, entry));
    } else files.set(relative, createHash("sha256").update(readFileSync(file)).digest("hex"));
  };
  for (const entry of entries) visit(entry);
  return files;
}

function compare(expected, actual, label) {
  const differences = [...new Set([...expected.keys(), ...actual.keys()])]
    .filter((file) => expected.get(file) !== actual.get(file)).sort();
  if (differences.length) throw new Error(`${label}: ${differences.join(", ")}`);
}

mkdirSync(cache, { recursive: true });
if (check) {
  const temporary = mkdtempSync(path.join(cache, "site-build-"));
  const cleanSource = path.join(temporary, "site-src");
  const cleanDist = path.join(cleanSource, "dist");
  try {
    mkdirSync(cleanSource);
    for (const entry of ["package.json", "pnpm-lock.yaml", "tsconfig.json", "vite.config.ts", "index.html", "404.html", "careers", "visit", "src", "public"]) {
      cpSync(path.join(source, entry), path.join(cleanSource, entry), { recursive: true });
    }
    pnpm(["install", "--frozen-lockfile", "--store-dir", path.join(cache, "pnpm-store")], cleanSource);
    pnpm(["build"], cleanSource);
    const emitted = emittedEntries(cleanDist);
    const first = snapshot(cleanDist, emitted);
    rmSync(cleanDist, { recursive: true, force: true });
    pnpm(["build"], cleanSource);
    compare(first, snapshot(cleanDist, emittedEntries(cleanDist)), "Repeated site build differs");
    const tracked = spawnSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" });
    if (tracked.status !== 0) throw new Error("Cannot enumerate committed site output");
    const published = new Set([...emitted, ...tracked.stdout.split("\0").filter(Boolean)
      .map((file) => file.split("/")[0]).filter((entry) => !protectedEntries.has(entry))]);
    compare(first, snapshot(root, published), "Published site output differs; run npm run build:site");
    console.log(`Clean and repeated builds match all ${first.size} published files.`);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
} else {
  if (!existsSync(path.join(source, "node_modules"))) pnpm(["install", "--frozen-lockfile", "--store-dir", path.join(cache, "pnpm-store")], source);
  pnpm(["build"], source);
  const emitted = emittedEntries(dist);
  for (const entry of emitted) {
    rmSync(path.join(root, entry), { recursive: true, force: true });
    cpSync(path.join(dist, entry), path.join(root, entry), { recursive: true });
  }
  console.log(`Published ${emitted.length} build entries from site-src/dist to the repository root.`);
}

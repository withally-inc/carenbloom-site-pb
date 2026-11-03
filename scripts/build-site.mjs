import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Builds site-src/ (Vite) and publishes its dist/ at the repository root, which is
// what Cloudflare Pages and Vercel serve. Only the paths the build emits are replaced;
// the runtime owners below are never touched.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "site-src");
const dist = path.join(source, "dist");

const protectedEntries = new Set([
  ".git", ".github", ".gitignore", ".no-mistakes.yaml", ".vercelignore", "AGENTS.md", "CLAUDE.md",
  "README.md", "_redirects", "api", "docs", "functions", "node_modules", "package.json",
  "package-lock.json", "scripts", "site-src", "tests", "vercel.json",
]);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, VITE_SITE_URL: process.env.VITE_SITE_URL || "https://carenbloom.com" },
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed in ${path.relative(root, cwd) || "."}`);
}

if (!existsSync(path.join(source, "node_modules"))) run("pnpm", ["install", "--frozen-lockfile"], source);
run("pnpm", ["build"], source);

const emitted = readdirSync(dist);
const clash = emitted.filter((entry) => protectedEntries.has(entry));
if (clash.length > 0) throw new Error(`The site build would overwrite runtime owners: ${clash.join(", ")}`);

for (const entry of emitted) {
  rmSync(path.join(root, entry), { recursive: true, force: true });
  cpSync(path.join(dist, entry), path.join(root, entry), { recursive: true });
}

console.log(`Published ${emitted.length} build entries from site-src/dist to the repository root.`);

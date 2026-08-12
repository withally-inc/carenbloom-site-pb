import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, ".vercel-deploy");
const runtimeAllowlist = [
  ".vercelignore",
  "index.html",
  "favicon.svg",
  "favicon-16.png",
  "favicon-32.png",
  "favicon-512.png",
  "apple-touch-icon-180.png",
  "critical.css",
  "style.css",
  "app.js",
  "tokens.css",
  "hero-scroll.js",
  "nav-float.js",
  "vercel.json",
  "assets",
  "icons",
  "fonts",
  "images",
  "careers/apply/index.html",
  "scripts/careers-apply.js",
  "scripts/careers-home.js",
  "scripts/careers-roles.js",
  "scripts/api-endpoints.js",
  "scripts/header-scroll.js",
  "api/applications.js",
  "api/role-state.js",
  "api/_lib/application-payload.js",
  "api/_lib/cors.js",
  "api/_lib/notion-client.js",
  "api/_lib/role-state.js",
  "api/_lib/role-state-response.js",
];

if (!target.startsWith(`${root}${path.sep}`) || path.basename(target) !== ".vercel-deploy") {
  throw new Error("Refusing to package outside the repository deployment directory.");
}

const missing = runtimeAllowlist.filter((entry) => !existsSync(path.join(root, entry)));
if (missing.length > 0) throw new Error(`Missing runtime allowlist entries: ${missing.join(", ")}`);

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

for (const entry of runtimeAllowlist) {
  const source = path.join(root, entry);
  const destination = path.join(target, entry);
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

const runtimePackage = {
  name: "carenbloom-site-pb-runtime",
  version: "1.0.0",
  private: true,
  type: "module",
  dependencies: { busboy: "^1.6.0" },
};
writeFileSync(path.join(target, "package.json"), `${JSON.stringify(runtimePackage, null, 2)}\n`);

console.log(`Packaged ${runtimeAllowlist.length + 1} runtime owners in ${path.relative(root, target)}`);

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import applicationHandler from "../api/applications.js";
import roleStateHandler from "../api/role-state.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number.parseInt(process.env.PORT || "49279", 10);
const host = process.env.HOST || "127.0.0.1";

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) return;
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".avif": "image/avif",
    ".mp4": "video/mp4",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".otf": "font/otf",
    ".ttf": "font/ttf",
  }[ext] || "application/octet-stream";
}

function staticPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const cleanPath = decoded.replace(/^\/+/, "");
  let target = path.resolve(root, cleanPath);
  if (decoded === "/" || decoded.endsWith("/")) target = path.resolve(root, cleanPath, "index.html");
  if (!path.extname(target) && existsSync(path.join(target, "index.html"))) target = path.join(target, "index.html");
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return null;
  return target;
}

function redirect(res, destination) {
  res.statusCode = 308;
  res.setHeader("Location", destination);
  res.end();
}

loadEnv(path.join(root, ".env"));

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (requestUrl.pathname === "/api/applications") {
    await applicationHandler(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/role-state") {
    await roleStateHandler(req, res);
    return;
  }

  if (requestUrl.pathname === "/pb-live" || requestUrl.pathname === "/pb-live/") return redirect(res, "/");

  const target = staticPath(requestUrl.pathname);
  if (!target) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  try {
    const file = await stat(target);
    const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    if (range) {
      const start = range[1] ? Number.parseInt(range[1], 10) : 0;
      const end = range[2] ? Math.min(Number.parseInt(range[2], 10), file.size - 1) : file.size - 1;
      if (start > end || start >= file.size) {
        res.statusCode = 416;
        res.setHeader("Content-Range", `bytes */${file.size}`);
        res.end();
        return;
      }
      res.statusCode = 206;
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Range", `bytes ${start}-${end}/${file.size}`);
      res.setHeader("Content-Length", end - start + 1);
      res.setHeader("Content-Type", contentType(target));
      createReadStream(target, { start, end }).pipe(res);
      return;
    }
    const body = await readFile(target);
    res.statusCode = 200;
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", contentType(target));
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
  }
});

server.listen(port, host, () => {
  // PORT=0 asks the kernel for a free port, so the bound address is the only truthful one to print.
  console.log(`Care & Bloom dev server: http://localhost:${server.address().port}`);
});

import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";

const otf = await fetch(`${baseUrl}/fonts/PPMori-Regular.otf`);
assert.equal(otf.status, 200);
assert.equal(otf.headers.get("content-type"), "font/otf");

const ttf = await fetch(`${baseUrl}/fonts/SpaceMono-Regular.ttf`);
assert.equal(ttf.status, 200);
assert.equal(ttf.headers.get("content-type"), "font/ttf");

const range = await fetch(`${baseUrl}/assets/hero-grow.mp4`, { headers: { Range: "bytes=0-1023" } });
assert.equal(range.status, 206);
assert.match(range.headers.get("content-range") || "", /^bytes 0-1023\/\d+$/);
assert.equal((await range.arrayBuffer()).byteLength, 1024);

console.log("server content-type and media range tests passed");

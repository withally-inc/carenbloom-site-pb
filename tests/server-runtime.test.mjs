import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";

const otf = await fetch(`${baseUrl}/fonts/PPMori-Regular.otf`);
assert.equal(otf.status, 200);
assert.equal(otf.headers.get("content-type"), "font/otf");

for (const font of ["Syne-VF.ttf", "AzeretMono-VF.ttf"]) {
  const ttf = await fetch(`${baseUrl}/fonts/${font}`);
  assert.equal(ttf.status, 200, `${font} should be served`);
  assert.equal(ttf.headers.get("content-type"), "font/ttf");
}

for (const licence of ["OFL-Syne.txt", "OFL-AzeretMono.txt"]) {
  const response = await fetch(`${baseUrl}/fonts/${licence}`);
  assert.equal(response.status, 200, `${licence} should ship beside its font`);
  assert.match(await response.text(), /SIL OPEN FONT LICENSE Version 1\.1/);
}

const range = await fetch(`${baseUrl}/assets/hero-grow.mp4`, { headers: { Range: "bytes=0-1023" } });
assert.equal(range.status, 206);
assert.match(range.headers.get("content-range") || "", /^bytes 0-1023\/\d+$/);
assert.equal((await range.arrayBuffer()).byteLength, 1024);

console.log("server content-type and media range tests passed");

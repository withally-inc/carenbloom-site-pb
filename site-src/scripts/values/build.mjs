// Values art: rebuild public/img/values/ from the kept sources in scripts/values/sources/.
//   node scripts/values/build.mjs
// Each value is screened twice by scripts/halftone.mjs: 1200 px long side and 600 px, the cell locked to
// 1% of the image height (same dots as the hero rose once the card draws it; never downsampled). Then writes
// a violet-mode pair (value-NN-violet[-600].webp, --invert with the violet tokens), and
// public/img/values/manifest.json in the shape the values card reads (src/sections/work.*).
// scripts/images.mjs keeps public/img/values/ when it wipes public/img/.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const OUT = path.join(root, 'public/img/values');
fs.mkdirSync(OUT, { recursive: true });

// edge: the card edge the wrist is cut by. enters: the brief's direction (a corner means the wrist
// leaves through that edge at an angle). opts: per-image halftone options.
const SUN = (boxes, q = 0.55) => ['--sun-region', boxes, '--sun-spots', String(boxes.split(';').length), '--sun-quantile', String(q)];
const VALUES = [
  { n: 1, scale: 0.56, id: 'rocket', name: 'Outsized ambition', edge: 'bottom', enters: 'bottom-right',
    opts: SUN('0.12,0,0.45,0.2;0.03,0.38,0.25,0.58') }, // nose, left fin
  { n: 2, scale: 0.52, id: 'key', name: 'Agency', edge: 'right', enters: 'right',
    opts: SUN('0.32,0.25,0.46,0.55;0.02,0.33,0.16,0.52', 0.3) }, // bow, bit
  { n: 3, scale: 0.56, id: 'stopwatch', name: 'Reduce cycle time', edge: 'right', enters: 'bottom-right',
    opts: SUN('0.3,0.08,0.52,0.24;0.14,0.22,0.3,0.5', 0.35) }, // crown, lit left rim
  { n: 4, scale: 0.56, id: 'pencil', name: 'Relentless upskilling', edge: 'bottom', enters: 'bottom',
    opts: SUN('0.3,0.22,0.62,0.4;0,0,0.25,0.18', 0.5) }, // shaving, pencil tip
  { n: 5, scale: 0.56, id: 'cutting', name: 'Organic (re)org', edge: 'bottom', enters: 'bottom-right',
    opts: SUN('0.42,0.14,0.76,0.3;0.22,0,0.5,0.12;0,0.1,0.2,0.3') }, // three leaf tips
  { n: 6, scale: 0.56, id: 'seedling', name: 'Human potential', edge: 'bottom', enters: 'bottom',
    opts: SUN('0.35,0.4,0.78,0.6;0.3,0.1,0.78,0.25', 0.5) }, // seed, first leaves
  { n: 7, scale: 0.52, id: 'scissors', name: 'Creativity', edge: 'right', enters: 'right',
    opts: ['--obj-blur', '1.2', ...SUN('0.17,0,0.36,0.3;0.4,0.45,0.75,0.62', 0.3)] }, // paper curl, upper handle
];

// Dot lock. At 1440 the hero draws its 1200 px rose frame 723 CSS px tall: a 6 px cell becomes
// 3.6 CSS px. The values card (460 px tall at 1440) draws each hand at `scale` of its height
// (work.art.ts: 0.56 tall, 0.52 wide; written to the manifest so the two stay in step). The cell, as a
// fraction of the image height, is therefore 3.6 / (scale × 460).
const ROSE_CELL_CSS = (6 * 723) / 1200, CARD_H = 460;
const run = (src, out, size, opts, scale) => {
  const cellH = (ROSE_CELL_CSS / (scale * CARD_H)).toFixed(5);
  const r = execFileSync('node', [path.join(root, 'scripts/halftone.mjs'), src, out, '--size', String(size), '--cell-h', cellH, ...opts], { encoding: 'utf8' });
  return JSON.parse(r.trim().split('\n').pop());
};

const manifest = {
  note: 'Values card art. Hand in ink, object in cobalt, transparent lossless WebP, 45° dot screen matched to the hero rose. edge = card edge the wrist is cut by; anchor = the image point (0..1) that sits on that edge; scale = image height as a share of the card height, which the dot size is locked to; visible = fraction of the image along the entry axis inside the card (the rest, wrist side, is cropped by the card). Rebuild: node scripts/values/build.mjs',
  values: [],
};

for (const v of VALUES) {
  const nn = String(v.n).padStart(2, '0');
  const src = path.join(here, 'sources', `value-${nn}.jpg`);
  const big = path.join(OUT, `value-${nn}.webp`);
  const small = path.join(OUT, `value-${nn}-600.webp`);
  const r1 = run(src, big, 1200, v.opts, v.scale);
  const r2 = run(src, small, 600, v.opts, v.scale);
  // violet mode: light-on-dark print, lavender hand, violet-blue object (tokens.css, violet)
  const VIO = ['--invert', '--ink', '#EDE9FC', '--cobalt', '#9A98FF'];
  run(src, path.join(OUT, `value-${nn}-violet.webp`), 1200, [...v.opts, ...VIO], v.scale);
  run(src, path.join(OUT, `value-${nn}-violet-600.webp`), 600, [...v.opts, ...VIO], v.scale);

  // measure on the 1200 file: object extent and where the wrist crosses the visible line
  const { data, info } = await sharp(big).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const isCob = (i) => data[i * 4 + 3] > 100 && data[i * 4 + 2] > data[i * 4] + 80;
  const isInk = (i) => data[i * 4 + 3] > 100 && !isCob(i);
  let far = 0; // object's furthest reach from the far side, along the entry axis (0..1)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isCob(y * W + x)) far = Math.max(far, v.edge === 'bottom' ? y / H : x / W);
  const visible = Math.min(1, +(far + 0.2).toFixed(2));
  // centre of the ink on the line where the card edge cuts the image (a 2-cell band)
  let s = 0, k = 0;
  const line = Math.min(Math.round(visible * (v.edge === 'bottom' ? H : W)), (v.edge === 'bottom' ? H : W) - 12);
  for (let d = 0; d < 12; d++) {
    if (v.edge === 'bottom') for (let x = 0; x < W; x++) { if (isInk((line + d) * W + x)) { s += x; k++; } }
    else for (let y = 0; y < H; y++) { if (isInk(y * W + line + d)) { s += y; k++; } }
  }
  const along = k ? +(s / k / (v.edge === 'bottom' ? W : H)).toFixed(3) : 0.5;
  const anchor = v.edge === 'bottom' ? [along, visible] : [visible, along];
  const m2 = await sharp(small).metadata();
  manifest.values.push({
    n: v.n, id: v.id, name: v.name,
    src: `/img/values/value-${nn}.webp`,
    srcset: [`/img/values/value-${nn}-600.webp ${m2.width}w`, `/img/values/value-${nn}.webp ${W}w`],
    srcViolet: `/img/values/value-${nn}-violet.webp`,
    srcsetViolet: [`/img/values/value-${nn}-violet-600.webp ${m2.width}w`, `/img/values/value-${nn}-violet.webp ${W}w`],
    width: W, height: H, scale: v.scale, edge: v.edge, enters: v.enters, anchor, visible,
    bytes: fs.statSync(big).size, sun: r1.sun,
  });
  console.log(nn, v.id, `${W}x${H}`, `600: ${m2.width}x${m2.height}`, v.edge, anchor, visible, `${(fs.statSync(big).size / 1024) | 0} KB`, `${(fs.statSync(small).size / 1024) | 0} KB`);
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('wrote', path.relative(root, path.join(OUT, 'manifest.json')));

#!/usr/bin/env node
// House halftone (BRAND.md §10, BRAND-PROPOSALS item 10).
//
// Turns a photograph of an ink subject (a hand) holding a coloured object on a flat light ground
// into the hero treatment: a 45° round-dot screen, the subject in Ink, the object in Cobalt, an
// optional Sun highlight on the object's brightest light, transparent everywhere else.
//
//   node scripts/halftone.mjs in.png out.webp [options]
//
// Options
//   --cell-h <f>       Cell as a fraction of the output height (overrides --cell). The values card
//                      draws its art at a fixed CSS height, so this locks the dot to the rose there.
//   --cell <px>        Screen period in output pixels, measured along x or y (default 6). The screen
//                      is rotated 45°, so neighbouring dots sit cell/√2 apart on the diagonal. The hero
//                      rose (1200 px tall frame) is a 6 px cell: at a 1200 px long side use 6, at 600
//                      use 3, i.e. cell = 6 × longSide / 1200 for the same dots at the same display size.
//   --size <px>        Long side of the output (default 1200). The subject's bounding box is cropped
//                      first, then scaled to this size, then screened (the screen is never resampled).
//   --object <hue>     Hue of the object to separate: blue (default), red, green, yellow, none.
//                      "none" screens the whole subject in --ink (grayscale halftone, like the lemon).
//   --ink <hex>        Subject colour (default #0A1220).
//   --cobalt <hex>     Object colour (default #2331E4).
//   --sun <hex>        Highlight colour (default #FDFF6D).
//   --sun-spots <n>    Number of sun highlights kept on the object, largest first (default 3, 0 = off).
//   --sun-quantile <q> Object lightness quantile where the sun starts (default 0.80).
//   --sun-blur <cells> Blur, in cells, of the object lightness the sun is picked from (default 2).
//                      Raise it on flat objects (paper) so the sun lands on one broad light, not on grain.
//   --sun-region <x0,y0,x1,y1[;...]> Boxes (fractions of the frame) the sun may land in. One box: the
//                      n largest spots inside it. Several boxes: one spot per box, each on that box's
//                      lightest plane (the rocket's nose and fin, a leaf tip, the curl of a sheet).
//   --sun-max <f>      Ceiling on sun area as a fraction of the image (default 0.05, BRAND: under 5%).
//   --ink-levels <lo,hi> Subject quantiles that clip to solid ink and to paper (default 0.04,0.97):
//                      checked 1:1 against the hero hand at display size.
//   --obj-levels <lo,hi> Same for the object (default 0.12,0.88).
//   --ink-mean <f>     Target mean dot coverage over the subject (default 0.56, the hero hand).
//   --obj-mean <f>     Target mean dot coverage over the object (default 0.60, measured on the rose).
//   --ink-contrast <k> S-curve strength on the subject, 0 to 1 (default 0.5).
//   --obj-contrast <k> S-curve strength on the object, 0 to 1 (default 1): the rose is solid in the
//                      shadows and open in the lights, so the object gets the full curve.
//   --obj-blur <cells> Softening of the object's tone before screening (default 0.3). Raise it on flat
//                      objects with grain (paper) so the dots follow the light, not the texture.
//   --bg-tol <f>       Ground key tolerance in luma (default 0.10). Raise on a greyer or uneven ground.
//   --pad <px>         Transparent margin kept on sides the subject does not touch (default 2 cells).
//   --invert           Light-on-dark print for dark grounds (violet mode): dots carry the lights
//                      instead of the shadows, the sun prints as dots over the object's (3/4 strength). Pair it with
//                      light inks, e.g. --ink #EDE9FC --cobalt #9A98FF.
//   --png              Also write a PNG next to the output.
//   --debug <dir>      Write the intermediate masks and tone maps.
//
// Method
//   1. Ground key: pixels close to the ground colour (median of the frame border), low in chroma,
//      connected to the border or forming a large enclosed pocket, become ground. Ground is forced to
//      zero ink, so no dot can land outside the subject: no specks, no halo.
//   2. Separation: "objectness" = (B − max(R,G)) / B for blue (other hues rotate the channels),
//      closed and hole-filled so speculars inside the object stay object.
//      Object parts thinner than a cell (stems, roots) print solid, like the rose's stem.
//   3. Tone: luma for the subject, max(R,G,B) for the object (a blue object's shading lives in its
//      brightest channel), unsharp-masked at 3 px, normalised separately over each region (1st to
//      99.5th percentile, 3rd to 98th for the object), an S-curve, then a gamma that lands the mean coverage on the target, so every
//      image has the same ink weight whatever the skin tone or exposure.
//   4. Screen: cosine round dot, (cos 2πu + cos 2πv)/2 with u = (x+y)/cell, v = (x−y)/cell, which
//      gives round dots in the lights, a checkerboard at 50% and round holes in the shadows.
//      Thresholds come from a coverage LUT, so 30% tone is 30% ink. 4×4 supersampling; edges are
//      alpha-antialiased in the dot's own colour (never blended with a ground colour).
//   5. Sun: the object's lightest area (blurred at 2 cells), the n largest spots, capped in area,
//      screened on the same lattice offset by half a cell, under the cobalt dots, like the rose.
//
// Output: RGBA. .webp is written lossless; .png as PNG. Prints width, height and the edges the
// subject touches (where it was cut by the frame), e.g. {"width":1200,"height":968,"touch":["bottom"]}.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

// ───────── args ─────────
const argv = process.argv.slice(2);
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && !['--png', '--invert'].includes(argv[i - 1])));
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);
const [input, output] = pos;
if (!input || !output) {
  console.error('usage: node scripts/halftone.mjs in.png out.webp [--cell 6] [--size 1200] [--object blue] ... (see header)');
  process.exit(1);
}
let CELL = Number(opt('cell', 6));
const CELL_H = opt('cell-h', null); // cell as a fraction of the output height (set after scaling)
const SIZE = Number(opt('size', 1200));
const OBJECT = opt('object', 'blue');
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.replace('#', '').padStart(6, '0').slice(i - 1, i + 1), 16));
const INK = hex(opt('ink', '#0A1220'));
const COB = hex(opt('cobalt', '#2331E4'));
const SUN = hex(opt('sun', '#FDFF6D'));
const SUN_SPOTS = Number(opt('sun-spots', 3));
const SUN_Q = Number(opt('sun-quantile', 0.8));
const SUN_MAX = Number(opt('sun-max', 0.05));
const SUN_BLUR = Number(opt('sun-blur', 2));
const SUN_REGIONS = opt('sun-region', '0,0,1,1').split(';').map((r) => r.split(',').map(Number));
const INK_MEAN = Number(opt('ink-mean', 0.56));
const OBJ_MEAN = Number(opt('obj-mean', 0.6));
const INK_K = Number(opt('ink-contrast', 0.5));
const INK_LV = opt('ink-levels', '0.04,0.97').split(',').map(Number);
const OBJ_LV = opt('obj-levels', '0.12,0.88').split(',').map(Number);
const OBJ_K = Number(opt('obj-contrast', 1));
const BG_TOL = Number(opt('bg-tol', 0.1));
const OBJ_BLUR = Number(opt('obj-blur', 0.3));
let PAD = opt('pad', null);
const DEBUG = opt('debug', null);
const INVERT = has('invert');
if (DEBUG) fs.mkdirSync(DEBUG, { recursive: true });

// ───────── small raster toolkit (Float32 planes) ─────────
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

function boxBlur(src, w, h, r) {
  if (r < 1) return Float32Array.from(src);
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), k = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0; const o = y * w;
    for (let x = -r; x <= r; x++) s += src[o + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[o + x] = s / k;
      s += src[o + Math.min(x + r + 1, w - 1)] - src[o + Math.max(x - r, 0)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / k;
      s += tmp[Math.min(y + r + 1, h - 1) * w + x] - tmp[Math.max(y - r, 0) * w + x];
    }
  }
  return out;
}
// three box passes ≈ gaussian of the given sigma
function blur(src, w, h, sigma) {
  if (sigma <= 0.3) return Float32Array.from(src);
  const r = Math.max(1, Math.round(Math.sqrt((12 * sigma * sigma) / 3 + 1) / 2 - 0.5));
  return boxBlur(boxBlur(boxBlur(src, w, h, r), w, h, r), w, h, r);
}
const dilate = (m, w, h, r) => boxBlur(m, w, h, r).map((v) => (v > 0.001 ? 1 : 0));
const erode = (m, w, h, r) => boxBlur(m, w, h, r).map((v) => (v > 0.999 ? 1 : 0));

// 4-connected components of (m > 0.5); returns { label: Int32Array, comps: [{ area, touches, minx.. }] }
function components(m, w, h) {
  const label = new Int32Array(w * h).fill(-1), comps = [], stack = new Int32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (m[i] <= 0.5 || label[i] >= 0) continue;
    const id = comps.length; let sp = 0, area = 0, touches = false;
    let minx = w, miny = h, maxx = 0, maxy = 0;
    stack[sp++] = i; label[i] = id;
    while (sp) {
      const p = stack[--sp], x = p % w, y = (p / w) | 0; area++;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
      if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
      if (x > 0 && m[p - 1] > 0.5 && label[p - 1] < 0) { label[p - 1] = id; stack[sp++] = p - 1; }
      if (x < w - 1 && m[p + 1] > 0.5 && label[p + 1] < 0) { label[p + 1] = id; stack[sp++] = p + 1; }
      if (y > 0 && m[p - w] > 0.5 && label[p - w] < 0) { label[p - w] = id; stack[sp++] = p - w; }
      if (y < h - 1 && m[p + w] > 0.5 && label[p + w] < 0) { label[p + w] = id; stack[sp++] = p + w; }
    }
    comps.push({ area, touches, minx, miny, maxx, maxy });
  }
  return { label, comps };
}
function quantile(values, q) {
  if (!values.length) return 0;
  const a = Float32Array.from(values).sort();
  return a[clamp(Math.round(q * (a.length - 1)), 0, a.length - 1)];
}
async function savePlane(name, p, w, h) {
  if (!DEBUG) return;
  const b = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) b[i] = clamp(p[i]) * 255;
  await sharp(b, { raw: { width: w, height: h, channels: 1 } }).png().toFile(path.join(DEBUG, `${name}.png`));
}

// ───────── analysis: ground, object, subject ─────────
function planes(rgb, w, h) {
  const n = w * h, R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), L = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    R[i] = rgb[i * 3] / 255; G[i] = rgb[i * 3 + 1] / 255; B[i] = rgb[i * 3 + 2] / 255;
    L[i] = 0.2126 * R[i] + 0.7152 * G[i] + 0.0722 * B[i];
  }
  return { R, G, B, L };
}

function groundMask({ R, G, B, L }, w, h) {
  // ground colour = median of the border, chroma-free and bright
  const border = [];
  for (let x = 0; x < w; x++) { border.push(L[x], L[(h - 1) * w + x]); }
  for (let y = 0; y < h; y++) { border.push(L[y * w], L[y * w + w - 1]); }
  const gL = quantile(border, 0.75);
  // the ground can carry a soft falloff: compare with a heavily blurred copy of the ground itself
  const cand = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const chroma = Math.max(R[i], G[i], B[i]) - Math.min(R[i], G[i], B[i]);
    cand[i] = L[i] > gL - BG_TOL && chroma < 0.06 ? 1 : 0;
  }
  const { label, comps } = components(cand, w, h);
  const minPocket = (w * h) * 0.0015;
  const keep = comps.map((c) => c.touches || c.area > minPocket);
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = label[i] >= 0 && keep[label[i]] ? 1 : 0;
  // the subject = everything else, minus crumbs; holes in the subject smaller than a pocket stay subject
  const fg = g.map((v) => 1 - v);
  const fc = components(fg, w, h), big = Math.max(...fc.comps.map((c) => c.area), 0);
  for (let i = 0; i < w * h; i++) if (fc.label[i] >= 0 && fc.comps[fc.label[i]].area < big * 0.01) fg[i] = 0;
  return { fg, gL };
}

function objectMask({ R, G, B }, fg, w, h) {
  const n = w * h, o = new Float32Array(n);
  if (OBJECT === 'none') return o;
  const ch = { blue: [B, R, G], red: [R, G, B], green: [G, R, B] }[OBJECT];
  for (let i = 0; i < n; i++) {
    if (!fg[i]) continue;
    let v;
    if (OBJECT === 'yellow') v = (Math.min(R[i], G[i]) - B[i]) / (Math.min(R[i], G[i]) + 0.02);
    else v = (ch[0][i] - Math.max(ch[1][i], ch[2][i])) / (ch[0][i] + 0.02);
    o[i] = v > 0.22 ? 1 : 0;
  }
  // close, then fill holes enclosed by the object (speculars, painted details)
  let m = erode(dilate(o, w, h, 2), w, h, 2);
  const inv = m.map((v, i) => (v ? 0 : 1));
  const { label, comps } = components(inv, w, h);
  // a hole is enclosed if it does not touch the frame and is not mostly ground
  const groundIn = new Float64Array(comps.length);
  for (let i = 0; i < n; i++) if (label[i] >= 0 && !fg[i]) groundIn[label[i]]++;
  const objArea = m.reduce((s, v) => s + v, 0);
  for (let i = 0; i < n; i++) {
    const l = label[i];
    if (l < 0) continue;
    const c = comps[l];
    if (!c.touches && groundIn[l] < c.area * 0.5 && c.area < objArea * 0.08) m[i] = 1;
  }
  // drop object crumbs (blue cast on skin)
  const oc = components(m, w, h), big = Math.max(...oc.comps.map((c) => c.area), 0);
  for (let i = 0; i < n; i++) if (oc.label[i] >= 0 && oc.comps[oc.label[i]].area < big * 0.004) m[i] = 0;
  for (let i = 0; i < n; i++) m[i] *= fg[i];
  return m;
}

// coverage map for a region: 1 = full dot, 0 = no dot
function coverage(L, region, w, h, mean, k, qlo = 0.01, qhi = 0.995) {
  const vals = [];
  for (let i = 0; i < w * h; i++) if (region[i] > 0.5) vals.push(L[i]);
  if (vals.length < 50) return new Float32Array(w * h);
  const lo = quantile(vals, qlo), hi = quantile(vals, qhi);
  const base = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const x = 1 - clamp((L[i] - lo) / Math.max(hi - lo, 1e-3));
    base[i] = x + k * (x * x * (3 - 2 * x) - x);
  }
  // gamma so that the region's mean coverage lands on `mean`
  let g0 = 0.2, g1 = 5;
  const meanAt = (g) => { let s = 0, k = 0; for (let i = 0; i < w * h; i++) if (region[i] > 0.5) { s += Math.pow(base[i], g); k++; } return s / k; };
  for (let it = 0; it < 30; it++) { const gm = Math.sqrt(g0 * g1); if (meanAt(gm) > mean) g0 = gm; else g1 = gm; }
  const g = Math.sqrt(g0 * g1);
  return base.map((v) => Math.pow(v, g));
}

// ───────── the screen ─────────
const SS = 4;
const spot = (u, v) => (Math.cos(2 * Math.PI * u) + Math.cos(2 * Math.PI * v)) / 2;
// LUT: threshold for coverage c (ink where spot > thr)
const LUT = (() => {
  const s = [], N = 256;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) s.push(spot((i + 0.5) / N, (j + 0.5) / N));
  s.sort((a, b) => a - b);
  const t = new Float32Array(1025);
  for (let k = 0; k <= 1024; k++) {
    const c = k / 1024;
    t[k] = c <= 0 ? 2 : c >= 1 ? -2 : s[Math.min(s.length - 1, Math.round((1 - c) * (s.length - 1)))];
  }
  return t;
})();
const thr = (c) => LUT[Math.round(clamp(c) * 1024)];

function screen(w, h, inkC, cobC, sunC) {
  const out = Buffer.alloc(w * h * 4);
  const cmin = 0.035, cmax = 0.975; // no orphan grey specks in the lights, no pinholes in the solids
  const tidy = (c) => (c < cmin ? 0 : c > cmax ? 1 : c);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const ci = tidy(inkC[i]), cc = tidy(cobC[i]), cs = tidy(sunC[i]);
      if (ci === 0 && cc === 0 && cs === 0) continue;
      const ti = thr(ci), tc = thr(cc), ts = thr(cs), tsI = thr(cs * 0.75);
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
          const u = (px + py) / CELL, v = (px - py) / CELL;
          const sp = spot(u, v);
          let col = null;
          if (INVERT && cs > 0 && spot(u + 0.5, v) > tsI) col = SUN; // dark ground: sun dots over the object's, offset half a cell
          else if (cc > 0 && sp > tc) col = COB;
          else if (ci > 0 && sp > ti) col = INK;
          else if (!INVERT && cs > 0 && spot(u + 0.5, v) > ts) col = SUN;
          if (col) { r += col[0]; g += col[1]; b += col[2]; a++; }
        }
      }
      if (!a) continue;
      out[i * 4] = Math.round(r / a); out[i * 4 + 1] = Math.round(g / a); out[i * 4 + 2] = Math.round(b / a);
      // harden the antialiasing (2x slope): crisp dots like the rose, still no stair-steps
      out[i * 4 + 3] = Math.round(clamp((a / (SS * SS) - 0.5) * 2 + 0.5) * 255);
    }
  }
  return out;
}

// ───────── pipeline ─────────
async function loadRGB(img) {
  const { data, info } = await img.removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
  return { rgb: data, w: info.width, h: info.height };
}

// 1. crop to the subject at source resolution, then scale so the crop's long side = SIZE
const src = sharp(input).rotate().flatten({ background: '#ffffff' });
const meta = await sharp(input).metadata();
let A = await loadRGB(src.clone().resize({ width: Math.min(meta.width, 900), withoutEnlargement: true }));
let P = planes(A.rgb, A.w, A.h);
let { fg } = groundMask(P, A.w, A.h);
let minx = A.w, miny = A.h, maxx = -1, maxy = -1;
for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) if (fg[y * A.w + x]) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
if (maxx < 0) throw new Error('no subject found: is the ground flat and light? try --bg-tol');
const k = meta.width / A.w;
const touch = [];
if (miny <= 1) touch.push('top');
if (maxx >= A.w - 2) touch.push('right');
if (maxy >= A.h - 2) touch.push('bottom');
if (minx <= 1) touch.push('left');
// crop box in source pixels, flush on touched sides, a little slack elsewhere (re-trimmed below)
const slack = Math.round(12 * k);
const cx0 = touch.includes('left') ? 0 : Math.max(0, Math.round(minx * k) - slack);
const cy0 = touch.includes('top') ? 0 : Math.max(0, Math.round(miny * k) - slack);
const cx1 = touch.includes('right') ? meta.width : Math.min(meta.width, Math.round((maxx + 1) * k) + slack);
const cy1 = touch.includes('bottom') ? meta.height : Math.min(meta.height, Math.round((maxy + 1) * k) + slack);
const cw = cx1 - cx0, chh = cy1 - cy0;
const scale = SIZE / Math.max(cw, chh);
const W = Math.round(cw * scale), H = Math.round(chh * scale);
if (CELL_H) CELL = Number(CELL_H) * H;
PAD = PAD === null ? Math.round(CELL * 2) : Number(PAD);
const B0 = await loadRGB(sharp(input).rotate().flatten({ background: '#ffffff' }).extract({ left: cx0, top: cy0, width: cw, height: chh }).resize(W, H, { kernel: 'lanczos3' }));

// 2. masks and tones at output resolution
P = planes(B0.rgb, W, H);
({ fg } = groundMask(P, W, H));
const obj = objectMask(P, fg, W, H);
const hand = fg.map((v, i) => (v && !obj[i] ? 1 : 0));

// detail: unsharp the luma at 3 px, then soften at a quarter cell so dots do not shred on grain
const detail = (L, soft) => { const b = blur(L, W, H, Math.max(3, CELL * 0.5)); return blur(L.map((v, i) => v + 0.6 * (v - b[i])), W, H, CELL * soft); };
const Lt = detail(P.L, 0.22);
const Vt = detail(P.L.map((_, i) => Math.max(P.R[i], P.G[i], P.B[i])), OBJ_BLUR);

const fgSoft = blur(fg, W, H, 0.7);
const objSoft = blur(obj, W, H, 0.7);
const handSoft = blur(hand, W, H, 0.7);
let cHand = coverage(Lt, hand, W, H, INVERT ? 1 - INK_MEAN : INK_MEAN, INK_K, INK_LV[0], INK_LV[1]);
let cObj = coverage(OBJECT === 'none' ? Lt : Vt, obj, W, H, INVERT ? 1 - OBJ_MEAN : OBJ_MEAN, OBJ_K, OBJ_LV[0], OBJ_LV[1]);
// parts of the object thinner than about a cell (stems, roots, a key's shaft) print solid, like the
// rose's stem: a dot screen would break them into beads
const thinFill = (() => {
  const r = Math.max(1, Math.round(CELL * 0.6));
  const opened = dilate(erode(obj, W, H, r), W, H, r);
  const thin = blur(obj.map((v, i) => (v && !opened[i] ? 1 : 0)), W, H, CELL * 0.3);
  return thin.map((t, i) => clamp(t * 2) * obj[i]);
})();
cObj = cObj.map((c, i) => Math.max(c, thinFill[i]));
const cObjTone = cObj; // the sun is always picked from the object's lights
if (INVERT) { cHand = cHand.map((c) => 1 - c); cObj = cObj.map((c, i) => Math.max(1 - c, thinFill[i])); }
const inkC = new Float32Array(W * H), cobC = new Float32Array(W * H), sunC = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  inkC[i] = cHand[i] * handSoft[i];
  cobC[i] = cObj[i] * fgSoft[i] * objSoft[i];
}

// 3. sun: the object's lightest planes (lightness blurred at SUN_BLUR cells). With one region (the
//    default, the whole frame) the n largest light spots are kept; with several regions, each region
//    gets its own spot, picked by the quantile inside that region. Area capped at SUN_MAX.
if (SUN_SPOTS > 0 && OBJECT !== 'none') {
  const lightObj = blur(cObjTone.map((c, i) => (obj[i] ? 1 - c : 0)), W, H, CELL * SUN_BLUR);
  const objIn0 = erode(obj, W, H, Math.max(1, Math.round(CELL * 0.4)));
  const perRegion = SUN_REGIONS.length > 1;
  const regionMask = (r) => {
    const m = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (objIn0[i] && x >= r[0] * W && x <= r[2] * W && y >= r[1] * H && y <= r[3] * H) m[i] = 1; }
    return m;
  };
  const spotIn = (m, nKeep, qShift) => {
    const vals = []; for (let i = 0; i < W * H; i++) if (m[i]) vals.push(lightObj[i]);
    if (!vals.length) return new Float32Array(W * H);
    const qTop = quantile(vals, 0.995), q = quantile(vals, SUN_Q) + (qTop - quantile(vals, SUN_Q)) * qShift;
    const s = new Float32Array(W * H);
    // a short ramp: the sun reads as a field with a dotted rim, like the rose's petals
    for (let i = 0; i < W * H; i++) s[i] = m[i] ? smooth(q, q + (qTop - q) * 0.3, lightObj[i]) : 0;
    const { label, comps } = components(s.map((v) => (v > 0.1 ? 1 : 0)), W, H);
    const keep = new Set(comps.map((c, j) => [c.area, j]).sort((x, y) => y[0] - x[0]).slice(0, nKeep).map((e) => e[1]));
    for (let i = 0; i < W * H; i++) if (!(label[i] >= 0 && keep.has(label[i]))) s[i] = 0;
    return s;
  };
  const build = (qShift) => {
    const s = new Float32Array(W * H);
    if (perRegion) for (const r of SUN_REGIONS.slice(0, SUN_SPOTS)) { const t = spotIn(regionMask(r), 1, qShift); for (let i = 0; i < W * H; i++) s[i] = Math.max(s[i], t[i]); }
    else { const t = spotIn(regionMask(SUN_REGIONS[0]), SUN_SPOTS, qShift); s.set(t); }
    return s;
  };
  let qs = 0, s = build(qs);
  for (let it = 0; it < 12 && s.reduce((a, v) => a + v, 0) / (W * H) > SUN_MAX; it++) { qs = qs + (1 - qs) * 0.25; s = build(qs); }
  for (let i = 0; i < W * H; i++) sunC[i] = s[i] * objSoft[i] * fgSoft[i];
}

await savePlane('fg', fg, W, H); await savePlane('obj', obj, W, H);
await savePlane('ink', inkC, W, H); await savePlane('cobalt', cobC, W, H); await savePlane('sun', sunC, W, H);

// 4. screen, then trim to the subject, flush on the cut sides, PAD elsewhere
const rgba = screen(W, H, inkC, cobC, sunC);
let tx0 = W, ty0 = H, tx1 = -1, ty1 = -1;
// trim on the subject's mask, not on the dots, so the plain and --invert prints share one frame
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fg[y * W + x]) { if (x < tx0) tx0 = x; if (x > tx1) tx1 = x; if (y < ty0) ty0 = y; if (y > ty1) ty1 = y; }
const ex = {
  left: touch.includes('left') ? 0 : Math.max(0, tx0 - PAD), top: touch.includes('top') ? 0 : Math.max(0, ty0 - PAD),
};
const right = touch.includes('right') ? W : Math.min(W, tx1 + 1 + PAD);
const bottom = touch.includes('bottom') ? H : Math.min(H, ty1 + 1 + PAD);
const outImg = sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).extract({ ...ex, width: right - ex.left, height: bottom - ex.top });
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
if (output.endsWith('.png')) await outImg.png({ compressionLevel: 9 }).toFile(output);
else await outImg.webp({ lossless: true, effort: 6 }).toFile(output);
if (has('png') && !output.endsWith('.png')) await outImg.png({ compressionLevel: 9 }).toFile(output.replace(/\.\w+$/, '.png'));
const om = await sharp(output).metadata();
let sunPx = 0, inked = 0;
for (let i = 0; i < W * H; i++) { if (rgba[i * 4 + 3]) inked++; if (sunC[i] > 0.035) sunPx++; }
console.log(JSON.stringify({ out: output, width: om.width, height: om.height, touch, cell: CELL, sun: +(sunPx / (om.width * om.height)).toFixed(4) }));

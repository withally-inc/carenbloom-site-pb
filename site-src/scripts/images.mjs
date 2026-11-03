// Care & Bloom v4 image pipeline. Re-runnable and idempotent: every output is rebuilt from assets-src/.
//   node scripts/images.mjs            what the site loads: images, logos, lemon, bloom sequence, manifest
//   node scripts/images.mjs --extras   also the files no page requests (bloom videos and posters, PNG
//                                      sprite copies, the Casetify raster), for press or a future fallback;
//                                      they land in public/img and ship with the next build
//   node scripts/images.mjs --seq      only the bloom sequence (public/img/bloom-seq/) and its manifest entry;
//                                      nothing else in public/img is touched
// Outputs land in public/img/ and public/img/manifest.json. See docs/ASSETS.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { colorToAlpha, hex } from './brand/c2a.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = (f) => path.join(ROOT, 'assets-src', f);
const OUT = path.join(ROOT, 'public/img');
const EXTRAS = process.argv.includes('--extras');
const SEQ_ONLY = process.argv.includes('--seq');
const WIDTHS = [480, 960, 1600];
const C = { paper: '#F4F6F8', mist: '#DCEDF5', ink: '#0A1220', cobalt: '#2331E4' };

if (SEQ_ONLY) fs.rmSync(path.join(OUT, 'bloom-seq'), { recursive: true, force: true });
else {
  // wipe what this script produces, keep folders other scripts own (values/ is built by scripts/values/build.mjs,
  // companions/ by scripts/companions/build.py). The -violet files next to ours are rebuilt by
  // scripts/halftone-dark.mjs afterwards: run the whole chain with `pnpm images` (scripts/pipeline.mjs).
  const KEEP = new Set(['values', 'companions']);
  for (const e of fs.existsSync(OUT) ? fs.readdirSync(OUT) : []) if (!KEEP.has(e)) fs.rmSync(path.join(OUT, e), { recursive: true, force: true });
}
fs.mkdirSync(path.join(OUT, 'logos'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'bloom-seq'), { recursive: true });

const MANIFEST = path.join(OUT, 'manifest.json');
const manifest = SEQ_ONLY && fs.existsSync(MANIFEST)
  ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  : { generated: new Date().toISOString().slice(0, 10), images: {}, bloom: {}, lemon: {}, logos: {} };
const kb = (f) => Math.round(fs.statSync(f).size / 102.4) / 10;
const rel = (f) => '/' + path.relative(path.join(ROOT, 'public'), f).split(path.sep).join('/');

// widths to emit: the requested ones below the source width, plus the source width itself (never upscale)
const widthsFor = (srcW) => [...WIDTHS.filter((w) => w < srcW), ...(srcW < WIDTHS.at(-1) ? [srcW] : [])];

async function placeholder(img) {
  const buf = await img.clone().resize(24).flatten({ background: C.paper }).blur(0.6).webp({ quality: 40 }).toBuffer();
  return 'data:image/webp;base64,' + buf.toString('base64');
}

// Photographic images: AVIF + lossy WebP.
// Halftone images (mode 'halftone'): palette-quantised lossless WebP only. Measured on the hero rose:
// lossless palette WebP 39 KB / 86 KB vs AVIF q60 132 KB / 335 KB, and the dots stay pixel-exact.
async function responsive(name, input, { mode = 'photo', alt = '' } = {}) {
  const img = sharp(input);
  const { width, height } = await img.metadata();
  // ground: the image's dominant colour (sharp stats), read by the brand registry for card grounds
  const { dominant } = await img.stats();
  const ground = '#' + [dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('');
  const widths = widthsFor(width);
  const files = [];
  for (const w of widths) {
    const r = img.clone().resize(w, null, { kernel: 'lanczos3' });
    if (mode === 'halftone') {
      const pal = await r.png({ palette: true, colours: 128, dither: 0.5, effort: 10 }).toBuffer();
      const f = path.join(OUT, `${name}-${w}.webp`);
      await sharp(pal).webp({ lossless: true, effort: 6 }).toFile(f);
      files.push(f);
    } else {
      const fa = path.join(OUT, `${name}-${w}.avif`);
      const fw = path.join(OUT, `${name}-${w}.webp`);
      await r.clone().avif({ quality: 58, effort: 6, chromaSubsampling: '4:4:4' }).toFile(fa);
      await r.clone().webp({ quality: 80, effort: 6, smartSubsample: true, alphaQuality: 90 }).toFile(fw);
      files.push(fa, fw);
    }
  }
  manifest.images[name] = {
    width, height, aspect: +(width / height).toFixed(4), widths,
    formats: mode === 'halftone' ? ['webp'] : ['avif', 'webp'],
    alpha: (await img.metadata()).hasAlpha || false,
    ground,
    src: `/img/${name}-${widths.at(-1)}.webp`,
    pattern: `/img/${name}-{w}.{format}`,
    placeholder: await placeholder(img),
    ...(alt ? { alt } : {}),
    bytes: Object.fromEntries(files.map((f) => [path.basename(f), kb(f) + 'KB'])),
  };
}

const raw = async (input) => sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const fromRaw = (data, w, h, ch) => sharp(data, { raw: { width: w, height: h, channels: ch } });

// ---------- hero stills: cut out of the mist ground (exact colour-to-alpha, no halo) ----------
async function hero() {
  for (const [src, name] of [['hero-grow-start.png', 'hero-start'], ['hero-grow-end.png', 'hero-end']]) {
    const { data, info } = await raw(SRC(src));
    const rgba = colorToAlpha(data, 3, hex(C.mist));
    const png = await fromRaw(rgba, info.width, info.height, 4).png().toBuffer();
    await responsive(name, png, { mode: 'halftone' }); // decorative: the hero wrapper carries the label (COPY.md)
  }
}

// ---------- portraits: one duotone mapping, same contrast, eyes on the same line ----------
// Eye centres measured on the 800px sources (left eye, right eye):
//   rahul  (325,363) (442,350)  interocular 116, mid (383,357)
//   momoko (340,350) (530,348)  interocular 190, mid (435,349)
// Momoko uses the full frame; Rahul is cropped to 520px so faces read at the same scale (within 6%)
// and both eye midpoints land at (54.4%, 43.6%) of the square.
const PORTRAITS = {
  rahul: { mid: [383, 357], size: 520 },
  momoko: { mid: [435, 349], size: 800 },
};
const EYE_AT = [435 / 800, 349 / 800];
const PORTRAIT_OUT = 640;
const FACE_MEDIAN = 0.5;

async function portraitTone(file, crop) {
  const left = Math.round(crop.mid[0] - EYE_AT[0] * crop.size);
  const top = Math.round(crop.mid[1] - EYE_AT[1] * crop.size);
  const { data } = await sharp(file).removeAlpha()
    .extract({ left, top, width: crop.size, height: crop.size })
    .resize(PORTRAIT_OUT, PORTRAIT_OUT, { kernel: 'lanczos3' })
    .greyscale().raw().toBuffer({ resolveWithObject: true });
  // tone normalisation: 1st..99th percentile stretch, then gamma so the face area median = FACE_MEDIAN, then a gentle S-curve
  const sorted = Uint8Array.from(data).sort();
  const lo = sorted[Math.floor(sorted.length * 0.03)], hi = sorted[Math.floor(sorted.length * 0.995)];
  const face = [];
  const N = PORTRAIT_OUT, x0 = N * 0.3 | 0, x1 = N * 0.75 | 0, y0 = N * 0.3 | 0, y1 = N * 0.7 | 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) face.push((data[y * N + x] - lo) / (hi - lo));
  face.sort((a, b) => a - b);
  const med = Math.min(0.95, Math.max(0.05, face[face.length >> 1]));
  const gamma = Math.log(FACE_MEDIAN) / Math.log(med);
  const t = new Float32Array(data.length);
  const S = (x) => x + 0.35 * x * (1 - x) * (2 * x - 1) * 2; // gentle S-curve, keeps 0, 0.5, 1 fixed
  for (let i = 0; i < data.length; i++) t[i] = Math.min(1, Math.max(0, S(Math.pow(Math.min(1, Math.max(0, (data[i] - lo) / (hi - lo))), gamma))));
  return t;
}
function duotone(t, dark, light) {
  const d = hex(dark), l = hex(light), out = Buffer.alloc(t.length * 3);
  for (let i = 0; i < t.length; i++) for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(d[c] + (l[c] - d[c]) * t[i]);
  return out;
}
async function portraits() {
  for (const [who, crop] of Object.entries(PORTRAITS)) {
    const t = await portraitTone(SRC(`leader-${who}.png`), crop);
    const person = who === 'rahul' ? 'Rahul Ramchand' : 'Momoko Kashiwabara';
    for (const [variant, dark, light] of [['cobalt', C.cobalt, C.paper], ['ink', C.ink, C.mist]]) {
      const png = await fromRaw(duotone(t, dark, light), PORTRAIT_OUT, PORTRAIT_OUT, 3).png().toBuffer();
      await responsive(`portrait-${who}-${variant}`, png, { alt: `Portrait of ${person}` }); // COPY.md wording (COPY-DECISIONS 7)
    }
  }
}

// ---------- brand photography ----------
async function products() {
  const list = [
    ['nancy-avocado.png', 'nancy-avocado', 'Hello Nancy avocado product among halved avocados'],
    ['nancy-lem.jpg', 'nancy-lem', 'Hello Nancy lemon product in a ring of lemon slices'],
    ['nancy-raspberry.png', 'nancy-raspberry', 'Hello Nancy raspberry product held in an open hand'],
    ['biird-glass-sky.png', 'biird-glass-sky', 'Biird glass product held up against a blue sky'],
    ['biird-lilac-first-timer.png', 'biird-lilac-first-timer', 'Biird lilac product resting on skin'],
    ['biird-ohwii-branch.jpg', 'biird-ohwii-branch', 'Biird Ohwii glass product balanced on a branch'],
  ];
  for (const [src, name, alt] of list) {
    let input = SRC(src);
    const meta = await sharp(input).metadata();
    if (meta.hasAlpha) {
      // nancy-raspberry ships with transparent rounded corners: fill them with its own edge colour
      const { data } = await sharp(input).extract({ left: 10, top: 10, width: 1, height: 1 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      input = await sharp(input).flatten({ background: { r: data[0], g: data[1], b: data[2] } }).png().toBuffer();
    }
    await responsive(name, input, { alt });
  }
}

// ---------- lemon sprite ----------
async function lemon() {
  const src = SRC('lemon-rotation-sprite.png');
  const FR = 10, SIZE = 360;
  for (const frame of [360, 180]) {
    const r = sharp(src).resize(frame * FR, frame, { kernel: 'lanczos3' });
    const pal = await r.png({ palette: true, colours: 128, dither: 0.5, effort: 10 }).toBuffer();
    const fw = path.join(OUT, `lemon-sprite-${frame}.webp`);
    await sharp(pal).webp({ lossless: true, effort: 6 }).toFile(fw);
    manifest.lemon[frame] = { webp: rel(fw), frameSize: frame, frames: FR, width: frame * FR, height: frame, bytes: { webp: kb(fw) + 'KB' } };
    if (EXTRAS) {
      const fp = path.join(OUT, `lemon-sprite-${frame}.png`);
      fs.writeFileSync(fp, pal);
      Object.assign(manifest.lemon[frame], { png: rel(fp) });
      manifest.lemon[frame].bytes.png = kb(fp) + 'KB';
    }
  }
  if (EXTRAS) {
    // the default names the brief asks for (360px frames)
    fs.copyFileSync(path.join(OUT, 'lemon-sprite-360.webp'), path.join(OUT, 'lemon-sprite.webp'));
    fs.copyFileSync(path.join(OUT, 'lemon-sprite-360.png'), path.join(OUT, 'lemon-sprite.png'));
  }
  manifest.lemon.note = `${FR} frames in one row, frame N at background-position-x = -N * frameSize. Source frame ${SIZE}px.`;
}

// ---------- proof logos, single colour ink ----------
// Optical sizing: every SVG gets a viewBox padded so that the same CSS height reads as the same size.
// `optical` = fraction of the box height the artwork fills (letter logos full, the solid Casetify block smaller).
function bbox(points) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}
function logoSvg(name, inner, box, optical) {
  const [x0, y0, x1, y1] = box;
  const h = (y1 - y0) / optical, padY = (h - (y1 - y0)) / 2;
  const vb = [x0, y0 - padY, x1 - x0, h].map((v) => +v.toFixed(2));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" fill="${C.ink}" role="img" aria-label="${name}"><title>${name}</title>${inner}</svg>\n`;
  return { svg, aspect: +(vb[2] / vb[3]).toFixed(4) };
}
async function inkBox(svgText) {
  // ink bounds in viewBox units, measured by rasterising (robust for any path syntax)
  const vb = svgText.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const { data, info } = await sharp(Buffer.from(svgText), { density: 300 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pts = [];
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 8) pts.push([x, y]);
  const [a, b, c, d] = bbox(pts);
  const kx = vb[2] / info.width, ky = vb[3] / info.height;
  return [vb[0] + a * kx, vb[1] + b * ky, vb[0] + (c + 1) * kx, vb[1] + (d + 1) * ky];
}
async function logos() {
  const out = {};
  // IM8: one compound path, recoloured
  {
    const s = fs.readFileSync(SRC('im8.svg'), 'utf8');
    const d = [...s.matchAll(/<path[^>]* d="([^"]+)"/g)].map((m) => m[1]);
    const inner = d.map((x) => `<path d="${x}"/>`).join('');
    const vb = s.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
    const probe = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${vb[2]}" height="${vb[3]}">${inner}</svg>`;
    out.im8 = logoSvg('IM8', inner, await inkBox(probe), 0.86);
  }
  // Peak21: white fill + 0.3 stroke, recoloured (the stroke is kept so the weight matches the original)
  {
    const s = fs.readFileSync(SRC('peak21.svg'), 'utf8');
    const d = [...s.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
    const inner = `<g stroke="${C.ink}" stroke-width="0.3">${d.map((x) => `<path d="${x}"/>`).join('')}</g>`;
    out.peak21 = logoSvg('Peak21', inner, [0.7, 0.7, 134.3, 32.3], 0.86);
  }
  // Casetify: PNG traced with potrace. Ink = the tilted block; letters and the dot become knockouts.
  {
    const SCALE = 10;
    const src = sharp(SRC('casetify-official.png'));
    const { width, height } = await src.metadata();
    const { data, info } = await src.clone().resize(width * SCALE, height * SCALE, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // ink where the pixel is opaque and dark (letters are white, the dot is pink)
    const bits = Buffer.alloc(info.width * info.height);
    for (let i = 0; i < bits.length; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) * (a / 255) + 255 * (1 - a / 255) * 0; // transparent counts as no-ink
      bits[i] = a > 128 && lum < 110 ? 0 : 255;
    }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-trace-'));
    const pgm = path.join(tmp, 'c.pgm');
    fs.writeFileSync(pgm, Buffer.concat([Buffer.from(`P5 ${info.width} ${info.height} 255\n`), bits]));
    execFileSync('potrace', [pgm, '-s', '-k', '0.5', '-t', '20', '-a', '1.0', '-O', '0.4', '-u', '10', '-o', path.join(tmp, 'c.svg')]);
    const traced = fs.readFileSync(path.join(tmp, 'c.svg'), 'utf8');
    fs.rmSync(tmp, { recursive: true, force: true });
    const g = traced.match(/<g transform="([^"]+)"[^>]*>([\s\S]*?)<\/g>/);
    const paths = [...g[2].matchAll(/d="([^"]+)"/g)].map((m) => m[1].replace(/\s+/g, ' '));
    // potrace transform maps to the upscaled pixel grid (pt); scale back to the source pixel grid
    const inner = `<g transform="scale(${1 / SCALE}) ${g[1]}">${paths.map((d) => `<path d="${d}"/>`).join('')}</g>`;
    const probe = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 4}" height="${height * 4}">${inner}</svg>`;
    out.casetify = logoSvg('CASETiFY', inner, await inkBox(probe), 0.8);
    // crisp raster fallback in ink with transparency (2x of a 40px slot)
    if (EXTRAS) {
    const r = await sharp(Buffer.from(out.casetify.svg), { density: 600 }).resize(null, 160).png().toBuffer();
    await sharp(r).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'logos/casetify@2x.png'));
    await sharp(r).webp({ lossless: true }).toFile(path.join(OUT, 'logos/casetify@2x.webp'));
    }
  }
  for (const [k, v] of Object.entries(out)) {
    const f = path.join(OUT, 'logos', `${k}.svg`);
    fs.writeFileSync(f, v.svg);
    manifest.logos[k] = { src: rel(f), aspect: v.aspect, bytes: kb(f) + 'KB' };
  }
  if (EXTRAS) {
    manifest.logos.casetify.png2x = '/img/logos/casetify@2x.png';
    manifest.logos.casetify.webp2x = '/img/logos/casetify@2x.webp';
  }
  manifest.logos.note = 'Same CSS height for all three (viewBoxes are optically padded). Recolour with CSS mask or use opacity .6 on ink.';
}

// ---------- the bloom: video re-grounded on paper + transparent WebP sequence ----------
// The source video sits on mist (decoded ~#DAECF4, with +-2 compression noise). Each frame is un-composited
// with colour-to-alpha (noise tolerance 4 levels), then re-composited on paper for the videos and kept
// transparent for the image sequence.
const VIDEO_BG = [218, 236, 244];
function tolerate(rgb, bg, tol) {
  const out = Buffer.from(rgb);
  for (let i = 0; i < out.length; i++) {
    const b = bg[i % 3], d = out[i] - b;
    out[i] = Math.abs(d) <= tol ? b : b + d - Math.sign(d) * tol;
  }
  return out;
}
function overPaper(rgba, paper) {
  const out = Buffer.alloc((rgba.length / 4) * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    const a = rgba[i + 3] / 255;
    for (let c = 0; c < 3; c++) out[j + c] = Math.round(rgba[i + c] * a + paper[c] * (1 - a));
  }
  return out;
}
async function bloom() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-bloom-'));
  const ffmpeg = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
  ffmpeg(['-i', SRC('hero-grow.mp4'), '-pix_fmt', 'rgb24', path.join(tmp, 'src%03d.png')]);
  const frames = fs.readdirSync(tmp).filter((f) => f.startsWith('src')).sort();
  const paper = hex(C.paper);
  // 49 frames = every second source frame (97 at 24 fps): the bloom reads as continuous growth when
  // scrubbed, and the hero draws them strictly in order (hero.ts). ~25 KB each, palette lossless.
  const SEQ = 49;
  const seqIdx = Array.from({ length: SEQ }, (_, i) => Math.round((i * (frames.length - 1)) / (SEQ - 1)));
  let W, H;
  for (let i = 0; i < frames.length; i++) {
    const { data, info } = await raw(path.join(tmp, frames[i]));
    W = info.width; H = info.height;
    const s = seqIdx.indexOf(i);
    if (!EXTRAS && s === -1) continue; // the paper frames only feed the extras (videos, posters)
    const rgba = colorToAlpha(tolerate(data, VIDEO_BG, 4), 3, VIDEO_BG);
    if (EXTRAS) await fromRaw(overPaper(rgba, paper), W, H, 3).png({ compressionLevel: 1 }).toFile(path.join(tmp, `p${String(i + 1).padStart(3, '0')}.png`));
    if (s !== -1) {
      const f = path.join(OUT, 'bloom-seq', `bloom-${String(s).padStart(2, '0')}.webp`);
      const pal = await fromRaw(rgba, W, H, 4).resize(null, 720, { kernel: 'lanczos3' }).png({ palette: true, colours: 96, dither: 0.4, effort: 10 }).toBuffer();
      await sharp(pal).webp({ lossless: true, effort: 6 }).toFile(f);
    }
  }
  const seqFiles = fs.readdirSync(path.join(OUT, 'bloom-seq')).sort();
  const seqSizes = seqFiles.map((f) => kb(path.join(OUT, 'bloom-seq', f)));
  manifest.bloom.sequence = {
    pattern: '/img/bloom-seq/bloom-{nn}.webp', count: SEQ, pad: 2, width: Math.round((W * 720) / H), height: 720,
    alpha: true, sourceFrames: seqIdx, maxKB: Math.max(...seqSizes), totalKB: +seqSizes.reduce((a, b) => a + b, 0).toFixed(1),
  };
  // poster = first frame on paper (AVIF + WebP at 720 and 1080 tall)
  if (EXTRAS) manifest.bloom.poster = {};
  for (const h of EXTRAS ? [720, 1080] : []) {
    const p = sharp(path.join(tmp, 'p001.png')).resize(null, h, { kernel: 'lanczos3' });
    const fw = path.join(OUT, `hero-bloom-poster-${h}.webp`), fa = path.join(OUT, `hero-bloom-poster-${h}.avif`);
    const pal = await p.clone().png({ palette: true, colours: 96, dither: 0.4, effort: 10 }).toBuffer();
    await sharp(pal).webp({ lossless: true, effort: 6 }).toFile(fw);
    await p.clone().avif({ quality: 62, effort: 6, chromaSubsampling: '4:4:4' }).toFile(fa);
    manifest.bloom.poster[h] = { webp: rel(fw), avif: rel(fa), bytes: { webp: kb(fw) + 'KB', avif: kb(fa) + 'KB' } };
  }
  if (EXTRAS) {
    const inp = ['-framerate', '24', '-i', path.join(tmp, 'p%03d.png')];
    const color = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
    const vf = (h) => `scale=-2:${h}:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p`;
    manifest.bloom.video = {};
    for (const h of [720, 1080]) {
      const mp4 = path.join(OUT, `hero-bloom-${h}.mp4`), webm = path.join(OUT, `hero-bloom-${h}.webm`);
      const scrub = path.join(OUT, `hero-bloom-${h}-scrub.mp4`);
      const crf = h === 720 ? 26 : 27;
      ffmpeg([...inp, '-vf', vf(h), '-c:v', 'libx264', '-preset', 'veryslow', '-crf', String(crf), '-tune', 'grain', '-profile:v', 'high', ...color, '-movflags', '+faststart', '-an', mp4]);
      ffmpeg([...inp, '-vf', vf(h), '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf + 10), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1', ...color, '-an', webm]);
      // scrub: a keyframe every 2 frames so currentTime seeks decode at most one frame
      // (H.264 only: every browser decodes it, and an all-keyframe VP9 file was 1.5x heavier for the same look)
      ffmpeg([...inp, '-vf', vf(h), '-c:v', 'libx264', '-preset', 'veryslow', '-crf', String(crf + 5), '-tune', 'grain', '-g', '2', '-keyint_min', '2', '-sc_threshold', '0', '-bf', '0', ...color, '-movflags', '+faststart', '-an', scrub]);
      manifest.bloom.video[h] = { mp4: rel(mp4), webm: rel(webm), scrubMp4: rel(scrub), width: Math.round((W * h) / H / 2) * 2, height: h,
        bytes: { mp4: kb(mp4) + 'KB', webm: kb(webm) + 'KB', scrubMp4: kb(scrub) + 'KB'} };
    }
    // default names asked by the brief = 720p
    fs.copyFileSync(path.join(OUT, 'hero-bloom-720.mp4'), path.join(OUT, 'hero-bloom.mp4'));
    fs.copyFileSync(path.join(OUT, 'hero-bloom-720.webm'), path.join(OUT, 'hero-bloom.webm'));
    manifest.bloom.duration = 97 / 24;
    manifest.bloom.fps = 24;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (!SEQ_ONLY) {
  await hero();
  await portraits();
  await products();
  await lemon();
  await logos();
}
await bloom();
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
let total = 0;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => e.isDirectory() ? walk(path.join(d, e.name)) : (total += fs.statSync(path.join(d, e.name)).size));
walk(OUT);
console.log(`public/img: ${(total / 1048576).toFixed(2)} MB`);

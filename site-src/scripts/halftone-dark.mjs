// Violet-mode variants of the halftone art (docs/ASSETS.md, "Violet mode").
//   node scripts/halftone-dark.mjs              every variant the site can load
//   node scripts/halftone-dark.mjs a.webp b.png  only these files (paths under public/)
//   node scripts/halftone-dark.mjs --seq        only the bloom sequence
// `pnpm images` (scripts/pipeline.mjs) runs it last, after images.mjs, values and companions.
//
// Ink on paper disappears on the violet ground, so each light file gets a sibling named by
// the rule of src/lib/theme.ts themedSrc(): `-violet` before the size or frame number, or
// before the extension (hero-start-896.webp → hero-start-violet-896.webp,
// bloom-seq/bloom-07.webp → bloom-seq/bloom-violet-07.webp, logos/im8.svg → logos/im8-violet.svg).
//
// Halftone art (hero stills, bloom sequence and poster, lemon sprites, any new
// ink + cobalt + sun halftone): every pixel is unmixed into the four inks it was printed
// with (ink, cobalt, sun, paper, over paper), then re-inked for a dark ground:
//   ink dots   → lavender-mist dots (DOT)
//   cobalt     → bright violet-blue (ART_COBALT)
//   sun        → sun, unchanged: pure #FDFF6D dots on the violet ground (no shade, no blend)
//   paper      → transparent (the violet ground shows through, as paper did)
// Opaque sources (posters) are flattened back onto the violet ground.
// Portraits: the duotones are re-mapped (ink print → night to lavender; cobalt print →
// violet-blue to lavender). Logos: the single ink fill becomes lavender mist.

import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const PUB = path.join(ROOT, 'public')
const IMG = path.join(PUB, 'img')

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
// light inks (docs/BRAND.md 6)
const INK = hex('#0A1220')
const COBALT = hex('#2331E4')
const SUN = hex('#FDFF6D')
const PAPER = hex('#F4F6F8')
// violet inks (docs/BRAND.md, Violet mode). DOT matches scripts/companions (lavender mist)
const DOT = hex('#D9D2F5')
const ART_COBALT = hex('#5F5BFF') // cobalt brightened a step toward violet: saturated, and the brightest colour on the violet ground
const GROUND = hex('#160F2E')
const NIGHT = hex('#050310')
const LAVENDER = hex('#DCD5F5')
const LOGO = '#EDE9FC' // the violet --ink

export const violetName = (file) => {
  if (/-violet(?=[-.@])/.test(file)) return file
  return file.replace(/(-\d+)?(@\dx)?(\.[a-z0-9]+)$/i, '-violet$1$2$3')
}

// ---------- unmixing: c ≈ wK·INK + wX·(COBALT or SUN) + wP·PAPER, Σw = 1, w ≥ 0 ----------
// The light files were cut out of the old mist ground (colour-to-alpha), so a pixel is read
// over that ground, and unmixed in the ink triangle (ink, cobalt, paper) or (ink, sun, paper)
// that fits it best. Cobalt and sun never share a dot.
const LIGHT_GROUND = hex('#DCEDF5')
const HI = [238, 246, 252] // the highlight "paper" of the art
function lsq3(P, c) {
  // least squares on the three channels plus a heavy Σw = 1 row
  const L = 400
  const rows = [0, 1, 2].map((ch) => [P[0][ch], P[1][ch], P[2][ch], c[ch]]).concat([[L, L, L, L]])
  const N = [0, 1, 2].map((i) => [0, 1, 2].map((j) => rows.reduce((s, r) => s + r[i] * r[j], 0)))
  const v = [0, 1, 2].map((i) => rows.reduce((s, r) => s + r[i] * r[3], 0))
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  const D = det(N)
  let w = [0, 1, 2].map((k) => det(N.map((r, i) => r.map((x, j) => (j === k ? v[i] : x)))) / D)
  w = w.map((x) => Math.max(0, x))
  const sum = w.reduce((a, b) => a + b, 0) || 1
  w = w.map((x) => x / sum)
  const err = [0, 1, 2].reduce((e, ch) => e + (w[0] * P[0][ch] + w[1] * P[1][ch] + w[2] * P[2][ch] - c[ch]) ** 2, 0)
  return { w, err }
}
/** [wK, wC, wS, wP] of an opaque colour */
function unmix(c) {
  const a = lsq3([INK, COBALT, HI], c)
  const b = lsq3([INK, SUN, HI], c)
  return a.err <= b.err ? [a.w[0], a.w[1], 0, a.w[2]] : [b.w[0], 0, b.w[1], b.w[2]]
}

// The flower (cobalt and sun) and the hand (ink only) are re-inked differently, so a
// chroma mask decides, per pixel, how much of each rule applies:
//   neutral art (the hand, the lemon): ink dots → lavender-mist dots, paper → transparent
//     (the brief's rule: the dots carry the light, the ground stays the ground)
//   cobalt and sun (the flower): cobalt → bright violet-blue, sun → sun, paper highlights
//     → lavender, ink shadows → a deep shade of the colour they sit in, so the bloom stays
//     a lit flower and cobalt stays the brightest colour of the image
function weights(r, g, b, a) {
  // the colour the light file shows over its own ground, unmixed, then scaled by alpha:
  // transparency is the ground, and stays the ground
  const al = a / 255
  if (al < 0.01) return [0, 0, 0, 0]
  const [wK, wC, wS, wP] = unmix([r, g, b].map((v, i) => v * al + LIGHT_GROUND[i] * (1 - al)))
  // the part of the pixel that was ground in the light file is not paint
  const paint = al
  return [wK * paint, wC * paint, wS * paint, wP * paint]
}
const COBALT_SHADE = hex('#2E2A9E')
const SUN_SHADE = hex('#C8C23A')
function reink([K, C, S, P], m, sunny) {
  // sun zones of the flower: pure sun dots on the violet ground. Each pixel is the ink it
  // is mostly made of, at full strength: sun stays #FDFF6D (never a blend with the ground
  // or an ink shade, which read olive at screen size), cobalt stays the violet-blue, and
  // ink shadows and paper highlights inside the zone drop to the ground, which plays the
  // shadow.
  if (sunny && m > 0.35) {
    const tot = K + C + S + P
    if (tot < 0.004) return [0, 0, 0, 0]
    // the light art was cut out of the mist ground, so even its solid sun dots sit at
    // about 90% alpha, and 90% sun over violet is olive: a dot is opaque, only the
    // faint cut-out fringe (under half) keeps its alpha
    const alpha = tot >= 0.5 ? 255 : Math.round(tot * 255)
    if (S / tot >= 0.4) return [...SUN, alpha]
    if (C / tot >= 0.4) return [...ART_COBALT, alpha]
    return [0, 0, 0, 0]
  }
  // neutral rule
  const nA = K + C + S
  const n = [0, 1, 2].map((i) => (nA ? (K * DOT[i] + C * ART_COBALT[i] + S * SUN[i]) / nA : 0))
  // colour rule
  const shade = sunny ? SUN_SHADE : COBALT_SHADE
  const cA = K + C + S + P
  const c = [0, 1, 2].map((i) => (cA ? (K * shade[i] + C * ART_COBALT[i] + S * SUN[i] + P * LAVENDER[i]) / cA : 0))
  const A = nA * (1 - m) + cA * m
  if (A < 0.004) return [0, 0, 0, 0]
  const col = [0, 1, 2].map((i) => Math.round((n[i] * nA * (1 - m) + c[i] * cA * m) / A))
  return [...col, Math.round(Math.min(1, A) * 255)]
}

async function halftone(src, { flatten = false } = {}) {
  const img = sharp(src)
  const meta = await img.metadata()
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  const N = W * H
  const w = new Array(N)
  const chroma = new Float32Array(N)
  const sun = new Float32Array(N)
  const memo = new Map()
  for (let i = 0; i < N; i++) {
    const j = i * 4
    const key = (data[j] << 24) ^ (data[j + 1] << 16) ^ (data[j + 2] << 8) ^ data[j + 3]
    let v = memo.get(key)
    if (!v) memo.set(key, (v = weights(data[j], data[j + 1], data[j + 2], data[j + 3])))
    w[i] = v
    chroma[i] = v[1] + v[2]
    sun[i] = v[2]
  }
  // the mask: local amount of colour, over about one halftone cell and a half (scaled to the image)
  const sigma = Math.max(2, W / 90)
  const blur = async (arr) => {
    const buf = Buffer.from(Uint8Array.from(arr, (x) => Math.round(Math.min(1, x) * 255)))
    // blur() returns three channels from a one-channel input: take one back, or the mask
    // is read three pixels at a time and lands on the wrong part of the image
    const out = await sharp(buf, { raw: { width: W, height: H, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer()
    return Float32Array.from(out, (x) => x / 255)
  }
  const mC = await blur(chroma)
  const mS = await blur(sun)
  const out = Buffer.alloc(N * 4)
  for (let i = 0; i < N; i++) {
    const m = Math.min(1, Math.max(0, (mC[i] - 0.08) / 0.22))
    const o = reink(w[i], m, mS[i] > mC[i] * 0.5)
    out.set(o, i * 4)
  }
  let pipe = sharp(out, { raw: { width: W, height: H, channels: 4 } })
  if (flatten || !meta.hasAlpha) pipe = pipe.flatten({ background: { r: GROUND[0], g: GROUND[1], b: GROUND[2] } })
  return { pipe, meta }
}

// ---------- duotone portraits: tone t along the light duotone, re-mapped ----------
async function duotone(src, from, to, dark, light) {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const d = to.map((v, i) => v - from[i])
  const dd = d.reduce((s, v) => s + v * v, 0)
  const out = Buffer.alloc(data.length)
  for (let i = 0; i < data.length; i += 3) {
    let t = ((data[i] - from[0]) * d[0] + (data[i + 1] - from[1]) * d[1] + (data[i + 2] - from[2]) * d[2]) / dd
    t = Math.min(1, Math.max(0, t))
    for (let k = 0; k < 3; k++) out[i + k] = Math.round(dark[k] + (light[k] - dark[k]) * t)
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
}

async function write(pipe, dest, meta) {
  const ext = path.extname(dest).toLowerCase()
  if (ext === '.webp') {
    // halftone keeps palette-lossless like the light files (images.mjs); photos stay lossy
    if (meta?.halftone) {
      // back to a small palette (the light files have 15 colours), so lossless WebP stays light
      const pal = await pipe.png({ palette: true, colours: 48, dither: 0, effort: 10 }).toBuffer()
      await sharp(pal).webp({ lossless: true, effort: 6 }).toFile(dest)
    }
    else await pipe.webp({ quality: 80, effort: 6 }).toFile(dest)
  } else if (ext === '.avif') await pipe.avif({ quality: 58, effort: 6 }).toFile(dest)
  else if (ext === '.png') await pipe.png({ compressionLevel: 9, palette: true }).toFile(dest)
  else throw new Error(`unsupported ${dest}`)
}

const kb = (f) => (fs.statSync(f).size / 1024).toFixed(1)
const made = []
async function one(abs) {
  const rel = path.relative(PUB, abs)
  const base = path.basename(abs)
  const dest = path.join(path.dirname(abs), violetName(base))
  if (/-violet[-.@]/.test(base)) return
  if (base.endsWith('.svg')) {
    const svg = fs.readFileSync(abs, 'utf8').replace(/#0A1220/gi, LOGO)
    fs.writeFileSync(dest, svg)
  } else if (/^portrait-.*-ink-/.test(base)) {
    await write(await duotone(abs, INK, hex('#DCEDF5'), NIGHT, LAVENDER), dest)
  } else if (/^portrait-.*-cobalt-/.test(base)) {
    await write(await duotone(abs, COBALT, PAPER, ART_COBALT, LAVENDER), dest)
  } else {
    const { pipe, meta } = await halftone(abs, { flatten: /poster/.test(base) })
    await write(pipe, dest, { halftone: true, ...meta })
  }
  made.push(`${path.relative(PUB, dest)} ${kb(dest)}KB (from ${rel} ${kb(abs)}KB)`)
}

function defaults() {
  const ls = (d, re) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => re.test(f) && !/-violet[-.@]/.test(f)).map((f) => path.join(d, f)) : [])
  return [
    ...ls(IMG, /^hero-(start|end)-\d+\.webp$/),
    ...ls(IMG, /^hero-bloom-poster-\d+\.webp$/),
    ...ls(path.join(IMG, 'bloom-seq'), /^bloom-\d+\.webp$/),
    ...ls(IMG, /^lemon-sprite(-\d+)?\.(webp|png)$/),
    ...ls(IMG, /^portrait-.+-(ink|cobalt)-\d+\.(webp|avif)$/),
    ...ls(path.join(IMG, 'logos'), /\.svg$/),
  ]
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const onlySeq = process.argv.includes('--seq') // after images.mjs --seq: the bloom frames only
const files = args.length
  ? args.map((a) => path.resolve(PUB, a.replace(/^public\//, '')))
  : defaults().filter((f) => !onlySeq || f.includes(`${path.sep}bloom-seq${path.sep}`))
const t0 = Date.now()
let n = 0
// a few at a time: the bloom sequence is 49 frames
const queue = [...files]
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const f = queue.shift()
      await one(f)
      n++
    }
  }),
)
made.sort().forEach((m) => console.log(m))
console.log(`${n} violet variants in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

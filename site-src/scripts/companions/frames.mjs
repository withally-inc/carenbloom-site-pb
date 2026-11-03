// Frame sequences of the brand-card companions, for review.
//   BASE=http://localhost:4189 OUT=<dir> node scripts/companions/frames.mjs [desktop|touch|reduced|perch|all]
// desktop: 1440x900, a scripted cursor path over each card, a crop of the card every 120ms.
// touch:   390x844 touch context, each card scrolled into view, idle frames.
// reduced: 1440x900 with prefers-reduced-motion, hovering each card.
// perch:   Biird: move in, rest 3.6s (sparrow perches at 0.8s, E4 tittles join at 3s).
// zones:   /?companion-zones, every gallery image of each card with its exclusion zones drawn.
// guard:   /?companion-zones, the cursor parks on each product and sweeps across it, every
//          image; samples the companion every 40ms and counts frames where its body
//          overlaps a zone (must be 0).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = (process.env.BASE || 'http://localhost:4189').replace(/\/$/, '')
const OUT = process.env.OUT || 'qa/companions'
mkdirSync(OUT, { recursive: true })
const what = process.argv[2] || 'all'
const errors = []

async function open(ctxOpts, path = '/', theme = null) {
  const b = await chromium.launch()
  const ctx = await b.newContext(ctxOpts)
  // skip the preloader (first visit per session)
  await ctx.addInitScript((t) => {
    try {
      sessionStorage.setItem('cb-intro', '1')
      if (t) localStorage.setItem('cb-theme', t)
    } catch {}
  }, theme)
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await p.goto(BASE + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1800)
  return { b, p }
}

async function toCard(p, slug) {
  await p.evaluate((s) => {
    const el = document.querySelector(`.bcard[data-brand="${s}"]`)
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 200)
  }, slug)
  await p.waitForTimeout(2600) // reveals and the image wipe
  return p.evaluate((s) => {
    const r = document.querySelector(`.bcard[data-brand="${s}"]`).getBoundingClientRect()
    return { x: r.left, y: r.top, w: r.width, h: r.height }
  }, slug)
}

const clip = (r, pad = 70) => ({ x: Math.max(0, r.x - pad), y: Math.max(0, r.y - 170), width: r.w + pad * 2, height: Math.min(900, r.h + 170 + pad) })

async function desktop() {
  const { b, p } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  for (const slug of ['hello-nancy', 'biird']) {
    const r = await toCard(p, slug)
    await p.mouse.move(r.x - 40, r.y + r.h * 0.4)
    // path: enter left, sweep right across the photo, down over the name, back up-left
    const path = [
      [0.12, 0.3],
      [0.3, 0.32],
      [0.5, 0.36],
      [0.7, 0.4],
      [0.82, 0.5],
      [0.6, 0.62],
      [0.35, 0.7],
      [0.2, 0.55],
      [0.4, 0.3],
      [0.62, 0.22],
    ]
    let k = 0
    for (let i = 0; i < path.length; i++) {
      const [fx, fy] = path[i]
      await p.mouse.move(r.x + r.w * fx, r.y + r.h * fy, { steps: 14 })
      for (let j = 0; j < (i === 0 ? 16 : 2); j++) {
        await p.waitForTimeout(120)
        await p.screenshot({ path: `${OUT}/${slug}-desktop-${String(k++).padStart(2, '0')}.png`, clip: clip(r) })
      }
    }
    // leave: it goes home
    await p.mouse.move(r.x + r.w + 200, r.y - 200, { steps: 6 })
    for (let j = 0; j < 4; j++) {
      await p.waitForTimeout(200)
      await p.screenshot({ path: `${OUT}/${slug}-desktop-${String(k++).padStart(2, '0')}.png`, clip: clip(r) })
    }
  }
  await b.close()
}

async function perch() {
  const { b, p } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  const r = await toCard(p, 'biird')
  await p.mouse.move(r.x - 40, r.y + r.h * 0.4)
  await p.mouse.move(r.x + r.w * 0.3, r.y + r.h * 0.35, { steps: 10 })
  await p.waitForTimeout(700)
  await p.mouse.move(r.x + r.w * 0.36, r.y + r.h * 0.3, { steps: 6 })
  const times = [300, 900, 1300, 2000, 3200, 3700, 4500, 5600]
  let t = 0
  for (const ms of times) {
    await p.waitForTimeout(ms - t)
    t = ms
    await p.screenshot({ path: `${OUT}/biird-perch-${ms}.png`, clip: clip(r) })
  }
  await p.mouse.move(r.x + r.w * 0.55, r.y + r.h * 0.45, { steps: 8 })
  await p.waitForTimeout(500)
  await p.screenshot({ path: `${OUT}/biird-perch-move.png`, clip: clip(r) })
  await b.close()
}

async function touch() {
  const { b, p } = await open({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  for (const slug of ['hello-nancy', 'biird']) {
    const r = await toCard(p, slug)
    for (let j = 0; j < 6; j++) {
      await p.waitForTimeout(500)
      await p.screenshot({ path: `${OUT}/${slug}-touch-${j}.png`, clip: { x: 0, y: Math.max(0, r.y - 80), width: 390, height: Math.min(844, r.h + 120) } })
    }
  }
  await b.close()
}

async function reduced() {
  const { b, p } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  for (const slug of ['hello-nancy', 'biird']) {
    const r = await toCard(p, slug)
    await p.mouse.move(r.x + r.w * 0.3, r.y + r.h * 0.3, { steps: 4 })
    await p.waitForTimeout(400)
    await p.mouse.move(r.x + r.w * 0.6, r.y + r.h * 0.5, { steps: 10 })
    await p.waitForTimeout(700)
    await p.screenshot({ path: `${OUT}/${slug}-reduced.png`, clip: clip(r) })
  }
  await b.close()
}

const showImage = (p, slug, i) =>
  p.evaluate(([s, n]) => document.querySelector(`.bcard[data-brand="${s}"]`).dispatchEvent(new CustomEvent('bcard:go', { detail: n })), [slug, i])
const IMAGES = { 'hello-nancy': 3, biird: 3 }

async function zones() {
  const { b, p } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, '/?companion-zones')
  for (const slug of Object.keys(IMAGES)) {
    const r = await toCard(p, slug)
    for (let i = 0; i < IMAGES[slug]; i++) {
      await showImage(p, slug, i)
      await p.mouse.move(r.x + r.w * 0.5, r.y + r.h * 0.3, { steps: 4 })
      await p.waitForTimeout(400)
      await p.mouse.move(5, 5) // off the card: the zones repaint for the image on screen
      await p.waitForTimeout(300)
      await p.screenshot({ path: `${OUT}/${slug}-zones-${i}.png`, clip: clip(r) })
    }
  }
  await b.close()
}

// the companion's body box, from its transform and the body fractions in brands.ts
const SAMPLE = `(() => {
  const out = []
  for (const card of document.querySelectorAll('.bcard--live')) {
    const c = card.querySelector('.bcard__companion')
    if (!c || +getComputedStyle(c).opacity < 0.05) continue
    const m = new DOMMatrix(getComputedStyle(c).transform)
    const s = c.offsetWidth
    const hop = c.classList.contains('companion--hop')
    const flip = hop && (c.firstElementChild.style.transform || '').includes('scaleX(-1)')
    let [a, b2, cc, d] = hop ? [0.06, 0.2, 0.8, 0.84] : [0.16, 0.16, 0.84, 0.84]
    if (flip) [a, cc] = [1 - cc, 1 - a]
    const body = { x0: m.e + a * s, y0: m.f + b2 * s, x1: m.e + cc * s, y1: m.f + d * s }
    if (hop && m.f <= -0.8 * s + 0.5) continue // on the top edge or above: always allowed
    for (const z of card.querySelectorAll('.bcard__zones i')) {
      const zx0 = z.offsetLeft, zy0 = z.offsetTop, zx1 = zx0 + z.offsetWidth, zy1 = zy0 + z.offsetHeight
      if (body.x0 < zx1 && body.x1 > zx0 && body.y0 < zy1 && body.y1 > zy0) out.push(card.dataset.brand + ' ' + Math.round(m.e) + ',' + Math.round(m.f))
    }
  }
  return out
})()`

async function guard() {
  const { b, p } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, '/?companion-zones')
  let samples = 0
  const bad = []
  for (const slug of Object.keys(IMAGES)) {
    const r = await toCard(p, slug)
    for (let i = 0; i < IMAGES[slug]; i++) {
      await p.mouse.move(5, 5)
      await showImage(p, slug, i)
      await p.waitForTimeout(300)
      // enter, wait out the moment, then sweep across the middle and park on the product
      const pts = [[0.08, 0.5], [0.08, 0.5], [0.5, 0.45], [0.92, 0.4], [0.1, 0.35], [0.55, 0.25], [0.55, 0.25], [0.5, 0.6], [0.3, 0.75], [0.85, 0.7]]
      let k = 0
      for (const [fx, fy] of pts) {
        await p.mouse.move(r.x + r.w * fx, r.y + r.h * fy * 0.8, { steps: 10 })
        const until = Date.now() + (k++ === 1 ? 2200 : 900)
        while (Date.now() < until) {
          const v = await p.evaluate(SAMPLE)
          samples++
          if (v.length) bad.push(`${slug} img${i}: ${v[0]}`)
          await p.waitForTimeout(40)
        }
      }
      await p.screenshot({ path: `${OUT}/${slug}-guard-${i}.png`, clip: clip(r) })
      await showImage(p, slug, i) // the moment may have advanced it; keep the image under test
    }
  }
  console.log(`guard: ${samples} samples, ${bad.length} overlapping`)
  if (bad.length) console.log(bad.slice(0, 12).join('\n'))
  await b.close()
}

// violet: both cards with their companion in violet mode, 1440 (hovered) and 390 (touch idle)
async function violet() {
  {
    const { b, p } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, '/', 'violet')
    for (const slug of Object.keys(IMAGES)) {
      const r = await toCard(p, slug)
      await p.mouse.move(r.x + r.w * 0.1, r.y + r.h * 0.45, { steps: 6 })
      await p.waitForTimeout(2600) // the moment leads, then the companion joins
      await p.mouse.move(r.x + r.w * 0.2, r.y + r.h * 0.12, { steps: 12 })
      await p.waitForTimeout(500)
      await p.screenshot({ path: `${OUT}/${slug}-violet-1440.png`, clip: clip(r) })
      await p.waitForTimeout(1600) // the pointer rests: the sparrow perches off the photo
      await p.screenshot({ path: `${OUT}/${slug}-violet-1440-rest.png`, clip: clip(r) })
    }
    await b.close()
  }
  const { b, p } = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, '/', 'violet')
  for (const slug of Object.keys(IMAGES)) {
    const r = await toCard(p, slug)
    await p.waitForTimeout(900)
    await p.screenshot({ path: `${OUT}/${slug}-violet-390.png`, clip: { x: 0, y: Math.max(0, r.y - 90), width: 390, height: Math.min(844, r.h + 130) } })
  }
  await b.close()
}

const jobs = { desktop, touch, reduced, perch, zones, guard, violet }
for (const [name, fn] of Object.entries(jobs)) if (what === 'all' || what === name) await fn()
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no page errors')

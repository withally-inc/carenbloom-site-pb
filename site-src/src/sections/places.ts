import './places.css'
import { WORLD, type City, type DotGrid } from '../data/world-dots'
import { easeExpoOut, finePointer, reducedMotion } from '../lib/motion'
import { whileVisible } from '../lib/live'
import { bindClock, timeIn } from '../lib/clocks'
import { THEME_EVENT } from '../lib/theme'

// Places: the four cities on a flat halftone world map, the closing block of the
// People section. The land is a 45 degree halftone screen (src/data/world-dots,
// generated at build time), shaded by the live day and night line. The cities sit
// in cobalt; great-circle arcs draw in once on enter. Hovering a city (or the map
// near it), focusing or tapping its name lights the dots around it in a soft radius
// that ripples outward, lifts its label with the local time and a sun or moon
// petal, and dims the other three. With no interaction the highlight walks slowly
// through the four cities while the map is in view.
//
// Drawing: the dots are painted once into an offscreen layer (again on resize and
// every 10 minutes for the night line). A frame blits that layer and draws only
// the lit dots near the active city, the arcs and the pins. The loop runs only
// while something moves, and only in view. Reduced motion: the static map, the
// four cities and their times; a highlight still follows focus, without ripple.

// canvas colours come from the CSS tokens at draw time (themes swap them):
// dots in --on-ink, marks in --cobalt-on-ink, the pin plate in --ink
let INK_DOT = '220, 237, 245'
let COBALT = '111, 124, 255'
let PLATE = '10, 18, 32'
function toRGB(v: string, fallback: string) {
  v = v.trim()
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v)
  if (m) {
    let h = m[1]
    if (h.length === 3) h = [...h].map((c) => c + c).join('')
    const n = parseInt(h, 16)
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(v)
  return m ? `${m[1]}, ${m[2]}, ${m[3]}` : fallback
}
function readColors(el: Element) {
  const cs = getComputedStyle(el)
  INK_DOT = toRGB(cs.getPropertyValue('--on-ink'), INK_DOT)
  COBALT = toRGB(cs.getPropertyValue('--cobalt-on-ink'), COBALT)
  PLATE = toRGB(cs.getPropertyValue('--night'), PLATE) // the section's own ground (lavender --ink in violet mode)
}
const TONE_R = [0, 0.33, 0.43, 0.52] // dot radius per tone, in row pitches
const ORDER = ['hong-kong', 'shenzhen', 'london', 'san-francisco']
const CYCLE_MS = 3600
const IDLE_MS = 5000 // after a touch or a pointer leaves, before the walk resumes
const ARC_MS = 1700
const RIPPLE = { front: 1.2, ring: 1.5, settle: 1.9 } // seconds
// arcs: San Francisco to London to Hong Kong (Shenzhen shares the end point)
const ARCS: [string, string][] = [
  ['san-francisco', 'london'],
  ['london', 'hong-kong'],
]

type Side = 'l' | 'r'
type Geo = { dx: number; dy: number; side: Side; leader?: boolean }
// label placement around each pin: open sea where possible; Hong Kong and
// Shenzhen sit 30 km apart, so their labels stack on leader lines (Shenzhen is
// the northern one, so it goes up)
const GEO_WIDE: Record<string, Geo> = {
  'san-francisco': { dx: -14, dy: 2, side: 'l' },
  london: { dx: -14, dy: 14, side: 'l' },
  shenzhen: { dx: 34, dy: -26, side: 'r', leader: true },
  'hong-kong': { dx: 34, dy: 24, side: 'r', leader: true },
}
const GEO_NARROW: Record<string, Geo> = {
  'san-francisco': { dx: 12, dy: -2, side: 'r' },
  london: { dx: -12, dy: 14, side: 'l' },
  shenzhen: { dx: -26, dy: -24, side: 'l', leader: true },
  'hong-kong': { dx: -26, dy: 22, side: 'l', leader: true },
}

// ── the sun: declination and the longitude where it is overhead (low precision, plenty for a map) ──
const RAD = Math.PI / 180
function sunNow(date = new Date()) {
  const d = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 864e5
  const g = (357.529 + 0.98560028 * d) * RAD
  const q = 280.459 + 0.98564736 * d
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD
  const e = (23.439 - 3.6e-7 * d) * RAD
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / RAD
  const decl = Math.asin(Math.sin(e) * Math.sin(L))
  let eqt = (q - ra) / 15 // hours
  eqt = ((((eqt + 12) % 24) + 24) % 24) - 12
  const utc = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const lon = -15 * (utc - 12 + eqt) * RAD
  return { sinD: Math.sin(decl), cosD: Math.cos(decl), lon }
}
type Sun = ReturnType<typeof sunNow>
/** sine of the sun's altitude at (lat, lon), radians */
const sunAlt = (sun: Sun, lat: number, lon: number) =>
  Math.sin(lat) * sun.sinD + Math.cos(lat) * sun.cosD * Math.cos(lon - sun.lon)
const SIN_DAY = Math.sin(4 * RAD)
const SIN_NIGHT = Math.sin(-10 * RAD)
const SIN_RISE = Math.sin(-0.833 * RAD)
const dayness = (s: number) => {
  const t = Math.min(1, Math.max(0, (s - SIN_NIGHT) / (SIN_DAY - SIN_NIGHT)))
  return t * t * (3 - 2 * t)
}

// ── Natural Earth forward (same as d3.geoNaturalEarth1), normalized to the map width ──
function project(lonDeg: number, latDeg: number): [number, number] {
  const l = lonDeg * RAD
  const p = latDeg * RAD
  const p2 = p * p
  const p4 = p2 * p2
  const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)))
  const y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)))
  return [0.5 + x / WORLD.proj.W, (-y - WORLD.proj.yTop) / WORLD.proj.W]
}
// great circle between two cities, sampled
function greatCircle(a: City, b: City, n = 72): [number, number][] {
  const v = (c: City) => {
    const la = c.lat * RAD
    const lo = c.lon * RAD
    return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]
  }
  const A = v(a)
  const B = v(b)
  const w = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]))
  const out: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const s1 = Math.sin((1 - t) * w) / Math.sin(w)
    const s2 = Math.sin(t * w) / Math.sin(w)
    const x = s1 * A[0] + s2 * B[0]
    const y = s1 * A[1] + s2 * B[1]
    const z = s1 * A[2] + s2 * B[2]
    out.push(project(Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD))
  }
  return out
}

// ── the dot grid, decoded once per grid ──
type Decoded = { n: number; nx: Float32Array; ny: Float32Array; tone: Uint8Array; lat: Float32Array; lon: Float32Array; jit: Float32Array }
const decoded = new Map<DotGrid, Decoded>()
function decode(g: DotGrid): Decoded {
  const hit = decoded.get(g)
  if (hit) return hit
  const bin = atob(g.data)
  const nx = new Float32Array(g.count)
  const ny = new Float32Array(g.count)
  const tone = new Uint8Array(g.count)
  const lat = new Float32Array(g.count)
  const lon = new Float32Array(g.count)
  const jit = new Float32Array(g.count)
  let n = 0
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const i = r * g.cols + c
      const t = (bin.charCodeAt(i >> 2) >> ((i & 3) * 2)) & 3
      if (!t) continue
      const x = (2 * c + (r % 2) + 0.5) * g.s
      nx[n] = x
      ny[n] = (r + 0.5) * g.s
      tone[n] = t
      lat[n] = g.lat[r] * RAD
      lon[n] = (x - 0.5) / g.k[r]
      // a halftone screen is never perfectly even: +-8%, stable per dot
      const h = Math.sin(i * 12.9898 + 78.233) * 43758.5453
      jit[n] = 0.92 + 0.16 * (h - Math.floor(h))
      n++
    }
  }
  const d = { n, nx, ny, tone, lat, lon, jit }
  decoded.set(g, d)
  return d
}

export function initPlaces(root: HTMLElement): () => void {
  const box = root.querySelector<HTMLElement>('.places__map')
  const canvas = root.querySelector<HTMLCanvasElement>('.places__canvas')
  const ctx = canvas?.getContext('2d')
  if (!box || !canvas || !ctx) return () => {}

  const cities = ORDER.map((id) => WORLD.cities.find((c) => c.id === id)!)
  const idx = (id: string) => ORDER.indexOf(id)
  const pins = cities.map((c) => root.querySelector<HTMLElement>(`[data-pin="${c.id}"]`))
  const buttons = cities.map((c) => root.querySelector<HTMLButtonElement>(`.places__city[data-city="${c.id}"]`))
  const narrowMQ = matchMedia('(max-width: 767px)')
  const base = document.createElement('canvas')
  const bctx = base.getContext('2d')!

  // layout state
  let cw = 0
  let ch = 0
  let dpr = 1
  let scale = 1
  let crop = WORLD.crops.wide
  let geo = GEO_WIDE
  let grid: Decoded | null = null
  let sPx = 0
  let X = new Float32Array(0)
  let Y = new Float32Array(0)
  let R0 = new Float32Array(0) // each dot's resting radius (px)
  let radius = 120 // lit field radius (px)
  const P = cities.map(() => ({ x: 0, y: 0 }))
  let near: { i: Uint32Array; d: Float32Array }[] = []
  let arcs: { pts: Float32Array; a: number; b: number }[] = []
  let sun = sunNow()

  // motion state
  const amp = cities.map(() => 0)
  const t0 = cities.map(() => -1e9)
  let active = -1
  let arcStart = -1
  let visible = false
  let raf = 0
  let last = 0
  let rm = reducedMotion()

  // ── layout ──
  function layout() {
    const narrow = narrowMQ.matches
    crop = narrow ? WORLD.crops.narrow : WORLD.crops.wide
    geo = narrow ? GEO_NARROW : GEO_WIDE
    const cwNow = box!.clientWidth
    if (!cwNow) return false
    const cropW = crop[2] - crop[0]
    const cropH = crop[3] - crop[1]
    cw = cwNow
    scale = cw / cropW
    ch = Math.round(cropH * scale)
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    for (const c of [canvas!, base]) {
      c.width = Math.round(cw * dpr)
      c.height = Math.round(ch * dpr)
    }
    // the fine screen only where its cells stay at least 3.4px apart
    const g = WORLD.fine.s * scale >= 3.4 ? WORLD.fine : WORLD.coarse
    grid = decode(g)
    sPx = g.s * scale
    X = new Float32Array(grid.n)
    Y = new Float32Array(grid.n)
    R0 = new Float32Array(grid.n)
    for (let i = 0; i < grid.n; i++) {
      X[i] = (grid.nx[i] - crop[0]) * scale
      Y[i] = (grid.ny[i] - crop[1]) * scale
    }
    cities.forEach((c, k) => {
      P[k].x = (c.x - crop[0]) * scale
      P[k].y = (c.y - crop[1]) * scale
    })
    radius = Math.max(52, Math.min(136, cw * 0.095))
    near = cities.map((_, k) => {
      const ids: number[] = []
      const ds: number[] = []
      const r2 = (radius * 1.35) ** 2
      for (let i = 0; i < grid!.n; i++) {
        const dx = X[i] - P[k].x
        const dy = Y[i] - P[k].y
        const q = dx * dx + dy * dy
        if (q < r2) {
          ids.push(i)
          ds.push(Math.sqrt(q))
        }
      }
      return { i: Uint32Array.from(ids), d: Float32Array.from(ds) }
    })
    arcs = ARCS.map(([a, b]) => {
      const pts = greatCircle(cities[idx(a)], cities[idx(b)])
      const f = new Float32Array(pts.length * 2)
      pts.forEach(([x, y], j) => {
        f[j * 2] = (x - crop[0]) * scale
        f[j * 2 + 1] = (y - crop[1]) * scale
      })
      return { pts: f, a: idx(a), b: idx(b) }
    })
    placePins()
    paintBase()
    needFull = true
    return true
  }

  function placePins() {
    pins.forEach((pin, k) => {
      if (!pin) return
      const g = geo[cities[k].id]
      pin.style.setProperty('--x', `${(P[k].x + g.dx).toFixed(1)}px`)
      pin.style.setProperty('--y', `${(P[k].y + g.dy).toFixed(1)}px`)
      pin.dataset.side = g.side
    })
  }

  // ── the halftone layer, shaded by day and night ──
  function paintBase() {
    if (!grid) return
    sun = sunNow()
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    bctx.clearRect(0, 0, cw, ch)
    const BUCKETS = 6
    const paths = Array.from({ length: BUCKETS }, () => new Path2D())
    for (let i = 0; i < grid.n; i++) {
      const x = X[i]
      const y = Y[i]
      if (x < -sPx || x > cw + sPx || y < -sPx || y > ch + sPx) continue
      const f = dayness(sunAlt(sun, grid.lat[i], grid.lon[i]))
      const r = sPx * TONE_R[grid.tone[i]] * (0.64 + 0.36 * f) * grid.jit[i]
      R0[i] = r
      const p = paths[Math.round(f * (BUCKETS - 1))]
      p.moveTo(x + r, y)
      p.arc(x, y, r, 0, Math.PI * 2)
    }
    paths.forEach((p, b) => {
      bctx.fillStyle = `rgba(${INK_DOT}, ${(0.13 + (0.31 * b) / (BUCKETS - 1)).toFixed(3)})`
      bctx.fill(p)
    })
  }

  // ── a frame ──
  // A frame redraws only the region that changes (the lit fields, this frame's
  // and the last one's) unless the arcs are still drawing in or the dim state
  // of the whole map just changed.
  let needFull = true
  let prevRect: number[] | null = null
  function fieldRect() {
    let r: number[] | null = null
    const pad = radius * 1.4 + sPx * 2 + 4
    for (let k = 0; k < cities.length; k++) {
      if (amp[k] < 0.004) continue
      const q = [P[k].x - pad, P[k].y - pad, P[k].x + pad, P[k].y + pad]
      r = r ? [Math.min(r[0], q[0]), Math.min(r[1], q[1]), Math.max(r[2], q[2]), Math.max(r[3], q[3])] : q
    }
    return r
  }
  function draw(now: number) {
    if (!grid) return
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    const arcsMoving = arcStart >= 0 && !rm && now - arcStart < ARC_MS + 260 * arcs.length
    const cur = fieldRect()
    let rect: number[] | null = null
    if (!needFull && !arcsMoving) {
      const u = cur && prevRect ? [Math.min(cur[0], prevRect[0]), Math.min(cur[1], prevRect[1]), Math.max(cur[2], prevRect[2]), Math.max(cur[3], prevRect[3])] : cur || prevRect
      if (u) {
        const x0 = Math.max(0, Math.floor(u[0]))
        const y0 = Math.max(0, Math.floor(u[1]))
        const x1 = Math.min(cw, Math.ceil(u[2]))
        const y1 = Math.min(ch, Math.ceil(u[3]))
        rect = [x0, y0, x1 - x0, y1 - y0]
      }
    }
    needFull = false
    prevRect = cur
    ctx!.save()
    if (rect) {
      ctx!.beginPath()
      ctx!.rect(rect[0], rect[1], rect[2], rect[3])
      ctx!.clip()
      ctx!.clearRect(rect[0], rect[1], rect[2], rect[3])
      ctx!.drawImage(base, rect[0] * dpr, rect[1] * dpr, rect[2] * dpr, rect[3] * dpr, rect[0], rect[1], rect[2], rect[3])
    } else {
      ctx!.clearRect(0, 0, cw, ch)
      ctx!.drawImage(base, 0, 0, cw, ch)
    }

    // lit dots around the active city (and any still fading out)
    const LB = 7
    const lit = Array.from({ length: LB }, () => new Path2D())
    let any = false
    for (let k = 0; k < cities.length; k++) {
      if (amp[k] < 0.004) continue
      const tau = rm ? 99 : (now - t0[k]) / 1000
      const front = radius * easeExpoOut(Math.min(1, tau / RIPPLE.front))
      const ringR = radius * 1.25 * easeExpoOut(Math.min(1, tau / RIPPLE.ring))
      const ringA = Math.max(0, 1 - tau / RIPPLE.ring) ** 2
      const ring2R = radius * 1.25 * easeExpoOut(Math.min(1, Math.max(0, tau - 0.28) / RIPPLE.ring))
      const ring2A = 0.6 * Math.max(0, 1 - Math.max(0, tau - 0.28) / RIPPLE.ring) ** 2
      const w = Math.max(10, sPx * 3)
      const { i: ids, d: ds } = near[k]
      for (let j = 0; j < ids.length; j++) {
        const d = ds[j]
        let field = d < front ? Math.max(0, 1 - d / radius) : 0
        field = field * field * (1.4 - 0.4 * field)
        let wave = 0
        if (ringA > 0.002) wave += ringA * Math.exp(-(((d - ringR) / w) ** 2))
        if (ring2A > 0.002) wave += ring2A * Math.exp(-(((d - ring2R) / w) ** 2))
        const I = amp[k] * Math.min(1, field + wave * 0.85)
        if (I < 0.05) continue
        const i = ids[j]
        const r = Math.max(R0[i], sPx * TONE_R[grid.tone[i]] * grid.jit[i]) * (1 + 0.32 * I)
        const p = lit[Math.min(LB - 1, Math.floor(I * LB))]
        p.moveTo(X[i] + r, Y[i])
        p.arc(X[i], Y[i], r, 0, Math.PI * 2)
        any = true
      }
    }
    if (any)
      lit.forEach((p, b) => {
        ctx!.fillStyle = `rgba(${COBALT}, ${(0.28 + (0.72 * (b + 1)) / LB).toFixed(3)})`
        ctx!.fill(p)
      })

    // arcs, drawn in once on enter
    const at = arcStart < 0 ? 0 : rm ? 1e9 : now - arcStart
    ctx!.lineCap = 'round'
    arcs.forEach((arc, n) => {
      const local = Math.min(1, Math.max(0, (at - n * 260) / ARC_MS))
      if (local <= 0) return
      const t = local < 0.5 ? Math.pow(2, 20 * local - 10) / 2 : (2 - Math.pow(2, -20 * local + 10)) / 2 // expo.inOut
      const count = arc.pts.length / 2
      const end = t * (count - 1)
      const hot = active >= 0 && (arc.a === active || arc.b === active || (active === 1 && arc.b === 0))
      ctx!.strokeStyle = `rgba(${COBALT}, ${hot ? 0.9 : active >= 0 ? 0.32 : 0.55})`
      ctx!.lineWidth = hot ? 1.25 : 1
      ctx!.beginPath()
      ctx!.moveTo(arc.pts[0], arc.pts[1])
      const whole = Math.floor(end)
      for (let j = 1; j <= whole; j++) ctx!.lineTo(arc.pts[j * 2], arc.pts[j * 2 + 1])
      let hx = arc.pts[whole * 2]
      let hy = arc.pts[whole * 2 + 1]
      if (whole < count - 1) {
        const f = end - whole
        hx += (arc.pts[(whole + 1) * 2] - hx) * f
        hy += (arc.pts[(whole + 1) * 2 + 1] - hy) * f
        ctx!.lineTo(hx, hy)
      }
      ctx!.stroke()
      if (local < 1) {
        ctx!.fillStyle = `rgb(${COBALT})`
        ctx!.beginPath()
        ctx!.arc(hx, hy, 2, 0, Math.PI * 2)
        ctx!.fill()
      }
    })

    // leader lines for the stacked pair, then the pins
    const narrow = geo === GEO_NARROW
    cities.forEach((c, k) => {
      const g = geo[c.id]
      if (!g.leader) return
      if (narrow && active !== k) return
      const dim = active >= 0 && active !== k
      ctx!.strokeStyle = `rgba(${INK_DOT}, ${dim ? 0.18 : 0.42})`
      ctx!.lineWidth = 1
      ctx!.beginPath()
      const ex = P[k].x + g.dx + (g.side === 'r' ? -6 : 6)
      ctx!.moveTo(P[k].x + Math.sign(g.dx) * 5, P[k].y + Math.sign(g.dy) * 3)
      ctx!.lineTo(ex - Math.sign(g.dx) * 8, P[k].y + g.dy)
      ctx!.lineTo(ex, P[k].y + g.dy)
      ctx!.stroke()
    })
    cities.forEach((_, k) => {
      const dim = active >= 0 && active !== k && !(active <= 1 && k <= 1)
      const { x, y } = P[k]
      // the ping: one ring out from the pin on activation
      const tau = (now - t0[k]) / 1000
      if (!rm && amp[k] > 0.05 && tau < 1.1) {
        const e = easeExpoOut(tau / 1.1)
        ctx!.strokeStyle = `rgba(${COBALT}, ${(0.8 * (1 - e) * amp[k]).toFixed(3)})`
        ctx!.lineWidth = 1
        ctx!.beginPath()
        ctx!.arc(x, y, 5 + 22 * e, 0, Math.PI * 2)
        ctx!.stroke()
      }
      ctx!.fillStyle = `rgba(${PLATE}, 0.9)` // ink plate under the pin
      ctx!.beginPath()
      ctx!.arc(x, y, 6.5, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.strokeStyle = `rgba(${COBALT}, ${dim ? 0.35 : 0.85})`
      ctx!.lineWidth = 1
      ctx!.beginPath()
      ctx!.arc(x, y, 6, 0, Math.PI * 2)
      ctx!.stroke()
      ctx!.fillStyle = `rgba(${COBALT}, ${dim ? 0.45 : 1})`
      ctx!.beginPath()
      ctx!.arc(x, y, 3, 0, Math.PI * 2)
      ctx!.fill()
    })
    ctx!.restore()
  }

  // ── the loop: runs while anything moves, in view only ──
  function settled(now: number) {
    if (arcStart >= 0 && !rm && now - arcStart < ARC_MS + 260 * arcs.length) return false
    for (let k = 0; k < cities.length; k++) {
      const target = k === active ? 1 : 0
      if (Math.abs(amp[k] - target) > 0.003) return false
      if (!rm && target === 1 && (now - t0[k]) / 1000 < RIPPLE.settle) return false
    }
    return true
  }
  function frame(now: number) {
    raf = 0
    const dt = Math.min(0.05, (now - (last || now)) / 1000)
    last = now
    for (let k = 0; k < cities.length; k++) {
      const target = k === active ? 1 : 0
      if (rm) amp[k] = target
      else {
        const tc = target > amp[k] ? 0.14 : 0.09 // exits take less
        amp[k] += (target - amp[k]) * (1 - Math.exp(-dt / tc))
        if (Math.abs(target - amp[k]) < 0.003) amp[k] = target
      }
    }
    draw(now)
    if (visible && !settled(now)) raf = requestAnimationFrame(frame)
  }
  function kick() {
    if (!visible || raf) return
    last = 0
    raf = requestAnimationFrame(frame)
  }

  // ── times, day and night ──
  function renderTimes() {
    const now = new Date()
    cities.forEach((c, k) => {
      // the visible digits are odometers (bindClock); the button's name carries the time
      const t = timeIn(c.tz, now)
      const day = sunAlt(sun, c.lat * RAD, c.lon * RAD) > SIN_RISE
      root.querySelectorAll<HTMLElement>(`[data-state="${c.id}"]`).forEach((el) => (el.textContent = `, ${t}, ${day ? 'day' : 'night'}`))
      pins[k]?.toggleAttribute('data-night', !day)
      buttons[k]?.toggleAttribute('data-night', !day)
    })
  }
  let minuteTimer = 0
  let lastBase = Date.now()
  function tick() {
    if (Date.now() - lastBase > 10 * 60e3) {
      lastBase = Date.now()
      paintBase()
      needFull = true
      kick()
      if (!raf) draw(performance.now())
    }
    sun = sunNow()
    renderTimes()
    minuteTimer = window.setTimeout(tick, 60000 - (Date.now() % 60000) + 30)
  }

  // ── activation ──
  function setActive(k: number) {
    if (k === active) return
    active = k
    needFull = true
    if (k >= 0) t0[k] = performance.now()
    root.toggleAttribute('data-active', k >= 0)
    pins.forEach((p, j) => p?.classList.toggle('is-active', j === k))
    buttons.forEach((b, j) => {
      b?.classList.toggle('is-active', j === k)
      b?.setAttribute('aria-pressed', String(j === k))
    })
    if (rm || !visible) {
      amp.forEach((_, j) => (amp[j] = j === k ? 1 : 0))
      if (visible) draw(performance.now())
      return
    }
    kick()
  }

  // the walk through the four cities, while nobody is interacting
  let cycleTimer = 0
  let idleUntil = 0
  let engaged = false // a pointer on the map or a list button, or focus inside
  function schedule(ms = CYCLE_MS) {
    clearTimeout(cycleTimer)
    if (rm || !visible) return
    cycleTimer = window.setTimeout(() => {
      if (engaged || Date.now() < idleUntil) return schedule(Math.max(400, idleUntil - Date.now()))
      setActive((active + 1) % cities.length)
      schedule()
    }, ms)
  }
  const rest = (ms = IDLE_MS) => {
    idleUntil = Date.now() + ms
    schedule(ms)
  }

  // pointer near a city on the map (fine pointers)
  function pick(e: PointerEvent) {
    const r = box!.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    let best = -1
    let bd = Infinity
    P.forEach((p, k) => {
      const d = Math.hypot(p.x - x, p.y - y)
      if (d < bd) {
        bd = d
        best = k
      }
    })
    if (bd > Math.max(70, radius)) return -1
    // the stacked pair: above the pins is Shenzhen, below is Hong Kong
    if (best <= 1) return y < (P[0].y + P[1].y) / 2 ? idx('shenzhen') : idx('hong-kong')
    return best
  }
  let leaveTimer = 0
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !finePointer()) return
    engaged = true
    clearTimeout(leaveTimer)
    const k = pick(e)
    if (k >= 0) setActive(k)
  }
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    engaged = false
    clearTimeout(leaveTimer)
    rest(2400)
  }
  box.addEventListener('pointermove', onMove)
  box.addEventListener('pointerleave', onLeave)

  const offs: (() => void)[] = []
  buttons.forEach((b, k) => {
    if (!b) return
    const enter = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      engaged = true
      setActive(k)
    }
    const leave = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      engaged = false
      rest(2400)
    }
    const focus = () => {
      engaged = true
      setActive(k)
    }
    const blur = () => {
      engaged = false
      rest()
    }
    const click = () => {
      setActive(k)
      rest(IDLE_MS + 3000)
    }
    b.addEventListener('pointerenter', enter)
    b.addEventListener('pointerleave', leave)
    b.addEventListener('focus', focus)
    b.addEventListener('blur', blur)
    b.addEventListener('click', click)
    offs.push(() => {
      b.removeEventListener('pointerenter', enter)
      b.removeEventListener('pointerleave', leave)
      b.removeEventListener('focus', focus)
      b.removeEventListener('blur', blur)
      b.removeEventListener('click', click)
    })
  })

  // ── lifecycle ──
  let ready = false
  readColors(root)
  const onTheme = () => {
    readColors(root)
    if (!ready) return
    paintBase()
    needFull = true
    draw(performance.now())
  }
  window.addEventListener(THEME_EVENT, onTheme)
  const ensure = () => {
    if (!ready) ready = layout()
    return ready
  }
  const ro = new ResizeObserver(() => {
    if (!visible && !ready) return
    const w = box.clientWidth
    if (ready && Math.abs(w - cw) < 1 && (narrowMQ.matches ? WORLD.crops.narrow : WORLD.crops.wide) === crop) return
    ready = layout()
    if (ready) draw(performance.now())
  })
  ro.observe(box)

  const stopVis = whileVisible(box, (on) => {
    visible = on
    if (on) {
      if (!ensure()) return
      rm = reducedMotion()
      if (arcStart < 0) arcStart = performance.now()
      clearTimeout(minuteTimer)
      tick()
      draw(performance.now())
      kick()
      if (!rm) {
        // first city lights as the arcs land
        if (active < 0) schedule(ARC_MS * 0.8)
        else schedule()
      }
    } else {
      cancelAnimationFrame(raf)
      raf = 0
      clearTimeout(cycleTimer)
      clearTimeout(minuteTimer)
    }
  })

  // live times: shared clocks (lib/clocks), one minute timer for the whole page
  cities.forEach((c) =>
    root.querySelectorAll<HTMLElement>(`[data-time="${c.id}"]`).forEach((el) => {
      el.setAttribute('aria-hidden', 'true')
      offs.push(bindClock(el, c.tz))
    }),
  )
  renderTimes()

  return () => {
    stopVis()
    ro.disconnect()
    cancelAnimationFrame(raf)
    clearTimeout(cycleTimer)
    clearTimeout(minuteTimer)
    clearTimeout(leaveTimer)
    box.removeEventListener('pointermove', onMove)
    box.removeEventListener('pointerleave', onLeave)
    window.removeEventListener(THEME_EVENT, onTheme)
    offs.forEach((f) => f())
  }
}

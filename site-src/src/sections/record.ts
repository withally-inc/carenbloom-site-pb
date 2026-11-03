import './record.css'
import { pulse, whileVisible } from '../lib/live'
import { easeExpoOut, reducedMotion } from '../lib/motion'
import { THEME_EVENT } from '../lib/theme'

// Record. The label, headline and the 1,000,000+ odometer ride the reveal
// runner (lib/reveal.ts). This file plays the three visuals:
//   months   36 cells tick in turn when the strip enters (CSS, 34ms apart),
//            then the sun draws under "profitably"
//   dots     1,000 dots on a 45 degree screen fill on canvas as a diagonal
//            front (a halftone ramp passing through), then the last dot, the
//            live one, pops cobalt and rings every 23 s while on screen
//            (monotonic: once in, they stay)
// Reduced motion, or a runner that never starts: everything in its final state.

const TICK_MS = 23000
const SWEEP = 1.15 // s, the front crossing the field
const GROW = 0.55 // s, one dot from nothing to full
const JITTER = 0.09 // s, so the front reads as a screen, not a ruler

export function init(root: HTMLElement): () => void {
  const html = document.documentElement
  const rm = reducedMotion()
  const offs: (() => void)[] = []

  const months = root.querySelector<HTMLElement>('.record__months')!
  // SplitText may rebuild the headline: look the sun up when it is needed
  const sun = () => root.querySelector<HTMLElement>('.record__sun')
  const field = root.querySelector<HTMLElement>('.record__field')!
  const canvas = root.querySelector<HTMLCanvasElement>('.record__dots')!
  const live = root.querySelector<HTMLElement>('.record__live')!
  const livePos = root.querySelector<HTMLElement>('.record__livepos')!

  // ───────── dots ─────────
  const ctx = canvas.getContext('2d')
  let dots: { x: number; y: number; t: number }[] = []
  let r = 0
  let lo = 0 // dots before lo are full and already painted (the fill's step())
  let t0 = -1 // fill start (ms), -1 = not started
  let raf = 0
  let filled = rm

  const layout = () => {
    const cs = getComputedStyle(field)
    const cols = Number(cs.getPropertyValue('--cols')) || 50
    const rows = Number(cs.getPropertyValue('--rows')) || 20
    const w = field.clientWidth
    const h = field.clientHeight
    if (!w || !h || !ctx) return false
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const p = w / (cols + 0.5)
    r = p * 0.17
    dots = []
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let row = 0; row < rows; row++) {
      for (let c = 0; c < cols; c++) {
        const x = p / 2 + c * p + (row % 2 ? p / 2 : 0)
        const y = p / 2 + row * (p / 2)
        // the front runs at 45 degrees, top left to bottom right
        const k = (x + y) / (w + h)
        dots.push({ x, y, t: Math.max(0.02, k * SWEEP + (rand() - 0.5) * JITTER) })
      }
    }
    // the last dot is the live one: the DOM dot sits exactly on it
    const last = dots.pop()!
    last.t = SWEEP
    livePos.style.setProperty('--lx', `${last.x}px`)
    livePos.style.setProperty('--ly', `${last.y}px`)
    live.style.setProperty('--ld', `${(r * 2).toFixed(2)}px`)
    // in the order they arrive, so a frame of the fill only touches the dots in flight
    dots.sort((a, b) => a.t - b.t)
    lo = 0
    return true
  }

  // colours are tokens: read at draw time, redrawn on a theme change
  let ink = ''
  const readInk = () => (ink = getComputedStyle(root).getPropertyValue('--ink').trim() || 'currentColor')
  readInk()
  const onTheme = () => {
    readInk()
    if (!raf) draw(filled ? 99 : 0)
  }
  window.addEventListener(THEME_EVENT, onTheme)
  offs.push(() => window.removeEventListener(THEME_EVENT, onTheme))

  const draw = (elapsed: number) => {
    if (!ctx) return true
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = ink
    ctx.beginPath()
    let settled = true
    for (const d of dots) {
      const u = filled ? 1 : (elapsed - d.t) / GROW
      if (u <= 0) {
        settled = false
        continue
      }
      const rr = u >= 1 ? r : r * easeExpoOut(u)
      if (u < 1) settled = false
      ctx.moveTo(d.x + rr, d.y)
      ctx.arc(d.x, d.y, rr, 0, Math.PI * 2)
    }
    ctx.fill()
    return settled
  }

  // One frame of the fill. The dots only grow, so nothing is cleared: the dots in flight
  // are drawn over themselves at their new size, and the ones already full (before lo)
  // are left alone. A full redraw of 1,000 arcs per frame cost 25 to 40ms at 6x CPU.
  const step = (elapsed: number) => {
    if (!ctx) return true
    ctx.fillStyle = ink
    ctx.beginPath()
    for (let i = lo; i < dots.length; i++) {
      const d = dots[i]
      const u = (elapsed - d.t) / GROW
      if (u <= 0) break
      const rr = u >= 1 ? r : r * easeExpoOut(u)
      ctx.moveTo(d.x + rr, d.y)
      ctx.arc(d.x, d.y, rr, 0, Math.PI * 2)
    }
    ctx.fill()
    while (lo < dots.length && (elapsed - dots[lo].t) / GROW >= 1) lo++
    if (lo < dots.length) return false
    draw(99) // one clean pass at full size: no edge built up by the overdraw
    return true
  }

  const frame = (now: number) => {
    if (t0 < 0) {
      t0 = now
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    const done = step((now - t0) / 1000)
    if (done) {
      raf = 0
      filled = true
      field.classList.add('is-done')
      window.setTimeout(() => pulse(live), 260)
      armTicker()
      return
    }
    raf = requestAnimationFrame(frame)
  }

  const startDots = () => {
    if (t0 >= 0 || filled) return
    raf = requestAnimationFrame(frame)
  }

  if (layout()) draw(filled ? 99 : 0)
  if (filled) field.classList.add('is-done')
  const ro = new ResizeObserver(() => {
    if (!layout()) return
    if (!raf) draw(filled ? 99 : 0)
  })
  ro.observe(field)
  offs.push(() => ro.disconnect(), () => cancelAnimationFrame(raf))

  // ───────── the live tip on the last dot (lib/livetip.ts, loaded only if present) ─────────
  type Tip = { tick: () => void; destroy: () => void }
  let tip: Tip | null = null
  let dead = false
  const tipMod = import.meta.glob<{ bindLiveTip: (dot: HTMLElement, o?: { selfTick?: boolean }) => Tip }>('../lib/livetip.ts')[
    '../lib/livetip.ts'
  ]
  if (tipMod) {
    void tipMod().then((m) => {
      if (dead) return
      tip = m.bindLiveTip(live, { selfTick: false })
      livePos.removeAttribute('aria-hidden')
    })
  }
  offs.push(() => {
    dead = true
    tip?.destroy()
  })

  // ───────── the live rhythm: the last dot rings every 23 s while on screen ─────────
  let visible = false
  let armed = false
  let timer = 0
  let nextAt = 0
  const tick = () => {
    pulse(live)
    tip?.tick()
    nextAt = performance.now() + TICK_MS
    timer = window.setTimeout(tick, TICK_MS)
  }
  const resume = () => {
    clearTimeout(timer)
    if (!armed || !visible) return
    const now = performance.now()
    let rem = nextAt - now
    if (rem <= 0) rem = TICK_MS - ((now - nextAt) % TICK_MS)
    timer = window.setTimeout(tick, Math.max(rem, 1200))
  }
  function armTicker() {
    if (armed) return
    armed = true
    nextAt = performance.now() + TICK_MS
    resume()
  }
  offs.push(
    whileVisible(field, (v) => {
      visible = v
      if (v) resume()
      else clearTimeout(timer)
    }),
    () => clearTimeout(timer),
  )

  // ───────── months → sun ─────────
  const playMonths = () => {
    if (months.classList.contains('is-in')) return
    months.classList.add('is-in')
    // 36th cell starts at 35 x 34ms and lands ~0.4s later: the sun takes over
    window.setTimeout(() => sun()?.classList.add('is-in'), 35 * 34 + 420)
  }

  const finalState = () => {
    months.classList.add('is-in')
    sun()?.classList.add('is-in')
  }

  if (rm) {
    finalState()
    armed = true
    return () => offs.forEach((f) => f())
  }

  // everything waits for the intro to land, like the reveal runner
  const whenReady = (fn: () => void) => {
    if (html.classList.contains('ready')) return fn()
    const mo = new MutationObserver(() => {
      if (!html.classList.contains('ready')) return
      mo.disconnect()
      fn()
    })
    mo.observe(html, { attributes: true, attributeFilter: ['class'] })
    offs.push(() => mo.disconnect())
  }

  whenReady(() => {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue
          io.unobserve(e.target)
          if (e.target === months) window.setTimeout(playMonths, 260)
          if (e.target === field) startDots()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(months)
    io.observe(field)
    offs.push(() => io.disconnect())
    // a restored scroll, or a jump past the section: show what is above the fold at once
    const r0 = root.getBoundingClientRect()
    if (r0.bottom < 0) {
      finalState()
      filled = true
      draw(99)
      field.classList.add('is-done')
      armTicker()
    }
  })

  // failsafe: if the runner never starts, nothing stays empty
  const failsafe = window.setTimeout(() => {
    if (html.classList.contains('ready')) return
    finalState()
    filled = true
    draw(99)
    field.classList.add('is-done')
  }, 6000)
  offs.push(() => clearTimeout(failsafe))

  return () => offs.forEach((f) => f())
}

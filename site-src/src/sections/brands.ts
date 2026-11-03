import './brands.css'
import { bySlug, resolveCompanion, resolveMoment, type BrandEntry, type CompanionSpec, type Moment } from '../data/brands'
import { motifMask } from '../data/motifs'
import { Spring, clamp, loop } from '../lib/spring'
import { INTENT as INTENTS, SPRING, finePointer, reducedMotion } from '../lib/motion'
import { playEgg } from '../lib/eggs'
import { ICON_PATH, budPetals, buildPetals } from '../lib/bloom'
import { createCompanion, type Companion, type Rect } from '../lib/companion'

// Brand cards (docs/MOTION-CHALLENGE.md 1.16 and section 4). The markup is static HTML
// rendered from src/data/brands.ts at build time (see the header there); this module
// only enhances it: gallery cycle and progress, pause control, cursor media shift and
// each brand's moment, all read from the registry by the card's data-brand.
//
// Pause reasons (the gallery runs only when there are none): wait (until 1.6s after
// the image wipe), offscreen (under 50% in view), hidden (tab), hover, focus, user.

const INTERVAL = 6 // s per image, the CSS --interval matches
const START_AFTER = 1200 + 1600 // ms after the card comes into view: the wipe, then 1.6s
const INTENT = INTENTS.cardMoment // 150ms of hover before a moment plays (section 0.4)
const SHIFT = 8 // px, cursor media shift
const STILL = 3000 // ms of stillness before the Biird birds perch (E4)
const [TOUCH_K, TOUCH_C] = SPRING.touch
const [FOLLOW_K, FOLLOW_C] = SPRING.follow

type Mode = 'fade' | 'wipe' | 'cut'

interface CardCtx {
  el: HTMLElement
  /** the card's cursor companion, if it has one (it steps aside while a moment leads) */
  companion: Companion | null
  entry: BrandEntry | undefined
  stage: HTMLElement
  visual: HTMLElement
  slides: HTMLElement[]
  readonly cur: number
  go(n: number, mode: Mode): void
}

interface MomentCtl {
  enter(by: 'pointer' | 'focus'): void
  leave(): void
  move?(e: PointerEvent): void
  destroy(): void
}

export function init(root: HTMLElement): () => void {
  const cards = [...root.querySelectorAll<HTMLElement>('.bcard--live')]
  const offs = cards.map((el) => createCard(el))
  root.querySelectorAll<SVGSVGElement>('.bcard__bud').forEach(drawBud)
  if (import.meta.env.DEV) void devCheck()
  return () => offs.forEach((off) => off())
}

// coming soon: the mark as a still bud, each petal at .42 about the centre
function drawBud(svg: SVGSVGElement) {
  budPetals(buildPetals(svg), 0.42, { instant: true })
}

function createCard(el: HTMLElement): () => void {
  const entry = bySlug(el.dataset.brand)
  if (import.meta.env.DEV && !entry) console.warn(`[brands] card "${el.dataset.brand}" has no registry entry`)
  const stage = el.querySelector<HTMLElement>('.bcard__stage')!
  const visual = el.querySelector<HTMLElement>('.bcard__visual')!
  const slides = [...el.querySelectorAll<HTMLElement>('.bcard__slide')]
  const segs = [...el.querySelectorAll<HTMLElement>('.bcard__seg')]
  const pauseBtn = el.querySelector<HTMLButtonElement>('.bcard__pause')
  const link = el.querySelector<HTMLAnchorElement>('.bcard__link')
  const fine = finePointer()
  const reduce = reducedMotion()
  const phase = Number(el.dataset.phase) || 0
  const multi = slides.length > 1
  const cleanups: (() => void)[] = []
  type Ev = HTMLElementEventMap & DocumentEventMap
  const on = <K extends keyof Ev>(t: EventTarget, type: K, fn: (e: Ev[K]) => void, opts?: AddEventListenerOptions) => {
    t.addEventListener(type, fn as EventListener, opts)
    cleanups.push(() => t.removeEventListener(type, fn as EventListener, opts))
  }

  // ───────── gallery ─────────
  let cur = 0
  let prevTimer = 0
  const reasons = new Set<string>(['wait', 'offscreen'])
  if (reduce) reasons.add('user') // no autoplay; the play button still works
  const sync = () => {
    const paused = reasons.size > 0
    el.toggleAttribute('data-paused', paused)
    if (pauseBtn) {
      const user = reasons.has('user')
      pauseBtn.toggleAttribute('data-play', user)
      pauseBtn.setAttribute('aria-label', user ? 'Play gallery' : 'Pause gallery')
    }
  }
  const pause = (r: string) => (reasons.add(r), sync())
  const resume = (r: string) => (reasons.delete(r), sync())

  const restartBar = () => {
    segs.forEach((s, i) => {
      s.classList.toggle('is-done', i < cur)
      s.classList.remove('is-active')
    })
    const s = segs[cur]
    if (!s) return
    void s.offsetWidth // restart the fill animation from 0
    s.classList.add('is-active')
  }

  function go(n: number, mode: Mode) {
    n = (n + slides.length) % slides.length
    if (n === cur || !multi) return
    const prev = slides[cur]
    const inc = slides[n]
    slides.forEach((s) => s.classList.remove('is-prev', 'is-entering', 'is-wipe', 'is-cut'))
    prev.classList.remove('is-active')
    prev.classList.add('is-prev')
    inc.classList.add('is-active', mode === 'wipe' ? 'is-wipe' : mode === 'cut' ? 'is-cut' : 'is-entering')
    slides.forEach((s, i) => (i === n ? s.removeAttribute('aria-hidden') : s.setAttribute('aria-hidden', 'true')))
    clearTimeout(prevTimer)
    prevTimer = window.setTimeout(() => prev.classList.remove('is-prev'), mode === 'cut' ? 0 : 950)
    cur = n
    restartBar()
  }

  if (multi) {
    if (!reduce) {
      // the bar's CSS fill animation is the clock: when it ends, the next image comes
      on(el, 'animationend', (e) => {
        if ((e as AnimationEvent).animationName === 'bcard-fill' && reasons.size === 0) go(cur + 1, 'fade')
      })
    } else {
      // reduced motion collapses CSS animations (base.css), so a plain clock times the
      // gallery once the visitor presses play; the bar shows segments, no fill
      let elapsed = 0
      let last = cur
      const clock = window.setInterval(() => {
        if (last !== cur) ((elapsed = 0), (last = cur))
        if (reasons.size) return
        elapsed += 0.25
        if (elapsed >= INTERVAL) go(cur + 1, 'fade')
      }, 250)
      cleanups.push(() => clearInterval(clock))
    }
    // cycle only while at least half the card is in view; start after the wipe
    let started = false
    let startTimer = 0
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          resume('offscreen')
          if (!started) {
            started = true
            startTimer = window.setTimeout(() => resume('wait'), START_AFTER + phase * INTERVAL * 1000)
          }
        } else pause('offscreen')
      },
      { threshold: 0.5 },
    )
    io.observe(visual)
    cleanups.push(() => (io.disconnect(), clearTimeout(startTimer)))
    const onVis = () => (document.hidden ? pause('hidden') : resume('hidden'))
    on(document, 'visibilitychange', onVis)
    onVis()
    if (pauseBtn) on(pauseBtn, 'click', () => (reasons.has('user') ? resume('user') : pause('user')))
  }
  sync()

  // hover and focus hold the timer (and the bar)
  on(el, 'pointerenter', (e) => e.pointerType === 'mouse' && pause('hover'))
  on(el, 'pointerleave', () => resume('hover'))
  // (focus on the pause control itself does not count: pressing Play must play)
  on(el, 'focusin', (e) => (e.target === pauseBtn ? resume('focus') : pause('focus')))
  on(el, 'focusout', (e) => {
    const to = e.relatedTarget as Node | null
    if (!el.contains(to) || to === pauseBtn) resume('focus')
  })

  const companion = entry ? cardCompanion(el, visual, entry, slides) : null
  // review aid: /?companion-zones outlines the zones and lets a test show any image
  if (companion && DEBUG_ZONES) on(el, 'bcard:go' as keyof Ev, (e) => go((e as unknown as CustomEvent<number>).detail, 'cut'))
  if (companion) cleanups.push(() => companion.destroy())

  const ctx: CardCtx = {
    el,
    companion,
    entry,
    stage,
    visual,
    slides,
    get cur() {
      return cur
    },
    go,
  }

  // ───────── cursor media shift: toward the pointer, max 8px, SPRING.follow ─────────
  if (fine && !reduce) {
    el.classList.add('has-shift')
    const sx = new Spring(0, FOLLOW_K, FOLLOW_C)
    const sy = new Spring(0, FOLLOW_K, FOLLOW_C)
    let stop: (() => void) | null = null
    const kick = () => {
      if (stop) return
      stop = loop((dt) => {
        sx.step(dt)
        sy.step(dt)
        stage.style.transform = `translate3d(${sx.value.toFixed(2)}px, ${sy.value.toFixed(2)}px, 0) scale(1.025)`
        if (sx.settled && sy.settled) {
          stop = null
          return false
        }
      })
    }
    on(el, 'pointermove', (e) => {
      if (e.pointerType !== 'mouse') return
      const r = visual.getBoundingClientRect()
      sx.target = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1) * SHIFT
      sy.target = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1) * SHIFT
      kick()
    })
    on(el, 'pointerleave', () => {
      sx.target = 0
      sy.target = 0
      kick()
    })
    cleanups.push(() => stop?.())
  }

  // ───────── the brand moment: hover after 150ms, keyboard focus on the link ─────────
  const moment: Moment = entry ? resolveMoment(entry) : ((el.dataset.moment as Moment) ?? 'none')
  const ctl = reduce ? null : createMoment(moment, ctx)
  if (ctl) {
    let intent = 0
    let active = false
    const enter = (by: 'pointer' | 'focus') => {
      if (active) return
      active = true
      ctl.enter(by)
    }
    const leave = () => {
      clearTimeout(intent)
      if (!active) return
      active = false
      ctl.leave()
    }
    if (fine) {
      on(el, 'pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return
        clearTimeout(intent)
        // the moment leads: the companion waits until the moment has had its say
        companion?.hold(true)
        intent = window.setTimeout(() => enter('pointer'), INTENT)
      })
      on(el, 'pointerleave', () => {
        leave()
        companion?.hold(false)
      })
      if (ctl.move) on(el, 'pointermove', (e) => e.pointerType === 'mouse' && ctl.move!(e))
    }
    if (link) {
      on(link, 'focus', () => link.matches(':focus-visible') && enter('focus'))
      on(link, 'blur', leave)
    }
    cleanups.push(() => (clearTimeout(intent), ctl.destroy()))
  }

  return () => {
    clearTimeout(prevTimer)
    cleanups.forEach((f) => f())
  }
}

// ───────── the card's cursor companion (src/lib/companion.ts) ─────────
// Inside its own card only. It waits while the card's moment leads (hold), then follows:
// Hello Nancy's raspberry rolls after the pointer once the fruit window has opened onto
// the next photo; Biird's sparrow hops after it once the tittles have hopped, and perches
// on the card's top edge when the pointer rests, where E4's tittles come to join it.
// At rest the fruit waits on the photo's upper right, under the progress bar; the sparrow
// on the top edge. Over the name and the text under the photo they step back to 40%.
const READING = '.bcard__name, .bcard__body'
const DEBUG_ZONES = typeof location !== 'undefined' && /[?&]companion-zones\b/.test(location.search)

/**
 * The registry's exclusion zones (BrandImage.avoid: product and hand) for the images on
 * screen (the active one, and the outgoing one while it fades), in card px. The photo is
 * object-fit: cover in the media box and the stage sits at scale(1.025) about its centre.
 */
function zonesFor(entry: BrandEntry, slides: HTMLElement[], visual: HTMLElement) {
  const media = visual.querySelector<HTMLElement>('.bcard__media')
  let key = ''
  let rects: Rect[] = []
  let W = 0
  let H = 0
  const ro = new ResizeObserver(() => ((W = media?.offsetWidth ?? 0), (H = media?.offsetHeight ?? 0), (key = '')))
  if (media) ro.observe(media)
  let overlay: HTMLElement | null = null
  if (DEBUG_ZONES && media) {
    overlay = document.createElement('div')
    overlay.className = 'bcard__zones'
    overlay.setAttribute('aria-hidden', 'true')
    Object.assign(overlay.style, { position: 'absolute', inset: '0', zIndex: '6', pointerEvents: 'none' })
    media.append(overlay)
  }
  const get = (): Rect[] => {
    const shown = slides.map((sl, i) => (sl.classList.contains('is-active') || sl.classList.contains('is-prev') ? i : -1)).filter((i) => i >= 0)
    const k = `${shown.join(',')}|${W}x${H}`
    if (k === key) return rects
    key = k
    rects = []
    for (const i of shown) {
      const img = slides[i].querySelector('img')
      const iw = Number(img?.getAttribute('width')) || 1
      const ih = Number(img?.getAttribute('height')) || 1
      const sc = Math.max(W / iw, H / ih) * 1.025
      const dx = (W - iw * sc) / 2
      const dy = (H - ih * sc) / 2
      for (const [x0, y0, x1, y1] of entry.gallery[i]?.avoid ?? []) {
        rects.push({ x0: dx + x0 * iw * sc, y0: dy + y0 * ih * sc, x1: dx + x1 * iw * sc, y1: dy + y1 * ih * sc })
      }
    }
    if (overlay) {
      overlay.innerHTML = rects
        .map(
          (r) =>
            `<i style="position:absolute;left:${r.x0}px;top:${r.y0}px;width:${r.x1 - r.x0}px;height:${r.y1 - r.y0}px;outline:2px dashed var(--sun);background:rgba(var(--ink-rgb),.28)"></i>`,
        )
        .join('')
    }
    return rects
  }
  return { get, destroy: () => (ro.disconnect(), overlay?.remove()) }
}

/** the group's petal (one quarter of the mark), for brands that name no companion */
function petalSVG(): string {
  const id = `cpp${Math.random().toString(36).slice(2, 8)}`
  return `<svg viewBox="10 -1 22 22" width="100%" height="100%" style="color: var(--fixed-ink, currentColor)" focusable="false"><clipPath id="${id}"><polygon points="21,21 -30,-30 72,-30"/></clipPath><path clip-path="url(#${id})" fill="currentColor" d="${ICON_PATH}"/></svg>`
}

function cardCompanion(el: HTMLElement, visual: HTMLElement, entry: BrandEntry, slides: HTMLElement[]): Companion | null {
  const spec: CompanionSpec | null = resolveCompanion(entry)
  if (!spec) return null
  const zones = zonesFor(entry, slides, visual)
  const avoid = () => zones.get()
  // violet mode: the paper print over the photo, the violet print once off it (top edge, text)
  const onGround = (_x: number, y: number, s: number) => y + s * 0.5 < 0 || y + s * 0.5 > mediaH()
  const withZones = (c: Companion): Companion => {
    const destroy = c.destroy
    c.destroy = () => (destroy(), zones.destroy())
    return c
  }
  const size = (w: number) => Math.min(spec.size, w * 0.26)
  const media = visual.querySelector<HTMLElement>('.bcard__media')
  const mediaH = () => media?.offsetHeight ?? visual.offsetHeight
  const feet = spec.feet ?? 0.8
  if (spec.flavour === 'hop') {
    return withZones(createCompanion(el, {
      sprite: spec.sprite ?? '',
      frames: spec.frames,
      frameSize: spec.frameSize,
      size,
      flavour: 'hop',
      feet,
      reading: READING,
      className: 'bcard__companion',
      // on the top edge, three quarters across (the wire)
      rest: (z, s) => ({ x: z.width * 0.74 - s / 2, y: -s * feet }),
      // a resting pointer: the stretch of top edge above it
      perch: (z, s, p) => ({ x: clamp(p.x - s / 2, 8, z.width - s - 8), y: -s * feet }),
      avoid,
      onGround,
      body: [0.06, 0.2, 0.8, 0.84], // the sparrow, wings included, facing right
    }))
  }
  return withZones(createCompanion(el, {
    sprite: spec.sprite ?? '',
    svg: spec.sprite ? undefined : petalSVG(),
    frames: spec.frames,
    frameSize: spec.frameSize,
    size,
    flavour: spec.flavour,
    reading: READING,
    className: 'bcard__companion',
    // on the photo's upper right, under the progress bar: clear of the name at every width
    rest: (z, s) => ({ x: z.width - s - 14, y: Math.min(30, mediaH() - s) }),
    avoid,
    onGround,
  }))
}

function createMoment(m: Moment, ctx: CardCtx): MomentCtl | null {
  if (m === 'roll') return roll(ctx)
  if (m === 'hop') return hop(ctx)
  if (m === 'advance') return advance(ctx)
  return null
}

// ───────── advance: one hover shows the next image with the house wipe ─────────
function advance(ctx: CardCtx): MomentCtl {
  let used = false
  let timer = 0
  return {
    enter() {
      if (used) return
      used = true
      ctx.go(ctx.cur + 1, 'wipe')
      timer = window.setTimeout(() => ctx.companion?.hold(false), 700)
    },
    leave() {
      used = false
      clearTimeout(timer)
    },
    destroy() {
      clearTimeout(timer)
    },
  }
}

// ───────── roll (Hello Nancy): docs/motion-sketches/nancy-roll.html ─────────
// The next image arrives in its fruit-shaped window that rolls in from the right and
// rests at 62% across, 70% down. The photo inside counter-transforms, so the window is
// a hole onto the next image, registered to the card. Stay 1.2s and it grows to fill
// the card and the gallery advances under it; leave earlier and it rolls back out.
// The window lives inside the stage, so it rides the cursor shift with the photos.
function roll(ctx: CardCtx): MomentCtl | null {
  const motifs = ctx.entry?.gallery.map((g) => g.motif)
  if (!motifs || motifs.some((m) => !m)) return advance(ctx)
  const fruit = document.createElement('div')
  fruit.className = 'bcard__fruit'
  fruit.setAttribute('aria-hidden', 'true')
  const peek = document.createElement('img')
  peek.alt = ''
  peek.decoding = 'async'
  fruit.append(peek)
  ctx.stage.append(fruit)

  const X = new Spring(0, TOUCH_K, TOUCH_C)
  const S = new Spring(1, TOUCH_K, TOUCH_C)
  let mode: 'idle' | 'in' | 'out' | 'grow' = 'idle'
  let W = 0
  let H = 0
  let w = 0
  let rest = 0
  let start = 0
  let y = 0
  let dwell = 0
  let rockTimer = 0
  let outTimer = 0
  let stop: (() => void) | null = null

  const measure = () => {
    W = ctx.stage.offsetWidth
    H = ctx.stage.offsetHeight
    w = fruit.offsetWidth
    rest = W * 0.62 - w / 2
    start = W + w * 0.1
    y = H * 0.7 - w / 2
    ctx.el.style.setProperty('--cw', `${W}px`)
    ctx.el.style.setProperty('--ch', `${H}px`)
    ctx.el.style.setProperty('--fo', `${w / 2}px`)
  }
  const render = () => {
    const x = X.value
    const s = S.value
    const theta = -(x - rest) / (w / 2) // radians: it rolls, it never slides
    fruit.style.transform = `translate(${x}px, ${y}px) rotate(${theta}rad) scale(${s})`
    peek.style.transform = `scale(${1 / s}) rotate(${-theta}rad) translate(${-x}px, ${-y}px)`
  }
  const hide = () => {
    fruit.style.visibility = 'hidden'
    mode = 'idle'
  }
  const kick = () => {
    if (stop) return
    stop = loop((dt) => {
      X.step(dt)
      S.step(dt)
      render()
      if (mode === 'out' && X.settled) hide()
      if (mode === 'grow' && S.value > S.target * 0.92) {
        ctx.go(ctx.cur + 1, 'cut')
        hide()
        // the window has become the next photo: now the raspberry may roll after the pointer
        ctx.companion?.hold(false)
        S.damping = TOUCH_C
        S.set(1)
      }
      if (mode === 'idle' || (mode === 'in' && X.settled && S.settled)) {
        stop = null
        return false
      }
    })
  }
  const enterFruit = (dwellMs: number | null) => {
    measure()
    const n = (ctx.cur + 1) % ctx.slides.length
    fruit.style.setProperty('--shape', motifMask(motifs[n]!))
    const img = ctx.slides[n].querySelector('img')
    peek.src = img?.currentSrc || img?.src || ''
    if (mode === 'idle') {
      X.set(start)
      S.set(1)
    }
    fruit.style.visibility = 'visible'
    X.target = rest
    mode = 'in'
    kick()
    clearTimeout(dwell)
    if (dwellMs !== null) dwell = window.setTimeout(grow, dwellMs)
  }
  const grow = () => {
    if (mode !== 'in') return
    S.damping = 30 // no overshoot on the cover
    S.target = (2.6 * Math.hypot(W, H)) / w
    mode = 'grow'
    kick()
  }
  const out = () => {
    clearTimeout(dwell)
    if (mode === 'in') {
      X.target = start
      mode = 'out'
      kick()
    }
  }

  // E5: wave at the card (three horizontal reversals of 24px+ within 900ms) and the
  // fruit rolls in and rocks once while the card answers "Hello yourself." (COPY-DECISIONS 6)
  let lastX = 0
  let dir = 0
  let travel = 0
  let flips: number[] = []
  const wave = () => {
    if (mode === 'grow') return
    void playEgg('wave', () => {
      waveBack()
      return sayHello(ctx)
    })
  }
  const waveBack = () => {
    // the fruit window answers the wave; the raspberry steps aside until it has rolled out
    ctx.companion?.hold(true)
    window.setTimeout(() => ctx.companion?.hold(false), 2400 + 700)
    clearTimeout(dwell)
    clearTimeout(rockTimer)
    clearTimeout(outTimer)
    const resting = mode === 'in' && X.settled
    if (mode !== 'in') enterFruit(null)
    rockTimer = window.setTimeout(
      () => {
        X.velocity -= w * 5.5 // rolls back a little and settles: one rock
        kick()
      },
      resting ? 0 : 520,
    )
    outTimer = window.setTimeout(out, 2400)
  }

  return {
    enter: () => enterFruit(1200),
    leave() {
      clearTimeout(rockTimer)
      clearTimeout(outTimer)
      out()
      flips = []
    },
    move(e) {
      if (ctx.entry?.egg !== 'wave') return
      const dx = e.clientX - lastX
      lastX = e.clientX
      if (!dx) return
      const d = Math.sign(dx)
      if (d === dir) travel += Math.abs(dx)
      else {
        if (dir !== 0 && travel >= 24) {
          const now = performance.now()
          flips = [...flips.filter((t) => now - t < 900), now]
          if (flips.length >= 3) {
            flips = []
            wave()
          }
        }
        dir = d
        travel = Math.abs(dx)
      }
    },
    destroy() {
      stop?.()
      clearTimeout(dwell)
      clearTimeout(rockTimer)
      clearTimeout(outTimer)
      fruit.remove()
      ctx.el.querySelector('.bcard__reply')?.remove()
    },
  }
}

// E5 reply (MOTION-CHALLENGE E5): "Hello yourself." rises from its own mask beside the
// name, Newsreader italic 400 sized to the name's x-height, paper with the name's text
// shadow: rise 1.1s house, hold 1.6s, fade 300ms. Beside the last line of the name on
// its baseline when it fits the card, else just above the name. Decorative (aria-hidden):
// the heading keeps its own name. Returns its length in ms for playEgg.
const HOUSE = 'cubic-bezier(0.16, 1, 0.3, 1)'
function sayHello(ctx: CardCtx): number {
  const name = ctx.el.querySelector<HTMLElement>('.bcard__name')
  if (!name) return 2400
  let reply = ctx.visual.querySelector<HTMLElement>('.bcard__reply')
  if (!reply) {
    reply = document.createElement('span')
    reply.className = 'bcard__reply'
    reply.setAttribute('aria-hidden', 'true')
    reply.innerHTML = '<span class="bcard__reply-in">Hello yourself.</span>'
    ctx.visual.append(reply)
  }
  const inner = reply.firstElementChild as HTMLElement
  const fn = parseFloat(getComputedStyle(name).fontSize)
  reply.style.fontSize = `${(fn * 0.5).toFixed(1)}px` // Newsreader italic at about the name's x-height
  const range = document.createRange()
  range.selectNodeContents(name)
  const lines = [...range.getClientRects()].filter((r) => r.width > 1)
  const v = ctx.visual.getBoundingClientRect()
  const first = lines[0] ?? name.getBoundingClientRect()
  const last = lines[lines.length - 1] ?? first
  const gap = fn * 0.22
  const rf = fn * 0.5
  const pad = rf * 0.32 // the line box below the reply's baseline (line-height 1.2 + descent)
  const baseline = v.bottom - last.bottom + fn * 0.14 // the name's baseline, above its descent
  if (last.right - v.left + gap + reply.offsetWidth <= v.width - 16) {
    reply.style.left = `${last.right - v.left + gap}px`
    reply.style.bottom = `${baseline - pad}px`
  } else {
    reply.style.left = `${first.left - v.left}px`
    reply.style.bottom = `${v.bottom - first.top + fn * 0.06 - pad}px`
  }
  reply.style.visibility = 'visible'
  reply.getAnimations().forEach((a) => a.cancel())
  inner.getAnimations().forEach((a) => a.cancel())
  inner.animate([{ transform: 'translateY(115%)' }, { transform: 'translateY(0)' }], { duration: 1100, easing: HOUSE, fill: 'both' })
  const fade = reply.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 2700, easing: HOUSE, fill: 'both' })
  fade.onfinish = () => {
    reply!.style.visibility = 'hidden'
    fade.cancel()
    inner.getAnimations().forEach((a) => a.cancel())
  }
  return 3000
}

// ───────── hop (Biird): docs/motion-sketches/biird-ii.html ─────────
// The name is set with dotless i (and dotless j) followed by a zero-size anchor holding
// a round tittle placed from PP Mori SemiBold metrics (dot x 38..196, y 597..756 of
// 1000 units; i advances 234, dotless j 238). On hover each tittle gets an upward
// impulse and falls back on the touch spring, 90ms apart: two birds on a wire.
// E4 "perch": hold still on the card for 3s and they glide to the card's top edge.
const TITTLE: Record<string, [string, number]> = { i: ['ı', 0.196], j: ['ȷ', 0.2] }

function splitTittles(h: HTMLElement): HTMLElement[] {
  const text = h.textContent ?? ''
  if (!/[ij]/.test(text)) return []
  const glyphs = [...text]
    .map((ch) => {
      const t = TITTLE[ch]
      if (!t) return ch.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      return `${t[0]}<span class="ta"><span class="dot" style="--tx:${t[1]}em"></span></span>`
    })
    .join('')
  h.innerHTML = `<span class="sr-only">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span><span class="bcard__glyphs" aria-hidden="true">${glyphs}</span>`
  return [...h.querySelectorAll<HTMLElement>('.dot')]
}

function hop(ctx: CardCtx): MomentCtl | null {
  const name = ctx.el.querySelector<HTMLElement>('.bcard__name')
  if (!name) return advance(ctx)
  const original = name.innerHTML
  const dots = splitTittles(name)
  if (!dots.length) return advance(ctx)
  const st = dots.map(() => ({ x: new Spring(0, TOUCH_K, TOUCH_C), y: new Spring(0, TOUCH_K, TOUCH_C), r: new Spring(0, TOUCH_K, TOUCH_C) }))
  const timers: number[] = []
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms))
  let stop: (() => void) | null = null
  let state: 'home' | 'perch' = 'home'
  let still = 0
  let px = 0
  let py = 0
  const kick = () => {
    if (stop) return
    stop = loop((dt) => {
      let busy = false
      st.forEach((s, i) => {
        s.x.step(dt)
        s.y.step(dt)
        s.r.step(dt)
        busy ||= !(s.x.settled && s.y.settled && s.r.settled)
        dots[i].style.transform = `translate(${s.x.value.toFixed(2)}px, ${s.y.value.toFixed(2)}px) rotate(${s.r.value.toFixed(2)}deg)`
      })
      if (!busy) {
        stop = null
        return false
      }
    })
  }
  const setSpring = (s: Spring, k: number, c: number) => ((s.stiffness = k), (s.damping = c))

  const doHop = () =>
    dots.forEach((d, i) =>
      later(() => {
        if (state === 'perch') return
        st[i].y.velocity = -(d.offsetHeight * 58)
        kick()
      }, i * 90),
    )

  let landed: (() => void) | null = null // resolves the egg when the birds come home
  const perch = () => {
    if (state === 'perch' || ctx.entry?.egg !== 'perch') return
    void playEgg('perch', () => new Promise<void>((res) => ((landed = res), fly())))
  }
  const fly = () => {
    state = 'perch'
    ctx.el.setAttribute('data-perch', '')
    const cr = ctx.visual.getBoundingClientRect()
    // the sparrow is usually perched on this edge already (it perches after 800ms of
    // stillness, the egg comes at 3s): the two tittles land beside it, on the side with
    // more room, and the bird turns to look at them. Three birds on one wire.
    const bird = ctx.companion?.state
    const zr = ctx.el.getBoundingClientRect()
    const dw = dots[0].offsetWidth
    let spots = dots.map((_, i) => cr.left + cr.width * (0.58 + i * 0.07))
    if (bird?.perched && bird.visible) {
      const bl = zr.left + bird.x + bird.size * 0.1 // the bird's body, about 10% to 78% of its box
      const br = zr.left + bird.x + bird.size * 0.9
      const right = cr.right - br > bl - cr.left
      spots = dots.map((_, i) => (right ? br + dw * 0.8 + i * dw * 2.4 : bl - dw * 1.8 - i * dw * 2.4))
      ctx.companion!.face(right ? Infinity : -Infinity)
    }
    dots.forEach((d, i) => {
      const r = d.getBoundingClientRect()
      const s = st[i]
      const tx = spots[i] - (r.left - s.x.value)
      const ty = cr.top - r.height * 0.98 - (r.top - s.y.value)
      // a soft arc: take off upwards first, then land; lower stiffness so they glide
      setSpring(s.x, 120, 20)
      setSpring(s.y, 120, 17)
      setSpring(s.r, 120, 16)
      later(() => {
        s.x.target = tx
        s.y.target = ty
        s.y.velocity = -900
        s.r.target = i ? 8 : -6
        kick()
      }, i * 140)
    })
    later(() => {
      if (state !== 'perch') return
      st[st.length - 1].y.velocity = -260 // one of them hops once
      kick()
    }, 2300)
  }
  const home = () => {
    if (state !== 'perch') return
    state = 'home'
    window.setTimeout(() => (landed?.(), (landed = null)), 600)
    ctx.el.removeAttribute('data-perch')
    st.forEach((s, i) => {
      ;[s.x, s.y, s.r].forEach((sp) => setSpring(sp, TOUCH_K, TOUCH_C))
      later(() => {
        s.x.target = 0
        s.y.target = 0
        s.r.target = 0
        s.y.velocity = -500
        kick()
      }, i * 90)
    })
  }
  const armStill = () => {
    clearTimeout(still)
    still = window.setTimeout(perch, STILL)
  }

  return {
    enter(by) {
      doHop()
      // the tittles hop first (90ms apart, ~400ms each); then the sparrow joins the pointer
      later(() => ctx.companion?.hold(false), 90 * dots.length + 380)
      if (by === 'pointer') armStill() // the perch is a pointer egg: hold the mouse still
    },
    leave() {
      clearTimeout(still)
      home()
    },
    move(e) {
      if (Math.hypot(e.clientX - px, e.clientY - py) > 2) {
        px = e.clientX
        py = e.clientY
        home()
        armStill()
      }
    },
    destroy() {
      stop?.()
      clearTimeout(still)
      timers.forEach(clearTimeout)
      ctx.el.removeAttribute('data-perch')
      landed?.()
      name.innerHTML = original
    },
  }
}

// ───────── dev only: is the HTML on disk what the registry renders? ─────────
async function devCheck() {
  try {
    const [raw, data, manifest] = await Promise.all([
      import('./brands.html?raw'),
      import('../data/brands'),
      fetch('/img/manifest.json').then((r) => r.json()),
    ])
    const region = data.extractRegion(raw.default, 'brands-cards')
    if (!data.sameMarkup(region, data.renderBrandCards(manifest))) {
      console.warn(
        '[brands] src/sections/brands.html is stale against src/data/brands.ts. Run:\n' +
          `node -e "import('./src/data/brands.ts').then((m) => m.syncSections(require('node:fs')))"`,
      )
    }
  } catch (err) {
    console.warn('[brands] registry check skipped', err)
  }
}

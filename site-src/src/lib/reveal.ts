import { maskedLines, type MaskedLines } from './split'
import { odometer, type Odometer } from './odometer'
import { isProgrammatic, onProgrammaticEnd, onScroll } from './lenis'
import { STAGGER_CAP } from './motion'

// One runner for every scroll reveal on the page, driven by data attributes:
//
//   [data-reveal]            rise 16px + fade, plus blur 6px to 0 on fine pointers >= 768px (CSS, adds .in)
//   [data-reveal="rise"]     rise + fade, never blur: cards, panels, rows, groups (> ~600x200px)
//   [data-reveal="wipe"]     image wipes up from the bottom, inner media 1.08 to 1
//   [data-reveal="fade"]     opacity only    [data-reveal="scale"]  .96 to 1
//   [data-stagger="70"]      group: its [data-reveal] descendants cascade 70ms apart when the
//                            group enters (optional data-base="120"); child 7+ share child 6's delay
//   [data-lines]             masked line rise (SplitText), optional data-step="85"; adds .landed
//   [data-odo]               odometer, plays on enter
//   .hl                      sun highlighter: the band draws in (adds .is-in)
//   .chip--sun               "In market": its sun ground draws 250ms after its block reveals (adds .is-in)
//   data-delay="120"         extra delay in ms on any of the above
//
// Reveals hold while a programmatic scroll (anchor jump) runs and fire on landing.
// A back/forward or reload that restores the scroll position marks everything
// above the viewport bottom in at once, with no transition.
// A sweep reveals anything already scrolled past, so nothing waits at opacity 0.

type Entry = { host: Element; run: (instant: boolean) => void }

const entries = new Map<Element, Entry[]>()
const done = new WeakSet<Element>()
let io: IntersectionObserver | null = null
let sweepQueued = 0
let offs: (() => void)[] = []

const ms = (el: Element, attr = 'delay') => Number((el as HTMLElement).dataset?.[attr]) || 0
const cssMs = (el: Element | null) => (el ? parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0 : 0)

function fire(host: Element, instant = false) {
  const list = entries.get(host)
  if (!list) return
  entries.delete(host)
  io?.unobserve(host)
  list.forEach((e) => e.run(instant))
}

function add(host: Element, run: (instant: boolean) => void) {
  if (!entries.has(host)) {
    entries.set(host, [])
    io!.observe(host)
  }
  entries.get(host)!.push({ host, run })
}

function sweep() {
  sweepQueued = 0
  if (isProgrammatic()) return
  const vh = window.innerHeight
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
  for (const host of [...entries.keys()]) {
    const r = host.getBoundingClientRect()
    if (atBottom || r.top < vh * 0.96) fire(host)
  }
}
const queueSweep = () => {
  if (!sweepQueued) sweepQueued = requestAnimationFrame(sweep)
}

function ensureObserver() {
  if (io) return
  io = new IntersectionObserver(
    (es) => {
      if (isProgrammatic()) return // the landing sweep picks these up
      es.forEach((e) => e.isIntersecting && fire(e.target))
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
  )
  window.addEventListener('scroll', queueSweep, { passive: true })
  window.addEventListener('resize', queueSweep)
  offs = [onScroll(queueSweep), onProgrammaticEnd(queueSweep)]
}

// marks an element in; `instant` skips its transition for this frame
function markIn(el: HTMLElement, delayMs: number, instant: boolean, cls = 'in') {
  if (instant) {
    el.style.transition = 'none'
    el.querySelectorAll<HTMLElement>(':scope > *').forEach((c) => (c.style.transition = 'none'))
    el.classList.add(cls)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = ''
        el.querySelectorAll<HTMLElement>(':scope > *').forEach((c) => (c.style.transition = ''))
      }),
    )
    return
  }
  if (delayMs) el.style.setProperty('--d', `${delayMs}ms`)
  el.classList.add(cls)
}

/** For content added after load (fetched lists): registers its reveals once the runner
 *  has started; before that, the runner picks them up itself when it starts. */
export function revealLater(el: ParentNode) {
  if (document.documentElement.classList.contains('ready')) watch(el)
}

/** Register every reveal inside root (call again for content added later). */
export function watch(root: ParentNode = document) {
  ensureObserver()

  // groups first, so their children are not observed on their own
  root.querySelectorAll<HTMLElement>('[data-stagger]').forEach((g) => {
    if (done.has(g)) return
    done.add(g)
    const step = Number(g.dataset.stagger) || 70
    const base = ms(g, 'base') + ms(g)
    const kids = [...g.querySelectorAll<HTMLElement>('[data-reveal]')].filter((k) => k.closest('[data-stagger]') === g)
    kids.forEach((k, i) => {
      done.add(k)
      k.style.setProperty('--d', `${base + Math.min(i, STAGGER_CAP - 1) * step + ms(k)}ms`)
    })
    add(g, (instant) => kids.forEach((k) => markIn(k, 0, instant)))
  })

  root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    if (done.has(el) || el.classList.contains('in')) return
    done.add(el)
    // a clipped element can report no intersection: its parent watches for it
    const host = el.dataset.reveal === 'wipe' && el.parentElement ? el.parentElement : el
    add(host, (instant) => markIn(el, ms(el), instant))
  })

  root.querySelectorAll<HTMLElement>('[data-lines]').forEach((el) => {
    if (done.has(el)) return
    done.add(el)
    let split: MaskedLines
    try {
      split = maskedLines(el)
    } catch {
      el.dataset.split = 'failed'
      return
    }
    add(el, (instant) => (instant ? split.finish() : split.play(ms(el) / 1000)))
  })

  root.querySelectorAll<HTMLElement>('[data-odo]').forEach((el) => {
    if (done.has(el)) return
    done.add(el)
    const o: Odometer = odometer(el)
    add(el, (instant) => {
      if (!instant) o.play(ms(el) / 1000)
    })
  })

  // highlighter band: draws just after the line it sits in has landed
  root.querySelectorAll<HTMLElement>('.hl').forEach((el) => {
    if (done.has(el) || el.classList.contains('is-in')) return
    done.add(el)
    add(el, (instant) => {
      if (instant) return markIn(el, 0, true, 'is-in')
      window.setTimeout(() => el.classList.add('is-in'), ms(el) || 250)
    })
  })

  // "In market" chip: the sun ground draws 250ms after its block reveals, then the dot pops
  root.querySelectorAll<HTMLElement>('.chip--sun').forEach((el) => {
    if (done.has(el) || el.classList.contains('is-in')) return
    done.add(el)
    add(el, (instant) => {
      if (instant) return markIn(el, 0, true, 'is-in')
      const block = el.closest<HTMLElement>('[data-reveal]')
      window.setTimeout(() => el.classList.add('is-in'), cssMs(block) + 250 + ms(el))
    })
  })

  queueSweep()
}

function restoredScroll() {
  const nav = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined
  return !!nav && (nav.type === 'back_forward' || nav.type === 'reload') && window.scrollY > 0 && !location.hash
}

/** Start the runner on the whole document. Returns a cleanup. */
export function initReveals(root: ParentNode = document) {
  watch(root)
  if (restoredScroll()) {
    const vh = window.innerHeight
    for (const host of [...entries.keys()]) if (host.getBoundingClientRect().top < vh) fire(host, true)
  }
  return () => {
    io?.disconnect()
    io = null
    entries.clear()
    offs.forEach((f) => f())
    window.removeEventListener('scroll', queueSweep)
    window.removeEventListener('resize', queueSweep)
  }
}

/** Reveal everything inside root right now (print, a jump). `instant` skips transitions. */
export function revealAll(root: ParentNode = document, instant = false) {
  for (const host of [...entries.keys()]) if (root === document || (root as Element).contains(host)) fire(host, instant)
}

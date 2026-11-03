import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { easeExpoOut, reducedMotion } from './motion'

gsap.registerPlugin(ScrollTrigger)

// Smooth scroll driven by GSAP's ticker so ScrollTrigger stays in sync (same
// wiring as melriver.com). Touch keeps native scrolling. Reduced motion keeps
// native wheel scrolling too.
export let lenis: Lenis | null = null

const scrollListeners = new Set<(y: number, dir: 1 | -1) => void>()
let lastY = 0

export function startLenis() {
  if (lenis) return lenis
  lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
    smoothWheel: !reducedMotion(),
  })
  lenis.on('scroll', ScrollTrigger.update)
  lenis.on('scroll', ({ scroll }: { scroll: number }) => {
    const dir = scroll >= lastY ? 1 : -1
    lastY = scroll
    scrollListeners.forEach((fn) => fn(scroll, dir))
  })
  gsap.ticker.add((t) => lenis!.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  bindAnchors()
  return lenis
}

// subscribe to scroll position (fires on every Lenis frame)
export function onScroll(fn: (y: number, dir: 1 | -1) => void) {
  scrollListeners.add(fn)
  return () => scrollListeners.delete(fn)
}

const navOffset = () => {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--nav-offset')
  return parseFloat(v) || 96
}

// Programmatic scrolls (anchor jumps, back to top) are flagged, so reveals and
// the nav's compact state wait for the landing instead of reacting mid-flight.
let programmatic = false
let progTimer = 0
const landListeners = new Set<() => void>()
/** true while an anchor jump or scrollToTarget() is running */
export const isProgrammatic = () => programmatic
/** called once each time a programmatic scroll lands */
export function onProgrammaticEnd(fn: () => void) {
  landListeners.add(fn)
  return () => landListeners.delete(fn)
}
function endProgrammatic() {
  if (!programmatic) return
  programmatic = false
  clearTimeout(progTimer)
  landListeners.forEach((fn) => fn())
}

// Smooth scroll to an element, a selector or a y position, leaving room for the nav.
// House expo out; duration by distance, clamp(0.6 + d / 4000, 0.6, 1.4) s. Reduced motion: instant.
export function scrollToTarget(
  target: string | HTMLElement | number,
  opts: { immediate?: boolean; offset?: number; onComplete?: () => void } = {},
) {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (el === null) return
  const offset = typeof el === 'number' ? 0 : -(opts.offset ?? navOffset())
  const y = typeof el === 'number' ? el : el.getBoundingClientRect().top + window.scrollY + offset
  const distance = Math.abs(y - window.scrollY)
  const immediate = !!opts.immediate || reducedMotion()
  const duration = Math.min(1.4, Math.max(0.6, 0.6 + distance / 4000))
  programmatic = true
  clearTimeout(progTimer)
  // safety net: never stay flagged if a scroll is interrupted
  progTimer = window.setTimeout(endProgrammatic, (immediate ? 0.1 : duration + 0.4) * 1000)
  let finished = false
  const done = () => {
    if (finished) return
    finished = true
    endProgrammatic()
    opts.onComplete?.()
  }
  if (lenis) {
    lenis.scrollTo(y, { immediate, duration, easing: easeExpoOut, force: true, onComplete: done })
    if (immediate) requestAnimationFrame(done)
  } else {
    window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' })
    window.setTimeout(done, immediate ? 16 : duration * 1000)
  }
}

// Stop page scrolling (menus, sheets). Reference counted.
let locks = 0
export function lockScroll(on: boolean) {
  locks = Math.max(0, locks + (on ? 1 : -1))
  const locked = locks > 0
  document.documentElement.classList.toggle('is-locked', locked)
  if (lenis) locked ? lenis.stop() : lenis.start()
}

// In-page anchors (#brands, or /#brands while on /) scroll smoothly, offset for the nav.
function bindAnchors() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = (e.target as Element | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null
    if (!a || a.target === '_blank') return
    const url = new URL(a.href, location.href)
    if (url.origin !== location.origin || url.pathname.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '')) return
    const id = decodeURIComponent(url.hash.slice(1))
    if (!id) return
    const el = id === 'top' ? document.body : document.getElementById(id)
    if (!el) return
    e.preventDefault()
    history.replaceState(null, '', `#${id}`)
    // keyboard users land on the section, not back at the top (focus after landing)
    scrollToTarget(id === 'top' ? 0 : el, {
      onComplete: () => {
        if (el === document.body) return
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
        el.focus({ preventScroll: true })
      },
    })
  })
  // arriving with a hash: jump there once layout has settled
  if (location.hash.length > 1) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)))
    if (el) requestAnimationFrame(() => setTimeout(() => scrollToTarget(el, { immediate: true }), 60))
  }
}

export { ScrollTrigger, gsap }

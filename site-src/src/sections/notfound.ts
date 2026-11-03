import './notfound.css'
import { gsap } from 'gsap'
import { buildPetals, budPetals, ICON_VIEWBOX, PETAL_OPEN, type Petals } from '../lib/bloom'
import { reducedMotion } from '../lib/motion'

// The 404 bud (MOTION-CHALLENGE 2.5): the mark as a bud (petals at .42, turned
// back 45 degrees). On load it tries once (to .6, then falls back on the touch
// spring). Hovering or focusing "Back to home" blooms it fully, because that is
// where things did bloom; leaving closes it again. The E8 egg ('egg:bloom')
// lets it bloom too. Reduced motion: a static bud.

const BUD = 0.42
const TRY = 0.6

export function init(root: HTMLElement): () => void {
  const host = root.querySelector<HTMLElement>('[data-bud]')
  const home = root.querySelector<HTMLElement>('[data-bud-home]')
  if (!host) return () => {}

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', ICON_VIEWBOX)
  host.replaceChildren(svg)
  const p: Petals = buildPetals(svg)
  // the bud: small, faint, turned back
  gsap.set(p.states, { scale: BUD, opacity: 0.5, rotate: -45 })

  let open = false
  let tl: gsap.core.Timeline | gsap.core.Tween | null = null
  const still = reducedMotion()

  const toBud = () => {
    tl?.kill()
    p.split()
    tl = budPetals(p, BUD, { opacity: 0.5, rotate: -45 })
  }
  const bloom = () => {
    if (open || still) return
    open = true
    tl?.kill()
    p.split()
    // openPetals' motion (0.8s, house curve, N E S W), starting from the bud instead of closed
    tl = gsap.to(p.states, { ...PETAL_OPEN, duration: 0.8, ease: 'expo.out', stagger: 0.08, onComplete: p.settle })
  }
  const close = () => {
    if (!open || still) return
    open = false
    toBud()
  }

  const cleanups: (() => void)[] = []
  const on = (el: EventTarget, type: string, fn: EventListener) => {
    el.addEventListener(type, fn)
    cleanups.push(() => el.removeEventListener(type, fn))
  }

  if (!still) {
    // one try, once the page has landed: towards open, then back to the bud
    const attempt = window.setTimeout(() => {
      if (open) return
      tl = gsap
        .timeline()
        .to(p.states, { scale: TRY, opacity: 0.62, rotate: -30, duration: 0.38, ease: 'expo.out', stagger: 0.04 })
        .add(() => {
          if (!open) toBud()
        })
    }, 1100)
    cleanups.push(() => clearTimeout(attempt))

    if (home) {
      const fine = matchMedia('(hover: hover) and (pointer: fine)')
      on(home, 'pointerenter', () => fine.matches && bloom())
      on(home, 'pointerleave', () => fine.matches && close())
      on(home, 'focus', bloom)
      on(home, 'blur', close)
    }
    on(window, 'egg:bloom', bloom)
  }

  return () => {
    tl?.kill()
    cleanups.forEach((f) => f())
  }
}

import { gsap } from 'gsap'
import { PETAL_CLOSED } from '../lib/bloom'
import { EASE, reducedMotion } from '../lib/motion'
import { chromePetals, type Nav } from './nav'

// The bloom intro, first visit per session only, skipped on reduced motion.
// Paper screen, the four petals open from the centre, then the mark flies to
// its home in the nav line (the compass mark, top left) and the rest of the line
// (wordmark, destinations, live count) draws in beside it as it lands; the hero
// entrance starts as the mark arrives (0.84s), so the whole first screen has landed
// about 2s after the page opened. A click, a key, a wheel or a touch skips it, and
// it never holds the scroll. Transform and opacity only.

const KEY = 'cb-intro'
let resolveDone: () => void = () => {}
const done = new Promise<void>((r) => (resolveDone = r))

/** resolves when the page entrance should start */
export const introDone = () => done

export function runPreloader(nav: Nav | null) {
  const html = document.documentElement
  const pre = document.querySelector<HTMLElement>('.preloader')
  const playing = html.classList.contains('intro') && !!pre && !!nav && !reducedMotion()

  if (!playing) {
    html.classList.remove('intro', 'cb-curtain')
    html.classList.add('no-preload')
    pre?.remove()
    if (nav && !reducedMotion()) {
      gsap.fromTo(nav.cluster, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.9, ease: EASE, clearProps: 'transform,opacity' })
    }
    resolveDone()
    return done
  }
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* private mode */
  }

  const bar = nav!.el
  const cluster = nav!.cluster
  const target = nav!.icon
  const inner = cluster.querySelectorAll<HTMLElement>('.nav__word, .nav__links, .nav__roles')
  const markEl = pre!.querySelector<SVGSVGElement>('.preloader__mark')!
  const petals = chromePetals(markEl)

  // the line has no container: the mark lands on its own spot, the seal ring
  // (mobile) and the rest of the line arrive around it
  html.classList.remove('intro')
  bar.setAttribute('data-intro', '')
  gsap.set(inner, { opacity: 0 })
  gsap.set(target, { opacity: 0 })
  gsap.set(petals.states, PETAL_CLOSED)
  gsap.set(markEl, { rotate: -45, transformOrigin: '50% 50%' })

  const LAND = 1.08 // the mark settles into the bar
  const tl = gsap.timeline({ defaults: { ease: EASE } })

  // 1. petals open from the centre, N E S W, while the whole mark turns home
  tl.to(petals.states, { scale: 1, rotate: 0, opacity: 1, duration: 0.62, stagger: 0.06 }, 0.04)
  tl.to(markEl, { rotate: 0, duration: 0.6 }, 0.04)
  tl.add(petals.settle, 0.66)

  // 2. it flies to the nav mark; the target is measured every frame, so a late
  //    font swap that moves the line cannot make it miss
  const fly = { p: 0 }
  let from: DOMRect | null = null
  tl.to(
    fly,
    {
      p: 1,
      duration: 0.5,
      ease: 'expo.inOut',
      onStart: () => {
        from = markEl.getBoundingClientRect()
      },
      onUpdate: () => {
        if (!from) return
        const b = target.getBoundingClientRect()
        const p = fly.p
        const dx = b.left + b.width / 2 - (from.left + from.width / 2)
        const dy = b.top + b.height / 2 - (from.top + from.height / 2)
        const s = 1 + (b.width / from.width - 1) * p
        gsap.set(markEl, { x: dx * p, y: dy * p, scale: s })
      },
    },
    0.58,
  )
  // the curtain fades to the page as the mark travels (the hero under it is still masked
  // and veiled: it arrives piece by piece once the mark is home)
  // the curtain is the page ground of the current theme (paper or violet): fade that colour out
  const ground = getComputedStyle(pre!).backgroundColor.replace(/^rgba?\(([^,]+),([^,]+),([^,)]+).*$/, 'rgba($1,$2,$3,0)')
  tl.to(pre, { backgroundColor: ground, duration: 0.45, ease: EASE }, 0.64)
  tl.add(() => html.classList.add('curtain-open'), 0.64)
  // 3. as the mark arrives, the line draws in beside it, left to right
  tl.fromTo(inner, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.05, clearProps: 'transform,opacity' }, 0.86)
  tl.add(() => bar.removeAttribute('data-intro'), 0.98)
  // the hero starts as the mark arrives (expo.inOut is ~90% of the way there)
  tl.add(() => resolveDone(), 0.84)
  tl.add(() => {
    gsap.set(target, { clearProps: 'opacity' })
    bar.removeAttribute('data-intro')
    pre!.remove()
    off()
  }, LAND)

  // skip: run the rest fast instead of cutting, so nothing jumps. A visitor who
  // starts scrolling has told us they want the page, so wheel and touch skip too.
  const SKIP = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
  const skip = () => {
    tl.timeScale(6)
    off()
  }
  const off = () => SKIP.forEach((t) => window.removeEventListener(t, skip))
  SKIP.forEach((t) => window.addEventListener(t, skip, { passive: true }))

  return done
}

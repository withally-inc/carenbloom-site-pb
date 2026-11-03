// House motion constants (docs/MOTION-CHALLENGE.md section 0). One curve
// (expo.out) for everything that enters, swaps or settles; one spring for what
// people touch, one for what follows the pointer, and the droplet lens pair.
// Durations in seconds (GSAP).

export const EASE = 'expo.out'
export const EASE_CSS = 'cubic-bezier(.16,1,.3,1)'
/** expo.out as a plain function, for Lenis and hand-rolled tweens */
export const easeExpoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

export const DUR = {
  press: 0.1, // press scale down to .97, ease-out
  spring: 0.43, // CSS-sprung release, petal pops, icon flips (--dur-spring)
  micro: 0.3, // colour, background, border, small opacity
  ui: 0.5, // state swaps: accordion content, card content, label slots, nav tone
  enter: 1.1, // reveals, masked lines, odometer rise
  line: 1.1,
  image: 1.2, // wipe (inner scale 1.4)
  imageInner: 1.4,
} as const

/** anything leaving takes 40% of its entrance */

export const STAGGER = {
  items: 0.07, // reveal groups (60 to 80ms), capped at 6 children
  lines: 0.085, // headline lines (75 to 90ms)
} as const
export const STAGGER_CAP = 6

/** intent delays in ms (section 0.4) */
export const INTENT = {
  navHover: 0,
  listHover: 120,
  cardMoment: 150,
  tooltipOpen: 120,
  tooltipClose: 200,
  prefetch: 70,
  eggDwell: 800,
} as const

export const LINE_ROTATE = 2.5 // deg, from bottom-left

// spring set for lib/spring.ts: [stiffness, damping], mass 1
export const SPRING = {
  /** everything a person touches: 3.5% overshoot, settles in ~430ms (same as CSS --spring) */
  touch: [320, 26],
  /** things that trail the pointer: lemon, card media shift. 1% overshoot, ~600ms */
  follow: [170, 22],
  /** the droplet lens only: two edges of one object */
  lens: { lead: [620, 40], trail: [190, 24] },
  /** @deprecated use SPRING.follow */
  soft: [170, 22],
} as const

/**
 * A spring as a GSAP ease, integrated from the same stiffness/damping as lib/spring.ts,
 * so a gsap tween can feel exactly like SPRING.touch:
 *   gsap.to(el, { scale: 1, ...springTween('touch') })
 */
const easeCache = new Map<string, { ease: (t: number) => number; duration: number }>()
export function springEase(stiffness: number, damping: number) {
  const key = `${stiffness}/${damping}`
  const hit = easeCache.get(key)
  if (hit) return hit
  const dt = 1 / 600
  let x = 0
  let v = 0
  const samples: number[] = [0]
  let still = 0
  for (let i = 0; i < 6000; i++) {
    const a = -stiffness * (x - 1) - damping * v
    v += a * dt
    x += v * dt
    samples.push(x)
    still = Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01 ? still + 1 : 0
    if (still > 12) break
  }
  samples[samples.length - 1] = 1
  const n = samples.length - 1
  const ease = (t: number) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    const f = t * n
    const i = Math.floor(f)
    return samples[i] + (samples[i + 1] - samples[i]) * (f - i)
  }
  const out = { ease, duration: n * dt }
  easeCache.set(key, out)
  return out
}
export function springTween(name: 'touch' | 'follow' = 'touch') {
  const [k, c] = SPRING[name]
  return springEase(k, c)
}

const mq = (q: string) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false)
export const reducedMotion = () => mq('(prefers-reduced-motion: reduce)')
export const finePointer = () => mq('(hover: hover) and (pointer: fine)')
export const isMobile = () => mq('(max-width: 767px)')
/** blur is allowed only on fine pointers at 768px and up (section 0.5) */
export const allowBlur = () => finePointer() && !isMobile()

import { gsap } from 'gsap'
import { damp } from './spring'
import { finePointer } from './motion'

// A tiny shared pointer store. One pointermove listener for the whole page,
// a damped position and its velocity, ticking only while someone listens.
//
//   const off = pointer.subscribe((p, dt) => {
//     lemon.style.transform = `translate3d(${p.sx}px, ${p.sy}px, 0) rotate(${p.vx * 0.02}deg)`
//   })
//   pointer.local(el)  -> { x, y, inside } relative to el, in px (from the damped position)
//
// On touch-only devices `fine` is false and the position only moves on taps.

export type PointerState = {
  x: number // raw, viewport px
  y: number
  sx: number // damped
  sy: number
  vx: number // velocity of the damped position, px/s
  vy: number
  speed: number
  inside: boolean // pointer is over the document
  fine: boolean // mouse-like pointer (hover capable)
  lastMove: number // ms timestamp of the last real move
}

type Listener = (p: PointerState, dt: number) => void

const state: PointerState = {
  x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
  y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  sx: 0,
  sy: 0,
  vx: 0,
  vy: 0,
  speed: 0,
  inside: false,
  fine: false,
  lastMove: 0,
}
state.sx = state.x
state.sy = state.y

const listeners = new Set<Listener>()
let bound = false
let ticking = false
let lambda = 9 // damping: higher is snappier

function onMove(e: PointerEvent) {
  state.x = e.clientX
  state.y = e.clientY
  state.inside = true
  state.lastMove = performance.now()
}
const onLeave = () => (state.inside = false)

function tick(_t: number, deltaMs: number) {
  const dt = Math.min(0.05, deltaMs / 1000 || 1 / 60)
  const px = state.sx
  const py = state.sy
  state.sx = damp(state.sx, state.x, lambda, dt)
  state.sy = damp(state.sy, state.y, lambda, dt)
  state.vx = (state.sx - px) / dt
  state.vy = (state.sy - py) / dt
  state.speed = Math.hypot(state.vx, state.vy)
  listeners.forEach((fn) => fn(state, dt))
}

function bind() {
  if (bound) return
  bound = true
  state.fine = finePointer()
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
  window.addEventListener('blur', onLeave)
}

export const pointer = {
  get state() {
    return state
  },
  /** listen every frame; returns an unsubscribe */
  subscribe(fn: Listener) {
    bind()
    listeners.add(fn)
    if (!ticking) {
      ticking = true
      gsap.ticker.add(tick)
    }
    return () => {
      listeners.delete(fn)
      if (!listeners.size && ticking) {
        ticking = false
        gsap.ticker.remove(tick)
      }
    }
  },
  /** damping of the shared smoothed position (default 9) */
  setDamping(v: number) {
    lambda = v
  },
  /** damped pointer relative to an element: px from its top-left, plus normalised -1..1 */
  local(el: Element) {
    const r = el.getBoundingClientRect()
    const x = state.sx - r.left
    const y = state.sy - r.top
    return {
      x,
      y,
      nx: (x / r.width) * 2 - 1,
      ny: (y / r.height) * 2 - 1,
      inside: state.inside && state.x >= r.left && state.x <= r.right && state.y >= r.top && state.y <= r.bottom,
    }
  },
}

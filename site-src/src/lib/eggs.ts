import { getRoleState } from './roles'
import { INTENT, reducedMotion } from './motion'

// Easter egg infrastructure (MOTION-CHALLENGE section 3).
// Rules built in: deliberate gestures only (typing, dwell, return, repeat), one egg
// animates at a time, eggs that move are off under reduced motion (E7 and E9 do not
// move), typed triggers ignore form fields and modifier keys, found eggs are
// remembered per viewer in localStorage ('cb-eggs').
//
//   playEgg('perch', () => { …animate…; return 2300 })   // ms, or a promise
//   onTyped('bloom', () => …)                            // b,l,o,o,m within 2s
//   onReturn((secondsAway) => …)                         // tab hidden, then visible again
//   onDwell(el, () => …, { ms: 800 })                    // pointer resting on el

export const EGGS = {
  away: 'E1', // while you were away (hero counter)
  cycle: 'E2', // cycle time (lemon)
  reorg: 'E3', // organic (re)org (values)
  perch: 'E4', // Biird birds on the wire
  wave: 'E5', // Hello Nancy says hello back
  cities: 'E6', // four cities, one day (footer)
  console: 'E7', // under the hood (console + source)
  bloom: 'E8', // type "bloom"
  print: 'E9', // the printed role
} as const
export type EggId = keyof typeof EGGS
export const EGG_TOTAL = Object.keys(EGGS).length
const MOTIONLESS: EggId[] = ['console', 'print']
const KEY = 'cb-eggs'

export function foundEggs(): EggId[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v.filter((id): id is EggId => id in EGGS) : []
  } catch {
    return []
  }
}
/** remember an egg as found; returns the tally */
export function markFound(id: EggId) {
  const set = new Set(foundEggs())
  set.add(id)
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]))
  } catch {
    /* storage blocked: the egg still plays */
  }
  window.dispatchEvent(new CustomEvent('egg:found', { detail: { id, count: set.size } }))
  return set.size
}

/** may this egg run right now? (reduced motion keeps only the motionless ones) */
export function eggAllowed(id: EggId) {
  return MOTIONLESS.includes(id) || !reducedMotion()
}

let busy: EggId | null = null
const lastRun = new Map<EggId, number>()
/** the egg currently animating, if any */
/**
 * Run an egg under the guard: one at a time, gated on reduced motion, optional throttle.
 * run() returns how long it animates (ms) or a promise; returns false if it did not run.
 */
export async function playEgg(id: EggId, run: () => number | void | Promise<unknown>, opts: { throttle?: number } = {}) {
  if (!eggAllowed(id) || (busy && !MOTIONLESS.includes(id))) return false
  const now = performance.now()
  if (opts.throttle && now - (lastRun.get(id) ?? -Infinity) < opts.throttle) return false
  lastRun.set(id, now)
  markFound(id)
  if (MOTIONLESS.includes(id)) {
    await run()
    return true
  }
  busy = id
  try {
    const r = run()
    if (typeof r === 'number') await new Promise((res) => setTimeout(res, r))
    else await r
  } finally {
    busy = null
  }
  return true
}

const typingInField = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]')
}

/** call fn when `word` is typed (outside form fields, no modifiers) within `within` ms */
export function onTyped(word: string, fn: () => void, { within = 2000 } = {}) {
  const target = word.toLowerCase()
  let buf = ''
  let start = 0
  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || typingInField(e.target)) return
    if (e.key.length !== 1) return
    const now = performance.now()
    if (!buf || now - start > within) {
      buf = ''
      start = now
    }
    buf += e.key.toLowerCase()
    if (!target.startsWith(buf)) {
      // allow the word to restart mid-buffer ("bbloom")
      buf = target.startsWith(e.key.toLowerCase()) ? e.key.toLowerCase() : ''
      start = now
      return
    }
    if (buf === target) {
      buf = ''
      fn()
    }
  }
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}

/** call fn(secondsAway) when the tab comes back after being hidden */
export function onReturn(fn: (secondsAway: number) => void, { min = 0 } = {}) {
  let hiddenAt = 0
  const onVis = () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now()
    else if (hiddenAt) {
      const s = (Date.now() - hiddenAt) / 1000
      hiddenAt = 0
      if (s >= min) fn(s)
    }
  }
  document.addEventListener('visibilitychange', onVis)
  return () => document.removeEventListener('visibilitychange', onVis)
}

/**
 * call fn when a mouse pointer rests on el (moves less than `tolerance` px) for `ms`.
 * onLeave fires when the pointer leaves or moves again after the dwell fired.
 * With tap: true, a tap on touch screens also triggers (and a second tap leaves).
 * With stayOnMove: true, moving after the dwell does not dismiss (only leaving does).
 */
export function onDwell(
  el: HTMLElement,
  fn: () => void,
  opts: { ms?: number; tolerance?: number; onLeave?: () => void; tap?: boolean; stayOnMove?: boolean } = {},
) {
  const ms = Math.max(INTENT.eggDwell, opts.ms ?? INTENT.eggDwell)
  const tol = opts.tolerance ?? 2
  let t = 0
  let x = 0
  let y = 0
  let fired = false
  const arm = () => {
    clearTimeout(t)
    t = window.setTimeout(() => {
      fired = true
      fn()
    }, ms)
  }
  const leave = () => {
    clearTimeout(t)
    if (fired) {
      fired = false
      opts.onLeave?.()
    }
  }
  const move = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    if (Math.hypot(e.clientX - x, e.clientY - y) < tol && t) return
    x = e.clientX
    y = e.clientY
    if (fired) {
      if (opts.stayOnMove) return
      leave()
    }
    arm()
  }
  const tap = (e: PointerEvent) => {
    if (!opts.tap || e.pointerType === 'mouse') return
    if (fired) leave()
    else {
      fired = true
      fn()
    }
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerleave', leave)
  el.addEventListener('pointerup', tap)
  return () => {
    clearTimeout(t)
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerleave', leave)
    el.removeEventListener('pointerup', tap)
  }
}

// E7: a note in the console for the curious (the people the careers page wants).
async function consoleNote() {
  const state = await getRoleState()
  const n = state?.openRoleCount
  const lines = [
    n ? `Curious is a good sign. ${n} open ${n === 1 ? 'role' : 'roles'}: https://carenbloom.com/careers` : 'Curious is a good sign. Open roles: https://carenbloom.com/careers',
  ]
  const k = foundEggs().length
  if (k > 0) lines.push(`Eggs found: ${k} of ${EGG_TOTAL}.`)
  lines.push('Try typing bloom.')
  console.log(`%cCare & Bloom\n%c${lines.join('\n')}`, 'font: 600 13px system-ui; color: #2331E4', 'font: 600 13px system-ui; color: #2B3447')
}

/** Boot the site-wide eggs: E7 console note, E8 typed "bloom". Returns a cleanup. */
export function initEggs() {
  void consoleNote()
  // E8: every mark on screen re-blooms (nav, closing bloom, the 404 bud); once per 10s
  const off = onTyped('bloom', () => {
    void playEgg('bloom', () => {
      window.dispatchEvent(new CustomEvent('egg:bloom'))
      return 1400
    }, { throttle: 10000 })
  })
  return off
}

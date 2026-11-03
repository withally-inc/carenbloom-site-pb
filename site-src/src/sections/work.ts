import './work.css'
import { initPlayerCoach } from './work.pc'
import { initValuesArt, themeLemon } from './work.art'
import { gsap } from 'gsap'
import { Spring, clamp, loop } from '../lib/spring'
import { pointer } from '../lib/cursor'
import { odometer } from '../lib/odometer'
import { playEgg } from '../lib/eggs'
import { EASE_CSS, INTENT, SPRING, finePointer, isMobile, reducedMotion, springTween } from '../lib/motion'

// How we work (MOTION-CHALLENGE 1.19, 1.20, 1.21, E2, E3).
//
// Values: a vertical tablist (roving tabindex, Up/Down/Home/End, click, hover
// with 120ms intent) and one card as the tabpanel. A mist lens rides behind the
// active row on two edge springs (the nav's droplet, turned 90 degrees). The
// card swaps direction-aware; the counter rolls. Phones: arrows, dots, swipe.
//
// Lemon: one halftone lemon that trails the pointer on SPRING.follow, turns
// through its ten frames with the distance it travels, hops when the value
// changes, and rests on the card's corner when the pointer leaves. Touch: it
// idles at rest with a stepped turn.
//
// Eggs: E2 times the loops drawn with the cursor (the lemon turning with them) while value 03 is open and shows the
// visitor's time in the counter. E3 lets value 05 reorganise the list.

const N = 7
const pad = (i: number) => String(i + 1).padStart(2, '0')
const FRAME_PX = 28 // travel per frame: a full turn is 280px
const FRAMES = 10
const CYCLE_MAX = 0.9 // seconds: a loop drawn faster than this shows the time
const BEST_KEY = 'cb-cycle-best'

type Lemon = { hop: () => void; destroy: () => void }

export function init(root: HTMLElement): () => void {
  const offs: (() => void)[] = []
  const lemon = initLemon(root)
  offs.push(lemon.destroy)
  offs.push(initValues(root, lemon))
  offs.push(initPlayerCoach(root))
  offs.push(themeLemon(root))
  return () => offs.forEach((f) => f())
}

// ───────────────────────── values ─────────────────────────

function initValues(root: HTMLElement, lemon: Lemon): () => void {
  const list = root.querySelector<HTMLElement>('.values__list')
  const lens = root.querySelector<HTMLElement>('.values__lens')
  const panel = root.querySelector<HTMLElement>('.values__card')
  const countEl = root.querySelector<HTMLElement>('[data-count]')
  const countWrap = root.querySelector<HTMLElement>('.values__count')
  const timeEl = root.querySelector<HTMLElement>('[data-time]')
  if (!list || !lens || !panel || !countEl || !countWrap || !timeEl) return () => {}
  const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
  const faces = [...panel.querySelectorAll<HTMLElement>('.values__face')]
  const dots = [...panel.querySelectorAll<HTMLElement>('.values__dots i')]
  if (tabs.length !== N || faces.length !== N) return () => {}

  const offs: (() => void)[] = []
  const on = <K extends keyof HTMLElementEventMap>(el: EventTarget, type: K | string, fn: (e: any) => void, opts?: AddEventListenerOptions) => {
    el.addEventListener(type, fn, opts)
    offs.push(() => el.removeEventListener(type, fn, opts))
  }
  const timers = new Set<number>()
  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timers.delete(t)
      fn()
    }, ms)
    timers.add(t)
    return t
  }

  let active = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'))
  let selectedAt = 0
  let selectedBy: 'hover' | 'other' = 'other'

  // the hand art behind the card (work.art.ts)
  const art = initValuesArt(panel, active)
  offs.push(art.destroy)

  // the counter rolls like every number on the site; keep it out of the reveal runner
  const odo = odometer(countEl, pad(active))
  delete countEl.dataset.odo

  // ── lens: two edge springs; the leading edge is stiffer, so it stretches like a droplet
  const T = new Spring(0, ...SPRING.lens.lead)
  const B = new Spring(0, ...SPRING.lens.trail)
  const ys = tabs.map(() => new Spring(0, ...SPRING.touch)) // row offsets, for the (re)org only
  let lensH = 0
  let stop: (() => void) | null = null

  const render = () => {
    if (!lensH) lensH = lens.offsetHeight || 56
    const t = T.value
    const b = Math.max(B.value, t + 8)
    const nat = B.target - T.target
    const stretch = clamp((b - t - nat) / 120, 0, 1)
    lens.style.transform = `translate3d(0,${t.toFixed(2)}px,0) scale(${(1 - stretch * 0.06).toFixed(4)},${((b - t) / lensH).toFixed(4)})`
    tabs.forEach((r, i) => {
      const y = ys[i].value
      r.style.transform = Math.abs(y) > 0.01 ? `translate3d(0,${y.toFixed(2)}px,0)` : ''
    })
  }
  const kick = () => {
    if (stop) return
    stop = loop((dt) => {
      T.step(dt)
      B.step(dt)
      ys.forEach((s) => s.step(dt))
      render()
      if (T.settled && B.settled && ys.every((s) => s.settled)) {
        stop = null
        return false
      }
    })
  }
  const aim = (i: number, instant = false) => {
    const r = tabs[i]
    const top = r.offsetTop + ys[i].target
    const bot = top + r.offsetHeight
    const down = top > T.target
    const [lead, trail] = [SPRING.lens.lead, SPRING.lens.trail]
    ;(down ? B : T).stiffness = lead[0]
    ;(down ? B : T).damping = lead[1]
    ;(down ? T : B).stiffness = trail[0]
    ;(down ? T : B).damping = trail[1]
    T.target = top
    B.target = bot
    if (instant || reducedMotion()) {
      T.set(top)
      B.set(bot)
      ys.forEach((s) => s.set(s.target))
      render()
      return
    }
    kick()
  }

  // ── card swap: direction-aware; name, then the sentence 60ms later
  const running = new Set<Animation>()
  const T3 = (axis: 'x' | 'y', v: number) => (axis === 'y' ? `translate3d(0,${v}px,0)` : `translate3d(${v}px,0,0)`)
  const swap = (from: number, to: number, dir: number, axis: 'x' | 'y', fromX = 0) => {
    running.forEach((a) => a.cancel())
    running.clear()
    faces.forEach((f, k) => {
      f.classList.toggle('is-active', k === to)
      f.classList.toggle('is-leaving', k === from && from !== to)
      f.style.transform = ''
      f.style.opacity = ''
    })
    const out = faces[from]
    const inn = faces[to]
    const done = () => out.classList.remove('is-leaving')
    if (reducedMotion()) {
      const a = out.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear' })
      const b = inn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 80, easing: 'linear', fill: 'backwards' })
      a.onfinish = done
      running.add(a).add(b)
      return
    }
    const outTo = axis === 'y' ? -8 * dir : fromX - 32 * dir
    const a = out.animate(
      [
        { opacity: axis === 'x' ? Math.max(0.4, 1 - Math.abs(fromX) / 400) : 1, transform: T3(axis, axis === 'x' ? fromX : 0) },
        { opacity: 0, transform: T3(axis, outTo) },
      ],
      { duration: 180, easing: EASE_CSS, fill: 'forwards' },
    )
    a.onfinish = () => {
      done()
      a.cancel()
    }
    running.add(a)
    const enter = axis === 'y' ? 12 * dir : 28 * dir
    ;[...inn.children].forEach((el, k) => {
      const an = el.animate([{ opacity: 0, transform: T3(axis, enter) }, { opacity: 1, transform: 'none' }], {
        duration: 500,
        delay: 70 + k * 60,
        easing: EASE_CSS,
        fill: 'backwards',
      })
      running.add(an)
    })
  }

  const select = (i: number, opts: { focus?: boolean; dir?: number; axis?: 'x' | 'y'; fromX?: number; by?: 'hover' | 'other' } = {}) => {
    if (i === active) return
    const from = active
    const dir = opts.dir ?? Math.sign(i - from)
    active = i
    selectedAt = performance.now()
    selectedBy = opts.by ?? 'other'
    if (reorgBusy) settleReorg()
    tabs.forEach((t, k) => {
      const on = k === i
      t.setAttribute('aria-selected', String(on))
      t.tabIndex = on ? 0 : -1
    })
    panel.setAttribute('aria-labelledby', tabs[i].id)
    dots.forEach((d, k) => d.classList.toggle('is-on', k === i))
    if (opts.focus) tabs[i].focus({ preventScroll: true })
    aim(i)
    swap(from, i, dir || 1, opts.axis ?? 'y', opts.fromX ?? 0)
    art.show(i, dir || 1)
    odo.to(pad(i))
    lemon.hop()
    root.dispatchEvent(new CustomEvent('values:change', { detail: { index: i } }))
  }

  // ── list input: click (Enter and Space click a button), hover intent, keys
  let intent = 0
  tabs.forEach((tab, i) => {
    on(tab, 'click', () => {
      if (i !== active) return select(i)
      // activating 05 again, deliberately (not the click that follows a hover pick)
      const fresh = selectedBy === 'hover' && performance.now() - selectedAt < 700
      if (i === 4 && !fresh) reorg()
    })
    on(tab, 'pointerenter', (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      clearTimeout(intent)
      intent = window.setTimeout(() => select(i, { by: 'hover' }), INTENT.listHover)
    })
    on(tab, 'pointerleave', () => clearTimeout(intent))
  })
  offs.push(() => clearTimeout(intent))
  on(list, 'keydown', (e: KeyboardEvent) => {
    let n: number | null = null
    if (e.key === 'ArrowDown') n = (active + 1) % N
    else if (e.key === 'ArrowUp') n = (active - 1 + N) % N
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = N - 1
    if (n === null) return
    e.preventDefault()
    const dir = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : Math.sign(n - active)
    if (n === active) tabs[n].focus({ preventScroll: true })
    else select(n, { focus: true, dir })
  })

  // ── phones: arrows and swipe
  panel.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) => {
    on(b, 'click', () => {
      const step = Number(b.dataset.step) || 1
      select((active + step + N) % N, { dir: step, axis: 'x' })
    })
  })
  let drag: { id: number; x: number; y: number; t: number; dx: number; mode: 0 | 1 | -1; hist: [number, number][] } | null = null
  let back: gsap.core.Tween | null = null
  on(panel, 'pointerdown', (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || !isMobile() || (e.target as HTMLElement).closest('button')) return
    back?.kill()
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, mode: 0, hist: [[e.timeStamp, e.clientX]] }
  })
  on(panel, 'pointermove', (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    if (drag.mode === 0) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) drag.mode = -1
      else if (Math.abs(dx) > 8) {
        drag.mode = 1
        panel.setPointerCapture?.(e.pointerId)
      }
    }
    if (drag.mode !== 1) return
    drag.dx = dx
    drag.hist.push([e.timeStamp, e.clientX])
    if (drag.hist.length > 6) drag.hist.shift()
    const f = faces[active]
    f.style.transform = `translate3d(${dx}px,0,0)`
    f.style.opacity = String(Math.max(0.4, 1 - Math.abs(dx) / 400))
  })
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return
    const d = drag
    drag = null
    if (d.mode !== 1) return
    const [t0, x0] = d.hist[0]
    const v = (e.clientX - x0) / Math.max(1, e.timeStamp - t0) // px/ms
    const f = faces[active]
    if (e.type !== 'pointercancel' && (Math.abs(d.dx) >= 48 || Math.abs(v) >= 0.4)) {
      const step = d.dx < 0 ? 1 : -1
      select((active + step + N) % N, { dir: step, axis: 'x', fromX: d.dx })
      return
    }
    // not far enough: spring home from where the finger left it
    const s = { x: d.dx }
    back = gsap.to(s, {
      x: 0,
      ...springTween('touch'),
      onUpdate: () => {
        f.style.transform = `translate3d(${s.x}px,0,0)`
        f.style.opacity = String(Math.max(0.4, 1 - Math.abs(s.x) / 400))
      },
      onComplete: () => {
        f.style.transform = ''
        f.style.opacity = ''
      },
    })
  }
  on(panel, 'pointerup', endDrag)
  on(panel, 'pointercancel', endDrag)
  offs.push(() => back?.kill())

  // ── E3 (re)org: activating 05 again shuffles the rows, then they settle back.
  //    Transform only: DOM order and reading order never change.
  let reorgBusy = false
  const reorgTimers: number[] = []
  const settleReorg = () => {
    reorgTimers.splice(0).forEach((t) => clearTimeout(t))
    ys.forEach((s) => (s.target = 0))
    reorgBusy = false
    kick()
  }
  const reorg = () => {
    if (reorgBusy || isMobile()) return
    void playEgg('reorg', () => {
      reorgBusy = true
      const h = tabs[0].offsetHeight
      const order = [...tabs.keys()].sort(() => Math.random() - 0.5)
      if (order.every((v, k) => v === k)) order.reverse()
      // 05 always moves, so the lens has somewhere to go
      if (order[4] === 4) {
        const j = (4 + 1 + Math.floor(Math.random() * 6)) % N
        ;[order[4], order[j]] = [order[j], order[4]]
      }
      const q = (fn: () => void, ms: number) => reorgTimers.push(later(fn, ms))
      order.forEach((slot, k) =>
        q(() => {
          ys[k].target = (slot - k) * h
          kick()
        }, k * 30),
      )
      q(() => aim(4), 260)
      q(() => {
        ys.forEach((s, k) =>
          q(() => {
            s.target = 0
            kick()
          }, (N - 1 - k) * 30),
        )
        q(() => {
          aim(4)
          reorgBusy = false
        }, 300)
      }, 1500)
      return 2300
    })
  }

  // ── E2 cycle time: a loop drawn with the cursor (lemon:turn); while 03 is open a fast one shows
  let cycleBusy = false
  const readBest = () => {
    try {
      const v = Number(localStorage.getItem(BEST_KEY))
      return v > 0 ? v : null
    } catch {
      return null
    }
  }
  const onTurn = (secs: number) => {
    if (active !== 2 || secs >= CYCLE_MAX || cycleBusy) return
    const best = readBest()
    if (best !== null && secs >= best) return
    const newBest = best !== null
    void playEgg('cycle', () => {
      cycleBusy = true
      try {
        localStorage.setItem(BEST_KEY, secs.toFixed(3))
      } catch {
        /* the egg still plays */
      }
      timeEl.textContent = `${secs.toFixed(2)} s`
      timeEl.classList.remove('hl', 'is-in')
      if (newBest) timeEl.classList.add('hl')
      countWrap.classList.add('is-time')
      if (newBest) later(() => timeEl.classList.add('is-in'), 350)
      later(() => countWrap.classList.remove('is-time'), 500 + 1800)
      later(() => {
        timeEl.classList.remove('hl', 'is-in')
        cycleBusy = false
      }, 500 + 1800 + 520)
      return 2820
    })
  }
  root.addEventListener('lemon:turn', ((e: CustomEvent<{ secs: number }>) => onTurn(e.detail.secs)) as EventListener)

  // ── start: the lens waits for real font metrics so it never lands at a fallback size
  let ro: ResizeObserver | null = null
  const ready = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1200))])
  void ready.then(() => {
    lensH = lens.offsetHeight
    aim(active, true)
    lens.style.transition = 'opacity 300ms cubic-bezier(0.16,1,0.3,1)'
    lens.style.opacity = '1'
    ro = new ResizeObserver(() => {
      lensH = lens.offsetHeight
      aim(active, true)
    })
    ro.observe(list)
  })

  return () => {
    offs.forEach((f) => f())
    timers.forEach((t) => clearTimeout(t))
    stop?.()
    ro?.disconnect()
    running.forEach((a) => a.cancel())
  }
}

// ───────────────────────── lemon ─────────────────────────

function initLemon(root: HTMLElement): Lemon {
  const el = root.querySelector<HTMLElement>('[data-lemon]')
  const fruit = el?.querySelector<HTMLElement>('.lemon__fruit')
  const card = root.querySelector<HTMLElement>('.values__card')
  // where people read: the lemon fades back while it passes under these
  const reading = [...root.querySelectorAll<HTMLElement>('.values__slot, .values__list, .pc')]
  if (!el || !fruit || !card) return { hop() {}, destroy() {} }

  const rm = reducedMotion()
  const fine = finePointer()
  const X = new Spring(0, ...SPRING.follow)
  const Y = new Spring(0, ...SPRING.follow)
  const R = new Spring(0, ...SPRING.follow) // tilt, degrees
  const H = new Spring(0, ...SPRING.touch) // the hop
  let size = el.offsetWidth || 180
  let acc = 0 // signed horizontal travel, px
  let extra = 0 // frames added by hops and the touch idle
  let frame = -1
  let placed = false
  let inView = false
  let idle = 0
  let wasInside = false
  // E2: a "turn" is a loop drawn with the cursor (the heading of the pointer turns a
  // full 360 degrees one way). A straight sweep, however fast, is not a loop, so the
  // egg never fires on the way to a tab.
  let loopAng = 0 // signed heading change, radians
  let loopT = 0
  let lastHead: number | null = null
  let slowFor = 0
  const OFF = 18 // the lemon's box starts here from the cursor: the fruit itself sits ~30px away

  const rest = (r: DOMRect) => {
    const c = card.getBoundingClientRect()
    const top = card.dataset.lemonRest === 'top'
    // on a narrow card the top right holds the arrows: the lemon peeks over the top edge's middle
    const x = top && c.width < 560 ? c.left - r.left + c.width * 0.5 - size * 0.5 : c.right - r.left - size * 0.64
    // the hand art (work.art.ts) names the free corner: above the top right when it takes the lower right
    const y = top ? c.top - r.top - size * 0.42 : c.bottom - r.top - size * 0.6
    return { x: clamp(x, 0, r.width - size - 4), y: clamp(y, 0, r.height - size) }
  }
  const paintFrame = () => {
    const f = (((Math.floor(acc / FRAME_PX) + extra) % FRAMES) + FRAMES) % FRAMES
    if (f !== frame) {
      frame = f
      fruit.style.setProperty('--f', String(f))
    }
  }
  const paint = () => {
    el.style.transform = `translate3d(${X.value.toFixed(2)}px,${(Y.value + H.value).toFixed(2)}px,0)`
    fruit.style.transform = Math.abs(R.value) > 0.01 ? `rotate(${R.value.toFixed(2)}deg)` : ''
    paintFrame()
  }

  const tick = (p: typeof pointer.state, dt: number) => {
    if (!inView) return
    const r = root.getBoundingClientRect()
    const inside = fine && !rm && p.inside && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom
    if (!placed) {
      const s = rest(r)
      X.set(s.x)
      Y.set(s.y)
      placed = true
      el.classList.add('is-on')
    }
    let faint = false
    if (inside) {
      faint = reading.some((z) => {
        const b = z.getBoundingClientRect()
        return p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom
      })
      X.target = clamp(p.x - r.left + OFF, 0, r.width - size)
      Y.target = clamp(p.y - r.top + OFF, 0, r.height - size)
    } else {
      const s = rest(r)
      X.target = s.x
      Y.target = s.y
    }
    el.classList.toggle('is-faint', faint)
    if (inside !== wasInside) {
      wasInside = inside
      lastHead = null
      loopAng = 0
    }
    if (rm) {
      X.set(X.target)
      Y.set(Y.target)
      paint()
      return
    }
    const px = X.value
    X.step(dt)
    Y.step(dt)
    const dx = X.value - px
    acc += dx
    R.target = clamp((dx / Math.max(dt, 1e-3)) * 0.015, -12, 12)
    R.step(dt)
    H.step(dt)
    // touch: idle at rest with the v3 stop-motion turn, one frame every 400ms
    if (!fine) {
      idle += dt
      if (idle >= 0.4) {
        idle = 0
        extra++
      }
    }
    // E2: time each loop drawn while the lemon follows
    if (inside) {
      const now = performance.now()
      if (p.speed > 240) {
        slowFor = 0
        const head = Math.atan2(p.vy, p.vx)
        if (lastHead === null) {
          lastHead = head
          loopAng = 0
          loopT = now
        } else {
          let d = head - lastHead
          if (d > Math.PI) d -= 2 * Math.PI
          if (d < -Math.PI) d += 2 * Math.PI
          lastHead = head
          // turning back the other way starts a new loop
          if (loopAng !== 0 && Math.sign(d) !== Math.sign(loopAng) && Math.abs(d) > 0.08) {
            loopAng = d
            loopT = now
          } else loopAng += d
          if (Math.abs(loopAng) >= 2 * Math.PI) {
            root.dispatchEvent(new CustomEvent('lemon:turn', { detail: { secs: (now - loopT) / 1000 } }))
            loopAng = 0
            loopT = now
          }
        }
      } else if ((slowFor += dt) > 0.2) lastHead = null
    }
    paint()
  }

  let unsub: (() => void) | null = null
  const io = new IntersectionObserver(
    ([e]) => {
      inView = e.isIntersecting
      if (inView && !unsub) unsub = pointer.subscribe(tick)
      else if (!inView && unsub) {
        unsub()
        unsub = null
      }
    },
    { rootMargin: '120px 0px' },
  )
  io.observe(root)
  const ro = new ResizeObserver(() => {
    size = el.offsetWidth || size
    if (rm && placed) {
      const s = rest(root.getBoundingClientRect())
      X.set(s.x)
      Y.set(s.y)
      paint()
    }
  })
  ro.observe(root)

  const hopTimers: number[] = []
  return {
    hop() {
      if (rm) return
      // an impulse up on the touch spring (about -10px at the top), and three extra frames over 300ms
      H.velocity -= 400
      ;[0, 100, 200].forEach((ms) => hopTimers.push(window.setTimeout(() => extra++, ms)))
    },
    destroy() {
      io.disconnect()
      ro.disconnect()
      unsub?.()
      hopTimers.forEach((t) => clearTimeout(t))
    },
  }
}

import { pointer, type PointerState } from './cursor'
import { Spring, clamp } from './spring'
import { INTENT, SPRING, finePointer, reducedMotion } from './motion'

// Cursor companions (docs/FOUNDATION.md, "Companions"). The lemon's behaviour from
// How we work (MOTION-CHALLENGE 1.20), made reusable: a halftone sprite that trails the
// pointer inside one zone, turns through its frames with the distance it travels, rests
// on a spot of its own when the pointer leaves, idles on touch, steps back to 40% over
// text, never takes a pointer event, and stops when its zone is off screen.
//
//   const c = createCompanion(card, {
//     sprite: '/img/companions/raspberry', frames: 10, frameSize: 132, size: 132,
//     rest: (zone, size) => ({ x: zone.width - size - 56, y: 380 }),
//   })
//   c.hold(true)   // step aside (back to rest, hidden) while the card's own moment plays
//   c.destroy()
//
// Sprite files: `${sprite}-${frameSize}.webp` (1x strip) and `${sprite}-${frameSize * 2}.webp`
// (2x strip), one row of frames; `${sprite}-violet-…` for html[data-theme="violet"]
// (the lib/theme.ts naming rule), swapped on the window 'theme:change' event. Build them with scripts/companions/build.py.
//
// Flavours:
//   roll  the lemon: SPRING.follow per axis, frame = distance / (circumference / frames),
//         tilt with horizontal speed. Touch idles with a stepped turn (one frame per 400ms).
//   turn  same follow, a vector shape (opts.svg) that rotates continuously with distance.
//   hop   a bird: it covers the distance in short ballistic hops (wing frames in the air),
//         and when the pointer rests (800ms) it flies to a perch (opts.perch) and stays.
//
// One companion is visible page-wide: a companion whose zone holds the pointer wins; on
// touch or with reduced motion, the companion whose zone is most in view (50%+) shows.
// Reduced motion: static, frame 0, at its rest spot. Off screen: no frame is computed.

export type Flavour = 'roll' | 'turn' | 'hop'
export type Point = { x: number; y: number }
/** a forbidden area in zone px */
export type Rect = { x0: number; y0: number; x1: number; y1: number }

export type CompanionEvent =
  | { type: 'turn'; secs: number } // a full turn of the frames (roll, turn)
  | { type: 'perched'; at: Point } // a hop companion landed on its perch (zone px, box top-left)
  | { type: 'flew' } // it left the perch
  | { type: 'show' }
  | { type: 'hide' }

export interface CompanionOptions {
  /** sprite base url without size, e.g. '/img/companions/raspberry' (ignored with svg) */
  sprite: string
  frames: number
  /** px of one frame in the 1x strip (the 2x strip is twice that) */
  frameSize: number
  /** on-screen size in CSS px, or a function of the zone's width */
  size: number | ((zoneWidth: number) => number)
  /** the rest spot, top-left of the companion box in zone px */
  rest: (zone: DOMRect, size: number) => Point
  onEgg?: (e: CompanionEvent) => void
  flavour?: Flavour
  /** a vector companion (flavour 'turn'): inline SVG markup, painted with currentColor */
  svg?: string
  /** box offset from the cursor in px (roll, turn). The lemon uses 18 */
  offset?: number
  /** where people read inside the zone: the companion fades to 40% over these */
  reading?: string
  /** hop: the perch for a resting pointer, top-left of the box in zone px */
  perch?: (zone: DOMRect, size: number, pointer: Point) => Point
  /** hop: the frame's feet line, 0..1 of the box height (default .8) */
  feet?: number
  /** extra class on the element */
  className?: string
  /**
   * Areas the companion's body never enters, crosses or rests on (zone px), e.g. the
   * product and the hand in a brand photo. Called every frame: return a cached array.
   * The target is clamped out of them (over a zone it waits at the nearest allowed
   * spot), a roller is pushed out along their edge, a hopper routes over the top edge
   * (opts.perch's line) when a hop would cross one, and the rest spot is clamped too.
   */
  avoid?: (zone: DOMRect, size: number) => Rect[]
  /**
   * Violet mode: where the companion sits on the page ground rather than on a photo.
   * Photos keep their colours in both themes, so over a photo the companion keeps the
   * paper print (black dots, white body); on the ground it crossfades (500ms) to the
   * -violet print, as the Biird tittles turn ink once they leave the photo. Omitted:
   * always on the ground (the violet print whenever the theme is violet).
   */
  onGround?: (x: number, y: number, size: number) => boolean
  /** the visible body inside the box, fractions [x0, y0, x1, y1] facing right (default .16 to .84) */
  body?: [number, number, number, number]
}

export interface Companion {
  el: HTMLElement
  /** true: step aside (glide to rest and hide) until released, e.g. while a card moment plays */
  hold(on: boolean): void
  /** a little impulse up and three extra frames (the lemon's values hop) */
  hop(): void
  /** current box position in zone px, its size, and whether it sits on its perch */
  readonly state: { x: number; y: number; size: number; perched: boolean; visible: boolean; facing: 1 | -1 }
  /** turn to face a point (hop flavour), zone px */
  face(x: number): void
  destroy(): void
}

// ───────── one visible companion, page-wide ─────────
type Claim = { want: number; apply(show: boolean): void }
const claims = new Set<Claim>()
let shown: Claim | null = null
function arbitrate() {
  let best: Claim | null = null
  for (const c of claims) if (c.want > 0 && (!best || c.want > best.want)) best = c
  if (best === shown) return
  shown?.apply(false)
  shown = best
  shown?.apply(true)
}

const FLAP = [2, 3, 4, 3] // hop flavour: wing frames in the air

// The violet theme (lib/theme.ts: html[data-theme="violet"], window 'theme:change'). Kept
// local so this module does not depend on theme.ts; the naming rule is the same as
// themedSrc(): '-violet' before the size, '/img/companions/bird-150.webp' to 'bird-violet-150.webp'.
const THEME_EVENT = 'theme:change'
const themed = (base: string, px: number, violet: boolean) => `${base}${violet ? '-violet' : ''}-${px}.webp`

export function createCompanion(zone: HTMLElement, opts: CompanionOptions): Companion {
  const flavour: Flavour = opts.flavour ?? (opts.svg ? 'turn' : 'roll')
  const rm = reducedMotion()
  const fine = finePointer()
  const feet = opts.feet ?? 0.8

  const el = document.createElement('div')
  el.className = `companion companion--${flavour}${opts.className ? ` ${opts.className}` : ''}`
  el.setAttribute('aria-hidden', 'true')
  const body = document.createElement('span')
  body.className = 'companion__body'
  el.append(body)
  if (opts.svg) body.innerHTML = opts.svg
  // two prints of the same frames: paper (always) and violet (over the page ground in violet mode)
  const prints = opts.svg ? [] : [document.createElement('span'), document.createElement('span')]
  prints.forEach((pr, i) => {
    Object.assign(pr.style, {
      position: 'absolute',
      inset: '0',
      backgroundRepeat: 'no-repeat',
      transition: 'opacity var(--dur-ui, 500ms) var(--ease, ease)',
      opacity: i ? '0' : '1',
    } satisfies Partial<CSSStyleDeclaration>)
    body.append(pr)
  })
  const [paperPrint, violetPrint] = prints
  zone.append(el)
  // the element's own styles, so a section needs no CSS to host one
  Object.assign(el.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    zIndex: '3',
    pointerEvents: 'none',
    opacity: '0',
    willChange: 'transform, opacity',
    transition: 'opacity var(--dur-ui, 500ms) var(--ease, ease)',
  } satisfies Partial<CSSStyleDeclaration>)
  Object.assign(body.style, { position: 'relative', display: 'block', width: '100%', height: '100%', transformOrigin: '50% 50%' })

  let violet = false
  let grounded = !opts.onGround
  const paintSprite = () => {
    if (opts.svg) return
    violet = document.documentElement.dataset.theme === 'violet'
    const set = (pr: HTMLElement, v: boolean) => {
      const a = themed(opts.sprite, opts.frameSize, v)
      const b = themed(opts.sprite, opts.frameSize * 2, v)
      pr.style.backgroundImage = `image-set(url("${a}") 1x, url("${b}") 2x)`
    }
    set(paperPrint, false)
    if (violet) set(violetPrint, true) // the violet file loads only in violet mode
    paintPrint()
  }
  const paintPrint = () => {
    if (opts.svg) return
    const v = violet && grounded
    violetPrint.style.opacity = v ? '1' : '0'
    paperPrint.style.opacity = v ? '0' : '1'
  }
  paintSprite()

  // ───────── geometry ─────────
  let size = 0
  let zr = zone.getBoundingClientRect()
  let readingEls: HTMLElement[] = []
  const measure = () => {
    zr = zone.getBoundingClientRect()
    const s = typeof opts.size === 'function' ? opts.size(zr.width) : opts.size
    if (s !== size) {
      size = Math.round(s)
      el.style.width = el.style.height = `${size}px`
      prints.forEach((pr) => (pr.style.backgroundSize = `${size * opts.frames}px ${size}px`))
      frame = -1
    }
  }
  const findReading = () => (readingEls = opts.reading ? [...zone.querySelectorAll<HTMLElement>(opts.reading)] : [])
  findReading()

  const X = new Spring(0, ...SPRING.follow)
  const Y = new Spring(0, ...SPRING.follow)
  const R = new Spring(0, ...SPRING.follow) // tilt, degrees
  const H = new Spring(0, ...SPRING.touch) // the hop impulse
  let acc = 0 // signed horizontal travel, px
  let extra = 0 // frames added by hops and the touch idle
  let frame = -1
  let facing: 1 | -1 = 1
  let placed = false
  let visible = false
  let held = false
  let inView = false
  let ratio = 0
  let idle = 0
  let turnT = performance.now()
  let turnAcc = 0

  // ───────── forbidden areas (opts.avoid) ─────────
  const MARGIN = 10
  const bodyF = opts.body ?? [0.16, 0.16, 0.84, 0.84]
  let zones: Rect[] = []
  const bodyAt = (x: number, y: number, f: 1 | -1 = facing): Rect => {
    const [a, b, c, d] = bodyF
    const l = f > 0 ? a : 1 - c
    const r = f > 0 ? c : 1 - a
    return { x0: x + l * size, y0: y + b * size, x1: x + r * size, y1: y + d * size }
  }
  const hitsAt = (x: number, y: number, f: 1 | -1 = facing) => {
    if (!zones.length) return false
    // the perch line (the card's top edge) and the air above it are always allowed
    if (opts.perch && y <= -size * feet + 0.5) return false
    const b = bodyAt(x, y, f)
    return zones.some((z) => b.x0 < z.x1 + MARGIN && b.x1 > z.x0 - MARGIN && b.y0 < z.y1 + MARGIN && b.y1 > z.y0 - MARGIN)
  }
  const minY = () => (opts.perch ? -size * feet : 0)
  /** the nearest box position whose body is clear of every zone, or null */
  const clear = (x: number, y: number): Point | null => {
    if (!hitsAt(x, y)) return { x, y }
    const b = bodyAt(x, y)
    const cands: Point[] = []
    for (const z of zones) {
      cands.push(
        { x: x - (b.x1 - (z.x0 - MARGIN)) - 0.5, y },
        { x: x + (z.x1 + MARGIN - b.x0) + 0.5, y },
        { x, y: y - (b.y1 - (z.y0 - MARGIN)) - 0.5 },
        { x, y: y + (z.y1 + MARGIN - b.y0) + 0.5 },
      )
    }
    // corners too, for a box wedged between two zones
    const n = cands.length
    for (let i = 0; i < n; i += 2) for (let j = 2; j < n; j += 4) cands.push({ x: cands[i].x, y: cands[j].y })
    let best: Point | null = null
    let bd = Infinity
    for (const c of cands) {
      const p = { x: clamp(c.x, 0, Math.max(0, zr.width - size)), y: clamp(c.y, minY(), Math.max(minY(), zr.height - size)) }
      if (hitsAt(p.x, p.y)) continue
      const d = Math.hypot(p.x - x, p.y - y)
      if (d < bd) ((bd = d), (best = p))
    }
    return best
  }
  const allowed = (p: Point, fallback: Point): Point => clear(p.x, p.y) ?? fallback
  const restRaw = () => opts.rest(zr, size)
  const topLine = () => -size * feet
  const restPt = () => {
    const r = restRaw()
    // the rest spot stays out of the zones too: clear of them, or on the top edge
    return clear(r.x, r.y) ?? { x: r.x, y: opts.perch ? topLine() : r.y }
  }
  const atRest = () => {
    const r = restPt()
    return flavour === 'hop'
      ? mode === 'ground' && Math.hypot(r.x - px, r.y - py) < 1
      : X.settled && Y.settled && Math.hypot(r.x - X.value, r.y - Y.value) < 1
  }
  const circumference = () => Math.PI * size * 0.72

  const setFrame = (f: number) => {
    f = ((f % opts.frames) + opts.frames) % opts.frames
    if (f === frame) return
    frame = f
    prints.forEach((pr) => (pr.style.backgroundPosition = `${-f * size}px 0`))
  }
  const paint = (x: number, y: number, tilt: number, spin = 0) => {
    if (violet && opts.onGround) {
      const g = opts.onGround(x, y, size)
      if (g !== grounded) ((grounded = g), paintPrint())
    }
    el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`
    const parts: string[] = []
    if (flavour === 'hop' && facing < 0) parts.push('scaleX(-1)')
    const rot = tilt + spin
    if (Math.abs(rot) > 0.01) parts.push(`rotate(${rot.toFixed(2)}deg)`)
    body.style.transform = parts.join(' ')
  }

  // ───────── visibility claim ─────────
  const claim: Claim = {
    want: 0,
    apply(show) {
      visible = show
      if (show) {
        el.style.transitionDelay = '0ms'
        el.style.opacity = faint ? '0.4' : '1'
        opts.onEgg?.({ type: 'show' })
      } else {
        // a companion sent home fades once it is nearly there (it glides back first)
        el.style.transitionDelay = rm ? '0ms' : '260ms'
        el.style.opacity = '0'
        opts.onEgg?.({ type: 'hide' })
      }
    },
  }
  claims.add(claim)
  let faint = false
  const setFaint = (f: boolean) => {
    if (f === faint) return
    faint = f
    if (visible) el.style.opacity = f ? '0.4' : '1'
  }
  const want = (inside: boolean) => {
    // the pointer in this zone outranks any zone that is merely in view
    const w = held ? 0 : inside ? 2 + ratio : !fine || rm ? (ratio >= 0.5 && inView ? ratio : 0) : 0
    if (w !== claim.want) {
      claim.want = w
      arbitrate()
    }
  }

  // ───────── hop flavour: ground, crouch, air ─────────
  type Flight = { x0: number; y0: number; x1: number; y1: number; t: number; dur: number; h: number; long: boolean }
  let mode: 'ground' | 'crouch' | 'air' = 'ground'
  let flight: Flight | null = null
  let px = 0 // the bird's box, zone px
  let py = 0
  let ground = 1 // s on the ground since the last landing
  let crouch = 0 // s left of the take-off crouch
  let perched = false
  let toPerch = false // the flight under way ends on the perch

  const fly = (x1: number, y1: number, long: boolean, h?: number) => {
    const d = Math.hypot(x1 - px, y1 - py)
    if (Math.abs(x1 - px) > 2) facing = x1 > px ? 1 : -1
    flight = {
      x0: px,
      y0: py,
      x1,
      y1,
      t: 0,
      dur: long ? clamp(0.42 + d / 900, 0.5, 0.95) : clamp(0.2 + d / 1100, 0.22, 0.34),
      h: h ?? arcH(d, long),
      long,
    }
    mode = 'air'
    if (perched) {
      perched = false
      opts.onEgg?.({ type: 'flew' })
    }
  }
  /** one step towards dest: a short hop, or the whole way when long */
  const stepTowards = (dest: Point, long: boolean): Point => {
    const d = Math.hypot(dest.x - px, dest.y - py)
    const max = long ? Infinity : Math.max(size * 1.1, 90)
    const k = Math.min(1, max / Math.max(d, 1e-3))
    return { x: px + (dest.x - px) * k, y: py + (dest.y - py) * k }
  }

  const arcH = (d: number, long: boolean) => (long ? clamp(d * 0.22, 24, 70) : clamp(d * 0.3 + 10, 12, 44))
  /** does the hop from here to b, on its arc, keep the body out of every zone? */
  const pathFree = (b: Point, long: boolean) => {
    if (!zones.length) return true
    const d = Math.hypot(b.x - px, b.y - py)
    const h = arcH(d, long)
    const f: 1 | -1 = b.x >= px ? 1 : -1
    for (let i = 1; i <= 16; i++) {
      const k = i / 16
      if (hitsAt(px + (b.x - px) * k, py + (b.y - py) * k - 4 * h * k * (1 - k), f)) return false
    }
    return true
  }
  /** the next hop towards dest that never crosses a zone: direct, else over the top edge, else wait */
  const route = (dest: Point, long: boolean): { p: Point; long: boolean } | null => {
    const step = stepTowards(dest, long)
    const s = clear(step.x, step.y)
    if (s && Math.hypot(s.x - px, s.y - py) > 4 && pathFree(s, long)) return { p: s, long }
    if (!zones.length || !opts.perch) return null
    const top = topLine()
    if (Math.abs(py - top) > 2) {
      // climb to the top edge first (straight up, when that is clear)
      const up = { x: px, y: top }
      return pathFree(up, true) || hitsAt(px, py) ? { p: up, long: true } : null
    }
    // along the top edge to above the destination, then down if the drop is clear
    if (Math.abs(px - dest.x) > 4) return { p: { x: clamp(dest.x, 0, zr.width - size), y: top }, long: true }
    return pathFree(dest, true) ? { p: dest, long: true } : null
  }

  const stepHop = (dt: number, dest: Point | null, long: boolean) => {
    if (mode === 'air' && flight) {
      flight.t += dt
      const k = Math.min(1, flight.t / flight.dur)
      // ballistic: x at constant speed, y on a parabola
      px = flight.x0 + (flight.x1 - flight.x0) * k
      py = flight.y0 + (flight.y1 - flight.y0) * k - 4 * flight.h * k * (1 - k)
      setFrame(FLAP[Math.floor(flight.t * (flight.long ? 16 : 22)) % FLAP.length])
      if (k >= 1) {
        flight = null
        mode = 'ground'
        ground = 0
        if (toPerch) {
          toPerch = false
          perched = true
          opts.onEgg?.({ type: 'perched', at: { x: px, y: py } })
        }
      }
    } else if (mode === 'crouch') {
      crouch -= dt
      setFrame(1)
      if (crouch <= 0) {
        const next = dest && Math.hypot(dest.x - px, dest.y - py) >= 6 ? route(dest, long) : null
        if (!next) mode = 'ground'
        else {
          toPerch = perchWanted && next.p.x === dest!.x && next.p.y === dest!.y
          fly(next.p.x, next.p.y, next.long)
        }
      }
    } else {
      ground += dt
      setFrame(ground < 0.09 ? 1 : 0) // lands in a crouch, then stands
      if (hitsAt(px, py) && opts.perch) {
        // the photo changed under it: up to the top edge at once
        perched = false
        fly(px, topLine(), true)
      } else if (dest && !perched && ground > 0.06 && Math.hypot(dest.x - px, dest.y - py) > 18) {
        mode = 'crouch'
        crouch = 0.07 // the anticipation before take-off
      }
    }
    paint(px, py, 0)
  }
  let perchWanted = false

  // ───────── the tick ─────────
  let wasInside = false
  let touchHop = 0
  const tick = (p: PointerState, dt: number) => {
    if (!inView) return
    measure()
    zones = opts.avoid ? opts.avoid(zr, size) : []
    const inside = fine && p.inside && p.x >= zr.left && p.x <= zr.right && p.y >= zr.top && p.y <= zr.bottom
    want(inside)
    if (!placed) {
      const r = restPt()
      X.set(r.x)
      Y.set(r.y)
      px = r.x
      py = r.y
      placed = true
      setFrame(0)
    }
    if (inside !== wasInside) wasInside = inside
    // nothing to draw: hidden, home and still
    if (!visible && claim.want === 0 && el.style.opacity === '0' && atRest()) return

    // over words people read, it steps back
    let f = false
    if (inside && visible) {
      const cx = zr.left + X.value + size / 2
      const cy = zr.top + Y.value + size / 2
      const hx = flavour === 'hop' ? zr.left + px + size / 2 : cx
      const hy = flavour === 'hop' ? zr.top + py + size / 2 : cy
      f = readingEls.some((z) => {
        const b = z.getBoundingClientRect()
        return hx >= b.left && hx <= b.right && hy >= b.top && hy <= b.bottom
      })
    }
    setFaint(f)

    if (rm) {
      const r = restPt()
      X.set(r.x)
      Y.set(r.y)
      px = r.x
      py = r.y
      setFrame(0)
      paint(r.x, r.y, 0)
      return
    }

    const lx = p.x - zr.left
    const ly = p.y - zr.top
    const active = inside && !held && claim === shown

    if (flavour === 'hop') {
      const still = inside && performance.now() - p.lastMove > INTENT.eggDwell
      let dest: Point | null = null
      let long = false
      perchWanted = active && still && !!opts.perch
      if (perchWanted) {
        // the pointer rests: fly to the perch and stay
        if (!perched) {
          const pt = opts.perch!(zr, size, { x: lx, y: ly })
          dest = allowed(pt, pt)
          long = true
        }
      } else if (active) {
        if (perched) {
          perched = false
          opts.onEgg?.({ type: 'flew' })
        }
        // beside the cursor, on the side it already stands, feet about level with the tip
        const side = px + size / 2 < lx ? -1 : 1
        const tx = side < 0 ? lx - size * 0.86 : lx + size * 0.06
        const ty = ly - size * feet + 6
        const want = { x: clamp(tx, 0, zr.width - size), y: clamp(ty, -size * feet, zr.height - size) }
        // over a zone it waits at the nearest allowed spot instead of following
        dest = allowed(want, { x: clamp(want.x, 0, zr.width - size), y: topLine() })
        if (mode === 'ground' && Math.abs(lx - (px + size / 2)) > 4) facing = lx > px + size / 2 ? 1 : -1
      } else {
        const r = restPt()
        if (Math.hypot(r.x - px, r.y - py) > 2) {
          dest = r
          long = true
        } else if (!fine && mode === 'ground' && visible) {
          // touch idle: a hop on the spot every 2.6s, now and then turning round
          touchHop += dt
          if (touchHop > 2.6) {
            touchHop = 0
            if (Math.random() < 0.45) facing = facing > 0 ? -1 : 1
            fly(px, py, false, 12)
          }
        }
      }
      stepHop(dt, dest, long)
      return
    }

    // roll and turn: the lemon
    if (active) {
      const off = opts.offset ?? 18
      const t = { x: clamp(lx + off, 0, zr.width - size), y: clamp(ly + off, 0, zr.height - size) }
      // over a zone it waits at the nearest allowed spot instead of following
      const a = allowed(t, restPt())
      X.target = a.x
      Y.target = a.y
    } else {
      const r = restPt()
      X.target = r.x
      Y.target = r.y
    }
    const before = X.value
    const beforeY = Y.value
    X.step(dt)
    Y.step(dt)
    if (hitsAt(X.value, Y.value)) {
      // it never rolls across a zone: pushed back out along the edge it met
      const c = clear(X.value, Y.value)
      if (c) {
        if (c.x !== X.value) X.velocity = 0
        if (c.y !== Y.value) Y.velocity = 0
        X.value = c.x
        Y.value = c.y
      } else {
        X.value = before
        Y.value = beforeY
        X.velocity = Y.velocity = 0
      }
    }
    const dx = X.value - before
    acc += dx
    R.target = flavour === 'turn' ? 0 : clamp((dx / Math.max(dt, 1e-3)) * 0.015, -12, 12)
    R.step(dt)
    H.step(dt)
    if (!fine && !active) {
      idle += dt
      if (idle >= 0.4) {
        idle = 0
        extra++
      }
    }
    // a full turn of the frames, timed (the lemon's E2 hook)
    turnAcc += Math.abs(dx)
    if (turnAcc >= circumference()) {
      const now = performance.now()
      opts.onEgg?.({ type: 'turn', secs: (now - turnT) / 1000 })
      turnT = now
      turnAcc = 0
    }
    const per = circumference() / opts.frames
    if (flavour === 'turn') {
      const deg = (acc / (size * 0.36)) * (180 / Math.PI) + extra * (360 / opts.frames)
      paint(X.value, Y.value + H.value, R.value, deg)
    } else {
      setFrame(Math.floor(acc / per) + extra)
      paint(X.value, Y.value + H.value, R.value)
    }
  }
  // ───────── lifecycle: tick only while the zone is (nearly) on screen ─────────
  let unsub: (() => void) | null = null
  const io = new IntersectionObserver(
    (es) => {
      const e = es[es.length - 1]
      inView = e.isIntersecting
      ratio = e.intersectionRatio
      if (inView && !unsub) unsub = pointer.subscribe(tick)
      else if (!inView && unsub) {
        unsub()
        unsub = null
        want(false)
      }
      if (inView) want(wasInside)
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  )
  io.observe(zone)
  const ro = new ResizeObserver(() => {
    measure()
    findReading()
    if (rm && placed) {
      const r = restPt()
      paint(r.x, r.y, 0)
    }
  })
  ro.observe(zone)
  const onTheme = () => paintSprite()
  window.addEventListener(THEME_EVENT, onTheme)
  measure()
  const r0 = restPt()
  paint(r0.x, r0.y, 0)
  setFrame(0)

  return {
    el,
    hold(on) {
      if (held === on) return
      held = on
      want(wasInside)
    },
    hop() {
      if (rm) return
      H.velocity -= 400
      ;[0, 100, 200].forEach((ms) => window.setTimeout(() => extra++, ms))
    },
    get state() {
      const hopper = flavour === 'hop'
      return { x: hopper ? px : X.value, y: hopper ? py : Y.value, size, perched, visible, facing }
    },
    face(x) {
      facing = x > px + size / 2 ? 1 : -1
      paint(px, py, 0)
    },
    destroy() {
      io.disconnect()
      ro.disconnect()
      unsub?.()
      window.removeEventListener(THEME_EVENT, onTheme)
      claims.delete(claim)
      if (shown === claim) {
        shown = null
        arbitrate()
      }
      el.remove()
    },
  }
}

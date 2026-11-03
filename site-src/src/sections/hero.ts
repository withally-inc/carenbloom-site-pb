import './hero.css'
import { gsap } from 'gsap'
import { introDone } from '../chrome/preloader'
import { odometer } from '../lib/odometer'
import { bindLiveTip } from '../lib/livetip'
import { LINES_LANDED } from '../lib/split'
import { pulse, whileVisible } from '../lib/live'
import { onReturn, playEgg } from '../lib/eggs'
import { EASE, EASE_CSS, allowBlur, reducedMotion, springTween } from '../lib/motion'
import { clamp, damp } from '../lib/spring'
import { onTheme, themedSrc, themedSrcset } from '../lib/theme'

// Hero: the manifesto. MOTION-CHALLENGE 1.8 to 1.11 and E1.
//   entrance()   the first impression, one piece after another, from the moment the intro lands
//   breathing    the wordmark ampersand, the one loop above the fold (CSS)
//   ticker       the live counter: "+1" every 23 s, "≈ +N" after an absence (E1); the dot's live tip
//   scrub        the rose blooms over the first 40vh of scroll, every stage drawn in order

const TICK_MS = 23000
const FIRST_TICK_DELAY = 2400 // after the odometer lands, so every visitor sees one
const FRAMES = 49 // bloom-seq: every second frame of the 97-frame source (docs/ASSETS.md)
const SEQ_W = 538 // bloom-seq frame size
const SEQ_H = 720
// violet mode scrubs its own frames (bloom-violet-NN.webp, docs/ASSETS.md)
const frameSrc = (i: number) => themedSrc(`/img/bloom-seq/bloom-${String(i).padStart(2, '0')}.webp`)

export function init(root: HTMLElement): () => void {
  const cleanups: (() => void)[] = []
  const rm = reducedMotion()
  try {
    const odo = setupCounter(root, rm, cleanups)
    const scrub = setupScrub(root, rm, cleanups)
    const breath = setupBreath(root, cleanups)
    entrance(root, rm, odo, scrub, breath, cleanups)
  } catch (err) {
    root.classList.add('is-static')
    throw err
  }
  return () => cleanups.forEach((f) => f())
}

// ───────────────────────── entrance (1.11) ─────────────────────────
// First visit, after the preloader bloom has put the mark in the nav (~0.85s), in seconds:
//   0.00  "Care", "&", "Bloom" rise from their masks, 70ms apart
//   0.30  the ampersand settles (a small spring), then breathes from 1.0
//   0.18  the brand line, one sentence per line
//   0.34  the rose rises into place as the bud (its paper veil lifts, it climbs 5%)
//   0.52  the counter rolls
//   0.70  dot, caption, then the record link
// Everything has landed about 2s after the page opened. Repeat visits (no preloader) run the
// same order 1.45x faster, settled in about 1s. Nothing ever blocks the scroll.
function entrance(
  root: HTMLElement,
  rm: boolean,
  counter: { play: () => void },
  scrub: { revealed: () => void },
  breath: { start: () => void },
  cleanups: (() => void)[],
) {
  const title = root.querySelector<HTMLElement>('.hero__title')!
  const line = root.querySelector<HTMLElement>('.hero__line')!
  const words = root.querySelectorAll<HTMLElement>('.hero__word')
  const amp = root.querySelector<HTMLElement>('.hero__amp')!
  const lines = root.querySelectorAll<HTMLElement>('.hero__ln > span')
  const media = root.querySelector<HTMLElement>('.hero__media')!
  const inner = root.querySelector<HTMLElement>('.hero__media-inner')!
  const veil = root.querySelector<HTMLElement>('.hero__veil')
  const beats = root.querySelectorAll<HTMLElement>('.hero__beat')
  const link = root.querySelector<HTMLElement>('.hero__link')!
  let started = false
  let tl: gsap.core.Timeline | null = null
  const firstVisit = document.documentElement.classList.contains('cb-curtain')

  const play = () => {
    if (started) return
    started = true
    // take over the CSS hidden state with inline styles, then let CSS go
    if (rm) {
      gsap.set([...words, ...lines, media, ...beats, link], { opacity: 0 })
    } else {
      // y: 0 explicitly: GSAP parses the CSS hidden state (translateY(118%)) into px `y`, and
      // a yPercent tween on top of it would end 118% low, then pop into place on clearProps
      gsap.set([...words, ...lines], { y: 0, yPercent: 118, rotate: 2.5, transformOrigin: '0% 100%' })
      gsap.set(inner, { y: 0, yPercent: 5 })
      if (veil) gsap.set(veil, { scaleY: 1 })
      gsap.set([...beats, link], { opacity: 0, y: 14, filter: allowBlur() ? 'blur(6px)' : 'none' })
    }
    // the figure stays hidden until its odometer plays, never a flash of the final value
    gsap.set(root.querySelector('.hero__figure'), { opacity: 0 })
    root.classList.add('is-played')

    tl = gsap.timeline({ defaults: { ease: EASE } })
    if (rm) {
      tl.to([...words, ...lines, media], { opacity: 1, duration: 0.4, clearProps: 'opacity' }, 0)
      tl.call(() => counter.play(), [], 0)
      tl.to([...beats, link], { opacity: 1, duration: 0.4, clearProps: 'opacity' }, 0.1)
      tl.call(() => land(title), [], 0.4)
      tl.call(() => land(line), [], 0.4)
      return
    }
    // 0.00 the wordmark
    tl.to(words, { yPercent: 0, rotate: 0, duration: 0.8, stagger: 0.07, clearProps: 'transform' }, 0)
    tl.call(() => land(title), [], 0.14 + 0.8)
    // 0.30 the ampersand settles as it lands, then starts breathing
    const sp = springTween('touch')
    tl.fromTo(amp, { scale: 1.12, rotate: -7 }, { scale: 1, rotate: 0, duration: sp.duration, ease: sp.ease, clearProps: 'transform' }, 0.3)
    tl.call(() => breath.start(), [], 1.0)
    // 0.18 the brand line
    tl.to(lines, { yPercent: 0, rotate: 0, duration: 0.8, stagger: 0.06, clearProps: 'transform' }, 0.18)
    tl.call(() => land(line), [], 0.18 + 0.12 + 0.8)
    // 0.34 the rose rises into place, already the bud
    if (veil) tl.to(veil, { scaleY: 0, duration: 0.85, onComplete: () => void (veil.style.display = 'none') }, 0.34)
    tl.to(inner, { yPercent: 0, duration: 1.0, clearProps: 'transform' }, 0.34)
    tl.call(() => scrub.revealed(), [], 0.34 + 0.5)
    // 0.52 the counter
    tl.call(() => counter.play(), [], 0.52)
    // 0.70 the secondary line: dot, caption, then the link
    tl.to(beats, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, stagger: 0.05, clearProps: 'opacity,transform,filter' }, 0.7)
    tl.to(link, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, clearProps: 'opacity,transform,filter' }, 0.82)
    if (!firstVisit) tl.timeScale(1.45)
  }

  // same contract as lib/split.ts: .landed lifts the mask clipping, then 'lines:landed'
  const land = (el: HTMLElement) => {
    if (el.classList.contains('landed')) return
    el.classList.add('landed')
    el.dispatchEvent(new CustomEvent(LINES_LANDED))
  }

  void introDone().then(() => {
    // fonts first, or the masks are measured on the fallback face
    const fonts = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 700))])
    void fonts.then(play)
  })
  // the intro never resolved: show the hero anyway
  const failsafe = window.setTimeout(play, 5000)
  cleanups.push(() => {
    clearTimeout(failsafe)
    tl?.kill()
  })
}

// ───────────────────────── breathing ampersand (1.9) ─────────────────────────
function setupBreath(root: HTMLElement, cleanups: (() => void)[]) {
  const title = root.querySelector<HTMLElement>('.hero__title')!
  // paused while the hero is off-screen (hidden tabs pause CSS on their own)
  const io = new IntersectionObserver(([e]) => root.classList.toggle('is-away', !e.isIntersecting))
  io.observe(title)
  cleanups.push(() => io.disconnect())
  return {
    start: () => {
      if (!reducedMotion()) root.classList.add('is-breathing')
    },
  }
}

// ───────────────────────── live counter (1.8 + E1) ─────────────────────────
function setupCounter(root: HTMLElement, rm: boolean, cleanups: (() => void)[]) {
  const fig = root.querySelector<HTMLElement>('.hero__figure')!
  const dot = root.querySelector<HTMLElement>('.hero__dot')!
  const plus = root.querySelector<HTMLElement>('.hero__plus')!
  const counter = root.querySelector<HTMLElement>('.hero__counter')!
  // the dot is a button: hover, focus or tap shows today's and this visit's pace estimates,
  // which roll with each "+1" (lib/livetip.ts)
  const tip = bindLiveTip(dot, { selfTick: false })
  cleanups.push(() => tip.destroy())
  // "1,000,000+" is a claim cap: the odometer lands on it and never moves again
  const odo = odometer(fig, fig.dataset.value ?? '1,000,000+')
  // the hero drives its own odometer: keep it out of the reveal runner
  delete fig.dataset.odo

  let started = false
  let live = false // counter on screen and tab visible
  let timer = 0
  let nextAt = 0
  const anims: Animation[] = []

  const fire = (n: number) => {
    const away = n > 1
    plus.textContent = away ? `≈ +${n}` : '+1'
    const dur = away ? 2600 : 1600
    pulse(dot, away ? 2 : 1)
    tip.tick()
    anims.forEach((a) => a.cancel())
    anims.length = 0
    anims.push(
      plus.animate([{ transform: 'translateY(4px) scale(.9)' }, { transform: 'translateY(-18px) scale(1)' }], { duration: dur, easing: EASE_CSS }),
      plus.animate([{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: dur, easing: 'linear' }),
    )
  }
  const arm = (ms: number) => {
    clearTimeout(timer)
    nextAt = performance.now() + ms
    if (live) timer = window.setTimeout(tick, ms)
  }
  const tick = () => {
    fire(1)
    arm(TICK_MS)
  }
  // back on screen: keep the rhythm, never a catch-up burst
  const resume = () => {
    const now = performance.now()
    let rem = nextAt - now
    if (rem <= 0) rem = TICK_MS - ((now - nextAt) % TICK_MS)
    clearTimeout(timer)
    timer = window.setTimeout(tick, Math.max(rem, 1200))
  }

  const offVisible = whileVisible(counter, (v) => {
    live = v
    if (!started) return
    if (v) resume()
    else clearTimeout(timer)
  })

  // E1, while you were away: the next tick carries the arithmetic of the absence,
  // N = floor(seconds away / 23), shown only for 2 <= N <= 99 (lib/eggs.ts guards it)
  const offReturn = onReturn(
    (secondsAway) => {
      const n = Math.floor(secondsAway / 23)
      if (!started || n < 2 || n > 99) return // whileVisible already resumed the rhythm
      // let whileVisible resume first, then replace its next tick with "≈ +N"
      window.setTimeout(() => {
        if (!live) return
        clearTimeout(timer)
        timer = window.setTimeout(() => {
          void playEgg('away', () => {
            fire(n)
            return 2600
          }).then((ran) => ran || fire(1)) // another egg is playing: an ordinary tick
          arm(TICK_MS)
        }, 700)
      }, 0)
    },
    { min: 46 },
  )

  cleanups.push(() => {
    clearTimeout(timer)
    offVisible()
    offReturn()
    anims.forEach((a) => a.cancel())
  })

  return {
    play: () => {
      const t = odo.play()
      if (rm) return // no "+1" under reduced motion: the caption carries the claim
      t.eventCallback('onComplete', () => {
        started = true
        arm(FIRST_TICK_DELAY)
      })
    },
  }
}

// ───────────────────────── rose scrub (1.10) ─────────────────────────
// The bloom always plays through every stage, in order, whatever the network, the CPU or
// the way the visitor scrolls:
// - the 49 frames load right after the poster (the LCP still), strictly in order, a few at a
//   time, each decoded before it may be drawn;
// - the drawn position chases the scroll but never passes the last frame of the unbroken
//   decoded run (frames 0..k all ready), and never moves more than one frame per display
//   frame (and at most ~56 frames a second): a flick plays the whole bloom in under a
//   second instead of cutting from bud to flower;
// - neighbouring frames blend only in the last 30% of each step, so motion reads as growth
//   and no frame is a double exposure for long; at rest the position settles on a whole frame;
// - while the rose is off-screen the position follows the scroll at once (nobody sees it).
// No crossfade between the closed and open stills anywhere: reduced motion shows the open
// still, nothing moves.
function setupScrub(root: HTMLElement, rm: boolean, cleanups: (() => void)[]) {
  const media = root.querySelector<HTMLElement>('.hero__media')!
  const inner = root.querySelector<HTMLElement>('.hero__media-inner')!
  // one still per theme (hero.html); the hidden one is display:none and never loads
  const stills = [...root.querySelectorAll<HTMLImageElement>('.hero__still')]
  const activeStill = () => stills.find((s) => s.offsetParent !== null || s.getClientRects().length) ?? stills[0]
  const still = activeStill()
  const canvas = root.querySelector<HTMLCanvasElement>('.hero__canvas')!
  const noop = { revealed: () => {} }

  // reduced motion: the <picture> already shows the open flower, nothing moves
  if (rm) {
    canvas.remove()
    return noop
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return noop
  }
  canvas.width = SEQ_W
  canvas.height = SEQ_H

  // frame-index trace for QA (?bloomtrace): every draw, in order
  type Trace = { t: number; f: number; a: number; goal: number; ready: number; p: number }
  const trace: Trace[] | null = /[?&]bloomtrace\b/.test(location.search) ? [] : null
  if (trace) (window as unknown as { __bloomTrace: Trace[] }).__bloomTrace = trace

  // ImageBitmaps once decoded: an <img> that is not in the document can lose its decoded
  // pixels, and drawImage then decodes it again on the main thread mid-scroll
  const frames: (HTMLImageElement | ImageBitmap | null)[] = Array(FRAMES).fill(null)
  let ready = -1 // frames 0..ready are all decoded

  // the crisp open still (896 wide on large screens) replaces the last frame at rest, same pixels
  // registration, never a fade
  const end = new Image()
  end.className = 'hero__end'
  end.alt = ''
  end.decoding = 'async'
  end.width = 896
  end.height = 1200
  end.sizes = still.sizes
  let endReady = false

  const BLEND = 0.3
  const MAX_RATE = 56 // frames per second
  let vh = window.innerHeight
  let d = 0 // drawn position, in frames
  let drawnKey = ''
  let ticking = false
  let inView = false // the observer reports the first state right away
  let revealed = false
  let shown: 'still' | 'canvas' | 'end' = 'still'
  let lastP = -1
  let restFor = 0

  const show = (which: typeof shown) => {
    if (which === shown) return
    shown = which
    stills.forEach((s) => (s.style.opacity = which === 'still' ? '' : '0'))
    canvas.style.opacity = which === 'canvas' ? '1' : '0'
    end.style.opacity = which === 'end' ? '1' : '0'
  }

  const progress = () => clamp(window.scrollY / (0.4 * vh), 0, 1)

  const paint = (p: number, goal: number) => {
    if (ready < 0 || d <= 0.0005) {
      if (drawnKey !== 'still') trace?.push({ t: performance.now(), f: 0, a: 0, goal, ready, p })
      drawnKey = 'still'
      show('still')
      return
    }
    const lo = Math.min(Math.floor(d + 1e-6), ready)
    const frac = d - lo
    const hi = Math.min(lo + 1, ready)
    const a = hi > lo ? clamp((frac - (1 - BLEND)) / BLEND, 0, 1) : 0
    const atEnd = lo === FRAMES - 1 && endReady && restFor > 0.15
    const key = atEnd ? 'end' : `${lo}:${a.toFixed(2)}`
    if (key === drawnKey) return
    drawnKey = key
    trace?.push({ t: performance.now(), f: lo, a: +a.toFixed(2), goal, ready, p })
    if (atEnd) {
      show('end')
      return
    }
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, SEQ_W, SEQ_H)
    ctx.drawImage(frames[lo]!, 0, 0)
    if (a > 0) {
      ctx.globalAlpha = a
      ctx.drawImage(frames[hi]!, 0, 0)
      ctx.globalAlpha = 1
    }
    show('canvas')
  }

  const update = (_t: number, dtMs: number) => {
    const dt = Math.min(dtMs / 1000, 0.1)
    const p = progress()
    if (p !== lastP) {
      lastP = p
      restFor = 0
    } else restFor += dt
    const target = p * (FRAMES - 1)
    // at rest, settle on a whole frame (at most half a step, ~4px of scroll)
    let goal = restFor > 0.15 ? Math.round(target) : target
    // the rose holds the bud until its entrance has risen; never past the decoded run
    if (!revealed) goal = 0
    goal = Math.min(goal, Math.max(ready, 0))
    if (!inView) {
      d = goal
    } else {
      const want = Math.abs(goal - d) < 0.002 ? goal - d : damp(d, goal, 14, dt) - d
      const cap = Math.min(1, MAX_RATE * dt)
      d += clamp(want, -cap, cap)
    }
    if (inView) paint(p, goal)
    // a newly decoded frame wakes the ticker again (advance)
    if (d === goal && restFor > 0.2) sleep()
  }
  const wake = () => {
    if (ticking) return
    ticking = true
    gsap.ticker.add(update)
  }
  const sleep = () => {
    if (!ticking) return
    ticking = false
    gsap.ticker.remove(update)
  }

  const onResize = () => {
    vh = window.innerHeight
    wake()
  }
  // back/forward cache: the page comes back as it was left; make sure the drawn frame matches
  const onShow = (e: PageTransitionEvent) => {
    if (e.persisted) {
      drawnKey = ''
      wake()
    }
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('scroll', wake, { passive: true })
  window.addEventListener('pageshow', onShow)

  // off-screen, the position follows the scroll without drawing; on return it is already right
  const io = new IntersectionObserver(([e]) => {
    inView = e.isIntersecting
    wake()
  })
  io.observe(media)

  // frames: in order, right after the poster, four in flight, each decoded before it counts
  let cancelled = false
  let gen = 0 // bumped on a theme switch: frames of the other theme are dropped
  const advance = () => {
    const before = ready
    while (ready + 1 < FRAMES && frames[ready + 1]) ready++
    if (ready !== before) wake()
  }
  const loadFrame = (i: number, g = gen) =>
    new Promise<void>((resolve) => {
      if (g !== gen) return resolve()
      const img = new Image()
      img.decoding = 'async'
      ;(img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = i < 8 ? 'high' : 'auto'
      img.src = frameSrc(i)
      const keep = (f: HTMLImageElement | ImageBitmap) => {
        if (!cancelled && g === gen) {
          frames[i] = f
          advance()
        } else if ('close' in f) f.close()
        resolve()
      }
      const done = () => {
        if (typeof createImageBitmap === 'function') createImageBitmap(img).then(keep, () => keep(img))
        else keep(img)
      }
      img
        .decode()
        .then(done)
        // a decode can reject on a busy main thread or a slow cache: retry once after load
        .catch(() => (img.complete && img.naturalWidth ? done() : img.addEventListener('load', () => img.decode().then(done, done), { once: true })))
    })
  const loadAll = async () => {
    const g = gen
    let next = 0
    const worker = async () => {
      while (!cancelled && g === gen && next < FRAMES) await loadFrame(next++, g)
    }
    await Promise.all([worker(), worker(), worker(), worker()])
    if (cancelled || g !== gen) return
    // the crisp open still, last: only used when it is sharper than the frames
    end.srcset = themedSrcset('/img/hero-end-480.webp 480w, /img/hero-end-896.webp 896w')
    end.src = themedSrc('/img/hero-end-896.webp')
    inner.appendChild(end)
    end
      .decode()
      .then(() => {
        if (g !== gen) return
        endReady = end.naturalWidth > SEQ_W
        drawnKey = ''
        wake()
      })
      .catch(() => {})
  }
  const afterPoster = () => requestAnimationFrame(() => void loadAll())
  if (still.complete) afterPoster()
  else {
    still.addEventListener('load', afterPoster, { once: true })
    still.addEventListener('error', afterPoster, { once: true })
  }

  // a theme switch: the other theme's frames load (cached after the first switch) and the
  // drawn position is kept; until they arrive the still of the new theme shows
  const offTheme = onTheme(() => {
    gen++
    frames.forEach((f) => f && 'close' in f && f.close()) // free the bitmaps of the theme left
    frames.fill(null)
    ready = -1
    endReady = false
    drawnKey = ''
    const s = activeStill()
    if (s.complete) afterPoster()
    else {
      s.addEventListener('load', afterPoster, { once: true })
      s.addEventListener('error', afterPoster, { once: true })
    }
    wake()
  })

  wake()
  cleanups.push(() => {
    offTheme()
    cancelled = true
    sleep()
    io.disconnect()
    window.removeEventListener('resize', onResize)
    window.removeEventListener('scroll', wake)
    window.removeEventListener('pageshow', onShow)
  })

  return {
    // the scrub follows the scroll once the rose has risen (a scroll during the entrance
    // then plays the bloom through every stage)
    revealed: () => {
      revealed = true
      wake()
    },
  }
}

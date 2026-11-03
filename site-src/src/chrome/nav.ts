import { gsap } from 'gsap'
import { Spring, loop } from '../lib/spring'
import { EASE, SPRING, finePointer, reducedMotion, springTween } from '../lib/motion'
import { isProgrammatic, lockScroll, onProgrammaticEnd, onScroll, scrollToTarget } from '../lib/lenis'
import { ROLES_EVENT, type RoleCountState } from '../lib/roles'
import { ICON_PATH, buildPetals, iconSVG, openPetals, type Petals } from '../lib/bloom'
import { pulse } from '../lib/live'
import { FLOOD_MS, bindThemeToggle, initTheme, toggleTheme } from '../lib/theme'

// The Care & Bloom nav (docs/nav-sketches/DECISION.md): the mark is the compass.
// Four petals, four destinations, clockwise as you read: N Brands, E People,
// S How we work, W Careers (the footer on home). Functional spec from
// MOTION-CHALLENGE 1.1 to 1.4, 1.26 and 2.6:
// - scroll-spy with 400ms hysteresis on "nothing current"; frozen during anchor jumps;
//   a destination becomes current on pointerdown; hash landings render on the first frame
// - the current petal of the mark stays full ink, the other three fade (opacity only);
//   at the top of the page, with nothing current, the mark is whole
// - desktop: a petal bullet beside the current destination; the line recedes while
//   reading down (24px past 120px) to the mark and the count on two seals, and comes
//   back on a band after 48px up, near the top, on focus, or with the pointer in the top 72px
// - the mark turns 45deg and goes cobalt on hover and focus (SPRING.touch); a click on it
//   switches violet mode (lib/theme.ts): it turns a quarter while the new theme floods
//   from it. The wordmark is the home link; on home it scrolls to the top instead of
//   reloading
// - ink tone while the line overlaps a .surface-ink section
// - below 960px the mark is the menu button: it turns a quarter and its petals unfold
//   into the four quarters of a paper panel; focus is trapped, Escape and back close it.
//   The violet-mode switch lives in the menu there (.panel__theme)

export type NavKey = 'brands' | 'people' | 'work' | 'careers'
const KEYS: NavKey[] = ['brands', 'people', 'work', 'careers'] // petals N, E, S, W

export type Nav = {
  el: HTMLElement
  cluster: HTMLElement
  icon: SVGSVGElement
  setActive: (k: NavKey | null, instant?: boolean) => void
  setCompact: (on: boolean) => void
  destroy: () => void
}

type State = 'top' | 'band' | 'seal'

/** buildPetals() tags its groups .petal, a class section CSS also styles (work.css
 *  turns every .petal 45deg). The chrome's marks take their own class. */
export function chromePetals(svg: SVGSVGElement): Petals {
  const p = buildPetals(svg)
  p.petals.forEach((g) => g.setAttribute('class', 'cb-chrome-petal'))
  return p
}
const FADED = 0.26 // the petals of the sections you are not reading
const isHome = () => document.body.dataset.page === 'home'
const DESKTOP = '(min-width: 960px)'

export function createNav(): Nav | null {
  const bar = document.querySelector<HTMLElement>('[data-nav]')
  if (!bar) return null
  const cluster = bar.querySelector<HTMLElement>('.nav__cluster')!
  const icon = bar.querySelector<SVGSVGElement>('.nav__icon')!
  const home = bar.querySelector<HTMLAnchorElement>('.nav__home')!
  const themeBtn = bar.querySelector<HTMLButtonElement>('.nav__theme')
  const roles = bar.querySelector<HTMLAnchorElement>('.nav__roles')
  const links = [...bar.querySelectorAll<HTMLAnchorElement>('.nav__link')]
  const panel = bar.querySelector<HTMLElement>('.panel')
  const quarters = panel ? [...panel.querySelectorAll<HTMLAnchorElement>('.quarter')] : []
  const page = document.body.dataset.page
  const isCareers = page === 'careers' || page === 'apply'
  const cleanups: (() => void)[] = [initTheme()]

  // ── petal bullets: one shared petal (its outer silhouette: with the inner
  //    cutout it reads as a letter at 11px), drawn by reference ──
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  defs.setAttribute('aria-hidden', 'true')
  defs.setAttribute('width', '0')
  defs.setAttribute('height', '0')
  defs.style.position = 'absolute'
  defs.innerHTML = `<defs><clipPath id="cb-nav-petal"><polygon points="21,21 -30,-30 72,-30"/></clipPath><path id="cb-nav-icon" d="${ICON_PATH.slice(0, ICON_PATH.indexOf('Z') + 1)}"/></defs>`
  bar.prepend(defs)
  links.forEach((a) => {
    const slot = a.querySelector('.nav__bullet')
    if (slot) slot.innerHTML = '<svg viewBox="12 0 18 21" focusable="false"><use href="#cb-nav-icon" fill="currentColor" clip-path="url(#cb-nav-petal)"/></svg>'
  })

  let menu: ReturnType<typeof bindMenu> | null = null

  // ── the mark as compass ──
  let petals: Petals | null = null
  let active: NavKey | null = null
  let whole = false // hovered or focused: the whole mark turns
  const opacities = (k: NavKey | null) => KEYS.map((key) => (whole || !k || key === k ? 1 : FADED))
  function paintMark(instant = false) {
    const i = active && !whole ? KEYS.indexOf(active) : -1
    if (i < 0 && !petals) return // still the whole, seamless mark
    petals ??= chromePetals(icon)
    const p = petals
    p.split()
    const ops = opacities(active)
    gsap.to(p.petals, {
      opacity: (j: number) => ops[j],
      duration: instant || reducedMotion() ? 0 : 0.5,
      ease: EASE,
      overwrite: 'auto',
      onComplete: () => {
        if (!active || whole) p.settle()
      },
    })
  }

  function setActive(k: NavKey | null, instant = false) {
    if (k === active) return
    active = k
    ;[...links, ...quarters].forEach((a) => {
      if (a.dataset.key === k) a.setAttribute('aria-current', k === 'careers' && isCareers ? 'page' : 'location')
      else a.removeAttribute('aria-current')
    })
    paintMark(instant)
    menu?.repaint()
  }

  // a destination becomes current as it is pressed, so the petal moves during the
  // unload of a page change, and the next page renders it in place. Never preventDefault.
  let spyFrozenUntil = 0
  ;[...links, ...quarters].forEach((a) => {
    a.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      spyFrozenUntil = performance.now() + 1500
      setActive(a.dataset.key as NavKey)
    })
  })

  // ── the mark turns a quarter of a petal on hover and focus (SPRING.touch) ──
  const turn = new Spring(0, SPRING.touch[0], SPRING.touch[1])
  let extra = 0 // the quarter turn of a theme switch, on top of the hover turn
  const writeTurn = () => {
    const d = turn.value + extra
    icon.style.transform = Math.abs(d) > 0.001 ? `rotate(${d.toFixed(3)}deg)` : ''
  }
  let turnStop: (() => void) | null = null
  const spin = (deg: number) => {
    if (whole !== !!deg) {
      whole = !!deg
      paintMark()
    }
    turn.target = deg
    if (reducedMotion()) {
      turn.set(deg)
      writeTurn()
      return
    }
    if (turnStop) return
    turnStop = loop((dt) => {
      turn.step(dt)
      writeTurn()
      if (turn.settled) {
        turnStop = null
        writeTurn()
        return false
      }
    })
  }
  const hoverTarget = themeBtn ?? home
  if (finePointer()) {
    hoverTarget.addEventListener('pointerenter', () => spin(45))
    hoverTarget.addEventListener('pointerleave', () => spin(0))
  }
  hoverTarget.addEventListener('focus', () => spin(45))
  hoverTarget.addEventListener('blur', () => spin(0))

  // ── violet mode: the mark turns a quarter (its four petals land on each other, so it
  //    ends where it started) while the new theme floods from it ──
  let quarter: gsap.core.Tween | null = null
  const quarterTurn = () => {
    if (reducedMotion()) return
    const t = { v: extra }
    quarter?.kill()
    quarter = gsap.to(t, {
      v: 90,
      duration: FLOOD_MS / 1000,
      ease: EASE,
      onUpdate: () => {
        extra = t.v
        writeTurn()
      },
      onComplete: () => {
        extra = 0
        writeTurn()
      },
    })
  }
  if (themeBtn) {
    cleanups.push(bindThemeToggle(themeBtn, (t) => (t === 'violet' ? 'Switch to light mode' : 'Switch to violet mode')))
    const onTheme = (e: MouseEvent) => {
      e.preventDefault()
      quarterTurn()
      void toggleTheme(icon)
    }
    themeBtn.addEventListener('click', onTheme)
    // desktop only: below 960px the menu button covers the mark and the switch is in the menu
    const mqDesk = window.matchMedia(DESKTOP)
    const syncDesk = () => {
      if (mqDesk.matches) {
        themeBtn.removeAttribute('tabindex')
        themeBtn.removeAttribute('aria-hidden')
      } else {
        themeBtn.setAttribute('tabindex', '-1')
        themeBtn.setAttribute('aria-hidden', 'true')
      }
    }
    syncDesk()
    mqDesk.addEventListener('change', syncDesk)
    cleanups.push(() => {
      themeBtn.removeEventListener('click', onTheme)
      mqDesk.removeEventListener('change', syncDesk)
    })
  }
  // on home the lockup never reloads: at the top it does nothing, scrolled it goes back up
  home.addEventListener('click', (e) => {
    if (!isHome() || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    if (window.scrollY > 4) scrollToTarget(0)
  })

  // ── E8 "bloom": the mark closes and re-blooms (eggs.ts dispatches egg:bloom) ──
  const onBloomEgg = () => {
    if (reducedMotion()) return
    petals ??= chromePetals(icon)
    const p = petals
    spin(45)
    window.setTimeout(() => spin(0), 520)
    p.split()
    gsap.killTweensOf(p.petals, 'opacity') // the compass fade hands over to the egg
    gsap.to(p.states, {
      scale: 0,
      rotate: -50,
      opacity: 0,
      duration: 0.3,
      ease: 'expo.out',
      overwrite: 'auto',
      onComplete: () => void openPetals(p, { stagger: 0.075 }).then(() => paintMark()),
    })
  }
  window.addEventListener('egg:bloom', onBloomEgg)
  cleanups.push(() => window.removeEventListener('egg:bloom', onBloomEgg))

  // ── "Back to top" from the footer bloom: the mark answers with its own turn on arrival ──
  const onAnswer = () => {
    if (reducedMotion()) return
    spin(45)
    window.setTimeout(() => spin(0), 520)
  }
  window.addEventListener('nav:answer', onAnswer)
  cleanups.push(() => window.removeEventListener('nav:answer', onAnswer))

  // ── reading: the line recedes to the mark and the count, with hysteresis ──
  const setState = (s: State) => {
    if (bar.dataset.state !== s) bar.dataset.state = s
  }
  const expand = () => setState(window.scrollY < 80 ? 'top' : 'band')
  const setCompact = (on: boolean) => (on ? setState('seal') : expand())
  if (window.scrollY >= 80) setState('band') // restored scroll or hash landing
  let lastY = window.scrollY
  let run = 0 // cumulative distance since the last direction change (+ down, - up)
  let jumpFrom = window.scrollY
  let wasProgrammatic = false
  cleanups.push(
    onScroll((y) => {
      const dy = y - lastY
      lastY = y
      if (bar.hasAttribute('data-open')) return
      if (isProgrammatic()) {
        if (!wasProgrammatic) jumpFrom = y - dy
        wasProgrammatic = true
        run = 0
        return
      }
      wasProgrammatic = false
      if (y < 80) {
        setState('top')
        run = 0
        return
      }
      if ((dy > 0 && run < 0) || (dy < 0 && run > 0)) run = 0
      run += dy
      if (run > 24 && y > 120) setState('seal')
      else if (run < -48) setState('band')
    }),
    onProgrammaticEnd(() => {
      const y = window.scrollY
      run = 0
      if (y < 80) setState('top')
      else setState(y > jumpFrom ? 'seal' : 'band')
    }),
  )
  bar.addEventListener('focusin', (e) => {
    if (!panel?.contains(e.target as Node)) expand()
  })
  if (finePointer()) {
    const onMove = (e: PointerEvent) => {
      if (e.clientY < 72 && bar.dataset.state === 'seal') expand()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    cleanups.push(() => window.removeEventListener('pointermove', onMove))
  }

  // ── page state: Careers on /careers; hash landing on the first frame; scroll-spy on home ──
  if (isCareers) setActive('careers', true)
  else {
    const hash = location.hash.slice(1)
    const landed = hash === 'spaces' ? 'brands' : hash === 'roles' ? null : (KEYS as string[]).includes(hash) ? (hash as NavKey) : null
    if (landed) {
      setActive(landed, true)
      spyFrozenUntil = performance.now() + 900
    }
    cleanups.push(scrollSpy(setActive, () => performance.now() < spyFrozenUntil || isProgrammatic()))
  }

  // ── ink tone over the one dark section ──
  cleanups.push(inkTone(bar))

  // ── open roles: the count fold opens when the API answers (roles:state, one fetch) ──
  if (roles) {
    const dot = roles.querySelector('.live-dot')
    let rang = false
    const apply = (state: RoleCountState) => {
      roles.dataset.count = state
      if (state === 'loading') roles.setAttribute('aria-label', 'Open roles, count loading')
      else if (state === 'error') roles.setAttribute('aria-label', 'Open roles, count unavailable')
      else roles.removeAttribute('aria-label')
      if (state === 'ready' && !rang) {
        rang = true
        window.setTimeout(() => pulse(dot), 450)
      }
    }
    const onRoles = (e: Event) => apply((e as CustomEvent<{ state: RoleCountState }>).detail.state)
    window.addEventListener(ROLES_EVENT, onRoles)
    cleanups.push(() => window.removeEventListener(ROLES_EVENT, onRoles))
    const cur = document.documentElement.dataset.rolesState as RoleCountState | undefined
    if (cur) apply(cur)
  }

  // ── mobile menu ──
  menu = panel ? bindMenu(bar, panel, icon, quarters, () => active) : null
  if (menu) cleanups.push(menu.destroy)

  // transitions only after the first frame: a hash landing never animates in
  requestAnimationFrame(() => requestAnimationFrame(() => bar.setAttribute('data-ready', '')))

  return {
    el: bar,
    cluster,
    icon,
    setActive,
    setCompact,
    destroy: () => cleanups.forEach((f) => f()),
  }
}

// The current destination follows the section crossing a line just above the middle
// of the screen. Sections opt in with data-spy="brands|people|work|careers" (How we
// work, #work, counts as "work" whatever its data-spy says). A gap with nothing spied
// applies only after 400ms; a section applies at once. Frozen while frozen() is true
// (anchor jumps, a destination just pressed), re-read on landing.
function scrollSpy(set: (k: NavKey | null) => void, frozen: () => boolean) {
  const sections = [...document.querySelectorAll<HTMLElement>('[data-spy]')]
  if (!sections.length) return () => {}
  const keyOf = (s: HTMLElement) => (s.id === 'work' ? 'work' : s.dataset.spy) as NavKey
  const visible = new Set<HTMLElement>()
  let nullTimer = 0
  const pick = () => {
    if (frozen()) return
    const on = sections.filter((s) => visible.has(s)).pop()
    if (on) {
      clearTimeout(nullTimer)
      nullTimer = 0
      set(keyOf(on))
    } else if (!nullTimer) {
      nullTimer = window.setTimeout(() => {
        nullTimer = 0
        if (!frozen() && !sections.some((s) => visible.has(s))) set(null)
      }, 400)
    }
  }
  const io = new IntersectionObserver(
    (es) => {
      es.forEach((e) => (e.isIntersecting ? visible.add(e.target as HTMLElement) : visible.delete(e.target as HTMLElement)))
      pick()
    },
    { rootMargin: '-42% 0px -52% 0px', threshold: 0 },
  )
  sections.forEach((s) => io.observe(s))
  const offLand = onProgrammaticEnd(() => setTimeout(pick, 50))
  // re-read once a freeze (destination pressed, hash landing) has expired
  const iv = window.setInterval(() => !frozen() && pick(), 500)
  return () => {
    io.disconnect()
    offLand()
    clearInterval(iv)
    clearTimeout(nullTimer)
  }
}

// data-tone="ink" while the line's band overlaps a .surface-ink section
function inkTone(bar: HTMLElement) {
  const inks = [...document.querySelectorAll<HTMLElement>('.surface-ink')]
  if (!inks.length) return () => {}
  const over = new Set<Element>()
  let io: IntersectionObserver | null = null
  const apply = () => {
    if (over.size) bar.dataset.tone = 'ink'
    else delete bar.dataset.tone
  }
  const build = () => {
    io?.disconnect()
    over.clear()
    const line = bar.querySelector<HTMLElement>('.nav__cluster')?.getBoundingClientRect().bottom ?? 72
    const bottom = Math.max(0, window.innerHeight - Math.round(line))
    io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => (e.isIntersecting ? over.add(e.target) : over.delete(e.target)))
        apply()
      },
      { rootMargin: `0px 0px -${bottom}px 0px`, threshold: 0 },
    )
    inks.forEach((el) => io!.observe(el))
  }
  build()
  let t = 0
  const onResize = () => {
    clearTimeout(t)
    t = window.setTimeout(build, 150)
  }
  window.addEventListener('resize', onResize)
  return () => {
    io?.disconnect()
    window.removeEventListener('resize', onResize)
  }
}

// ── the menu: the mark is the button; its petals unfold into four quarters ──
function bindMenu(
  bar: HTMLElement,
  panel: HTMLElement,
  icon: SVGSVGElement,
  quarters: HTMLAnchorElement[],
  current: () => NavKey | null,
) {
  const btn = bar.querySelector<HTMLButtonElement>('.nav__menu')!
  const ground = panel.querySelector<HTMLElement>('.panel__ground')!
  const closeBtn = panel.querySelector<HTMLButtonElement>('.panel__close')!
  const x = panel.querySelector<HTMLElement>('.panel__x')!
  const flower = panel.querySelector<HTMLElement>('.panel__flower')!
  const rules = [...panel.querySelectorAll<HTMLElement>('.panel__rule')]
  const labels = quarters.map((q) => q.firstElementChild as HTMLElement)
  const homeLink = panel.querySelector<HTMLAnchorElement>('.panel__home')!
  const foot = [...panel.querySelectorAll<HTMLElement>('.panel__foot > *')]
  const themeSwitch = panel.querySelector<HTMLButtonElement>('.panel__theme')
  const knob = panel.querySelector<HTMLElement>('.panel__knob')
  if (knob) knob.innerHTML = iconSVG('panel__knob-mark')
  const offThemeSync = themeSwitch ? bindThemeToggle(themeSwitch) : () => {}
  const onThemeSwitch = () => void toggleTheme(knob ?? themeSwitch)
  themeSwitch?.addEventListener('click', onThemeSwitch)
  flower.innerHTML = iconSVG('panel__mark')
  const fp = chromePetals(flower.querySelector('svg')!)
  // the flower barely opens (a unit apart), so it still reads as the mark
  const OPEN = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]
  // the labels start near the centre and are pushed out to their corners
  const PUSH = [
    [14, 14],
    [-14, 14],
    [-14, -14],
    [14, -14],
  ]
  let open = false
  let tl: gsap.core.Timeline | null = null
  let lastFocus: HTMLElement | null = null
  let pushed = false
  let afterPop: (() => void) | null = null
  let popTimer = 0

  const repaint = () => {
    const k = current()
    gsap.set(fp.petals, { opacity: (j: number) => (!k || KEYS[j] === k ? 1 : FADED) })
  }

  // centre of the bar's mark relative to the flower's resting box
  const fromMark = () => {
    gsap.set(flower, { clearProps: 'transform' })
    const a = icon.getBoundingClientRect()
    const b = flower.getBoundingClientRect()
    return {
      x: a.left + a.width / 2 - (b.left + b.width / 2),
      y: a.top + a.height / 2 - (b.top + b.height / 2),
      scale: a.width / b.width,
    }
  }

  const focusables = () => [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')]

  function show() {
    open = true
    lastFocus = document.activeElement as HTMLElement | null
    bar.setAttribute('data-open', '')
    panel.setAttribute('data-open', '')
    panel.inert = false
    btn.setAttribute('aria-expanded', 'true')
    lockScroll(true)
    try {
      history.pushState({ cbMenu: true }, '')
      pushed = true
    } catch {
      pushed = false
    }
    repaint()
    tl?.kill()
    const touch = springTween('touch')
    if (reducedMotion()) {
      gsap.set(flower, { x: 0, y: 0, scale: 1, rotate: -45 })
      gsap.set(fp.states, { x: (i: number) => OPEN[i][0], y: (i: number) => OPEN[i][1] })
      gsap.set([...labels, ...foot, ...rules, x], { clearProps: 'transform' })
      tl = gsap.timeline().fromTo([ground, flower, ...labels, ...foot, ...rules, x], { opacity: 0 }, { opacity: 1, duration: 0.2, ease: EASE })
    } else {
      const from = fromMark()
      tl = gsap
        .timeline({ defaults: { ease: EASE } })
        .set(icon, { opacity: 0 }, 0) // the flower leaves from exactly where the mark was
        .fromTo(ground, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0)
        .fromTo(flower, { ...from, rotate: 0, opacity: 1 }, { x: 0, y: 0, scale: 1, rotate: -45, duration: 0.9 }, 0)
        .fromTo(fp.states, { x: 0, y: 0 }, { x: (i: number) => OPEN[i][0], y: (i: number) => OPEN[i][1], duration: touch.duration, ease: touch.ease }, 0.42)
        .fromTo(rules, { opacity: 1, scale: 0 }, { scale: 1, duration: 1.1 }, 0.16)
        .fromTo(labels, { opacity: 0, x: (i: number) => PUSH[i][0], y: (i: number) => PUSH[i][1] }, { opacity: 1, x: 0, y: 0, duration: 0.9, stagger: 0.06 }, 0.2)
        .fromTo(foot, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.05 }, 0.32)
        .fromTo(x, { opacity: 0, scale: 0.4, rotate: -45 }, { opacity: 1, scale: 1, rotate: 0, duration: touch.duration, ease: touch.ease }, 0.14)
    }
    // focus the current destination; retried once visibility has flipped (reduced
    // motion keeps a short visibility transition, during which nothing is focusable)
    const first = quarters.find((q) => q.hasAttribute('aria-current')) ?? quarters[0]
    const focusFirst = () => open && !panel.contains(document.activeElement) && first?.focus({ preventScroll: true })
    focusFirst()
    requestAnimationFrame(focusFirst)
    window.setTimeout(focusFirst, 240)
  }

  function hide(opts: { restoreFocus?: boolean; fromPop?: boolean; then?: () => void } = {}) {
    if (!open) return
    open = false
    btn.setAttribute('aria-expanded', 'false')
    lockScroll(false)
    // the menu's history entry goes away first; the follow-up runs once it has
    if (pushed && !opts.fromPop && (history.state as { cbMenu?: boolean } | null)?.cbMenu) {
      afterPop = opts.then ?? null
      history.back()
      clearTimeout(popTimer)
      popTimer = window.setTimeout(() => runAfterPop(), 400) // never stuck if popstate is late
    } else opts.then?.()
    pushed = false
    tl?.kill()
    const done = () => {
      bar.removeAttribute('data-open')
      panel.removeAttribute('data-open')
      panel.inert = true
      gsap.set(icon, { clearProps: 'opacity' })
    }
    if (reducedMotion()) {
      tl = gsap.timeline({ onComplete: done }).to([ground, flower, ...labels, ...foot, ...rules, x], { opacity: 0, duration: 0.2, ease: EASE })
    } else {
      // exits take 40% of the entrance: the flower folds back into the mark
      const to = fromMark()
      gsap.set(flower, { x: 0, y: 0, scale: 1, rotate: -45 })
      tl = gsap
        .timeline({ defaults: { ease: EASE }, onComplete: done })
        .to([...labels, ...foot, x], { opacity: 0, duration: 0.18 }, 0)
        .to(rules, { scale: 0, duration: 0.3 }, 0)
        .to(fp.states, { x: 0, y: 0, duration: 0.3 }, 0)
        .to(flower, { ...to, rotate: 0, duration: 0.36 }, 0)
        .to(ground, { opacity: 0, duration: 0.3 }, 0.06)
    }
    if (opts.restoreFocus !== false) (lastFocus && lastFocus !== document.body && !panel.contains(lastFocus) ? lastFocus : btn).focus({ preventScroll: true })
  }

  function runAfterPop() {
    clearTimeout(popTimer)
    const fn = afterPop
    afterPop = null
    fn?.()
  }
  const onPop = () => {
    if (open) hide({ fromPop: true })
    runAfterPop()
  }

  // a destination in the menu: close, unwind the history entry, then go
  const go = (a: HTMLAnchorElement) => (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    const url = new URL(a.href, location.href)
    const samePage = url.origin === location.origin && url.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '')
    const id = decodeURIComponent(url.hash.slice(1))
    const target = samePage && id ? document.getElementById(id) : null
    hide({
      restoreFocus: false,
      then: () => {
        if (samePage && !id) {
          if (window.scrollY > 4) scrollToTarget(0)
          btn.focus({ preventScroll: true })
        } else if (target) {
          history.replaceState(null, '', `#${id}`)
          scrollToTarget(target, {
            onComplete: () => {
              if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
              target.focus({ preventScroll: true })
            },
          })
        } else location.assign(a.href)
      },
    })
  }
  const linkHandlers = [...quarters, homeLink, panel.querySelector<HTMLAnchorElement>('.panel__roles')]
    .filter((a): a is HTMLAnchorElement => !!a)
    .map((a) => {
      const h = go(a)
      a.addEventListener('click', h)
      return [a, h] as const
    })

  const onBtn = () => (open ? hide() : show())
  const onClose = () => hide()
  const onKey = (e: KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') {
      e.preventDefault()
      hide()
      return
    }
    if (e.key !== 'Tab') return
    const f = focusables()
    const i = f.indexOf(document.activeElement as HTMLElement)
    if (e.shiftKey && i <= 0) {
      e.preventDefault()
      f[f.length - 1].focus()
    } else if (!e.shiftKey && (i === f.length - 1 || i < 0)) {
      e.preventDefault()
      f[0].focus()
    }
  }
  const mq = window.matchMedia(DESKTOP)
  const onMq = () => {
    if (!mq.matches || !open) return
    hide({ restoreFocus: false })
    tl?.progress(1)
  }

  btn.addEventListener('click', onBtn)
  closeBtn.addEventListener('click', onClose)
  document.addEventListener('keydown', onKey)
  window.addEventListener('popstate', onPop)
  mq.addEventListener('change', onMq)
  return {
    repaint,
    destroy: () => {
      btn.removeEventListener('click', onBtn)
      closeBtn.removeEventListener('click', onClose)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('popstate', onPop)
      mq.removeEventListener('change', onMq)
      linkHandlers.forEach(([a, h]) => a.removeEventListener('click', h))
      themeSwitch?.removeEventListener('click', onThemeSwitch)
      offThemeSync()
    },
  }
}

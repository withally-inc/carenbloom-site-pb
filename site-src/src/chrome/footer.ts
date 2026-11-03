import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { buildPetals, openPetals, PETAL_CLOSED } from '../lib/bloom'
import { bindCopy } from '../lib/copy'
import { reducedMotion } from '../lib/motion'
import { scrollToTarget } from '../lib/lenis'
import { ROLES_EVENT, type RoleCountState } from '../lib/roles'
import { setSlot } from '../lib/slot'
import { pulse, pulseOnEnter } from '../lib/live'
import { onDwell, playEgg } from '../lib/eggs'

gsap.registerPlugin(ScrollTrigger)

// Footer: the live roles caption (swaps loading / ready / zero / error, count rolls,
// the dot pulses once on data and once on entering view), the copy button, the
// closing bloom scrubbed open as it scrolls in (never pinned) and used as the
// "Back to top" button, and egg E6.
export function initFooter(): () => void {
  const root = document.querySelector<HTMLElement>('[data-footer]')
  if (!root) return () => {}
  const off: (() => void)[] = []

  // ── live roles caption ──
  const slot = root.querySelector<HTMLElement>('[data-role-slot]')
  const dot = root.querySelector<HTMLElement>('.statement__count .live-dot')
  if (slot) {
    const apply = (state: RoleCountState) => {
      setSlot(slot, state)
      dot?.classList.toggle('live-dot--off', state === 'zero' || state === 'error')
      if (state === 'ready') pulse(dot)
    }
    const onRoles = (e: Event) => apply((e as CustomEvent<{ state: RoleCountState }>).detail.state)
    window.addEventListener(ROLES_EVENT, onRoles)
    off.push(() => window.removeEventListener(ROLES_EVENT, onRoles))
    const cur = document.documentElement.dataset.rolesState as RoleCountState | undefined
    if (cur) apply(cur)
  }
  off.push(pulseOnEnter(dot))

  const copy = root.querySelector<HTMLElement>('[data-copy]')
  if (copy) off.push(bindCopy(copy, undefined, { fallbackSelect: root.querySelector('.statement__email') ?? undefined }))

  // ── closing bloom ──
  const svg = root.querySelector<SVGSVGElement>('.footer__mark')
  if (svg && !reducedMotion()) {
    const p = buildPetals(svg)
    gsap.set(p.states, PETAL_CLOSED)
    gsap.set(svg, { rotate: -45, transformOrigin: '50% 50%' })
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
    tl.to(svg, { rotate: 0, duration: 1 }, 0)
    p.states.forEach((st, i) => {
      tl.to(st, { scale: 1, rotate: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }, i * 0.15)
    })
    let latched = false
    let st: ScrollTrigger | null = null
    const latch = () => {
      if (latched) return
      latched = true
      st?.kill() // the timeline keeps its state; it finishes on the house curve
      gsap.to(tl, { progress: 1, duration: 0.6, ease: 'expo.out', onComplete: () => p.settle() })
    }
    st = ScrollTrigger.create({
      trigger: svg,
      start: 'top 92%',
      // fully open with the mark well in view, and always reachable at the page end;
      // measured on the container, not the rotated svg, whose box grows while it turns
      end: () => {
        const r = (svg.parentElement ?? svg).getBoundingClientRect()
        const want = r.bottom + window.scrollY - window.innerHeight
        return Math.min(want, ScrollTrigger.maxScroll(window) - 2)
      },
      scrub: 1.2,
      animation: tl,
      // petals while it opens; once it has been fully open it stays open (whole and
      // seamless): scrolling back up never closes it again, so the sign-off is there at
      // rest, in a full-page capture, and on any later visit to the foot of the page
      onUpdate: (self) => {
        if (self.progress >= 0.999) latch()
        else p.split()
      },
      onLeave: () => latch(),
    })
    // loaded at the foot of the page (restored scroll, #anchor): open at once
    if (st.progress >= 0.999) latch()
    if (latched) st.kill() // latched during create, before st existed
    off.push(() => st?.kill())

    // E8: re-blooms with the nav mark when it is fully open and on screen
    const onBloomEgg = () => {
      const r = svg.getBoundingClientRect()
      if (!latched || r.bottom < 0 || r.top > window.innerHeight) return
      p.split()
      gsap.to(p.states, {
        scale: 0,
        rotate: -50,
        opacity: 0,
        duration: 0.3,
        ease: 'expo.out',
        onComplete: () => void openPetals(p, { stagger: 0.075 }),
      })
    }
    window.addEventListener('egg:bloom', onBloomEgg)
    off.push(() => window.removeEventListener('egg:bloom', onBloomEgg))
  }

  // ── back to top (the closing bloom is the button): scroll home on the house curve,
  //    then the nav mark answers with its own turn and focus returns to the content ──
  const top = root.querySelector<HTMLButtonElement>('[data-back-to-top]')
  if (top) {
    const onTop = () =>
      scrollToTarget(0, {
        onComplete: () => {
          document.getElementById('main')?.focus({ preventScroll: true })
          window.dispatchEvent(new CustomEvent('nav:answer'))
        },
      })
    top.addEventListener('click', onTop)
    off.push(() => top.removeEventListener('click', onTop))
  }

  // ── E6: four cities, one day ──
  const cities = root.querySelector<HTMLElement>('[data-egg-cities]')
  if (cities) off.push(citiesEgg(cities))

  return () => off.forEach((f) => f())
}

const ZONES: Record<string, string> = {
  'Hong Kong': 'Asia/Hong_Kong',
  Shenzhen: 'Asia/Shanghai',
  London: 'Europe/London',
  'San Francisco': 'America/Los_Angeles',
}

// Rest the pointer on the cities for 800ms (or tap): each name swaps to its local
// time, 24-hour, 60ms apart; leave (after 400ms) or tap again to swap back.
// The names stay in the DOM; the times are an aria-hidden overlay.
function citiesEgg(list: HTMLElement) {
  const items = [...list.querySelectorAll<HTMLLIElement>('li')]
  const times: HTMLElement[] = []
  items.forEach((li, i) => {
    const name = li.textContent?.trim() ?? ''
    li.innerHTML = `<span class="swap"><span class="swap__a">${name}</span><span class="swap__b tnum" aria-hidden="true"></span></span>`
    li.style.setProperty('--i', String(i))
    li.dataset.zone = ZONES[name] ?? ''
    times.push(li.querySelector<HTMLElement>('.swap__b')!)
  })
  let minuteTimer = 0
  let leaveTimer = 0
  let shown = false
  const render = () => {
    const now = new Date()
    items.forEach((li, i) => {
      const tz = li.dataset.zone
      times[i].textContent = tz ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(now) : ''
    })
  }
  const tick = () => {
    render()
    const ms = 60000 - (Date.now() % 60000)
    minuteTimer = window.setTimeout(tick, ms + 20)
  }
  const show = () => {
    clearTimeout(leaveTimer)
    if (shown) return
    void playEgg('cities', () => {
      shown = true
      tick()
      list.setAttribute('data-swapped', '')
    })
  }
  const hide = () => {
    clearTimeout(leaveTimer)
    leaveTimer = window.setTimeout(() => {
      shown = false
      clearTimeout(minuteTimer)
      list.removeAttribute('data-swapped')
    }, 400)
  }
  const offDwell = onDwell(list, show, { ms: 800, tap: true, stayOnMove: true, onLeave: hide })
  return () => {
    offDwell()
    clearTimeout(minuteTimer)
    clearTimeout(leaveTimer)
  }
}

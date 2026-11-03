import './livetip.css'
import { odometer, type Odometer } from './odometer'
import { INTENT, reducedMotion } from './motion'

// Live tip: the bubble on a live dot (hero counter, record). Two estimates from the published
// pace "+1 ≈ every 23 s", there is no live sales feed:
//   today  seconds since midnight in Hong Kong (the group's base) / 23
//   visit  seconds since the visit started / 23 (start kept in sessionStorage: survives reloads)
// const tip = bindLiveTip(dot)                      ticks on its own every 23 s while open
// const tip = bindLiveTip(dot, { selfTick: false }) the caller calls tip.tick() with its own "+1"
// The dot is wrapped in a real button ("Customer pace") described by a role="tooltip" bubble.
// Hover opens after 120ms, focus and tap open at once; leave, blur, Escape or a tap outside close.

const PACE_S = 23
const HK = 'Asia/Hong_Kong'
const VISIT_KEY = 'cb-visit-start'
const GAP = 12 // bubble edge to dot centre, past the arrow
const EDGE = 12 // viewport margin

let hkFmt: Intl.DateTimeFormat | null = null
function secondsSinceMidnightHK(now = new Date()) {
  hkFmt ??= new Intl.DateTimeFormat('en-GB', { timeZone: HK, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
  const p = Object.fromEntries(hkFmt.formatToParts(now).map((x) => [x.type, x.value]))
  return Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second)
}

function visitStart() {
  const fallback = Math.round(performance.timeOrigin || Date.now())
  try {
    const v = Number(sessionStorage.getItem(VISIT_KEY))
    if (v > 0 && v <= Date.now()) return v
    sessionStorage.setItem(VISIT_KEY, String(fallback))
  } catch {
    /* private mode: this page load is the visit */
  }
  return fallback
}

/** the two estimates, as whole customers */
export function paceEstimates(now = new Date()) {
  return {
    today: Math.floor(secondsSinceMidnightHK(now) / PACE_S),
    visit: Math.floor(Math.max(0, now.getTime() - visitStart()) / 1000 / PACE_S),
  }
}

let uid = 0

export type LiveTip = { tick: () => void; open: () => void; close: () => void; destroy: () => void }

export function bindLiveTip(dot: HTMLElement, { selfTick = true }: { selfTick?: boolean } = {}): LiveTip {
  visitStart() // the visit starts at the first page that can show it
  const id = `livetip-${++uid}`

  // the dot becomes a real button (or already is one)
  let btn: HTMLButtonElement
  if (dot instanceof HTMLButtonElement) btn = dot
  else {
    btn = document.createElement('button')
    btn.type = 'button'
    dot.replaceWith(btn)
    btn.appendChild(dot)
  }
  btn.classList.add('livetip-btn')
  btn.setAttribute('aria-label', 'Customer pace')
  btn.setAttribute('aria-describedby', id)

  const tip = document.createElement('span')
  tip.id = id
  tip.className = 'livetip'
  tip.setAttribute('role', 'tooltip')
  tip.innerHTML =
    '<span class="livetip__row">≈ <span class="livetip__n"></span> new customers today</span>' +
    '<span class="livetip__row">≈ <span class="livetip__n"></span> since you arrived</span>' +
    '<span class="livetip__note">At the average pace of one every 23 seconds.</span>' +
    '<span class="livetip__arrow" aria-hidden="true"></span>'
  document.body.appendChild(tip)
  const [nEl, mEl] = tip.querySelectorAll<HTMLElement>('.livetip__n')
  const arrow = tip.querySelector<HTMLElement>('.livetip__arrow')!

  let est = paceEstimates()
  let today = est.today
  let visit = est.visit
  const odoN: Odometer = odometer(nEl, today.toLocaleString('en-US'))
  const odoM: Odometer = odometer(mEl, visit.toLocaleString('en-US'))
  delete nEl.dataset.odo
  delete mEl.dataset.odo
  const render = () => {
    odoN.to(today.toLocaleString('en-US'))
    odoM.to(visit.toLocaleString('en-US'))
  }
  // resync on the formula (on open): never more than the estimate says
  const sync = () => {
    est = paceEstimates()
    today = est.today
    visit = est.visit
    render()
  }

  let isOpen = false
  let raf = 0
  let openTimer = 0
  let closeTimer = 0
  let selfTimer = 0

  const place = () => {
    const r = btn.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const w = tip.offsetWidth
    const h = tip.offsetHeight
    const navClear = 72
    const side = cy - GAP - h < navClear && cy + GAP + h < innerHeight - EDGE ? 'bottom' : 'top'
    const left = Math.min(Math.max(cx - w / 2, EDGE), document.documentElement.clientWidth - EDGE - w)
    const top = side === 'top' ? cy - GAP - h : cy + GAP
    tip.dataset.side = side
    tip.style.translate = `${Math.round(left)}px ${Math.round(top)}px`
    arrow.style.left = `${Math.round(cx - left)}px`
    tip.style.setProperty('--origin-x', `${Math.round(cx - left)}px`)
  }
  const follow = () => {
    place()
    raf = requestAnimationFrame(follow)
  }

  const armSelfTick = () => {
    clearTimeout(selfTimer)
    if (!selfTick || !isOpen) return
    // the next 23 s boundary of the visit, so the visit count turns exactly on it
    const elapsed = Date.now() - visitStart()
    const ms = PACE_S * 1000 - (elapsed % (PACE_S * 1000)) + 30
    selfTimer = window.setTimeout(() => {
      sync()
      armSelfTick()
    }, ms)
  }

  const open = () => {
    clearTimeout(closeTimer)
    clearTimeout(openTimer)
    if (isOpen) return
    isOpen = true
    sync()
    place()
    tip.dataset.open = ''
    btn.setAttribute('data-open', '')
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(follow)
    document.addEventListener('pointerdown', onOutside, true)
    document.addEventListener('keydown', onKey)
    armSelfTick()
  }
  const close = () => {
    clearTimeout(openTimer)
    clearTimeout(closeTimer)
    if (!isOpen) return
    isOpen = false
    delete tip.dataset.open
    btn.removeAttribute('data-open')
    clearTimeout(selfTimer)
    document.removeEventListener('pointerdown', onOutside, true)
    document.removeEventListener('keydown', onKey)
    // keep following through the exit, then stop
    window.setTimeout(() => {
      if (!isOpen) cancelAnimationFrame(raf)
    }, 260)
  }

  const onOutside = (e: PointerEvent) => {
    const t = e.target as Node
    if (!btn.contains(t) && !tip.contains(t)) close()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
  }
  const isMouse = (e: PointerEvent) => e.pointerType === 'mouse' || e.pointerType === 'pen'
  const onEnter = (e: PointerEvent) => {
    if (!isMouse(e)) return
    clearTimeout(closeTimer)
    if (isOpen) return
    clearTimeout(openTimer)
    openTimer = window.setTimeout(open, INTENT.tooltipOpen)
  }
  const onLeave = (e: PointerEvent) => {
    if (!isMouse(e)) return
    clearTimeout(openTimer)
    closeTimer = window.setTimeout(close, INTENT.tooltipClose)
  }
  let lastPointer = ''
  const onDown = (e: PointerEvent) => {
    lastPointer = e.pointerType
  }
  const onClick = () => {
    // a mouse already opened it on hover: a click keeps it; touch and keyboard toggle
    if (lastPointer === 'mouse' || lastPointer === 'pen') open()
    else if (isOpen) close()
    else open()
    lastPointer = ''
  }
  const onFocus = () => {
    if (btn.matches(':focus-visible')) open()
  }
  const onBlur = () => {
    closeTimer = window.setTimeout(close, 0)
  }

  btn.addEventListener('pointerenter', onEnter)
  btn.addEventListener('pointerleave', onLeave)
  btn.addEventListener('pointerdown', onDown)
  btn.addEventListener('click', onClick)
  btn.addEventListener('focus', onFocus)
  btn.addEventListener('blur', onBlur)
  tip.addEventListener('pointerenter', onEnter)
  tip.addEventListener('pointerleave', onLeave)
  if (reducedMotion()) tip.classList.add('livetip--still')

  return {
    // one more customer at the pace, in step with the caller's "+1"; a count never drifts
    // more than one from the formula (open resyncs it exactly)
    tick: () => {
      est = paceEstimates()
      today = Math.min(Math.max(today + 1, est.today - 1), est.today + 1)
      visit = Math.min(Math.max(visit + 1, est.visit - 1), est.visit + 1)
      if (isOpen) render()
    },
    open,
    close,
    destroy: () => {
      close()
      cancelAnimationFrame(raf)
      clearTimeout(selfTimer)
      btn.removeEventListener('pointerenter', onEnter)
      btn.removeEventListener('pointerleave', onLeave)
      btn.removeEventListener('pointerdown', onDown)
      btn.removeEventListener('click', onClick)
      btn.removeEventListener('focus', onFocus)
      btn.removeEventListener('blur', onBlur)
      tip.remove()
    },
  }
}

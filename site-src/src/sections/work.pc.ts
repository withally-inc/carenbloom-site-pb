import './work.pc.css'
import { EASE_CSS, finePointer, reducedMotion } from '../lib/motion'

// Player-coach (owner feedback, 21 Oct 2026): one object instead of two columns and
// two lists. The pod diagram lights the roles a text names while it is hovered or
// focused; the Coach / Player switch is a real tablist (Left/Right, Home/End, roving
// tabindex) that swaps the paired rows in place and moves the player coach from the
// pod's edge into it (CSS, SPRING.touch). Rows: the outgoing text leaves upward in
// 180ms, the incoming rises in over 500ms, row by row 50ms apart. Reduced motion:
// the outgoing fades in 120ms, then the incoming in 200ms.

type State = 'coach' | 'player'

export function initPlayerCoach(root: HTMLElement): () => void {
  const pc = root.querySelector<HTMLElement>('[data-pc]')
  if (!pc) return () => {}
  const tabs = [...pc.querySelectorAll<HTMLButtonElement>('.seg__tab')]
  const panels = [...pc.querySelectorAll<HTMLElement>('.pc__panel')]
  const offs: (() => void)[] = []
  const on = <K extends keyof HTMLElementEventMap>(t: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    t.addEventListener(type, fn as EventListener)
    offs.push(() => t.removeEventListener(type, fn as EventListener))
  }
  let state: State = 'coach'
  let running: Animation[] = []

  const show = (next: State, animate: boolean) => {
    const prev = state
    state = next
    pc.dataset.state = next
    tabs.forEach((t) => {
      const sel = t.id.endsWith(next)
      t.setAttribute('aria-selected', String(sel))
      t.tabIndex = sel ? 0 : -1
    })
    running.forEach((a) => a.cancel())
    running = []
    const out = panels.find((p) => p.dataset.panel === prev)
    const inc = panels.find((p) => p.dataset.panel === next)
    panels.forEach((p) => p.setAttribute('aria-hidden', String(p !== inc)))
    if (!animate || !out || !inc || out === inc) return
    const rm = reducedMotion()
    const parts = (p: HTMLElement) => [p.querySelector('.pc__panel-label'), ...p.querySelectorAll('.pc__item')].filter(Boolean) as HTMLElement[]
    // the outgoing panel stays visible while it leaves
    out.style.visibility = 'visible'
    parts(out).forEach((el, i) => {
      const a = el.animate(
        rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }],
        { duration: rm ? 120 : 180, delay: rm ? 0 : i * 20, easing: EASE_CSS, fill: 'both' },
      )
      running.push(a)
    })
    const last = running[running.length - 1]
    if (last) last.onfinish = () => (out.style.visibility = '')
    parts(inc).forEach((el, i) => {
      running.push(
        el.animate(
          rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
          { duration: rm ? 200 : 500, delay: rm ? 120 : 120 + i * 50, easing: EASE_CSS, fill: 'backwards' },
        ),
      )
    })
    // keep the outgoing frames off once finished, so nothing lingers at opacity 0
    running.forEach((a) => a.finished.then(() => a.cancel()).catch(() => {}))
  }
  show('coach', false)

  tabs.forEach((tab, i) => {
    on(tab, 'click', () => {
      const next = tab.id.endsWith('player') ? 'player' : 'coach'
      if (next !== state) show(next, true)
    })
    on(tab, 'keydown', (e) => {
      let to = -1
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (i + 1) % tabs.length
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (i - 1 + tabs.length) % tabs.length
      else if (e.key === 'Home') to = 0
      else if (e.key === 'End') to = tabs.length - 1
      if (to < 0) return
      e.preventDefault()
      tabs[to].focus()
      tabs[to].click()
    })
  })

  // lighting: hover (fine pointers, 120ms intent so a pass-over does nothing) and focus
  let timer = 0
  const light = (roles: string | null) => {
    clearTimeout(timer)
    if (roles) pc.dataset.lit = roles
    else delete pc.dataset.lit
  }
  pc.querySelectorAll<HTMLElement>('[data-lights]').forEach((el) => {
    const roles = el.dataset.lights!
    if (finePointer()) {
      on(el, 'pointerenter', () => {
        clearTimeout(timer)
        timer = window.setTimeout(() => light(roles), 120)
      })
      on(el, 'pointerleave', () => {
        clearTimeout(timer)
        timer = window.setTimeout(() => light(null), 120)
      })
    }
    on(el, 'focusin', () => light(roles))
    on(el, 'focusout', (e) => {
      if (!el.contains(e.relatedTarget as Node)) light(null)
    })
  })

  return () => {
    offs.forEach((f) => f())
    clearTimeout(timer)
    running.forEach((a) => a.cancel())
  }
}

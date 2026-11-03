import { reducedMotion } from './motion'

// Live dots are still between events: they move only when something happens
// (MOTION-CHALLENGE 1.8). pulse() plays the one-shot ring (1.2s, house curve);
// pulse(el, 2) rings twice, 180ms apart. Off under reduced motion.
export function pulse(dot: Element | null | undefined, times: 1 | 2 = 1) {
  if (!dot || reducedMotion()) return
  const cls = times === 2 ? 'pulse-2' : 'pulse'
  dot.classList.remove('pulse', 'pulse-2')
  // restart the animation even if it is mid-flight
  void (dot as HTMLElement).offsetWidth
  dot.classList.add(cls)
  const end = () => dot.classList.remove(cls)
  dot.addEventListener('animationend', end, { once: true })
}

// Pulse a dot once each time it scrolls into view (and never on a loop).
export function pulseOnEnter(dot: Element | null | undefined) {
  if (!dot) return () => {}
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => e.isIntersecting && pulse(e.target)),
    { threshold: 1 },
  )
  io.observe(dot)
  return () => io.disconnect()
}

// Calls fn while el is on screen and the tab is visible; returns a cleanup.
// onChange(true|false) is called on every change, for tickers that pause and resume.
export function whileVisible(el: Element, onChange: (visible: boolean) => void) {
  let inView = false
  const emit = () => onChange(inView && document.visibilityState === 'visible')
  const io = new IntersectionObserver((es) => {
    inView = es.some((e) => e.isIntersecting)
    emit()
  })
  io.observe(el)
  document.addEventListener('visibilitychange', emit)
  return () => {
    io.disconnect()
    document.removeEventListener('visibilitychange', emit)
  }
}

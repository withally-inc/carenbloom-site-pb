import './people.css'
import { gsap } from 'gsap'
import { reducedMotion } from '../lib/motion'
import { initPlaces } from './places'

// People: each leader is one link to LinkedIn (stretched link, people.css).
// Hover or keyboard focus "develops" the cobalt print over the ink print: a
// clip-path circle grows from where the pointer entered the portrait (the
// centre for keyboard focus), 700ms on the house curve, like ink spreading on
// paper. Leaving shrinks it to the exit point in 450ms. Touch keeps the ink
// print (no hover); reduced motion gets a 300ms crossfade (CSS, .is-dev).

const DEVELOP = 0.7
const RECEDE = 0.45

export function init(root: HTMLElement): () => void {
  const offs: (() => void)[] = []
  const places = root.querySelector<HTMLElement>('[data-places]')
  if (places) offs.push(initPlaces(places))

  root.querySelectorAll<HTMLElement>('[data-person]').forEach((person) => {
    const media = person.querySelector<HTMLElement>('.person__media')
    // one cobalt print per theme (people.html); both take the same circle
    const devs = [...person.querySelectorAll<HTMLElement>('.person__dev')]
    const dev = devs[0]
    const link = person.querySelector<HTMLAnchorElement>('.person__link')
    if (!media || !dev || !link) return

    // circle state in px, relative to the portrait
    const c = { r: 0, x: 0, y: 0 }
    let tween: gsap.core.Tween | null = null
    let hovered = false
    let focused = false

    const paint = () => {
      const clip = `circle(${c.r.toFixed(1)}px at ${c.x.toFixed(1)}px ${c.y.toFixed(1)}px)`
      devs.forEach((d) => (d.style.clipPath = clip))
    }
    // radius that covers the whole print from (x, y): distance to the farthest corner
    const cover = (x: number, y: number, w: number, h: number) =>
      Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) + 2

    const local = (e?: PointerEvent) => {
      const r = media.getBoundingClientRect()
      if (!e) return { x: r.width / 2, y: r.height / 2, w: r.width, h: r.height }
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }
    }

    const develop = (e?: PointerEvent) => {
      person.classList.add('is-dev')
      if (reducedMotion()) return
      const p = local(e)
      tween?.kill()
      // a fresh develop starts from the touch point; one still receding keeps its size
      if (c.r < 1) {
        c.x = p.x
        c.y = p.y
      }
      tween = gsap.to(c, { r: cover(p.x, p.y, p.w, p.h), x: p.x, y: p.y, duration: DEVELOP, ease: 'expo.out', onUpdate: paint })
    }
    const recede = (e?: PointerEvent) => {
      if (hovered || focused) return
      person.classList.remove('is-dev')
      if (reducedMotion()) return
      const p = local(e)
      tween?.kill()
      tween = gsap.to(c, { r: 0, x: p.x, y: p.y, duration: RECEDE, ease: 'expo.out', onUpdate: paint })
    }

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      hovered = true
      develop(e)
    }
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      hovered = false
      recede(e)
    }
    const onFocus = () => {
      if (!link.matches(':focus-visible')) return
      focused = true
      if (!hovered) develop()
    }
    const onBlur = () => {
      focused = false
      recede()
    }

    person.addEventListener('pointerenter', onEnter)
    person.addEventListener('pointerleave', onLeave)
    link.addEventListener('focus', onFocus)
    link.addEventListener('blur', onBlur)
    offs.push(() => {
      tween?.kill()
      person.removeEventListener('pointerenter', onEnter)
      person.removeEventListener('pointerleave', onLeave)
      link.removeEventListener('focus', onFocus)
      link.removeEventListener('blur', onBlur)
    })
  })

  return () => offs.forEach((f) => f())
}

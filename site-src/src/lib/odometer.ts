import { gsap } from 'gsap'
import { reducedMotion } from './motion'

// Odometer, ported from melriver.com and extended for separators and suffixes:
// "1,000,000+", "9", "36". Left digits land first and each digit rolls only
// its last 3 to 5 steps, so the number reads as it settles. The plain value
// stays in the DOM once as real text (screen readers, copy and paste).
//
// <span data-odo>1,000,000+</span>          plays on enter via lib/reveal.ts
// const o = odometer(el); o.play(); o.to('1,000,001+')

const STRIP = 20 // two turns of 0..9; each item is 5% of the strip

export type Odometer = {
  play: (delay?: number) => gsap.core.Timeline
  to: (next: string | number) => void
  readonly value: string
}

const fmt = (v: string | number) => (typeof v === 'number' ? v.toLocaleString('en-US') : v.trim())

export function odometer(el: HTMLElement, initial?: string | number): Odometer {
  // an empty attribute (the bare `data-odo` of the markup) is not nullish: fall through to the text
  let value = fmt(initial ?? (el.dataset.odo || el.textContent?.trim() || '0'))
  if (el.dataset.odo === '' || el.dataset.odo === undefined) el.dataset.odo = value
  let strips: { strip: HTMLElement; digit: number }[] = []

  const build = (str: string) => {
    el.classList.add('odo')
    el.setAttribute('aria-label', str)
    el.innerHTML = ''
    const sr = document.createElement('span')
    sr.className = 'odo__sr'
    sr.textContent = str
    el.appendChild(sr)
    strips = []
    for (const ch of str) {
      if (!/\d/.test(ch)) {
        const s = document.createElement('span')
        s.className = 'odo__sym'
        s.setAttribute('aria-hidden', 'true')
        s.textContent = ch
        el.appendChild(s)
        continue
      }
      const cell = document.createElement('span')
      cell.className = 'odo__cell'
      cell.setAttribute('aria-hidden', 'true')
      const ghost = document.createElement('span')
      ghost.className = 'odo__ghost'
      ghost.textContent = ch
      const strip = document.createElement('span')
      strip.className = 'odo__strip'
      strip.innerHTML = Array.from({ length: STRIP }, (_, i) => `<span>${i % 10}</span>`).join('')
      cell.append(ghost, strip)
      el.appendChild(cell)
      const digit = Number(ch)
      // at rest on the final value: correct even if it never plays
      gsap.set(strip, { yPercent: -(10 + digit) * (100 / STRIP) })
      strips.push({ strip, digit })
    }
  }
  build(value)

  return {
    play(delay = 0) {
      const tl = gsap.timeline({ delay })
      if (reducedMotion()) {
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4 })
        return tl
      }
      // the number rises out of its line while the reels settle, left first
      tl.fromTo(el, { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out', clearProps: 'transform' }, 0)
      strips.forEach(({ strip, digit }, i) => {
        const steps = 3 + ((i * 2) % 3) // 3 to 5 steps, neighbours never in lockstep
        tl.fromTo(
          strip,
          { yPercent: -(10 + digit - steps) * (100 / STRIP) },
          { yPercent: -(10 + digit) * (100 / STRIP), duration: 1.5 + i * 0.12, ease: 'expo.out' },
          0.05 + i * 0.07,
        )
      })
      return tl
    },
    // roll to a new value; rebuilds when the shape changes (more digits, new separators)
    to(next) {
      const str = fmt(next)
      const shape = (s: string) => s.replace(/\d/g, '0')
      if (shape(str) !== shape(value)) {
        value = str
        build(str)
        return
      }
      value = str
      el.setAttribute('aria-label', str)
      el.querySelector('.odo__sr')!.textContent = str
      let k = 0
      for (const ch of str) {
        if (!/\d/.test(ch)) continue
        const s = strips[k++]
        s.digit = Number(ch)
        gsap.to(s.strip, { yPercent: -(10 + s.digit) * (100 / STRIP), duration: reducedMotion() ? 0 : 0.9, ease: 'expo.out', overwrite: true })
      }
    },
    get value() {
      return value
    },
  }
}

import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { DUR, EASE, LINE_ROTATE, STAGGER, reducedMotion } from './motion'

gsap.registerPlugin(SplitText)

export type MaskedLines = {
  /** play the rise (idempotent) */
  play: (delay?: number) => void
  /** jump to the landed state with no motion (restored scroll, print) */
  finish: () => void
  /** undo the split, back to the original markup */
  revert: () => void
  readonly played: boolean
}

// Masked line rise for headlines. Each line rises out of its own padded mask
// (CSS: [data-lines] .line-mask) with a slight rotate from the bottom-left.
// autoSplit re-splits on resize and font load, and the running animation is
// carried over to the new lines, so a resize never breaks a reveal.
// Once the lines have landed, the element gets .landed (CSS lifts the mask
// clipping, so a breathing or hovered wink word is never cut) and dispatches
// a 'lines:landed' event: el.addEventListener('lines:landed', fn).
export const LINES_LANDED = 'lines:landed'
const land = (el: HTMLElement) => {
  if (el.classList.contains('landed')) return
  el.classList.add('landed')
  el.dispatchEvent(new CustomEvent(LINES_LANDED))
}
export function maskedLines(el: HTMLElement, opts: { stagger?: number; duration?: number; delay?: number } = {}): MaskedLines {
  const stagger = opts.stagger ?? (Number(el.dataset.step) / 1000 || STAGGER.lines)
  const duration = opts.duration ?? DUR.line
  let played = false
  let tween: gsap.core.Tween | null = null

  if (reducedMotion()) {
    el.dataset.split = 'none'
    gsap.set(el, { opacity: 0 })
    return {
      play(delay = 0) {
        if (played) return
        played = true
        gsap.to(el, { opacity: 1, duration: 0.4, delay, clearProps: 'opacity', onComplete: () => land(el) })
      },
      finish() {
        played = true
        gsap.set(el, { clearProps: 'opacity' })
        land(el)
      },
      revert() {},
      get played() {
        return played
      },
    }
  }

  const split = SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'line',
    autoSplit: true,
    aria: 'auto',
    // returning the tween lets SplitText carry its progress over on re-split
    onSplit: ((self: SplitText) => {
      tween = gsap.fromTo(
        self.lines,
        { yPercent: 118, rotate: LINE_ROTATE, transformOrigin: '0% 100%' },
        { yPercent: 0, rotate: 0, duration, ease: EASE, stagger, paused: !played, delay: opts.delay ?? 0, onComplete: () => land(el) },
      )
      return tween
    }) as unknown as (self: SplitText) => void,
  })
  el.dataset.split = '1'

  return {
    play(delay = 0) {
      if (played) return
      played = true
      if (delay > 0) gsap.delayedCall(delay, () => tween?.play())
      else tween?.play()
    },
    finish() {
      played = true
      tween?.progress(1)
      land(el)
    },
    revert() {
      split.revert()
      delete el.dataset.split
    },
    get played() {
      return played
    },
  }
}

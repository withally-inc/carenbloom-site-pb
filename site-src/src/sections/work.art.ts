// Values card art (owner request, 21 Oct 2026): one halftone hand per value, ink
// hand with a cobalt object, cropped by the card edge it enters from, behind the
// words. The files and their placement come from public/img/values/manifest.json
// (written by the art pipeline); this module only places and moves them.
//
// Manifest (scripts/values/build.mjs; unknown keys are ignored, missing ones default):
//   { "values": [ { "n": 1, "src": "/img/values/value-01.webp", "srcset": [...],
//       "srcViolet": "...", "srcsetViolet": [...],             theme variant
//       "width": 758, "height": 1198,
//       "edge": "bottom",            the card edge that cuts the wrist
//       "enters": "bottom-right",    where along that edge the hand sits
//       "visible": 0.65,             share of the image inside the card, along the entry axis
//       "scale": 0.6 } ] }           optional: image height as a share of the card height
// Placement favours the right half of the card: the name and sentence sit on the
// left and must always win, so a hand centred on the bottom edge is moved right.

// Motion: on a value change the outgoing hand slides out through its own edge
// (360ms, 40% of the entrance) and the incoming one slides in from its edge
// (900ms house curve, 60ms after), so it travels further and slower than the
// card text, which only moves 12px: a short parallax. Neighbours are preloaded.
// Reduced motion: a 300ms crossfade. The lemon rests on the side the hand leaves
// free (card.dataset.lemonRest, read by the lemon's rest spot).
// Without a manifest nothing is drawn; `?art=demo` shows placeholder boxes.

import { EASE_CSS, reducedMotion } from '../lib/motion'
import { THEME_EVENT } from '../lib/theme'

type Edge = 'left' | 'right' | 'top' | 'bottom'
export type ArtEntry = {
  n: number
  src: string
  srcset?: string
  srcViolet?: string
  srcsetViolet?: string
  width: number
  height: number
  edge: Edge
  /** position along the entry edge: 0 = flush top or left, 1 = flush bottom or right */
  along: number
  visible: number
  scale: number
}

const EDGES: Edge[] = ['left', 'right', 'top', 'bottom']
const num = (v: unknown, d: number, lo = 0, hi = 1) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d)
const set = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(', ') : typeof v === 'string' ? v : undefined)

// where along its edge a hand sits, from the manifest's "enters"
function alongFor(edge: Edge, enters: string): number {
  const side = edge === 'left' || edge === 'right'
  if (side) return enters.includes('bottom') ? 1 : enters.includes('top') ? 0 : 0.22
  return enters.includes('left') ? 0 : 1
}

function normalize(raw: unknown): ArtEntry[] {
  const list = Array.isArray(raw) ? raw : Array.isArray((raw as { values?: unknown })?.values) ? (raw as { values: unknown[] }).values : []
  return list
    .map((e: any, i): ArtEntry | null => {
      if (!e || typeof e.src !== 'string') return null
      const edge: Edge = EDGES.includes(e.edge) ? e.edge : 'right'
      const width = num(e.width, 1000, 1, 1e5)
      const height = num(e.height, 1000, 1, 1e5)
      return {
        n: typeof e.n === 'number' ? e.n : i + 1,
        src: e.src,
        srcset: set(e.srcset),
        srcViolet: typeof e.srcViolet === 'string' ? e.srcViolet : undefined,
        srcsetViolet: set(e.srcsetViolet),
        width,
        height,
        edge,
        along: typeof e.along === 'number' ? num(e.along, 1) : alongFor(edge, String(e.enters ?? '')),
        visible: num(e.visible, 0.6, 0.2, 1),
        // tall hands take 56% of the card height, wide ones 52%
        scale: num(e.scale, height >= width ? 0.56 : 0.52, 0.2, 1.4),
      }
    })
    .filter((e): e is ArtEntry => !!e)
}

const DEMO: ArtEntry[] = (['right', 'bottom', 'right', 'left', 'bottom', 'right', 'bottom'] as Edge[]).map((edge, i) => ({
  n: i + 1,
  src: '',
  width: 1000,
  height: 1200,
  edge,
  along: edge === 'bottom' ? 1 : 0.25,
  visible: 0.55,
  scale: 0.6,
}))

const isViolet = () => document.documentElement.dataset.theme === 'violet'

/** where the lemon rests while this hand is shown: above the card's top right corner
 *  when the hand takes the lower right, else its usual spot at the bottom right */
export function lemonSideFor(e: ArtEntry | undefined): 'top' | 'bottom' {
  if (!e) return 'bottom'
  const lowerRight = e.edge === 'bottom' ? e.along > 0.5 : e.edge === 'right' && e.along > 0.5
  return lowerRight ? 'top' : 'bottom'
}

export type ValuesArt = { show: (i: number, dir: number) => void; destroy: () => void }

export function initValuesArt(card: HTMLElement, start: number): ValuesArt {
  const layer = document.createElement('div')
  layer.className = 'values__art'
  layer.setAttribute('aria-hidden', 'true')
  card.prepend(layer)
  let entries: ArtEntry[] = []
  const els = new Map<number, HTMLElement>()
  let current = start
  let running: Animation[] = []
  let dead = false

  const srcFor = (e: ArtEntry) => (isViolet() && e.srcViolet ? e.srcViolet : e.src)
  const srcsetFor = (e: ArtEntry) => (isViolet() && e.srcViolet ? e.srcsetViolet : e.srcset) ?? ''
  const fill = (img: HTMLImageElement, e: ArtEntry) => {
    const ss = srcsetFor(e)
    if (ss) {
      img.sizes = '(max-width: 767px) 220px, 420px'
      img.srcset = ss
    } else img.removeAttribute('srcset')
    img.src = srcFor(e)
  }
  const place = (el: HTMLElement, e: ArtEntry) => {
    el.dataset.edge = e.edge
    el.style.setProperty('--ratio', String(e.width / e.height))
    el.style.setProperty('--scale', String(e.scale))
    el.style.setProperty('--hide', String(1 - e.visible))
    el.style.setProperty('--along', String(e.along))
  }
  const build = (i: number): HTMLElement | null => {
    const e = entries[i]
    if (!e) return null
    let el = els.get(i)
    if (el) return el
    if (e.src) {
      const img = document.createElement('img')
      img.alt = ''
      img.decoding = 'async'
      img.width = e.width
      img.height = e.height
      fill(img, e)
      el = img
    } else {
      el = document.createElement('div')
      el.textContent = String(e.n).padStart(2, '0')
    }
    el.className = `values__hand${e.src ? '' : ' values__hand--demo'}`
    place(el, e)
    layer.appendChild(el)
    els.set(i, el)
    return el
  }
  const preload = (i: number) => {
    const e = entries[(i + entries.length) % entries.length]
    if (!e?.src) return
    const im = new Image()
    im.decoding = 'async'
    im.src = srcFor(e)
  }
  const lemonRest = (i: number) => (card.dataset.lemonRest = lemonSideFor(entries[i]))

  // the slide offset rides the `translate` property, the placement stays in `transform`
  const away = (e: ArtEntry) => {
    const d = `calc(${e.visible * 100}% + 24px)`
    return e.edge === 'right' ? `${d} 0` : e.edge === 'left' ? `calc(-1 * ${d}) 0` : e.edge === 'bottom' ? `0 ${d}` : `0 calc(-1 * ${d})`
  }

  const show = (i: number, _dir: number) => {
    const from = current
    current = i
    if (!entries.length) return
    lemonRest(i)
    running.forEach((a) => a.cancel())
    running = []
    const out = els.get(from)
    const inn = build(i)
    els.forEach((el, k) => el.classList.toggle('is-on', k === i || (k === from && from !== i)))
    preload(i + 1)
    preload(i - 1)
    if (!inn || from === i) return
    const rm = reducedMotion()
    if (out) {
      const eo = entries[from]
      const a = out.animate(rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ translate: '0 0', opacity: 1 }, { translate: away(eo), opacity: 0.6 }], {
        duration: rm ? 300 : 360,
        easing: EASE_CSS,
        fill: 'forwards',
      })
      a.onfinish = () => {
        if (current !== from) out.classList.remove('is-on')
        a.cancel()
      }
      running.push(a)
    }
    running.push(
      inn.animate(rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ translate: away(entries[i]), opacity: 0 }, { translate: '0 0', opacity: 1, offset: 0.35 }, { translate: '0 0', opacity: 1 }], {
        duration: rm ? 300 : 900,
        delay: rm ? 0 : 60,
        easing: EASE_CSS,
        fill: 'backwards',
      }),
    )
  }

  const onTheme = () => {
    els.forEach((el, i) => {
      const e = entries[i]
      if (e?.src && el instanceof HTMLImageElement) fill(el, e)
    })
  }
  window.addEventListener(THEME_EVENT, onTheme)

  const demo = new URLSearchParams(location.search).get('art') === 'demo'
  fetch('/img/values/manifest.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((m) => normalize(m))
    .catch(() => [] as ArtEntry[])
    .then((list) => {
      if (dead) return
      entries = list.length ? list : demo ? DEMO : []
      if (!entries.length) return
      card.classList.add('has-art')
      const el = build(current)
      el?.classList.add('is-on')
      lemonRest(current)
      preload(current + 1)
      preload(current - 1)
    })

  return {
    show,
    destroy() {
      dead = true
      window.removeEventListener(THEME_EVENT, onTheme)
      running.forEach((a) => a.cancel())
      layer.remove()
      delete card.dataset.lemonRest
    },
  }
}

/** the lemon's violet sprite (theme variant): used only once the file has loaded,
 *  so a missing variant never blanks the lemon */
export function themeLemon(root: HTMLElement): () => void {
  const lemon = root.querySelector<HTMLElement>('[data-lemon]')
  if (!lemon) return () => {}
  let probe: HTMLImageElement | null = null
  const apply = () => {
    if (!isViolet()) return void lemon.classList.remove('lemon--violet')
    probe = new Image()
    probe.onload = () => isViolet() && lemon.classList.add('lemon--violet')
    probe.src = '/img/lemon-sprite-violet-180.webp'
  }
  apply()
  window.addEventListener(THEME_EVENT, apply)
  return () => {
    window.removeEventListener(THEME_EVENT, apply)
    if (probe) probe.onload = null
  }
}

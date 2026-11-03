import { reducedMotion } from './motion'

// Violet mode (docs/BRAND.md, "Violet mode"). The theme lives on
// <html data-theme="light|violet">, set before first paint by the head script of each
// page (stored choice first, then prefers-color-scheme: dark means violet). This module
// switches it at runtime: the flood (a four-petal shape that opens from the mark and
// turns as it grows, through a View Transition of the root), persistence, the
// theme-color meta, cross-tab sync, and the asset naming rule for `-violet` files.

export type Theme = 'light' | 'violet'
export const THEME_EVENT = 'theme:change'
export const THEME_KEY = 'cb-theme'
/** the ground of each theme, for <meta name="theme-color"> and the fallback veil */
export const THEME_COLOR: Record<Theme, string> = { light: '#F4F6F8', violet: '#160F2E' }
/** the flood: 600 to 800ms by the brief, on the house curve */
export const FLOOD_MS = 720

export const getTheme = (): Theme => (document.documentElement.dataset.theme === 'violet' ? 'violet' : 'light')

export function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'violet' || v === 'light' ? v : null
  } catch {
    return null
  }
}
function store(t: Theme) {
  try {
    localStorage.setItem(THEME_KEY, t)
  } catch {
    /* private mode or blocked storage: the choice lasts for this page only */
  }
}
const darkQuery = () => {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)')
  } catch {
    return null
  }
}
export const systemTheme = (): Theme => (darkQuery()?.matches ? 'violet' : 'light')

/**
 * The asset naming rule (docs/ASSETS.md): the violet file sits next to the light one,
 * `-violet` inserted before the size or frame number, or before the extension.
 *   /img/hero-start-896.webp      → /img/hero-start-violet-896.webp
 *   /img/bloom-seq/bloom-07.webp  → /img/bloom-seq/bloom-violet-07.webp
 *   /img/logos/im8.svg            → /img/logos/im8-violet.svg
 */
export function themedSrc(url: string, t: Theme = getTheme()): string {
  if (t !== 'violet' || /-violet(?=[-.@])/.test(url)) return url
  return url.replace(/(-\d+)?(@\dx)?(\.[a-z0-9]+)(\?[^\s]*)?$/i, '-violet$1$2$3$4')
}
/** the same rule over a srcset ("a.webp 480w, b.webp 896w") */
export const themedSrcset = (srcset: string, t: Theme = getTheme()) =>
  srcset
    .split(',')
    .map((c) => {
      const [u, ...rest] = c.trim().split(/\s+/)
      return [themedSrc(u, t), ...rest].join(' ')
    })
    .join(', ')

/** listen to theme changes; returns the unsubscribe */
export function onTheme(fn: (t: Theme) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<{ theme: Theme }>).detail.theme)
  window.addEventListener(THEME_EVENT, h)
  return () => window.removeEventListener(THEME_EVENT, h)
}

function paint(t: Theme) {
  const html = document.documentElement
  html.dataset.theme = t
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => (m.content = THEME_COLOR[t]))
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme: t } }))
}
// for the frame the tokens change, no element runs its own colour transition
function commit(t: Theme) {
  const html = document.documentElement
  html.classList.add('cb-theme-switch')
  paint(t)
  void html.offsetWidth
  requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove('cb-theme-switch')))
}

type Point = { x: number; y: number }
function originOf(from?: Element | Point | null): Point {
  if (from && 'getBoundingClientRect' in from) {
    const r = from.getBoundingClientRect()
    if (r.width || r.height) return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  } else if (from && 'x' in from) return from
  return { x: 28, y: 36 } // the nav mark, top left
}

// cubic-bezier(.16, 1, .3, 1), the house curve, solved for y(x)
function houseCurve(x: number) {
  const [x1, y1, x2, y2] = [0.16, 1, 0.3, 1]
  const bx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3
  const by = (t: number) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2
    if (bx(m) < x) lo = m
    else hi = m
  }
  return by((lo + hi) / 2)
}

/**
 * The flood as clip-path keyframes: a quatrefoil (four circles of radius a, each
 * passing through the origin) that opens from the size of the mark and turns 45deg as
 * it grows. Its narrowest reach is the cusp between two petals, a·√2, so once that
 * passes the farthest corner the page is covered. The curve is baked into the frames
 * (played linearly), so every frame keeps the same path commands and interpolates.
 */
export function floodFrames(o: Point, w = window.innerWidth, h = window.innerHeight, steps = 36): string[] {
  const far = Math.max(Math.hypot(o.x, o.y), Math.hypot(w - o.x, o.y), Math.hypot(o.x, h - o.y), Math.hypot(w - o.x, h - o.y))
  const a0 = 5 // the 20px mark: petals reach 2a from the centre
  const a1 = far / Math.SQRT2 + 4
  const frames: string[] = []
  for (let i = 0; i <= steps; i++) {
    const p = houseCurve(i / steps)
    const a = a0 + (a1 - a0) * p
    const turn = (Math.PI / 4) * p
    const u = [0, 1, 2, 3].map((k) => {
      const ang = turn + (k * Math.PI) / 2 - Math.PI / 2
      return [Math.cos(ang), Math.sin(ang)]
    })
    // cusps between petals k and k+1
    const cusp = (k: number) => {
      const [ux, uy] = u[k % 4]
      const [vx, vy] = u[(k + 1) % 4]
      return `${(o.x + a * (ux + vx)).toFixed(1)} ${(o.y + a * (uy + vy)).toFixed(1)}`
    }
    const r = a.toFixed(1)
    frames.push(`path("M ${cusp(3)} A ${r} ${r} 0 0 1 ${cusp(0)} A ${r} ${r} 0 0 1 ${cusp(1)} A ${r} ${r} 0 0 1 ${cusp(2)} A ${r} ${r} 0 0 1 ${cusp(3)} Z")`)
  }
  return frames
}

type VTDocument = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> }
}

let busy: Promise<void> | null = null

/**
 * Switch the theme. `from` is where the flood opens (the mark, or the menu toggle).
 * Reduced motion: a 200ms crossfade. No View Transitions: a flood of the new ground,
 * then the page flips under it. The choice is stored unless `persist: false`.
 */
export async function setTheme(next: Theme, opts: { from?: Element | Point | null; persist?: boolean; animate?: boolean } = {}): Promise<void> {
  if (opts.persist !== false) store(next)
  if (busy) await busy
  if (next === getTheme()) return
  const html = document.documentElement
  const doc = document as VTDocument
  const rm = reducedMotion()
  if (opts.animate === false || document.hidden) {
    commit(next)
    return
  }
  busy = (async () => {
    try {
      if (doc.startViewTransition) {
        html.classList.add(rm ? 'cb-fade' : 'cb-flood')
        const vt = doc.startViewTransition(() => commit(next))
        if (!rm) {
          try {
            await vt.ready
            html.animate(
              { clipPath: floodFrames(originOf(opts.from)) },
              { duration: FLOOD_MS, easing: 'linear', fill: 'both', pseudoElement: '::view-transition-new(root)' },
            )
          } catch {
            /* transition skipped: the theme is already committed */
          }
        }
        await vt.finished.catch(() => {})
        html.classList.remove('cb-flood', 'cb-fade')
      } else if (!rm) {
        await veilFlood(next, originOf(opts.from))
      } else commit(next)
    } finally {
      busy = null
    }
  })()
  return busy
}

// no View Transitions: the new ground floods from the mark, the page flips under it,
// the veil fades (40% of the entrance)
async function veilFlood(next: Theme, o: Point) {
  const veil = document.createElement('div')
  veil.className = 'cb-flood-veil'
  veil.style.background = THEME_COLOR[next]
  document.body.appendChild(veil)
  try {
    await veil.animate({ clipPath: floodFrames(o) }, { duration: FLOOD_MS * 0.8, easing: 'linear', fill: 'both' }).finished
    commit(next)
    await veil.animate({ opacity: [1, 0] }, { duration: 280, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }).finished
  } catch {
    commit(next)
  } finally {
    veil.remove()
  }
}

export const toggleTheme = (from?: Element | Point | null) => setTheme(getTheme() === 'violet' ? 'light' : 'violet', { from })

let started = false
/**
 * Once per page (createNav calls it): follow the system setting while nothing is
 * stored, and other tabs when the choice changes there. Returns the cleanup.
 */
export function initTheme(): () => void {
  if (started) return () => {}
  started = true
  const html = document.documentElement
  if (html.dataset.theme !== 'violet' && html.dataset.theme !== 'light') paint(storedTheme() ?? systemTheme())
  const mq = darkQuery()
  const onSystem = (e: MediaQueryListEvent) => {
    if (!storedTheme()) void setTheme(e.matches ? 'violet' : 'light', { persist: false, animate: false })
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_KEY) return
    const t = storedTheme() ?? systemTheme()
    void setTheme(t, { persist: false, animate: false })
  }
  mq?.addEventListener('change', onSystem)
  window.addEventListener('storage', onStorage)
  return () => {
    started = false
    mq?.removeEventListener('change', onSystem)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Keep a toggle button in sync. `label` gives its accessible name per current theme
 * (the header mark: "Switch to violet mode" / "Switch to light mode"); without it the
 * button keeps its own constant label and only aria-pressed changes.
 */
export function bindThemeToggle(btn: HTMLElement, label?: (t: Theme) => string): () => void {
  const sync = (t: Theme) => {
    btn.setAttribute('aria-pressed', String(t === 'violet'))
    if (label) btn.setAttribute('aria-label', label(t))
  }
  sync(getTheme())
  return onTheme(sync)
}

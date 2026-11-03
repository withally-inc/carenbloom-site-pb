import { INTENT } from './motion'

// Prefetch our own pages on intent (MOTION-CHALLENGE 2.4). Speculation rules
// (prefetch, eagerness moderate) where supported; elsewhere a <link rel=prefetch>
// injected after 70ms of hover, on touchstart and on focus. Each URL once.
// /careers/apply is one HTML file for every role, so it is fetched once.

const done = new Set<string>()
const PAGES = /^\/(careers(\/apply)?\/?)?$/

function key(a: HTMLAnchorElement) {
  try {
    const u = new URL(a.href, location.href)
    if (u.origin !== location.origin) return null
    const path = u.pathname.replace(/\/index\.html$/, '/')
    if (!PAGES.test(path)) return null
    if (path.replace(/\/$/, '') === location.pathname.replace(/\/$/, '')) return null
    return path
  } catch {
    return null
  }
}

function prefetch(path: string) {
  if (done.has(path)) return
  done.add(path)
  const l = document.createElement('link')
  l.rel = 'prefetch'
  l.href = path
  document.head.appendChild(l)
}

export function initPrefetch() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (conn?.saveData || /2g/.test(conn?.effectiveType || '')) return () => {}

  const S = HTMLScriptElement as unknown as { supports?: (t: string) => boolean }
  if (S.supports?.('speculationrules')) {
    const s = document.createElement('script')
    s.type = 'speculationrules'
    s.textContent = JSON.stringify({
      prefetch: [{ where: { or: [{ href_matches: '/' }, { href_matches: '/careers' }, { href_matches: '/careers/*' }] }, eagerness: 'moderate' }],
    })
    document.head.appendChild(s)
    return () => s.remove()
  }

  let t = 0
  const target = (e: Event) => (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
  const over = (e: Event) => {
    const a = target(e)
    const k = a && key(a)
    if (!k) return
    clearTimeout(t)
    t = window.setTimeout(() => prefetch(k), INTENT.prefetch)
  }
  const out = () => clearTimeout(t)
  const now = (e: Event) => {
    const a = target(e)
    const k = a && key(a)
    if (k) prefetch(k)
  }
  document.addEventListener('pointerover', over, { passive: true })
  document.addEventListener('pointerout', out, { passive: true })
  document.addEventListener('touchstart', now, { passive: true })
  document.addEventListener('focusin', now)
  return () => {
    document.removeEventListener('pointerover', over)
    document.removeEventListener('pointerout', out)
    document.removeEventListener('touchstart', now)
    document.removeEventListener('focusin', now)
  }
}

import { startLenis, ScrollTrigger } from '../lib/lenis'
import { createNav, type Nav } from '../chrome/nav'
import { runPreloader, introDone } from '../chrome/preloader'
import { initFooter } from '../chrome/footer'
import { initReveals } from '../lib/reveal'
import { bindRoleCount } from '../lib/roles'
import { initEggs } from '../lib/eggs'
import { initPrefetch } from '../lib/prefetch'
import { bindPrint } from '../lib/print'
import { decodeFade } from '../lib/media'

export type SectionInit = (root: HTMLElement) => () => void

// Shared page boot. Order matters:
// 1. smooth scroll, nav, live role count
// 2. every section's init(root) runs while the preloader still covers the page,
//    so sections can build their DOM (and add data-reveal) before anything moves
// 3. when the intro lands (and fonts are in), the reveal runner starts: the
//    entrance of whatever is in view plays, the rest waits for scroll
export async function boot(sections: Record<string, SectionInit> = {}): Promise<{ nav: Nav | null; cleanup: () => void }> {
  const html = document.documentElement
  html.classList.add('motion')
  startLenis()
  const nav = createNav()
  void bindRoleCount()

  const cleanups: (() => void)[] = []
  for (const [name, init] of Object.entries(sections)) {
    const root = document.querySelector<HTMLElement>(`[data-section="${name}"]`)
    if (!root) continue
    try {
      cleanups.push(init(root))
    } catch (err) {
      // one broken section must never take the page down with it
      console.warn(`[section:${name}] init failed`, err)
    }
  }
  cleanups.push(initFooter())
  decodeFade()
  cleanups.push(bindPrint())

  const fonts = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1000))])
  runPreloader(nav)
  await Promise.all([introDone(), fonts])
  cleanups.push(initReveals())
  html.classList.add('ready')
  ScrollTrigger.refresh()
  cleanups.push(initEggs())
  // prefetch once the page has settled, so it never competes with the entrance
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 600))
  idle(() => cleanups.push(initPrefetch()))
  // late images and fonts can move things: refresh triggers once everything has loaded
  if (document.readyState !== 'complete') window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })

  return { nav, cleanup: () => cleanups.forEach((f) => f()) }
}

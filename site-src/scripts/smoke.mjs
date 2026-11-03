// Smoke test. Expects `pnpm preview` running (http://localhost:4174, or BASE=).
// Loads each page at desktop 1440x900 and a real mobile context 390x844,
// scrolls to the bottom slowly to trigger reveals, then asserts:
//   no horizontal overflow, no console errors or page errors,
//   no visible [data-reveal] / [data-lines] left hidden, the nav is present.
// Full-page screenshots go to qa/<page>-<viewport>.png.
//   node scripts/smoke.mjs            all pages
//   PAGES=home,careers node scripts/smoke.mjs
//   THEME=violet node scripts/smoke.mjs   the same run in violet mode (stored choice, as a visitor's)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE = (process.env.BASE || 'http://localhost:4174').replace(/\/$/, '')
const THEME = process.env.THEME === 'violet' ? 'violet' : 'light'
const OUT = resolve(import.meta.dirname, '..', 'qa')
mkdirSync(OUT, { recursive: true })

const ALL = [
  { name: 'home', path: '/' },
  { name: 'careers', path: '/careers' },
  { name: 'apply', path: '/careers/apply?role=chief-of-staff' },
  { name: 'notfound', path: '/404.html' },
]
const only = (process.env.PAGES || '').split(',').map((s) => s.trim()).filter(Boolean)
const PAGES = only.length ? ALL.filter((p) => only.includes(p.name)) : ALL

const VIEWPORTS = [
  { name: 'desktop', ctx: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
  {
    name: 'mobile',
    ctx: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    },
  },
]

// files produced by the image pipeline: a missing one is reported, not fatal
const IMAGE_OWNED = /\/(img|brand)\/|\/favicon|\/apple-touch-icon|\/og\.png|\/icon-\d+\.png|site\.webmanifest/

const failures = []
const warnings = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch()
try {
  for (const pg of PAGES) {
    for (const vp of VIEWPORTS) {
      const tag = `${pg.name}-${vp.name}${THEME === 'violet' ? '-violet' : ''}`
      const fail = (msg) => failures.push(`[${tag}] ${msg}`)
      const context = await browser.newContext(vp.ctx)
      if (THEME === 'violet') await context.addInitScript(() => localStorage.setItem('cb-theme', 'violet'))
      const page = await context.newPage()
      const errors = []
      page.on('console', (m) => {
        if (m.type() !== 'error') return
        const loc = m.location()?.url || ''
        if (IMAGE_OWNED.test(loc) || IMAGE_OWNED.test(m.text())) warnings.push(`[${tag}] ${m.text()} ${loc}`)
        else errors.push(`console: ${m.text()}${loc ? ` (${loc})` : ''}`)
      })
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
      page.on('response', (r) => {
        if (r.status() >= 400) {
          const u = r.url()
          if (IMAGE_OWNED.test(u)) warnings.push(`[${tag}] ${r.status()} ${u}`)
          else errors.push(`http ${r.status()} ${u}`)
        }
      })

      try {
        await page.goto(BASE + pg.path, { waitUntil: 'load', timeout: 30000 })
      } catch (e) {
        fail(`navigation failed: ${e.message}`)
        await context.close()
        continue
      }
      // let the intro (first visit in a fresh context) land
      await sleep(2000)

      // scroll to the bottom slowly: wheel on desktop (drives Lenis), native on touch
      for (let i = 0; i < 200; i++) {
        const atBottom = await page.evaluate(() => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2)
        if (atBottom) break
        if (vp.name === 'desktop') await page.mouse.wheel(0, 420)
        else await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.55))
        await sleep(160)
      }
      await sleep(1800)

      const report = await page.evaluate(() => {
        const out = { overflow: null, hidden: [], nav: null }
        const doc = document.documentElement
        if (doc.scrollWidth > doc.clientWidth) {
          const wide = [...document.querySelectorAll('body *')]
            .filter((el) => {
              const r = el.getBoundingClientRect()
              return r.width && (r.right > doc.clientWidth + 0.5 || r.left < -0.5)
            })
            .slice(0, 6)
            .map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')}`)
          out.overflow = `scrollWidth ${doc.scrollWidth} > ${doc.clientWidth}: ${wide.join(', ')}`
        }
        const shown = (el) => el.getClientRects().length > 0 && !el.closest('[inert],[hidden],[aria-hidden="true"]')
        for (const el of document.querySelectorAll('[data-reveal], [data-lines]')) {
          if (!shown(el)) continue
          const cs = getComputedStyle(el)
          const clipped = /inset\(100%/.test(cs.clipPath)
          if (parseFloat(cs.opacity) < 0.99 || clipped) {
            out.hidden.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent || '').trim().slice(0, 40)}" opacity=${cs.opacity}${clipped ? ' clipped' : ''}`)
          }
        }
        const nav = document.querySelector('[data-nav]')
        const cluster = nav?.querySelector('.nav__cluster')
        out.theme = document.documentElement.dataset.theme || 'light'
        out.nav = !nav ? 'missing' : !cluster || !shown(cluster) ? 'not visible' : parseFloat(getComputedStyle(cluster).opacity) < 0.99 ? 'transparent' : 'ok'
        return out
      })

      if (report.overflow) fail(`horizontal overflow: ${report.overflow}`)
      report.hidden.forEach((h) => fail(`still hidden after scroll: ${h}`))
      if (report.nav !== 'ok') fail(`nav ${report.nav}`)
      if (report.theme !== THEME) fail(`theme is ${report.theme}, expected ${THEME}`)
      errors.forEach((e) => fail(e))

      await page.evaluate(() => window.scrollTo(0, 0))
      await sleep(1600) // let scrubbed scenes settle back before the capture
      await page.screenshot({ path: resolve(OUT, `${tag}.png`), fullPage: true })
      console.log(`${failures.some((f) => f.startsWith(`[${tag}]`)) ? 'FAIL' : 'ok  '} ${tag}`)
      await context.close()
    }
  }
} finally {
  await browser.close()
}

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s), image pipeline files:`)
  ;[...new Set(warnings)].forEach((w) => console.log('  ' + w))
}
if (failures.length) {
  console.log(`\n${failures.length} failure(s):`)
  failures.forEach((f) => console.log('  ' + f))
  process.exit(1)
}
console.log('\nALL PASS')

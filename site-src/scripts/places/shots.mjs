// Screenshots of the places map: rest, each city hovered, the touch walk.
//   BASE=http://localhost:4183 node scripts/places/shots.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
const BASE = process.env.BASE || 'http://localhost:4183'
const OUT = resolve(import.meta.dirname, '..', '..', 'qa', 'places')
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch()
const errors = []
async function open(ctxOpts, reduced = false) {
  const ctx = await browser.newContext({ ...ctxOpts, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  await ctx.addInitScript(() => sessionStorage.setItem('cb-intro', '1'))
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(BASE + '/#places', { waitUntil: 'networkidle' })
  await page.locator('#places').scrollIntoViewIfNeeded()
  await page.evaluate(() => document.querySelector('#places').scrollIntoView({ block: 'start' }))
  return { ctx, page }
}
const shot = (page, name) => page.locator('#places').screenshot({ path: `${OUT}/${name}.png` })
// desktop
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  await page.mouse.move(5, 5)
  await sleep(700)
  await shot(page, 'desktop-rest')
  for (const id of ['hong-kong', 'shenzhen', 'london', 'san-francisco']) {
    await page.locator(`.places__city[data-city="${id}"]`).hover()
    await sleep(380)
    await shot(page, `desktop-${id}-ripple`)
    await sleep(1600)
    await shot(page, `desktop-${id}`)
  }
  // map hover near the pair, above (Shenzhen) and below (Hong Kong)
  const box = await page.locator('.places__map').boundingBox()
  const pin = await page.evaluate(() => {
    const c = document.querySelector('.places__map').getBoundingClientRect()
    return { w: c.width }
  })
  await page.mouse.move(box.x + 0.18335 * pin.w + 10, box.y + 0.12255 * pin.w + 20)
  await sleep(1800)
  await shot(page, 'desktop-map-hover-sf')
  await ctx.close()
}
// desktop reduced motion
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, true)
  await sleep(4500)
  await shot(page, 'desktop-reduced')
  await ctx.close()
}
// mobile
{
  const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await sleep(300)
  await shot(page, 'mobile-rest')
  await page.screenshot({ path: `${OUT}/mobile-viewport.png` })
  for (let i = 0; i < 4; i++) {
    await sleep(3600)
    await shot(page, `mobile-cycle-${i + 1}`)
  }
  await page.locator('.places__city[data-city="shenzhen"]').tap()
  await sleep(1900)
  await shot(page, 'mobile-tap-shenzhen')
  await page.screenshot({ path: `${OUT}/mobile-tap-viewport.png` })
  await ctx.close()
}
await browser.close()
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors', '\n', OUT)

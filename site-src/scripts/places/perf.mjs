// Frame times and long tasks while the places map ripples, 390px, CPU 4x.
//   BASE=http://localhost:4183 node scripts/places/perf.mjs
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:4183'
const browser = await chromium.launch()
for (const vp of [{ width: 390, height: 844, mobile: true }, { width: 1440, height: 900 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, isMobile: !!vp.mobile, hasTouch: !!vp.mobile })
  await ctx.addInitScript(() => {
    sessionStorage.setItem('cb-intro', '1')
    window.__long = []
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true })
  })
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => document.querySelector('#places').scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(3000)
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.evaluate(() => (window.__long = []))
  const res = []
  // raw input, so Playwright's own actionability scripts do not count as long tasks
  const boxes = {}
  for (const id of ['london', 'san-francisco', 'hong-kong']) boxes[id] = await page.locator(`.places__city[data-city="${id}"]`).boundingBox()
  // the page's first pointer move wakes other modules (cursor followers): not ours
  if (!vp.mobile) {
    await page.mouse.move(8, 8)
    await page.waitForTimeout(600)
  }
  await page.evaluate(() => (window.__long = []))
  for (const id of ['london', 'san-francisco', 'hong-kong']) {
    const b = boxes[id]
    const p = page.evaluate(() => new Promise((res) => {
      const t = []; let last = performance.now(); const end = last + 1500
      const f = (now) => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else res(t) }
      requestAnimationFrame(f)
    }))
    if (vp.mobile) await page.touchscreen.tap(b.x + 20, b.y + 20)
    else await page.mouse.move(b.x + 20, b.y + 20)
    const t = await p
    t.shift()
    t.sort((a, b) => a - b)
    res.push(`${id}: frames ${t.length}, p50 ${t[t.length >> 1].toFixed(1)}ms, p95 ${t[Math.floor(t.length * 0.95)].toFixed(1)}ms, max ${t[t.length - 1].toFixed(1)}ms`)
  }
  const long = await page.evaluate(() => window.__long)
  console.log(`${vp.width}px CPU4x\n  ${res.join('\n  ')}\n  long tasks: ${long.length ? long.join(', ') : 'none'}`)
  await ctx.close()
}
await browser.close()

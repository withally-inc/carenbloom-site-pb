// Render a local HTML file to PNG with Playwright. node scripts/brand/shot.mjs page.html out.png [width] [height] [scale]
import { chromium } from 'playwright';
import path from 'node:path';
const [file, out, w = '1200', h = '630', scale = '1'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale });
await page.goto('file://' + path.resolve(file));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: h === 'full' ? true : false });
await browser.close();
console.log('shot', out);

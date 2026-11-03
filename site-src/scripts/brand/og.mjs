// Renders the OG cards (1200x630): scripts/brand/og.html -> public/og.png, og-careers.html -> public/og-careers.png.
// Run after scripts/images.mjs and brand.mjs (pnpm images runs it).
import { chromium } from 'playwright';
import path from 'node:path';
import sharp from 'sharp';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const [tpl, out] of [['og.html', 'og.png'], ['og-careers.html', 'og-careers.png']]) {
  await page.goto('file://' + path.join(ROOT, 'scripts/brand', tpl));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const buf = await page.screenshot({ type: 'png' });
  await sharp(buf).png({ compressionLevel: 9, palette: true, colours: 256, dither: 0.3 }).toFile(path.join(ROOT, 'public', out));
  console.log(out + ' written');
}
await browser.close();

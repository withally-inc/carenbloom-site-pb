// Contact sheet of the values art next to the hero rose, at the CSS sizes the site draws them (1440 wide).
//   node scripts/values/contact.mjs [out=.builds/values-contact.png]   (.builds is gitignored)
// Also writes <out>-crop.png: the hero hand and two values hands cropped 1:1 at device pixels (2x),
// to check the dot size and ink weight side by side.
// Rows: the 1:1 crop, paper, white, violet mode, then each hand in a card mock placed as work.css does
// (height = scale × card height, cut by its edge so `visible` shows).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const out = path.resolve(process.argv[2] || path.join(root, '.builds/values-contact.png'));
fs.mkdirSync(path.dirname(out), { recursive: true });
const m = JSON.parse(fs.readFileSync(path.join(root, 'public/img/values/manifest.json'), 'utf8'));
const url = (p) => 'file://' + path.join(root, 'public', p);
const hero = 'file://' + path.join(root, 'public/img/hero-end-896.webp');
const CARD_H = 460, CARD_W = 741, HERO_H = 723; // measured at 1440 (hero media 540x723, card 741x460)
const nn = (v) => String(v.n).padStart(2, '0');

const tile = (src, v) => {
  const h = v.scale * CARD_H, w = (h * v.width) / v.height;
  return `<figure><img src="${src}" style="width:${w}px;height:${h}px"><figcaption>${nn(v)} ${v.name}</figcaption></figure>`;
};
const heroTile = `<figure><img src="${hero}" style="width:${(HERO_H * 896) / 1200}px;height:${HERO_H}px"><figcaption>hero rose, as drawn at 1440</figcaption></figure>`;
const row = (bg, fg, label, key) => `<section style="background:${bg};color:${fg}"><h2>${label}</h2><div class="row">${heroTile}${m.values.map((v) => tile(url(v[key]), v)).join('')}</div></section>`;

// 1:1 crop windows (CSS px), positioned on the hand of each image
const crop = (src, imgW, imgH, fx, fy, label) => `<figure><div class="win"><img src="${src}" style="width:${imgW}px;height:${imgH}px;left:${-fx * imgW + 150}px;top:${-fy * imgH + 150}px"></div><figcaption>${label}</figcaption></figure>`;
const v1 = m.values[0], v3 = m.values[2];
const h1 = v1.scale * CARD_H, h3 = v3.scale * CARD_H;
const crops = `<section style="background:#fff"><h2>1:1 at device pixels (2x), each at its size on the page: hero hand | 01 rocket hand | 03 stopwatch hand</h2><div class="row crops">
${crop(hero, (HERO_H * 896) / 1200, HERO_H, 0.5, 0.76, 'hero hand')}
${crop(url(v1.src), (h1 * v1.width) / v1.height, h1, 0.42, 0.72, '01 rocket')}
${crop(url(v3.src), (h3 * v3.width) / v3.height, h3, 0.42, 0.55, '03 stopwatch')}
</div></section>`;

const card = (v) => {
  const h = v.scale * CARD_H, w = (h * v.width) / v.height;
  const lowerRight = true;
  let pos;
  if (v.edge === 'bottom') pos = `right:0;bottom:${-(1 - v.visible) * h}px`;
  else pos = `right:${-(1 - v.visible) * w}px;top:${lowerRight ? CARD_H - h : 0}px`;
  return `<div class="card"><img src="${url(v.src)}" style="width:${w}px;height:${h}px;${pos}"><div class="txt"><span>${nn(v)} / 07</span><b>${v.name}</b></div></div>`;
};

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;font:13px/1.3 system-ui,sans-serif}
section{padding:24px}
h2{font-size:14px;margin:0 0 16px;font-weight:600}
.row{display:flex;gap:28px;align-items:flex-end;flex-wrap:nowrap}
figure{margin:0}figcaption{margin-top:6px;opacity:.6}
img{display:block}
.crops{width:fit-content;padding:0 8px 8px 0}
.win{position:relative;width:300px;height:300px;overflow:hidden;background:#fff;box-shadow:0 0 0 1px rgba(10,18,32,.1)}
.win img{position:absolute}
.cards{display:grid;grid-template-columns:repeat(4,${CARD_W}px);gap:24px;background:#f4f6f8;padding:24px}
.card{position:relative;width:${CARD_W}px;height:${CARD_H}px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 0 0 1px rgba(10,18,32,.08)}
.card img{position:absolute}
.txt{position:absolute;left:36px;top:32px;right:50%;color:#0a1220;display:flex;flex-direction:column;gap:150px}
.txt span{font-size:13px;color:#2331e4;font-weight:600}.txt b{font-size:40px;line-height:1.05;font-weight:600;letter-spacing:-.02em}
</style>
${crops}
${row('#F4F6F8', '#0A1220', 'On paper #F4F6F8, each at its size on the page at 1440 (hero 723 px tall, hands at scale × 460)', 'src')}
${row('#FFFFFF', '#0A1220', 'On white (card ground)', 'src')}
${row('#201838', '#EDE9FC', 'Violet mode (srcViolet) on raised violet #201838', 'srcViolet')}
<section style="background:#f4f6f8"><h2>In a card mock (${CARD_W}x${CARD_H}, hand at its manifest scale, cut on its edge)</h2></section>
<div class="cards">${m.values.map(card).join('')}</div>`;

const tmp = path.join(root, '.builds/.values-contact.html');
fs.writeFileSync(tmp, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 3200, height: 800 }, deviceScaleFactor: 2 });
await page.goto('file://' + tmp);
await page.waitForLoadState('networkidle');
await page.screenshot({ path: out, fullPage: true });
const cropOut = out.replace(/\.png$/, '-crop.png');
await page.locator('.crops').screenshot({ path: cropOut });
await browser.close();
fs.unlinkSync(tmp);
console.log('wrote', out, cropOut);

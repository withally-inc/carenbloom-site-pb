// Brand files: lockups (horizontal, wordmark, mark) x (ink, paper, cobalt), logo-mark.png, favicons, manifest.
// Requires scripts/brand/wordmark.json (python3 -I scripts/brand/outline.py). Run: node scripts/brand/brand.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const pub = (...p) => path.join(ROOT, 'public', ...p);
fs.mkdirSync(pub('brand'), { recursive: true });

export const COLORS = { ink: '#0A1220', paper: '#F4F6F8', cobalt: '#2331E4', mist: '#DCEDF5' };
const ICON_D = fs.readFileSync(path.join(ROOT, 'docs/icon-path.svg.txt'), 'utf8').match(/ d="([^"]+)"/)[1];
const WM = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/brand/wordmark.json'), 'utf8'));

const r = (v) => Math.round(v * 100) / 100;
const CAP = WM.capHeight;              // 700 units
const ICON = CAP * 1.45;               // icon height (and width, the mark is square)
const GAP = ICON * 0.45;               // icon right edge to wordmark ink left
const [wx0, wy0, wx1, wy1] = WM.ink;
const wordD = WM.paths.map((p) => p.d).join('');

function svg(viewBox, body, { color, title }) {
  const [, , w, h] = viewBox;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.map(r).join(' ')}" width="${r(w / 10)}" height="${r(h / 10)}" role="img" aria-label="${title}"><title>${title}</title><g fill="${color}">${body}</g></svg>\n`;
}

// icon placed with its vertical centre on the middle of the cap height
function iconAt(x, size) {
  const s = size / 42;
  const y = -CAP / 2 - size / 2;
  return `<path transform="translate(${r(x)} ${r(y)}) scale(${r(s * 1000) / 1000})" d="${ICON_D}"/>`;
}

export function lockups() {
  const out = {};
  // horizontal
  {
    const iconTop = -CAP / 2 - ICON / 2, iconBot = -CAP / 2 + ICON / 2;
    const shift = ICON + GAP - wx0; // translate wordmark so its ink starts at ICON+GAP
    const top = Math.min(iconTop, wy0), bot = Math.max(iconBot, wy1);
    const vb = [0, top, ICON + GAP + (wx1 - wx0), bot - top];
    out.horizontal = (c) => svg(vb, `${iconAt(0, ICON)}<path transform="translate(${r(shift)} 0)" d="${wordD}"/>`, { color: c, title: 'Care & Bloom' });
    out.horizontalBox = vb;
  }
  // wordmark only (tight to ink)
  {
    const vb = [wx0, wy0, wx1 - wx0, wy1 - wy0];
    out.wordmark = (c) => svg(vb, `<path d="${wordD}"/>`, { color: c, title: 'Care & Bloom' });
  }
  // mark only
  out.mark = (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42" width="42" height="42" role="img" aria-label="Care & Bloom"><title>Care &amp; Bloom</title><path fill="${c}" d="${ICON_D}"/></svg>\n`;
  return out;
}

async function main() {
  const L = lockups();
  for (const [name, fn] of [['horizontal', L.horizontal], ['wordmark', L.wordmark], ['mark', L.mark]]) {
    for (const v of ['ink', 'paper', 'cobalt']) {
      fs.writeFileSync(pub('brand', `logo-${name}-${v}.svg`), fn(COLORS[v]).replace('aria-label="Care & Bloom"', 'aria-label="Care &amp; Bloom"').replace('<title>Care & Bloom</title>', '<title>Care &amp; Bloom</title>'));
    }
  }
  // logo-mark.png 512 (ink on transparent), plus mist variant for dark grounds
  const markSvg = (c, size, pad = 0, bg = null) => {
    const inner = size - pad * 2;
    return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}<path transform="translate(${pad} ${pad}) scale(${inner / 42})" fill="${c}" d="${ICON_D}"/></svg>`);
  };
  const png = (buf, file) => sharp(buf, { density: 72 }).png({ compressionLevel: 9, palette: false }).toFile(file);
  await png(markSvg(COLORS.ink, 512), pub('brand', 'logo-mark.png'));
  await png(markSvg(COLORS.paper, 512), pub('brand', 'logo-mark-paper.png'));

  // favicons
  fs.writeFileSync(pub('favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42"><style>path{fill:${COLORS.ink}}@media (prefers-color-scheme:dark){path{fill:${COLORS.mist}}}</style><path d="${ICON_D}"/></svg>\n`);
  // 32px: tiny padding so the petals do not touch the tab edge
  await png(markSvg(COLORS.ink, 32, 1), pub('favicon-32.png'));
  // apple touch: mist mark on ink, padded (iOS rounds the corners)
  await png(markSvg(COLORS.mist, 180, 34, COLORS.ink), pub('apple-touch-icon.png'));
  // PWA icons: ink mark on paper, padding inside the maskable safe zone (80% circle)
  await png(markSvg(COLORS.ink, 192, 36, COLORS.paper), pub('icon-192.png'));
  await png(markSvg(COLORS.ink, 512, 96, COLORS.paper), pub('icon-512.png'));
  fs.writeFileSync(pub('site.webmanifest'), JSON.stringify({
    name: 'Care & Bloom',
    short_name: 'Care & Bloom',
    start_url: '/',
    display: 'standalone',
    theme_color: COLORS.paper,
    background_color: COLORS.paper,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }, null, 2) + '\n');
  console.log('brand: lockup viewBox', L.horizontalBox.map(r).join(' '), 'aspect', r(L.horizontalBox[2] / L.horizontalBox[3]));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) await main();

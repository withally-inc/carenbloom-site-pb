// Generate photographic source candidates for the values art with Gemini.
// Usage: node scripts/values/generate.mjs <id> [count=3] [--no-ref] [--out dir] [--model m]
// Reads scripts/values/prompts.json; writes <out>/value-<id>-<n>.png (default out: scripts/values/candidates).
// Needs GEMINI_API_KEY in the environment.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const id = args[0];
const count = Number(args.find((a, i) => i === 1 && /^\d+$/.test(a)) || 3);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const useRef = !args.includes('--no-ref');
const out = flag('--out') || path.join(here, 'candidates');
const model = flag('--model') || 'gemini-3-pro-image';
const P = JSON.parse(fs.readFileSync(path.join(here, 'prompts.json'), 'utf8'));
const v = P.values[id];
if (!v) throw new Error(`unknown id ${id}`);
fs.mkdirSync(out, { recursive: true });

const text = [v.prompt, P.common, useRef ? P.reference : ''].join(' ');
const parts = [{ text }];
if (useRef) {
  const ref = fs.readFileSync(path.join(here, '../../assets-src/hero-grow-end.png')).toString('base64');
  parts.push({ inline_data: { mime_type: 'image/png', data: ref } });
}
const body = {
  contents: [{ parts }],
  generationConfig: {
    responseModalities: ['IMAGE'],
    imageConfig: { aspectRatio: v.aspect, ...(model.includes('pro') ? { imageSize: '2K' } : {}) },
  },
};

async function one(n) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData || p.inline_data);
    if (img) {
      const d = img.inlineData || img.inline_data;
      const f = path.join(out, `value-${id}-${n}.png`);
      fs.writeFileSync(f, Buffer.from(d.data, 'base64'));
      console.log('wrote', f);
      return;
    }
    console.error(`value-${id}-${n} attempt ${attempt}:`, JSON.stringify(j).slice(0, 300));
  }
}
const start = Number(flag('--start') || 1);
await Promise.all(Array.from({ length: count }, (_, i) => one(start + i)));

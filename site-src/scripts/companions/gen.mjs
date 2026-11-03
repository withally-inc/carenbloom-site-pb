// Generate an isolated photo source for a companion with Gemini (gemini-2.5-flash-image).
//   node scripts/companions/gen.mjs <out.png> "<prompt>" [reference.png ...]
// Fruit and birds only: never a product, never a label. Key from $GEMINI_API_KEY.
import fs from 'node:fs'

const [out, prompt, ...refs] = process.argv.slice(2)
if (!out || !prompt) throw new Error('usage: gen.mjs <out.png> "<prompt>" [ref.png ...]')
const key = process.env.GEMINI_API_KEY
if (!key) throw new Error('GEMINI_API_KEY missing')
const model = process.env.MODEL || 'gemini-2.5-flash-image'
const parts = [
  ...refs.map((f) => ({ inline_data: { mime_type: 'image/png', data: fs.readFileSync(f).toString('base64') } })),
  { text: prompt },
]
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
  body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'] } }),
})
const json = await res.json()
const img = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData || p.inline_data)
if (!img) {
  console.error(JSON.stringify(json).slice(0, 800))
  process.exit(1)
}
fs.writeFileSync(out, Buffer.from((img.inlineData || img.inline_data).data, 'base64'))
console.log('wrote', out)

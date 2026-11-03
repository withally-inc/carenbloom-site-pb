// Contact sheet helper: node scripts/brand/contact.mjs out.png bg file1 file2 ... (tile 400)
import sharp from 'sharp';
const [out, bg, ...files] = process.argv.slice(2);
const T = 400, cols = Math.min(5, files.length), rows = Math.ceil(files.length / cols);
const comp = await Promise.all(files.map(async (f, i) => ({
  input: await sharp(f).resize(T, T, { fit: 'contain', background: bg }).flatten({ background: bg }).png().toBuffer(),
  left: (i % cols) * T, top: Math.floor(i / cols) * T,
})));
await sharp({ create: { width: cols * T, height: rows * T, channels: 3, background: bg } }).composite(comp).png().toFile(out);
console.log('wrote', out);

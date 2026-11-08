// Licensed guide photos. Sources, credits and permitted reuse: docs/VISIT-HONG-KONG-SOURCES.md.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'assets-src/visit/hong-kong');
const output = path.join(root, 'public/img/visit/hong-kong');
await fs.mkdir(output, { recursive: true });
let bytes = 0;
for (const file of (await fs.readdir(source)).filter((name) => name.endsWith('.jpg')).sort()) {
  const input = path.join(source, file);
  const { width, height } = await sharp(input).metadata();
  if (width < 384 || height < 288) throw new Error(`${file} is too small for a card`);
  const largest = Math.min(768, width, Math.floor(height * 4 / 3));
  for (const size of new Set([384, largest])) {
    const result = await sharp(input)
      .resize(size, size * 3 / 4, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 78, effort: 6 })
      .toFile(path.join(output, `${path.parse(file).name}-${size}.webp`));
    bytes += result.size;
  }
}
console.log(`Visitor photos: ${Math.round(bytes / 1024)} KiB across both responsive sizes`);

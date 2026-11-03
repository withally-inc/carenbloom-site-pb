// Colour-to-alpha (GIMP style): un-composites a foreground that was flattened over a known solid colour.
// Exact for every pixel p = a*fg + (1-a)*bg, so halftone dots keep their anti-aliasing and get no halo.
// floor: alpha below this is treated as background noise (video compression), rescaled above it.
export function colorToAlpha(rgb, channels, bg, floor = 0) {
  const n = rgb.length / channels;
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const s = i * channels, d = i * 4;
    let a = 0;
    for (let c = 0; c < 3; c++) {
      const p = rgb[s + c], b = bg[c];
      const ac = p > b ? (p - b) / (255 - b) : p < b ? (b - p) / b : 0;
      if (ac > a) a = ac;
    }
    let a2 = floor ? Math.max(0, (a - floor) / (1 - floor)) : a;
    if (a2 <= 0) { out[d + 3] = 0; continue; }
    for (let c = 0; c < 3; c++) {
      const v = bg[c] + (rgb[s + c] - bg[c]) / a2;
      out[d + c] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
    }
    out[d + 3] = Math.round(a2 * 255);
  }
  return out;
}
export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

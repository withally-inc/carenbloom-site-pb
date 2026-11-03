// Motif silhouettes for the brand card moment 'roll' (docs/MOTION-CHALLENGE.md 4.4).
// Each motif is one shape in a 100 x 100 box, drawn from the brand's own product
// silhouettes (Hello Nancy: Lem, the avocado, the raspberry). The shape is only ever
// used as a mask: what shows through it is the brand's next photo, so no colour lives
// here. A new motif is one entry below, reviewed against the egg safety notes
// (MOTION-CHALLENGE section 3): products as objects, never bodies.

export type MotifShape = 'lemon' | 'avocado' | 'raspberry'

// raspberry: drupelets as overlapping circles, a little taller than wide like the product
const drupelets = [
  [50, 20], [35, 27], [65, 27], [24, 42], [42, 39], [58, 39], [76, 42],
  [30, 57], [50, 54], [70, 57], [38, 72], [62, 72], [50, 85],
]
  .map(([x, y]) => `<circle cx='${x}' cy='${y}' r='14'/>`)
  .join('')

export const MOTIFS: Record<MotifShape, string> = {
  // a lemon on its side, with the two nubs at the ends
  lemon: "<path d='M3 50C6 46 8 44 11 42C17 26 32 17 50 17S83 26 89 42C92 44 94 46 97 50C94 54 92 56 89 58C83 74 68 83 50 83S17 74 11 58C8 56 6 54 3 50Z'/>",
  // a halved avocado standing up: narrow neck, round base
  avocado: "<path d='M50 5C62 5 68 17 70 29C72 40 86 51 86 66C86 84 70 95 50 95S14 84 14 66C14 51 28 40 30 29C32 17 38 5 50 5Z'/>",
  raspberry: `<g>${drupelets}</g>`,
}

/** the motif as a CSS mask-image value */
export function motifMask(shape: MotifShape): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>${MOTIFS[shape]}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

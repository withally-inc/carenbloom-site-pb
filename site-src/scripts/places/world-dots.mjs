// Generates src/data/world-dots.ts: the dot-matrix world map of the People
// section's "places" block. Land from world-atlas (Natural Earth 110m), projected
// with d3-geo's Natural Earth projection, sampled on a 45 degree halftone screen
// (a square lattice turned 45 degrees: rows s apart, dots 2s apart in a row,
// odd rows shifted by s). Each land dot carries a tone 1..3 from its distance to
// the coast, so coastlines fall off like a halftone screen.
//
//   node scripts/places/world-dots.mjs
//
// Output is packed 2 bits per lattice cell (0 = sea), base64, per grid. The page
// draws it on canvas; d3 never ships to the browser.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { geoNaturalEarth1, geoContains, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'

const require = createRequire(import.meta.url)
const root = resolve(import.meta.dirname, '..', '..')
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/land-110m.json'), 'utf8'))
const land = feature(topo, topo.objects.land)

const proj = geoNaturalEarth1().scale(1).translate([0, 0]).precision(0.01)
const [[sx0], [sx1]] = geoPath(proj).bounds({ type: 'Sphere' })
const W = sx1 - sx0
const LAT_TOP = 80
const LAT_BOTTOM = -57 // the tip of South America; Antarctica stays off the map
const yTop = proj([0, LAT_TOP])[1]
const yBot = proj([0, LAT_BOTTOM])[1]
const H = yBot - yTop
const norm = ([x, y]) => [(x - sx0) / W, (y - yTop) / W]

const CITIES = [
  { id: 'hong-kong', name: 'Hong Kong', tz: 'Asia/Hong_Kong', lon: 114.1694, lat: 22.3193 },
  { id: 'shenzhen', name: 'Shenzhen', tz: 'Asia/Shanghai', lon: 114.0579, lat: 22.5431 },
  { id: 'london', name: 'London', tz: 'Europe/London', lon: -0.1276, lat: 51.5072 },
  { id: 'san-francisco', name: 'San Francisco', tz: 'America/Los_Angeles', lon: -122.4194, lat: 37.7749 },
]

function grid(per) {
  const s = W / per // row pitch in projected units
  const rows = Math.floor(H / s)
  const cols = Math.ceil(per / 2)
  const cells = new Uint8Array(rows * cols)
  const lat = []
  const k = []
  for (let r = 0; r < rows; r++) {
    const y = yTop + (r + 0.5) * s
    const ll = proj.invert([0, y])
    lat.push(+ll[1].toFixed(3))
    // x = lon(rad) * k(lat): Natural Earth is pseudo-cylindrical
    k.push(+((proj([1, ll[1]])[0] / (Math.PI / 180)) / W).toFixed(6))
    for (let c = 0; c < cols; c++) {
      const x = sx0 + s * (2 * c + (r % 2) + 0.5)
      const p = proj.invert([x, y])
      if (!p || Math.abs(p[0]) > 180) continue
      // invert past the sphere's edge wraps; reproject to reject it
      const back = proj(p)
      if (!back || Math.abs(back[0] - x) > s * 0.25) continue
      if (geoContains(land, p)) cells[r * cols + c] = 9
    }
  }
  // coast distance on the lattice (horizontal and diagonal neighbours)
  const at = (r, c) => (r < 0 || r >= rows || c < 0 || c >= cols ? 0 : cells[r * cols + c])
  const nbrs = (r, c) => {
    const o = r % 2 // odd rows sit s to the right
    const d = o ? [c, c + 1] : [c - 1, c]
    return [[r, c - 1], [r, c + 1], [r - 1, d[0]], [r - 1, d[1]], [r + 1, d[0]], [r + 1, d[1]]]
  }
  const dist = new Int8Array(rows * cols).fill(-1)
  let frontier = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (!cells[r * cols + c]) continue
      if (nbrs(r, c).some(([a, b]) => !at(a, b))) {
        dist[r * cols + c] = 0
        frontier.push([r, c])
      }
    }
  for (let step = 1; step <= 2 && frontier.length; step++) {
    const next = []
    for (const [r, c] of frontier)
      for (const [a, b] of nbrs(r, c)) {
        if (!at(a, b) || dist[a * cols + b] >= 0) continue
        dist[a * cols + b] = step
        next.push([a, b])
      }
    frontier = next
  }
  let count = 0
  const packed = new Uint8Array(Math.ceil((rows * cols) / 4))
  for (let i = 0; i < rows * cols; i++) {
    if (!cells[i]) continue
    count++
    const d = dist[i] < 0 ? 2 : dist[i]
    const tone = d + 1 // 1 coast, 2 one in, 3 inland
    packed[i >> 2] |= tone << ((i & 3) * 2)
  }
  return { s: +(s / W).toFixed(7), rows, cols, count, lat, k, data: Buffer.from(packed).toString('base64') }
}

// the narrow crop (phones): Pacific edge to Japan, Arctic to the Cape
function crop(lon0, lon1, lat0, lat1) {
  const [x0] = norm(proj([lon0, 0]))
  const [x1] = norm(proj([lon1, 0]))
  const [, y0] = norm(proj([0, lat0]))
  const [, y1] = norm(proj([0, lat1]))
  return [+x0.toFixed(4), +Math.max(0, y0).toFixed(4), +x1.toFixed(4), +y1.toFixed(4)]
}

const fine = grid(272)
const coarse = grid(150)
const out = {
  aspect: +(H / W).toFixed(5),
  // Natural Earth forward constants, for great-circle arcs drawn at runtime
  proj: { W: +W.toFixed(6), yTop: +yTop.toFixed(6) },
  fine,
  coarse,
  crops: { wide: [0, 0, 1, +(H / W).toFixed(5)], narrow: crop(-134, 150, 70, -36) },
  cities: CITIES.map((c) => {
    const [x, y] = norm(proj([c.lon, c.lat]))
    return { ...c, x: +x.toFixed(5), y: +y.toFixed(5) }
  }),
}

const ts = `// Generated by scripts/places/world-dots.mjs from world-atlas land-110m
// (Natural Earth projection, 45 degree halftone lattice). Do not edit by hand.
// Coordinates are normalized to the map width: x 0..1, y 0..aspect.
// Grid cells pack 2 bits each (0 sea, 1 coast, 2 near coast, 3 inland), row-major.

export type DotGrid = {
  /** row pitch; dots sit 2s apart in a row, odd rows shifted by s */
  s: number
  rows: number
  cols: number
  count: number
  /** latitude of each row (deg) */
  lat: number[]
  /** x = 0.5 + lon(rad) * k[row] */
  k: number[]
  data: string
}
export type City = { id: string; name: string; tz: string; lon: number; lat: number; x: number; y: number }

export const WORLD: {
  aspect: number
  /** projected width and the y of the top edge (d3 units, y down) */
  proj: { W: number; yTop: number }
  fine: DotGrid
  coarse: DotGrid
  crops: { wide: [number, number, number, number]; narrow: [number, number, number, number] }
  cities: City[]
} = ${JSON.stringify(out)}
`
writeFileSync(resolve(root, 'src/data/world-dots.ts'), ts)
console.log(`world-dots: fine ${fine.cols}x${fine.rows} (${fine.count} dots), coarse ${coarse.cols}x${coarse.rows} (${coarse.count} dots), ${(ts.length / 1024).toFixed(1)} KB`)

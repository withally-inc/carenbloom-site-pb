// The four space icons (owner request, 21 Oct 2026): one per vertical, drawn from the
// mark's petal so they read as one family with the logo. The petal is the mark's own
// silhouette: a 90 degree tip and a round base (radius = length / (1 + sqrt 2)), with
// the swirl of its counter as an inner vein. 42 box like the mark, stroke 2 = the
// mark's line weight at the same size. Paths are drawn in order when a row opens.
//   sexual health  two petals meeting, their overlap a third petal
//   longevity      growth rings: three petals nested about one centre
//   mental health  a calm cradle: two open petals holding the centre ring
//   education      an open book: two petals as pages, two lines of text on each
// petalPath() below generated them (base point, angle to the tip in degrees, length).

export type SpaceIcon = { paths: string[]; offset: [number, number] }

export const SPACE_ICONS: Record<string, SpaceIcon> = {
  'sexual-health': {
    offset: [0,-3],
    paths: [
      'M21,38 L25.73,27.86 A11.18 11.18 0 1 0 10.86,33.27 Z',
      'M21,38 L31.14,33.27 A11.18 11.18 0 1 0 16.27,27.86 Z',
    ],
  },
  'longevity': {
    offset: [2.67,-2.67],
    paths: [
      'M33.66,8.34 L18.34,8.34 A15.33 15.33 0 1 0 33.66,23.66 Z',
      'M29.68,12.32 L19.32,12.32 A10.36 10.36 0 1 0 29.68,22.68 Z',
      'M25.69,16.31 L20.31,16.31 A5.38 5.38 0 1 0 25.69,21.69 Z',
    ],
  },
  'mental-health': {
    offset: [0,-3.5],
    paths: [
      'M3.62,25.67 L6.85,32.62 A7.66 7.66 0 1 0 10.56,22.43 Z',
      'M7.09,26.94 C12.88,24.56 18.35,26.96 17.4,30.69',
      'M38.38,25.67 L31.44,22.43 A7.66 7.66 0 1 0 35.15,32.62 Z',
      'M34.91,26.94 C29.12,24.56 23.65,26.96 24.6,30.69',
      'M16.6 16.5 a4.4 4.4 0 1 0 8.8 0 a4.4 4.4 0 1 0 -8.8 0',
    ],
  },
  'education': {
    offset: [0, -3],
    paths: [
      // an open book: two petals as pages, their 90 degree tips meeting at the foot of
      // the spine, the round bases as the pages' outer corners, two lines of text each
      'M20,32 L20,24 A8 8 0 1 0 12,32 Z',
      'M22,32 L30,32 A8 8 0 1 0 22,24 Z',
      'M9.5 21.5 H16',
      'M10 26 H16',
      'M32.5 21.5 H26',
      'M32 26 H26',
    ],
  },
}

/** the mark's petal as a path: base (bx, by), tip at `deg` degrees and `length` away */
export function petalPath(bx: number, by: number, deg: number, length: number): string {
  const f = (n: number) => +n.toFixed(2)
  const r = length / (1 + Math.SQRT2)
  const a = (deg * Math.PI) / 180
  const [ux, uy, vx, vy] = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a)]
  const at = (s: number, t: number) => `${f(bx + ux * s + vx * t)},${f(by + uy * s + vy * t)}`
  const k = r + r / Math.SQRT2
  return `M${at(length, 0)} L${at(k, -r / Math.SQRT2)} A${f(r)} ${f(r)} 0 1 0 ${at(k, r / Math.SQRT2)} Z`
}

const NS = 'http://www.w3.org/2000/svg'
/** the icon as an svg: a resting layer (ink) under a live layer (cobalt) that draws in */
export function spaceIconSVG(slug: string): SVGSVGElement | null {
  const icon = SPACE_ICONS[slug]
  if (!icon) return null
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 42 42')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.setAttribute('class', 'space__svg')
  const layer = (cls: string, draw: boolean) => {
    const g = document.createElementNS(NS, 'g')
    g.setAttribute('class', cls)
    const inner = document.createElementNS(NS, 'g')
    inner.setAttribute('transform', `translate(${icon.offset[0]} ${icon.offset[1]})`)
    icon.paths.forEach((d, i) => {
      const p = document.createElementNS(NS, 'path')
      p.setAttribute('d', d)
      if (draw) {
        p.setAttribute('pathLength', '1')
        p.style.setProperty('--i', String(i))
        p.style.setProperty('--n', String(icon.paths.length))
      }
      inner.appendChild(p)
    })
    g.appendChild(inner)
    svg.appendChild(g)
  }
  layer('space__rest', false)
  layer('space__live', true)
  return svg
}

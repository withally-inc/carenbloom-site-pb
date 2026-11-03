// The portfolio registry (docs/MOTION-CHALLENGE.md section 4). One entry per brand.
// The brand cards, the spaces accordion chips, the spaces petal indicator and any later
// brand surface read from here, so Care & Bloom can go from 2 brands to 10 with data only.
//
// HOW THE HTML STAYS IN SYNC (and why it is built this way)
// The cards and the accordion rows are static HTML in src/sections/brands.html and
// spaces.html, between `@generated` markers, rendered from this file by the pure
// functions below. That gives crawlers and the first paint the real markup with no
// runtime render and no flash, and ships none of this rendering code to the browser.
// The alternative (render at runtime over a static fallback) would keep two copies of
// the markup that can drift apart. Here there is one renderer and one source of data:
//   - after editing BRANDS (or the image manifest), regenerate both regions:
//       node -e "import('./src/data/brands.ts').then((m) => m.syncSections(require('node:fs')))"
//   - in `vite dev`, brands.ts and spaces.ts re-render from this file and warn in the
//     console if the HTML on disk is stale, so a forgotten sync cannot go unnoticed.
// This file is plain TypeScript with type-only imports, so Node runs it directly.
//
// ADDING A BRAND
// 1. Drop its photos in assets-src/ and run scripts/images.mjs (manifest entries).
// 2. Add one BrandEntry below. Pick moment 'advance' unless it has a motif per image
//    ('roll', shapes in motifs.ts) or an i or j in its name and wants 'hop'.
// 3. Optional: a cursor companion (`companion`, sprites from scripts/companions/build.py);
//    without one the card gets the group's turning petal (DEFAULT_COMPANION).
// 4. Run the sync command above. Card, grid layout, chips, spaces status and petal follow.

import type { MotifShape } from './motifs'

export type BrandStatus = 'in-market' | 'coming-soon'
export type Space = 'sexual-health' | 'longevity' | 'mental-health' | 'education'

/** the hover/focus moment of a card; unknown or unmet requirements fall back (see resolveMoment) */
export type Moment =
  | 'advance' // default: hovering shows the next gallery image with the house wipe
  | 'roll' // the next image arrives in a motif-shaped window that rolls in (needs a motif per image)
  | 'hop' // the tittles of the name's i and j hop (needs an i or j in the name)
  | 'none' // coming soon, or a brand that wants stillness

/**
 * The card's cursor companion (src/lib/companion.ts, docs/FOUNDATION.md "Companions"):
 * a halftone character that follows the pointer inside its own card only. Sprites are
 * built by scripts/companions/build.py into public/img/companions/<name>-<px>.webp.
 */
export type CompanionFlavour = 'roll' | 'turn' | 'hop'
export interface CompanionSpec {
  /** sprite base, '/img/companions/raspberry'; null draws the Care & Bloom petal (vector) */
  sprite: string | null
  frames: number
  /** px of one frame in the 1x strip */
  frameSize: number
  /** CSS px on a desktop card; phones scale it to the card (max 26% of its width) */
  size: number
  /** roll: turns with distance like the lemon; turn: a vector that spins; hop: a bird */
  flavour: CompanionFlavour
  /** hop: the feet line of the sprite, 0..1 of the frame height */
  feet?: number
}

/** a brand that names no companion gets the group's petal, turning as it travels */
export const DEFAULT_COMPANION: CompanionSpec = { sprite: null, frames: 8, frameSize: 0, size: 64, flavour: 'turn' }

/** [x0, y0, x1, y1], normalized to the image (0..1, before the card's cover crop) */
export type ImageRect = [number, number, number, number]

export interface BrandImage {
  key: string // public/img/manifest.json images.<key>
  alt: string // docs/COPY.md alt text table
  motif?: MotifShape // the silhouette that carries this image in a 'roll' moment
  /**
   * Where a cursor companion may never go: the product and the hand holding it (BRAND 3,
   * no innuendo). The companion's body is pushed out of these rects, it never travels
   * across them, and its rest and perch spots lie outside them. A photo that is product
   * or body throughout gets [[0, 0, 1, 1]]: the companion keeps to the top edge and the
   * text under the photo. Every gallery image needs one before it ships with a companion.
   */
  avoid: ImageRect[]
}

export interface BrandEntry {
  slug: string // 'hello-nancy'
  name: string // verbatim
  url: string | null // null while coming soon: the card is then not a link
  linkLabel: string | null // 'Visit Hello Nancy (opens in a new tab)'
  category: string // label, verbatim
  space: Space // drives the spaces accordion chips and petal indicator
  status: BrandStatus
  description: string // verbatim
  gallery: BrandImage[] // empty for coming soon
  galleryLabel?: string // 'Hello Nancy product gallery'
  /** loading and coming-soon ground. Sampled from gallery[0] (sharp stats().dominant);
   *  a manifest `ground` for that image wins when present; mist when empty. */
  ground: string
  moment: Moment
  egg?: 'wave' | 'perch' // E5, E4
  /** the card's cursor companion; omitted = DEFAULT_COMPANION, 'none' = no companion */
  companion?: CompanionSpec | 'none'
  order: number // in-market first, then by order
}

export const BRANDS: BrandEntry[] = [
  {
    slug: 'hello-nancy',
    name: 'Hello Nancy',
    url: 'https://hellonancy.com',
    linkLabel: 'Visit Hello Nancy (opens in a new tab)',
    category: 'Sexual wellness',
    space: 'sexual-health',
    status: 'in-market',
    description: 'A stigmatized category, made easy to enter and safe to trust.',
    gallery: [
      { key: 'nancy-lem', alt: "Hello Nancy's Lem product photographed on a bright yellow set with lemon slices", motif: 'lemon', avoid: [[0.24, 0.3, 0.76, 0.7]] },
      { key: 'nancy-avocado', alt: 'Hello Nancy avocado-form product arranged among avocados on a green ground', motif: 'avocado', avoid: [[0.34, 0.2, 0.64, 0.8]] },
      { key: 'nancy-raspberry', alt: 'Hello Nancy raspberry-form product held in a hand on a pink ground', motif: 'raspberry', avoid: [[0.06, 0.2, 1, 0.84]] },
    ],
    galleryLabel: 'Hello Nancy product gallery',
    ground: '#f8b808',
    moment: 'roll',
    egg: 'wave',
    // the brand's world is fruit and the lemon is How we work's: a raspberry that rolls
    companion: { sprite: '/img/companions/raspberry', frames: 10, frameSize: 132, size: 132, flavour: 'roll' },
    order: 1,
  },
  {
    slug: 'biird',
    name: 'Biird',
    url: 'https://biird.co',
    linkLabel: 'Visit Biird (opens in a new tab)',
    category: 'Intimate wellness',
    space: 'sexual-health',
    status: 'in-market',
    description: 'Design-led objects, made to be picked up, understood and bought without apology.',
    gallery: [
      { key: 'biird-glass-sky', alt: 'Biird glass wand held against a blue sky and white clouds', avoid: [[0.36, 0.1, 0.72, 0.9], [0, 0.4, 0.6, 1]] },
      { key: 'biird-lilac-first-timer', alt: 'Biird lilac product in an on-body lifestyle photograph with first-timer guidance', avoid: [[0, 0, 1, 1]] },
      { key: 'biird-ohwii-branch', alt: "Biird's blue glass object resting on a bare branch against a blue backdrop", avoid: [[0.4, 0.15, 0.84, 0.94], [0.18, 0.62, 0.92, 1]] },
    ],
    galleryLabel: 'Biird product gallery',
    ground: '#3898b8',
    moment: 'hop',
    egg: 'perch',
    // a sparrow that hops after the pointer and perches on the card's top edge (E4's wire)
    companion: { sprite: '/img/companions/bird', frames: 5, frameSize: 150, size: 150, flavour: 'hop', feet: 0.8 },
    order: 2,
  },
]

/** the four verticals, in accordion order (= petal order N, E, S, W). Copy verbatim, docs/COPY.md */
export interface SpaceEntry {
  slug: Space
  title: string
  body: string
}
export const SPACES: SpaceEntry[] = [
  {
    slug: 'sexual-health',
    title: 'Sexual health',
    body: 'Care for intimacy, hormones, fertility, pleasure, and agency still asks people to navigate stigma. We build brands that make the category easier to enter and safer to trust.',
  },
  {
    slug: 'longevity',
    title: 'Longevity',
    body: 'Longevity is moving from abstract promises to practical healthspan: energy, recovery, prevention, metabolic health, and routines people can keep.',
  },
  {
    slug: 'mental-health',
    title: 'Mental health',
    body: 'People need support that feels accessible and human, with enough clinical seriousness to be trusted and enough cultural fluency to be used.',
  },
  {
    slug: 'education',
    title: 'Education',
    body: 'Better health decisions start with language people understand. Education turns expert knowledge into routines, confidence, and behavior change.',
  },
]

export const STATUS_LABEL: Record<BrandStatus, string> = { 'in-market': 'In market', 'coming-soon': 'Coming soon' }
/** the ground fallback: the theme's mist token, so a card without a photo follows violet mode */
export const MIST = 'var(--mist)'

// ───────── derived data (used at build time and at runtime) ─────────

/** in-market first, then by order */
export const sortBrands = (list: BrandEntry[] = BRANDS) =>
  [...list].sort((a, b) => (a.status === b.status ? a.order - b.order : a.status === 'in-market' ? -1 : 1))

export const bySlug = (slug: string | undefined, list: BrandEntry[] = BRANDS) => list.find((b) => b.slug === slug)

/** the moment a card actually gets, after checking what the moment needs */
export function resolveMoment(b: BrandEntry): Moment {
  if (b.status !== 'in-market' || !b.url || b.moment === 'none') return 'none'
  const canAdvance = b.gallery.length > 1
  if (b.moment === 'roll' && canAdvance && b.gallery.every((g) => g.motif)) return 'roll'
  if (b.moment === 'hop' && /[ij]/.test(b.name)) return 'hop'
  return canAdvance ? 'advance' : 'none'
}

/** the companion a card actually gets: none unless the card is a live link */
export function resolveCompanion(b: BrandEntry): CompanionSpec | null {
  if (b.status !== 'in-market' || !b.url || b.companion === 'none') return null
  return b.companion ?? DEFAULT_COMPANION
}

/** a space is in market when at least one of its brands is */
export const spaceInMarket = (space: Space, list: BrandEntry[] = BRANDS) =>
  list.some((b) => b.space === space && b.status === 'in-market')
export const spaceStatus = (space: Space, list: BrandEntry[] = BRANDS): BrandStatus =>
  spaceInMarket(space, list) ? 'in-market' : 'coming-soon'

/**
 * Rows for n cards on the desktop grid: rows of 3, never a row of 1. If one card would
 * be left over, the last two rows become 2 + 2. 1 = [1], 2 = [2], 4 = [2,2], 5 = [3,2],
 * 7 = [3,2,2], 10 = [3,3,2,2].
 */
export function rowsFor(n: number): number[] {
  if (n <= 0) return []
  if (n <= 2) return [n]
  const rows = Array<number>(Math.floor(n / 3)).fill(3)
  const rest = n % 3
  if (rest === 2) rows.push(2)
  if (rest === 1) rows.splice(rows.length - 1, 1, 2, 2)
  return rows
}

// ───────── build-time rendering (pure: strings in, strings out) ─────────

export interface ManifestImage {
  width: number
  height: number
  widths: number[]
  formats: string[]
  pattern: string // /img/<name>-{w}.{format}
  placeholder?: string
  ground?: string
}
export interface Manifest {
  images: Record<string, ManifestImage>
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const at = (p: string, w: number, f: string) => p.replace('{w}', String(w)).replace('{format}', f)
const TYPES: Record<string, string> = { avif: 'image/avif', webp: 'image/webp' }

function picture(img: BrandImage, m: ManifestImage | undefined, i: number, sizes: string): string {
  const cls = `bcard__slide${i === 0 ? ' is-active' : ''}`
  const hidden = i === 0 ? '' : ' aria-hidden="true"'
  if (!m) throw new Error(`brands: image "${img.key}" is not in public/img/manifest.json`)
  const sources = m.formats
    .map((f) => `<source type="${TYPES[f] ?? `image/${f}`}" srcset="${m.widths.map((w) => `${at(m.pattern, w, f)} ${w}w`).join(', ')}" sizes="${sizes}">`)
    .join('')
  const fallbackW = m.widths.find((w) => w >= 960) ?? m.widths[m.widths.length - 1]
  const fmt = m.formats.includes('webp') ? 'webp' : m.formats[0]
  return `<picture class="${cls}" data-i="${i}"${hidden}>${sources}<img src="${at(m.pattern, fallbackW, fmt)}" width="${m.width}" height="${m.height}" alt="${esc(img.alt)}" loading="lazy" decoding="async" draggable="false"></picture>`
}

function card(b: BrandEntry, manifest: Manifest, span: number, col: number, phase: number, short: boolean): string {
  const moment = resolveMoment(b)
  const first = b.gallery[0] ? manifest.images[b.gallery[0].key] : undefined
  const ground = first?.ground || b.ground || MIST
  const d = (ms: number) => ` data-delay="${ms + col * 120}"`
  const chip = `<span class="chip ${b.status === 'in-market' ? 'chip--sun' : 'chip--line'}">${STATUS_LABEL[b.status]}</span>`
  const meta = `<p class="bcard__meta"><span class="label">${esc(b.category)}</span>${chip}</p>`
  const desc = `<p class="body bcard__desc">${esc(b.description)}</p>`
  const live = b.status === 'in-market' && !!b.url && b.gallery.length > 0
  const name = `<h3 class="bcard__name" id="brand-${b.slug}" data-reveal="fade"${d(live ? 420 : 200)}>${esc(b.name)}</h3>`

  if (!live) {
    return `
      <article class="bcard bcard--soon${short ? ' bcard--short' : ''}" data-brand="${b.slug}" data-status="${b.status}" data-moment="none" data-span="${span}" style="--ground:${ground}" aria-labelledby="brand-${b.slug}">
        <div class="bcard__visual">
          <div class="bcard__media bcard__media--soon" data-reveal="rise"${d(0)}><svg class="mark bcard__bud" viewBox="0 0 42 42" aria-hidden="true" focusable="false"></svg></div>
          ${name}
        </div>
        <div class="bcard__body" data-reveal="rise"${d(140)}>${meta}${desc}</div>
      </article>`
  }

  const sizes = `(min-width: 768px) ${Math.round((span / 6) * 100)}vw, 100vw`
  const slides = b.gallery.map((g, i) => picture(g, manifest.images[g.key], i, sizes)).join('')
  const segs = b.gallery.map((_, i) => `<i class="bcard__seg${i === 0 ? ' is-active' : ''}"><b></b></i>`).join('')
  const ph = first?.placeholder ? `--ph:url('${first.placeholder}');` : ''
  const multi = b.gallery.length > 1
  const href = esc(b.url ?? '')
  const label = esc(b.linkLabel ?? `Visit ${b.name} (opens in a new tab)`)
  return `
      <article class="bcard bcard--live link-block" data-brand="${b.slug}" data-status="${b.status}" data-moment="${moment}"${b.egg ? ` data-egg="${b.egg}"` : ''} data-span="${span}" data-phase="${phase.toFixed(3)}" style="--ground:${ground}" aria-labelledby="brand-${b.slug}">
        <div class="bcard__visual">
          <div class="bcard__media" data-reveal="wipe"${d(0)} style="${ph}">
            <div class="media bcard__wipe">
              <div class="bcard__stage" role="group" aria-label="${esc(b.galleryLabel ?? `${b.name} product gallery`)}">${slides}</div>
            </div>
            <div class="bcard__shade" aria-hidden="true"></div>
          </div>
          ${name}${
            multi
              ? `
          <div class="bcard__bar" aria-hidden="true" data-reveal="fade"${d(520)}>${segs}</div>
          <button class="bcard__pause glass" type="button" aria-label="Pause gallery" data-reveal="fade"${d(620)}><span class="bcard__pi" aria-hidden="true"><i></i><i></i></span></button>`
              : ''
          }
        </div>
        <div class="bcard__body" data-reveal="rise"${d(140)}>${meta}${desc}
          <a class="dotlink dotlink--stretch bcard__link" href="${href}" target="_blank" rel="noopener" aria-label="${label}"><span>Visit brand ↗</span></a>
        </div>
      </article>`
}

/** the brands grid: every card, laid out by rowsFor(), in-market first */
export function renderBrandCards(manifest: Manifest, list: BrandEntry[] = BRANDS): string {
  const sorted = sortBrands(list)
  const rows = rowsFor(sorted.length)
  const live = sorted.filter((b) => b.status === 'in-market' && b.gallery.length > 1)
  const out: string[] = []
  let k = 0
  for (const perRow of rows) {
    // a row with no live card gets shorter panels: nothing to show yet but a bud
    const short = sorted.slice(k, k + perRow).every((b) => !live.includes(b))
    for (let col = 0; col < perRow; col++, k++) {
      const b = sorted[k]
      const li = live.indexOf(b)
      out.push(card(b, manifest, 6 / perRow, col, li < 0 ? 0 : li / Math.max(1, live.length), short))
    }
  }
  const compact = sorted.length > 3 ? ' data-compact' : ''
  return `
    <div class="brands__grid" data-count="${sorted.length}" data-rows="${rows.join('-')}"${compact}>${out.join('')}
    </div>
    `
}

/** the spaces accordion rows; the first space in market opens by default */
export function renderSpacesList(list: BrandEntry[] = BRANDS): string {
  const openSlug = (SPACES.find((s) => spaceInMarket(s.slug, list)) ?? SPACES[0]).slug
  const rows = SPACES.map((s) => {
    const status = spaceStatus(s.slug, list)
    const open = s.slug === openSlug
    const chip = `<span class="chip ${status === 'in-market' ? 'chip--sun' : 'chip--line'}">${STATUS_LABEL[status]}</span>`
    return `
        <li class="space" data-space="${s.slug}" data-status="${status}"${open ? ' data-open' : ''}>
          <h3 class="space__head">
            <button class="space__btn" type="button" id="space-btn-${s.slug}" aria-expanded="${open}" aria-controls="space-panel-${s.slug}" aria-label="${esc(s.title)}, ${STATUS_LABEL[status].toLowerCase()}">
              <span class="space__title">${esc(s.title)}</span>${chip}<span class="space__plus" aria-hidden="true"><i></i><i></i></span>
            </button>
          </h3>
          <div class="space__panel" id="space-panel-${s.slug}" role="region" aria-labelledby="space-btn-${s.slug}">
            <div class="space__clip"><p class="body space__body">${esc(s.body)}</p></div>
          </div>
        </li>`
  }).join('')
  return `
      <ul class="spaces__list" role="list" data-reveal="rise">${rows}
      </ul>
      `
}

// ───────── the @generated regions ─────────

const open = (name: string) => `<!-- @generated:${name} from src/data/brands.ts, do not edit by hand -->`
const close = (name: string) => `<!-- /@generated:${name} -->`

/** the current contents of a region, or null if the markers are missing */
export function extractRegion(src: string, name: string): string | null {
  const a = src.indexOf(open(name))
  const b = src.indexOf(close(name))
  return a < 0 || b < a ? null : src.slice(a + open(name).length, b)
}
export function replaceRegion(src: string, name: string, body: string): string {
  const a = src.indexOf(open(name))
  const b = src.indexOf(close(name))
  if (a < 0 || b < a) throw new Error(`brands: markers for "${name}" not found`)
  return src.slice(0, a + open(name).length) + body + src.slice(b)
}
/** whitespace-insensitive comparison, for the dev staleness check */
export const sameMarkup = (a: string | null, b: string) => a !== null && a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim()

type FsLike = { readFileSync(p: string, enc: 'utf8'): string; writeFileSync(p: string, data: string): void }

/** Regenerate both regions on disk. Run from the site root (see the header). */
export function syncSections(fs: FsLike): void {
  const manifest = JSON.parse(fs.readFileSync('public/img/manifest.json', 'utf8')) as Manifest
  const jobs: [string, string, string][] = [
    ['src/sections/brands.html', 'brands-cards', renderBrandCards(manifest)],
    ['src/sections/spaces.html', 'spaces-list', renderSpacesList()],
  ]
  for (const [file, name, body] of jobs) {
    const src = fs.readFileSync(file, 'utf8')
    const next = replaceRegion(src, name, body)
    if (next !== src) fs.writeFileSync(file, next)
    console.log(`${next === src ? 'unchanged' : 'updated  '} ${file} (${name})`)
  }
}

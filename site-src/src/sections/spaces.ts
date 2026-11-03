import './spaces.css'
import { SPACES, spaceStatus } from '../data/brands'
import { budPetals, buildPetals } from '../lib/bloom'
import { ScrollTrigger } from '../lib/lenis'
import { spaceIconSVG } from './spaces.icons'

// The spaces (docs/MOTION-CHALLENGE.md 1.17). The rows are static HTML rendered from
// src/data/brands.ts; their chips come from the registry (a space is in market when
// one of its brands is). This module adds the single-open accordion, its keyboard
// model, and the petal indicator, which is the mark at its true state: one petal per
// space, open where a brand is in market, a bud where one is coming.

export function init(root: HTMLElement): () => void {
  const rows = [...root.querySelectorAll<HTMLElement>('.space')]
  const buttons = rows.map((r) => r.querySelector<HTMLButtonElement>('.space__btn')!)
  const offs: (() => void)[] = []
  const on = <K extends keyof HTMLElementEventMap>(t: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    t.addEventListener(type, fn)
    offs.push(() => t.removeEventListener(type, fn))
  }

  // ───────── the space icons (spaces.icons.ts) ─────────
  // One per row, in front of the title. The rows are generated from the registry
  // (brands.ts), so the icon is added here: it is decorative (aria-hidden) and the
  // rows read the same without it. At rest it is drawn in ink (lighter when coming
  // soon); opening a row draws its cobalt line over it, closing folds it back (CSS).
  rows.forEach((row) => {
    const title = row.querySelector('.space__title')
    const svg = row.dataset.space ? spaceIconSVG(row.dataset.space) : null
    if (!title || !svg || row.querySelector('.space__icon')) return
    const slot = document.createElement('span')
    slot.className = 'space__icon'
    slot.setAttribute('aria-hidden', 'true')
    slot.appendChild(svg)
    title.before(slot)
  })
  root.querySelector('.spaces__list')?.classList.add('has-icons')
  offs.push(() => root.querySelectorAll('.space__icon').forEach((el) => el.remove()))

  // ───────── petal indicator, from the registry ─────────
  // in market: open (1); coming soon: a bud (.42) that grows to .62 while its row is open
  const svg = root.querySelector<SVGSVGElement>('.spaces__petals')
  const mark = svg ? buildPetals(svg) : null
  const petals = mark?.petals ?? []
  const live = SPACES.map((s) => spaceStatus(s.slug) === 'in-market')
  SPACES.forEach((s, i) => {
    const p = petals[i]
    if (!p) return
    p.classList.add(live[i] ? 'is-live' : 'is-bud')
    p.dataset.space = s.slug
  })
  const petalFor = (row: HTMLElement) => petals.find((p) => p.dataset.space === row.dataset.space)
  // budPetals() scales each petal about the mark's centre on SPRING.touch, with the
  // transform written explicitly (exact even while the preloader hides the page)
  let tween: gsap.core.Timeline | null = null
  const drawPetals = (instant = false) => {
    if (!mark) return
    const amounts = petals.map((p, i) => (live[i] ? 1 : p.classList.contains('is-open') ? 0.62 : 0.42)) as [number, number, number, number]
    tween = budPetals(mark, amounts, { instant })
  }
  offs.push(() => void tween?.kill())

  // ───────── single-open accordion ─────────
  const set = (row: HTMLElement, open: boolean) => {
    row.toggleAttribute('data-open', open)
    row.querySelector('.space__btn')?.setAttribute('aria-expanded', String(open))
    petalFor(row)?.classList.toggle('is-open', open)
  }
  rows.forEach((r) => set(r, r.hasAttribute('data-open')))
  drawPetals(true)

  rows.forEach((row, i) => {
    on(buttons[i], 'click', () => {
      const opening = !row.hasAttribute('data-open')
      // opening one closes the other in the same frame, so the page barely changes height
      rows.forEach((r) => set(r, opening && r === row))
      drawPetals()
    })
    on(buttons[i], 'keydown', (e) => {
      const k = e.key
      let to = -1
      if (k === 'ArrowDown') to = (i + 1) % rows.length
      else if (k === 'ArrowUp') to = (i - 1 + rows.length) % rows.length
      else if (k === 'Home') to = 0
      else if (k === 'End') to = rows.length - 1
      if (to < 0) return
      e.preventDefault()
      buttons[to].focus()
    })
    // layout changed: triggers below need their positions again
    const panel = row.querySelector<HTMLElement>('.space__panel')
    if (panel)
      on(panel, 'transitionend', (e) => {
        if (e.target === panel && e.propertyName === 'grid-template-rows') ScrollTrigger.refresh()
      })
  })

  if (import.meta.env.DEV) void devCheck()
  return () => offs.forEach((off) => off())
}

// dev only: is the HTML on disk what the registry renders?
async function devCheck() {
  try {
    const [raw, data] = await Promise.all([import('./spaces.html?raw'), import('../data/brands')])
    const region = data.extractRegion(raw.default, 'spaces-list')
    if (!data.sameMarkup(region, data.renderSpacesList())) {
      console.warn(
        '[spaces] src/sections/spaces.html is stale against src/data/brands.ts. Run:\n' +
          `node -e "import('./src/data/brands.ts').then((m) => m.syncSections(require('node:fs')))"`,
      )
    }
  } catch (err) {
    console.warn('[spaces] registry check skipped', err)
  }
}

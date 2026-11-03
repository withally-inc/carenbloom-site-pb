import './careers.css'
import { gsap } from 'gsap'
import { getRoleState, type Role, type RoleState } from '../lib/roles'
import { revealLater } from '../lib/reveal'
import { petalLoader } from '../lib/bloom'
import { cleanDashes } from '../lib/text'
import { odometer } from '../lib/odometer'
import { reducedMotion } from '../lib/motion'

// Careers: the live list of open roles from /api/role-state (shared, cached
// request in lib/roles.ts). States: loading (skeleton + petal loader), ready
// (groups and rows), empty, error with retry. Motion per MOTION-CHALLENGE
// 1.28 / 1.29; copy per COPY.md "Careers".

/* ───────── careers list ───────── */

const GROUPS = [
  { id: 'platform', label: 'Platform' },
  { id: 'launch', label: 'Launch' },
  { id: 'scale', label: 'Scale' },
  { id: 'source-build', label: 'Source & Build' },
] as const

const STAGGER = 50 // capped at 6 rows by the reveal runner
const FALLBACK_REFRESH_MS = 15 * 60 * 1000
const MAX_TIMEOUT = 2 ** 31 - 1

type View = 'loading' | 'ready' | 'empty' | 'error'

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string) => {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text !== undefined) el.textContent = text
  return el
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

function roleRow(role: Role): HTMLLIElement {
  const li = h('li', 'crow-item')
  li.dataset.reveal = 'rise'

  const isOpen = role.state?.isOpen !== false
  const row = isOpen ? h('a', 'crow') : h('div', 'crow is-closed')
  if (row instanceof HTMLAnchorElement) {
    row.href = `/careers/apply?role=${encodeURIComponent(role.slug)}`
  }
  // the API's apply label ("Apply for … before applications close … HKT") is read after the
  // visible text instead of replacing it, so the accessible name contains what is seen
  // (WCAG 2.5.3, label in name)
  const applyLabel = row instanceof HTMLAnchorElement ? cleanDashes(role.state?.applyLabel) : ''
  const main = h('span', 'crow__main')
  main.append(h('h3', 'crow__title', cleanDashes(role.title)))
  const meta = h('span', 'crow__meta')
  meta.append(h('span', 'crow__loc', cleanDashes(role.locationType) || 'Remote'))
  const close = isOpen ? cleanDashes(role.state?.visibleCloseLabel) : 'Closed'
  if (close) meta.append(h('span', 'crow__close', close))
  main.append(meta)
  if (applyLabel) main.append(h('span', 'sr-only', `. ${applyLabel}`))
  row.append(main)
  if (isOpen) {
    const arrow = h('span', 'crow__arrow', '→')
    arrow.setAttribute('aria-hidden', 'true')
    row.append(arrow)
  }
  li.append(row)
  return li
}

function roleGroup(group: (typeof GROUPS)[number], roles: Role[], count: number): HTMLElement {
  const sec = h('section', 'cgroup')
  const id = `cgroup-${group.id}`
  sec.setAttribute('aria-labelledby', id)
  const head = h('div', 'cgroup__head')
  head.dataset.reveal = 'rise'
  const title = h('h2', 'cgroup__title')
  title.id = id
  title.append(h('span', '', group.label), h('span', 'sr-only', `, ${count} ${plural(count, 'open role', 'open roles')}`))
  const chip = h('span', 'cgroup__count tnum')
  chip.setAttribute('aria-hidden', 'true')
  const num = h('span', '', String(count))
  num.dataset.odo = String(count)
  chip.append(num)
  head.append(title, chip)
  const list = h('ul', 'cgroup__rows')
  list.dataset.stagger = String(STAGGER)
  list.dataset.base = '80'
  roles.forEach((r) => list.append(roleRow(r)))
  sec.append(head, list)
  return sec
}

function nextRefreshDelay(state: RoleState): number {
  const raw = state as RoleState & { serverNow?: string; nextBoundaryAt?: string }
  const now = Date.parse(str(raw.serverNow))
  if (!Number.isFinite(now)) return FALLBACK_REFRESH_MS
  const marks = [
    Date.parse(str(raw.nextBoundaryAt)),
    ...state.roles.flatMap((r) => [Date.parse(str(r.state?.nextRefreshAt)), Date.parse(str(r.state?.effectiveClosesAt))]),
  ].filter((t) => Number.isFinite(t) && t > now)
  if (!marks.length) return FALLBACK_REFRESH_MS
  return Math.max(1000, Math.min(...marks) - now)
}

export function init(root: HTMLElement): () => void {
  const list = root.querySelector<HTMLElement>('[data-careers-list]')
  const status = root.querySelector<HTMLElement>('[data-careers-status]')
  const chip = root.querySelector<HTMLElement>('[data-careers-chip]')
  const count = root.querySelector<HTMLElement>('[data-careers-count]')
  const summary = root.querySelector<HTMLElement>('[data-careers-summary]')
  const announce = root.querySelector<HTMLElement>('[data-careers-announce]')
  if (!list || !status || !chip || !count || !summary) return () => {}

  root.querySelectorAll<HTMLElement>('[data-petal-loader]').forEach((el) => el.replaceChildren(petalLoader()))

  let refreshTimer = 0
  let alive = true
  let view: View = 'loading'
  let signature = ''

  const say = (text: string) => {
    if (!announce) return
    announce.textContent = ''
    // written a frame later so the change is announced, not bundled
    requestAnimationFrame(() => setTimeout(() => alive && (announce.textContent = text), 0))
  }

  const setStatus = (next: View, n = 0) => {
    status.dataset.state = next
    chip.hidden = next === 'loading'
    chip.className = `chip careers__chip ${next === 'ready' ? 'chip--sun' : 'chip--line careers__chip--off'}`
    chip.textContent = next === 'ready' ? 'Actively recruiting' : next === 'empty' ? 'No current openings' : next === 'error' ? 'Openings unavailable' : ''
    if (next === 'ready') {
      summary.replaceChildren(h('span', 'sr-only', `${n} `), document.createTextNode(plural(n, 'role open', 'roles open')))
      count.textContent = String(n)
      count.hidden = false
    } else {
      summary.textContent = next === 'loading' ? 'Checking openings' : ''
      count.hidden = true
      count.textContent = ''
    }
    summary.hidden = !summary.textContent
  }

  // the skeleton leaves first (180ms), then the new content takes its place
  const swapContent = (nodes: Node[], animate: boolean) =>
    new Promise<void>((done) => {
      const skeleton = list.querySelector<HTMLElement>('[data-careers-skeleton]')
      const put = () => {
        list.replaceChildren(...nodes)
        done()
      }
      if (skeleton && animate && !reducedMotion()) gsap.to(skeleton, { opacity: 0, duration: 0.18, ease: 'power1.out', onComplete: put })
      else put()
    })

  const finishLoading = (next: View) => {
    view = next
    list.dataset.state = next
    list.setAttribute('aria-busy', 'false')
    list.removeAttribute('aria-label')
  }

  const render = async (state: RoleState | null, animate: boolean) => {
    if (!alive) return
    clearTimeout(refreshTimer)

    if (!state || !Array.isArray(state.roles)) {
      signature = ''
      setStatus('error')
      const box = h('div', 'careers__msg')
      const text = h('p', 'body careers__msg-text', 'Current openings are temporarily unavailable.')
      const retry = h('button', 'btn btn--ghost careers__retry')
      retry.type = 'button'
      const idle = h('span', 'careers__retry-label', 'Try again')
      retry.append(idle)
      retry.addEventListener('click', () => void retryLoad(retry))
      box.append(text, retry)
      box.dataset.reveal = 'fade'
      await swapContent([box], animate)
      finishLoading('error')
      say('Current openings are temporarily unavailable.')
      revealLater(list)
      return
    }

    const groups = GROUPS.map((g) => ({
      group: g,
      roles: state.roles.filter((r) => r.careerGroup === g.id).sort((a, b) => a.careerOrder - b.careerOrder),
      count: Number(state.groupCounts?.[g.id]) || 0,
    })).filter((g) => g.roles.length > 0)

    const n = state.openRoleCount
    const sig = JSON.stringify([n, groups.map((g) => [g.count, g.roles.map((r) => [r.slug, r.title, r.locationType, r.state?.isOpen, r.state?.visibleCloseLabel, r.state?.applyLabel])])])
    const quiet = view === 'ready' || view === 'empty' // a scheduled refresh: no entrance again
    if (sig !== signature) {
      signature = sig
      if (n <= 0 || !groups.length) {
        setStatus('empty')
        const box = h('div', 'careers__msg careers__msg--empty')
        box.append(h('p', 'body careers__msg-text', 'No current openings.'))
        const follow = h('p', 'body careers__msg-text')
        const mail = h('a', 'dotlink')
        mail.href = 'mailto:hello@carenbloom.com'
        mail.append(h('span', '', 'hello@carenbloom.com'))
        follow.append(document.createTextNode('Start a conversation: '), mail)
        box.append(follow)
        if (!quiet) box.dataset.reveal = 'fade'
        await swapContent([box], animate && !quiet)
        finishLoading('empty')
      } else {
        setStatus('ready', n)
        const nodes = groups.map(({ group, roles, count: c }) => roleGroup(group, roles, c))
        if (quiet) {
          // refresh: show the new list at rest, numbers static
          nodes.forEach((g) => {
            g.querySelectorAll('[data-reveal]').forEach((el) => el.removeAttribute('data-reveal'))
            g.querySelectorAll<HTMLElement>('[data-odo]').forEach((el) => el.removeAttribute('data-odo'))
          })
        } else {
          count.dataset.odo = '' // reads the count setStatus() wrote
        }
        await swapContent(nodes, animate && !quiet)
        finishLoading('ready')
      }
      if (!quiet) revealLater(root)
      else if (view === 'ready') odometer(count, String(n))
    }

    // the server publishes its next boundary (a close or a weekly refresh): re-read then
    refreshTimer = window.setTimeout(() => void load(true), Math.min(MAX_TIMEOUT, nextRefreshDelay(state)))
  }

  const load = async (force = false) => {
    const state = await getRoleState(force)
    await render(state, true)
  }

  const retryLoad = async (button: HTMLButtonElement) => {
    if (button.disabled) return
    // width locked to the idle label so nothing jumps while checking
    button.style.width = `${button.getBoundingClientRect().width}px`
    button.disabled = true
    button.setAttribute('aria-busy', 'true')
    const label = button.querySelector('.careers__retry-label')!
    label.textContent = 'Checking…'
    button.prepend(petalLoader('careers__retry-loader'))
    const [state] = await Promise.all([getRoleState(true), new Promise((r) => setTimeout(r, 450))])
    if (!alive) return
    if (!state) {
      button.disabled = false
      button.removeAttribute('aria-busy')
      button.querySelector('.petal-loader')?.remove()
      label.textContent = 'Try again'
      button.style.width = ''
      say('Current openings are temporarily unavailable.')
      return
    }
    view = 'loading'
    list.dataset.state = 'loading'
    await render(state, true)
  }

  setStatus('loading')
  void load()

  return () => {
    alive = false
    clearTimeout(refreshTimer)
  }
}

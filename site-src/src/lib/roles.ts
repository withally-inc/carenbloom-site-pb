import { odometer, type Odometer } from './odometer'

// One collection owner publishes every response and refreshes at server boundaries.
export type Role = {
  slug: string
  title: string
  locationType: string
  careerGroup: string
  careerOrder: number
  state: { isOpen?: boolean; visibleCloseLabel?: string; [k: string]: unknown }
}
export type RoleState = {
  status: string
  serverNow: string
  nextBoundaryAt: string | null
  openRoleCount: number
  groupCounts: Record<string, number>
  roles: Role[]
}
export type RoleCountState = 'loading' | 'ready' | 'zero' | 'error'
export const ROLES_EVENT = 'roles:state'
const FALLBACK_REFRESH_MS = 15 * 60 * 1000
const MAX_TIMEOUT = 2 ** 31 - 1
const consumers = new Set<(state: RoleState | null) => void>()
const odos = new WeakMap<HTMLElement, Odometer>()
let pending: Promise<RoleState | null> | null = null
let inFlight = false
let settled = false
let current: RoleState | null = null
let refreshTimer = 0

function publish(data: RoleState | null) {
  current = data
  settled = true
  renderCounts(data ? (data.openRoleCount === 0 ? 'zero' : 'ready') : 'error', data?.openRoleCount ?? null)
  consumers.forEach((consume) => consume(data))
}

function renderCounts(state: RoleCountState, count: number | null) {
  const html = document.documentElement
  html.dataset.rolesState = state
  if (count === null) delete html.dataset.roles
  else html.dataset.roles = String(count)
  document.querySelectorAll<HTMLElement>('[data-role-count]').forEach((el) => {
    if (count === null) {
      el.replaceChildren()
      el.removeAttribute('aria-label')
      el.removeAttribute('data-odo')
      odos.delete(el)
      return
    }
    let odo = odos.get(el)
    if (!odo) {
      odo = odometer(el, count)
      odos.set(el, odo)
    } else odo.to(count)
  })
  document.querySelectorAll<HTMLElement>('[data-role-count-fold]').forEach((el) => (el.hidden = count === null))
  document.querySelectorAll<HTMLElement>('[data-role-noun]').forEach((el) => (el.textContent = count === 1 ? 'open role' : 'open roles'))
  window.dispatchEvent(new CustomEvent(ROLES_EVENT, { detail: { state, count } }))
}

export function subscribeRoleState(consume: (state: RoleState | null) => void): () => void {
  consumers.add(consume)
  if (settled) consume(current)
  return () => consumers.delete(consume)
}

export function getRoleState(force = false): Promise<RoleState | null> {
  if (pending && (inFlight || !force)) return pending
  clearTimeout(refreshTimer)
  inFlight = true
  pending = fetch('/api/role-state', { cache: 'no-store', headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? (r.json() as Promise<RoleState>) : null))
    .then((d) => (d && Number.isInteger(d.openRoleCount) && d.openRoleCount >= 0 && Array.isArray(d.roles) ? d : null))
    .catch(() => null)
    .then((data) => {
      inFlight = false
      publish(data)
      const now = Date.parse(data?.serverNow ?? '')
      const boundary = Date.parse(data?.nextBoundaryAt ?? '')
      const delay = Number.isFinite(now) && Number.isFinite(boundary) ? Math.max(1000, boundary - now) : FALLBACK_REFRESH_MS
      refreshTimer = window.setTimeout(() => void getRoleState(true), Math.min(MAX_TIMEOUT, delay))
      return data
    })
  return pending
}

export function bindRoleCount() {
  if (!settled) renderCounts('loading', null)
  return getRoleState()
}

import { odometer, type Odometer } from './odometer'

// Live role state from the careers API (proxied at /api by Vite and Vercel).
// One request per page, shared by everything that shows the count.

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
  openRoleCount: number
  groupCounts: Record<string, number>
  roles: Role[]
}
export type RoleCountState = 'loading' | 'ready' | 'zero' | 'error'

export const FALLBACK_ROLE_COUNT = 15
export const ROLES_EVENT = 'roles:state' // window event, detail: { state, count }
const CACHE = 'cb-roles'

let pending: Promise<RoleState | null> | null = null

export function getRoleState(force = false): Promise<RoleState | null> {
  if (pending && !force) return pending
  pending = fetch('/api/role-state', { headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? (r.json() as Promise<RoleState>) : null))
    .then((d) => (d && typeof d.openRoleCount === 'number' ? d : null))
    .catch(() => null)
  pending.then((d) => {
    if (!d) return
    try {
      sessionStorage.setItem(CACHE, String(d.openRoleCount))
    } catch {
      /* private mode */
    }
  })
  return pending
}

/** the count seen earlier in this session, if any (no roll when it has not changed) */
export function cachedRoleCount(): number | null {
  try {
    const v = sessionStorage.getItem(CACHE)
    return v === null ? null : Number(v)
  } catch {
    return null
  }
}

function setState(state: RoleCountState, count: number | null) {
  const html = document.documentElement
  html.dataset.rolesState = state
  if (count !== null) html.dataset.roles = String(count)
  window.dispatchEvent(new CustomEvent(ROLES_EVENT, { detail: { state, count } }))
}

const odos = new WeakMap<HTMLElement, Odometer>()

// Fill every [data-role-count] with the live count, rolling the digits when the
// value changes (odometer), pluralize [data-role-noun], and publish the state on
// <html data-roles-state="loading|ready|zero|error" data-roles="15"> plus a
// 'roles:state' window event. On a failed request the static fallback stays.
export async function bindRoleCount(root: ParentNode = document) {
  const cached = cachedRoleCount()
  setState('loading', cached)
  const state = await getRoleState()
  const n = state ? state.openRoleCount : FALLBACK_ROLE_COUNT
  root.querySelectorAll<HTMLElement>('[data-role-count]').forEach((el) => {
    const shown = (el.querySelector('.odo__sr')?.textContent ?? el.textContent ?? '').trim()
    if (shown === String(n)) return
    let o = odos.get(el)
    if (!o) {
      o = odometer(el, shown || String(cached ?? FALLBACK_ROLE_COUNT))
      odos.set(el, o)
    }
    o.to(n)
  })
  root.querySelectorAll<HTMLElement>('[data-role-noun]').forEach((el) => (el.textContent = n === 1 ? 'open role' : 'open roles'))
  // legacy caption wrapper: reads "No current openings" when nothing is open
  if (state && n === 0) root.querySelectorAll<HTMLElement>('[data-role-caption]').forEach((el) => (el.textContent = 'No current openings'))
  setState(!state ? 'error' : n === 0 ? 'zero' : 'ready', state ? n : null)
  return n
}

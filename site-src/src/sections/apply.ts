import './apply.css'
import { gsap } from 'gsap'
import { scrollToTarget } from '../lib/lenis'
import { buildPetals, ICON_VIEWBOX, openPetals, petalLoader } from '../lib/bloom'
import { odometer, type Odometer } from '../lib/odometer'
import { maskedLines } from '../lib/split'
import { EASE, reducedMotion } from '../lib/motion'
import { cleanDashes } from '../lib/text'
import { revealLater } from '../lib/reveal'

// Apply: role page and application form. The flow and the payload mirror the
// live careers-apply.js (role authority from /api/role-state?role=, monotonic
// close countdown, refresh at the server's boundaries, takedown at close).
//
// SUBMISSION GUARD: the form posts to /api/applications only when the page is
// served from carenbloom.com or www.carenbloom.com. Everywhere else (localhost,
// *.vercel.app) it validates, shows the preview notice and sends nothing.

const LIVE_HOSTS = new Set(['carenbloom.com', 'www.carenbloom.com'])
export const canSend = () => LIVE_HOSTS.has(location.hostname)
const APPLICATIONS_ENDPOINT = '/api/applications' // same origin only, never another host

const MAX_UPLOAD = 4 * 1024 * 1024 // mirrors api/applications.js
const MAX_TOTAL_UPLOAD = 4 * 1024 * 1024
const RESUME_EXT = ['pdf', 'doc', 'docx', 'odt', 'txt', 'rtf']

// the live lists, unchanged
const CALLING_CODES = '+1 +7 +20 +27 +30 +31 +32 +33 +34 +36 +39 +40 +41 +43 +44 +45 +46 +47 +48 +49 +51 +52 +53 +54 +55 +56 +57 +58 +60 +61 +62 +63 +64 +65 +66 +81 +82 +84 +86 +90 +91 +92 +93 +94 +95 +98 +211 +212 +213 +216 +218 +220 +221 +222 +223 +224 +225 +226 +227 +228 +229 +230 +231 +232 +233 +234 +235 +236 +237 +238 +239 +240 +241 +242 +243 +244 +245 +246 +248 +249 +250 +251 +252 +253 +254 +255 +256 +257 +258 +260 +261 +262 +263 +264 +265 +266 +267 +268 +269 +290 +291 +297 +298 +299 +350 +351 +352 +353 +354 +355 +356 +357 +358 +359 +370 +371 +372 +373 +374 +375 +376 +377 +378 +380 +381 +382 +383 +385 +386 +387 +389 +420 +421 +423 +500 +501 +502 +503 +504 +505 +506 +507 +508 +509 +590 +591 +592 +593 +594 +595 +596 +597 +598 +599 +670 +672 +673 +674 +675 +676 +677 +678 +679 +680 +681 +682 +683 +685 +686 +687 +688 +689 +690 +691 +692 +850 +852 +853 +855 +856 +880 +886 +960 +961 +962 +963 +964 +965 +966 +967 +968 +970 +971 +972 +973 +974 +975 +976 +977 +992 +993 +994 +995 +996 +998'.split(' ')
const COUNTRY_CODES = 'AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI KH CM CA CV KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB UM US UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(' ')

type RoleDetail = {
  slug: string
  title: string
  level?: string
  locationType?: string
  introVideoRequired?: boolean
  loomPrompt?: string
  portfolioRequired?: boolean
  portfolioLabel?: string
  summary?: string
  mission?: string
  responsibilities?: string[]
  requirements?: string[]
  questions?: string[]
}
type CloseState = {
  isOpen?: boolean
  datePosted?: string
  validThrough?: string
  effectiveClosesAt?: string
  nextRefreshAt?: string
  visibleCloseLabel?: string
  applyLabel?: string
}
type Authority = { status?: string; serverNow?: string; openRoleCount?: number; role?: RoleDetail; state?: CloseState }

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => (clearTimeout(t), reject(new DOMException('Aborted', 'AbortError'))), { once: true })
  })

// live api-endpoints.js fetchWithRetry: two retries, 1.5s apart, no-store
async function fetchRoleState(slug: string, signal?: AbortSignal): Promise<Response> {
  const url = `/api/role-state?role=${encodeURIComponent(slug)}`
  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    try {
      const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' }, signal })
      if (res.ok || attempt === 2) return res
    } catch (err) {
      if (attempt === 2) throw err
    }
    await sleep(1500, signal)
  }
}

// the API answers unknown slugs with a stub ({ title } only): a real role has
// its questions and a close instant
const isRealRole = (a: Authority | null, slug: string) =>
  !!a?.role && a.role.slug === slug && Array.isArray(a.role.questions) && !!a.state && !!a.serverNow && Number.isFinite(Date.parse(a.state.effectiveClosesAt ?? ''))

const fmtSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`)
const navOffset = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-offset')) || 96

/** house scroll (MOTION-CHALLENGE 1.27, lib/lenis): lands a little under the nav, then calls done */
const glideTo = (el: HTMLElement, done?: () => void) => scrollToTarget(el, { offset: navOffset() + 24, onComplete: done })

function setMeta(selector: string, content: string) {
  document.querySelector(selector)?.setAttribute('content', content)
}

export function init(root: HTMLElement): () => void {
  const $ = <T extends Element = HTMLElement>(sel: string, from: ParentNode = root) => from.querySelector<T>(sel)
  const $$ = <T extends Element = HTMLElement>(sel: string, from: ParentNode = root) => [...from.querySelectorAll<T>(sel)]

  const stateBox = $('[data-role-unavailable]')!
  const stateTitle = $('[data-role-state-title]')!
  const stateMessage = $('[data-role-state-message]')!
  const receipt = $('[data-submission-receipt]')
  const retryBtn = $<HTMLButtonElement>('[data-role-retry]')
  const content = $('[data-role-content]')!
  const form = $<HTMLFormElement>('#application-form')!
  const formWrap = $('[data-form-wrap]')!
  const statusLine = $('[data-form-status]')!
  const submitBtn = $<HTMLButtonElement>('[data-submit]')!
  const summaryWrap = $('[data-error-summary]')!
  const summaryBox = $('[data-error-summary-box]')!
  const summaryText = $('[data-error-summary-text]')!
  const success = $('[data-success]')!
  if (!stateBox || !content || !form) return () => {}

  root.querySelectorAll<HTMLElement>('[data-petal-loader]').forEach((el) => el.replaceChildren(petalLoader()))

  const cleanups: (() => void)[] = []
  const on = <K extends keyof HTMLElementEventMap>(el: EventTarget, type: K | string, fn: (e: never) => void, opts?: AddEventListenerOptions) => {
    el.addEventListener(type, fn as EventListener, opts)
    cleanups.push(() => el.removeEventListener(type, fn as EventListener, opts))
  }

  const slug = new URLSearchParams(location.search).get('role')
  let role: RoleDetail | null = null
  let takenDown = false
  let submissionReference: string | null = null
  let isSubmitting = false

  /* ───────── page states ───────── */

  const showReceipt = (ref: string) => {
    if (!receipt) return
    // written a frame later so the live region announces it
    requestAnimationFrame(() => setTimeout(() => (receipt.textContent = `Your application was received before this role closed. Reference: ${ref}.`), 0))
  }

  let slowTimer = 0
  const showUnavailable = (state: string, heading: string, message: string, retry = false) => {
    clearTimeout(slowTimer)
    stateBox.classList.add('is-slow')
    stateBox.dataset.state = state
    content.hidden = true
    stateBox.hidden = false
    stateTitle.textContent = heading
    stateMessage.textContent = message
    if (retryBtn) retryBtn.hidden = !retry
    root.setAttribute('aria-labelledby', 'apply-title')
    if (!reducedMotion() && document.documentElement.classList.contains('ready')) {
      gsap.fromTo([stateTitle, stateMessage], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: EASE, stagger: 0.06, clearProps: 'all' })
    }
  }

  /* ───────── preview guard notice ───────── */

  const preview = !canSend()
  $$('[data-preview-note]').forEach((n) => (n.hidden = !preview))
  form.dataset.preview = preview ? 'true' : 'false'

  /* ───────── load ───────── */

  const load = async () => {
    if (!slug) {
      showUnavailable('unknown', 'Role not found', 'Choose a current opening from the Care & Bloom careers page.')
      return
    }
    stateBox.dataset.state = 'checking'
    // the checking panel only appears if the answer is slow (see apply.css)
    stateBox.classList.remove('is-slow')
    clearTimeout(slowTimer)
    slowTimer = window.setTimeout(() => stateBox.classList.add('is-slow'), 600)
    let authority: Authority | null = null
    try {
      const res = await fetchRoleState(slug)
      authority = await res.json().catch(() => null)
      if (res.status === 404 || authority?.status === 'unknown') {
        showUnavailable('unknown', 'Role not found', 'This role is not one of our current openings.')
        return
      }
      if (!res.ok) throw new Error('Role authority request failed.')
    } catch {
      showUnavailable('unavailable', 'Role unavailable', 'We could not confirm this role right now. Please return to careers and try again.', true)
      return
    }
    if (authority?.role && authority.role.slug === slug && !isRealRole(authority, slug)) {
      showUnavailable('unknown', 'Role not found', 'This role is not one of our current openings.')
      return
    }
    if (!isRealRole(authority, slug)) {
      showUnavailable('unavailable', 'Role unavailable', 'We could not confirm this role right now. Please return to careers and try again.', true)
      return
    }
    const a = authority as Required<Pick<Authority, 'role' | 'state' | 'serverNow'>> & Authority
    if (a.status === 'closed' || a.state.isOpen !== true) {
      document.title = `${cleanDashes(a.role.title)}, closed | Care & Bloom`
      showUnavailable('closed', 'This role is closed', `${cleanDashes(a.role.title)} is no longer accepting applications.`)
      return
    }
    openRole(a.role, a.state, a.serverNow)
  }

  if (retryBtn) {
    on(retryBtn, 'click', async () => {
      retryBtn.disabled = true
      retryBtn.style.width = `${retryBtn.getBoundingClientRect().width}px`
      retryBtn.replaceChildren(petalLoader('apply-state__retry-loader'), document.createTextNode('Checking…'))
      stateBox.dataset.state = 'checking'
      await load()
      retryBtn.disabled = false
      retryBtn.style.width = ''
      retryBtn.textContent = 'Try again'
    })
  }

  /* ───────── the open role ───────── */

  let tick = 0
  let boundaryTimer = 0
  let refreshController: AbortController | null = null
  let jsonLd: HTMLScriptElement | null = null

  function openRole(r: RoleDetail, state: CloseState, serverNow: string) {
    clearTimeout(slowTimer)
    role = r
    const title = cleanDashes(r.title)
    const location = cleanDashes(r.locationType) || 'Remote'
    const isRemote = location === 'Remote'

    document.title = `${title} | Care & Bloom`
    const description = `${title}, ${location}, at Care & Bloom.`
    setMeta('meta[name="description"]', description)
    setMeta('meta[property="og:description"]', description)
    setMeta('meta[name="twitter:description"]', description)
    setMeta('meta[property="og:title"]', `${title} | Care & Bloom`)
    setMeta('meta[name="twitter:title"]', `${title} | Care & Bloom`)

    $('[data-role-title]')!.textContent = title
    $('[data-role-summary]')!.textContent = cleanDashes(r.summary)
    $('[data-role-location]')!.textContent = location
    $('[data-role-location-dd]')!.textContent = location
    $('[data-role-level]')!.textContent = cleanDashes(r.level) || 'Varies by role'
    $('[data-role-mission]')!.textContent = cleanDashes(r.mission)
    const list = (el: HTMLElement | null, items: string[] = []) =>
      el?.replaceChildren(
        ...items.map((t) => {
          const li = document.createElement('li')
          li.textContent = cleanDashes(t)
          return li
        }),
      )
    list($('[data-role-responsibilities]'), r.responsibilities)
    list($('[data-role-requirements]'), r.requirements)
    const roleInput = $<HTMLInputElement>('input[name="role"]', form)
    if (roleInput) roleInput.value = r.title
    // the live site canonicalises with the slash (it 308s /careers/apply to /careers/apply/)
    $$<HTMLAnchorElement>('[data-live-link]').forEach((l) => (l.href = `https://carenbloom.com/careers/apply/?role=${encodeURIComponent(r.slug)}`))

    // intro video: required per role, prompt from the role
    const intro = $<HTMLInputElement>('#f-intro')!
    intro.required = !!r.introVideoRequired
    $('[data-intro-video-label]')!.textContent = 'Intro video' + (r.introVideoRequired ? '' : ' (optional)')
    $('[data-intro-video-req]')!.hidden = !r.introVideoRequired
    if (r.loomPrompt) $('[data-intro-video-help]')!.textContent = cleanDashes(r.loomPrompt)

    // additional attachment, or the role's portfolio
    const attach = $<HTMLInputElement>('#f-attachment')!
    if (r.portfolioRequired) {
      attach.required = true
      $('[data-attachment-label]')!.textContent = cleanDashes(r.portfolioLabel || 'Portfolio / work samples').replace(/\s*\*\s*$/, '')
      $('[data-attachment-req]')!.hidden = false
      $('[data-attachment-help]')!.textContent = 'Under 4 MB.'
    }

    renderQuestions(r.questions ?? [])

    // structured data only once the server confirms the role is open
    const posting: Record<string, unknown> = {
      '@context': 'https://schema.org/',
      '@type': 'JobPosting',
      title: r.title,
      description: `${r.mission} Responsibilities: ${(r.responsibilities ?? []).join('. ')}. Requirements: ${(r.requirements ?? []).join('. ')}.`,
      datePosted: state.datePosted,
      validThrough: state.validThrough,
      employmentType: 'FULL_TIME',
      hiringOrganization: { '@type': 'Organization', name: 'Care & Bloom', sameAs: 'https://carenbloom.com' },
      directApply: true,
      jobLocationType: isRemote ? 'TELECOMMUTE' : undefined,
      jobLocation: !isRemote ? { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: location } } : undefined,
    }
    Object.keys(posting).forEach((k) => posting[k] === undefined && delete posting[k])
    jsonLd = document.createElement('script')
    jsonLd.type = 'application/ld+json'
    jsonLd.textContent = JSON.stringify(posting)
    document.head.appendChild(jsonLd)

    // show: the state panel leaves, the role enters with the house reveals
    stateBox.hidden = true
    content.hidden = false
    root.setAttribute('aria-labelledby', 'role-title')
    let d = 0
    $$('[data-enter], [data-enter-lines]', content).forEach((el) => {
      const inHero = !!el.closest('.role-hero')
      if (el.hasAttribute('data-enter-lines')) el.dataset.lines = ''
      else el.dataset.reveal = el.dataset.enter || ''
      if (inHero) {
        el.dataset.delay = String(d)
        d += 70
      }
    })
    revealLater(content)

    startClock(r, state, serverNow, posting)
  }

  /* ───────── close countdown and authority refresh (live parity) ───────── */

  function startClock(r: RoleDetail, initial: CloseState, initialNow: string, posting: Record<string, unknown>) {
    const closeDate = $('[data-close-date]')!
    const countdown = $<HTMLTimeElement>('[data-close-countdown]')!
    const closeApply = $('[data-close-apply]')!
    let current = initial
    let serverNow = initialNow
    let anchor = performance.now()
    let remainingAtResponse = Date.parse(current.effectiveClosesAt!) - Date.parse(serverNow)
    const remainingNow = () => remainingAtResponse - (performance.now() - anchor)

    // {d}d {h}h {m}m {s}s: seconds swap instantly, minutes and up roll (MOTION-CHALLENGE 2.9)
    countdown.innerHTML = ['d', 'h', 'm', 's'].map((k) => `<span class="cd-part cd-part--${k}"><span data-cd="${k}">0</span>${k}</span>`).join(' ')
    const parts = { d: $('[data-cd="d"]', countdown)!, h: $('[data-cd="h"]', countdown)!, m: $('[data-cd="m"]', countdown)!, s: $('[data-cd="s"]', countdown)! }
    const odos: Partial<Record<'d' | 'h' | 'm', Odometer>> = {}
    const last: Record<string, number> = {}
    const render = () => {
      const total = Math.floor(Math.max(0, remainingNow()) / 1000)
      const v = { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 }
      for (const k of ['d', 'h', 'm'] as const) {
        if (last[k] === v[k]) continue
        if (!odos[k]) odos[k] = odometer(parts[k], String(v[k]))
        else odos[k]!.to(String(v[k]))
        last[k] = v[k]
      }
      parts.s.textContent = String(v.s)
      closeDate.textContent = cleanDashes(current.visibleCloseLabel)
      if (current.validThrough) countdown.dateTime = current.validThrough
      if (current.applyLabel) closeApply.setAttribute('aria-label', cleanDashes(current.applyLabel))
    }

    const syncPosting = () => {
      posting.datePosted = current.datePosted
      posting.validThrough = current.validThrough
      if (jsonLd) jsonLd.textContent = JSON.stringify(posting)
    }

    const takeDown = (state: string, heading: string, message: string, docTitle?: string) => {
      takenDown = true
      refreshController?.abort()
      refreshController = null
      clearInterval(tick)
      clearTimeout(boundaryTimer)
      jsonLd?.remove()
      if (docTitle) document.title = docTitle
      form.reset()
      $$<HTMLInputElement>('input[type="file"]', form).forEach((i) => (i.value = ''))
      form.dispatchEvent(new Event('reset'))
      showUnavailable(state, heading, message)
      if (submissionReference) showReceipt(submissionReference)
    }
    const takeDownAsClosed = () =>
      takeDown('closed', 'This role is closed', `${cleanDashes(r.title)} is no longer accepting applications.`, `${cleanDashes(r.title)}, closed | Care & Bloom`)

    // the close instant is enforced from the monotonic anchor, so an endpoint
    // outage can never leave the form standing past it
    const enforceClosure = () => {
      if (takenDown) return true
      if (remainingNow() > 0) return false
      takeDownAsClosed()
      return true
    }
    const onTick = () => {
      if (!enforceClosure()) render()
    }
    const startTick = () => {
      clearInterval(tick)
      tick = window.setInterval(onTick, 1000)
    }
    // paused in hidden tabs, recomputed from the clock on return
    on(document, 'visibilitychange', () => {
      if (takenDown) return
      if (document.hidden) clearInterval(tick)
      else {
        onTick()
        if (!takenDown) startTick()
      }
    })

    const retryRefresh = () => {
      if (enforceClosure()) return
      boundaryTimer = window.setTimeout(refreshAuthority, 30000)
    }
    const refreshAuthority = async () => {
      if (takenDown) return
      const controller = new AbortController()
      refreshController = controller
      let next: Authority | null = null
      try {
        const res = await fetchRoleState(r.slug, controller.signal)
        next = await res.json().catch(() => null)
        if (!res.ok && res.status !== 404) throw new Error('Role authority refresh failed.')
      } catch {
        if (!takenDown) retryRefresh()
        return
      } finally {
        if (refreshController === controller) refreshController = null
      }
      if (takenDown) return
      if (next?.status === 'unknown') {
        takeDown('unknown', 'Role not found', 'This role is not one of our current openings.')
        return
      }
      if (!next?.role || next.role.slug !== r.slug || !next.state || !next.serverNow) {
        retryRefresh()
        return
      }
      if (next.status !== 'open' || next.state.isOpen !== true) {
        takeDownAsClosed()
        return
      }
      current = next.state
      serverNow = next.serverNow
      anchor = performance.now()
      remainingAtResponse = Date.parse(current.effectiveClosesAt ?? '') - Date.parse(serverNow)
      syncPosting()
      render()
      scheduleBoundary()
    }
    function scheduleBoundary() {
      if (takenDown) return
      const closesAt = Date.parse(current.effectiveClosesAt ?? '')
      const nextRefresh = Date.parse(current.nextRefreshAt ?? '')
      const boundary = Math.min(Number.isFinite(nextRefresh) ? nextRefresh : Infinity, closesAt) - Date.parse(serverNow)
      clearTimeout(boundaryTimer)
      boundaryTimer = window.setTimeout(refreshAuthority, Math.min(2 ** 31 - 1, Math.max(0, boundary)))
    }

    render()
    startTick()
    scheduleBoundary()
  }

  /* ───────── apply jump (2.11) ───────── */

  const closeApply = $<HTMLAnchorElement>('[data-close-apply]')!
  on(closeApply, 'click', (e: MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    const first = $<HTMLInputElement>('#f-first-name', form)!
    // to the form's title: below 960px it sits above the form and would otherwise land
    // under the nav; from 960px it shares the form's top line
    glideTo($<HTMLElement>('#apply-form-title') ?? form, () => first.focus({ preventScroll: true }))
  })

  /* ───────── selects ───────── */

  const codeSelect = $<HTMLSelectElement>('select[name="phone_country_code"]', form)!
  codeSelect.append(...CALLING_CODES.map((c) => new Option(c, c)))
  const countrySelect = $<HTMLSelectElement>('select[name="location"]', form)!
  if (typeof Intl !== 'undefined' && 'DisplayNames' in Intl) {
    const names = new Intl.DisplayNames(['en'], { type: 'region' })
    const countries = [...new Set(COUNTRY_CODES.map((c) => names.of(c)).filter((n): n is string => !!n).sort((a, b) => a.localeCompare(b)))]
    countrySelect.append(...countries.map((c) => new Option(c, c)))
  }
  const syncSelect = (s: HTMLSelectElement) => s.classList.toggle('is-empty', !s.value)
  ;[codeSelect, countrySelect].forEach((s) => {
    syncSelect(s)
    on(s, 'change', () => syncSelect(s))
  })

  /* ───────── numbers only (live: strip non-digits on input) ───────── */

  const income = $<HTMLInputElement>('#f-income', form)!
  let incomeNonNumeric = false
  on(income, 'input', () => {
    const raw = income.value
    const digits = raw.replace(/\D/g, '')
    if (raw !== digits) income.value = digits
    incomeNonNumeric = !!raw && !digits
  })

  /* ───────── time zones (live: the first box is required until one is chosen) ───────── */

  const tzBoxes = $$<HTMLInputElement>('input[name="open_time_zone"]', form)
  const syncTz = () => {
    const any = tzBoxes.some((b) => b.checked)
    tzBoxes.forEach((b, i) => (b.required = i === 0 && !any))
  }
  tzBoxes.forEach((b) => on(b, 'change', syncTz))
  syncTz()

  /* ───────── tooltip (1.30) ───────── */

  const tip = $('[data-tip]')
  const tipBtn = $<HTMLButtonElement>('[data-tip-btn]')
  if (tip && tipBtn) {
    let openT = 0
    let closeT = 0
    let lastPointer = 'mouse'
    const open = () => {
      clearTimeout(closeT)
      const row = tip.closest('.f-label-row') as HTMLElement | null
      if (row) row.style.setProperty('--tip-x', `${tipBtn.offsetLeft + tipBtn.offsetWidth / 2}px`)
      tip.dataset.open = ''
    }
    const close = () => {
      clearTimeout(openT)
      delete tip.dataset.open
    }
    on(tipBtn, 'pointerdown', (e: PointerEvent) => (lastPointer = e.pointerType))
    on(tipBtn, 'pointerenter', (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      clearTimeout(closeT)
      openT = window.setTimeout(open, 120)
    })
    on(tip, 'pointerleave', (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      clearTimeout(openT)
      closeT = window.setTimeout(close, 200)
    })
    on(tipBtn, 'focus', open)
    on(tipBtn, 'blur', close)
    on(tipBtn, 'click', () => {
      if (lastPointer === 'mouse') open()
      else if ('open' in tip.dataset) close()
      else open()
    })
    on(document, 'keydown', (e: KeyboardEvent) => e.key === 'Escape' && close())
    on(document, 'pointerdown', (e: PointerEvent) => {
      if (!tip.contains(e.target as Node)) close()
    })
  }

  /* ───────── validation (1.31: inline, on blur, the sun highlighter, never a shake) ───────── */

  type Field = { name: string; box: HTMLElement; controls: HTMLElement[]; check: () => string; dirty: boolean }
  const fields = new Map<string, Field>()
  let submitted = false

  const value = (name: string) => {
    const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
    return el && 'value' in el ? el.value.trim() : ''
  }
  const fileOf = (name: string) => ($<HTMLInputElement>(`input[name="${name}"]`, form)?.files?.[0] ?? null)
  const URL_RE = /^https?:\/\/[^\s/$.?#]+\.[^\s]+$/i
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

  const checks: Record<string, () => string> = {
    first_name: () => (value('first_name') ? '' : 'Enter your first name.'),
    last_name: () => (value('last_name') ? '' : 'Enter your last name.'),
    email: () => {
      const v = value('email')
      if (!v) return 'Enter your email address.'
      return EMAIL_RE.test(v) ? '' : 'Enter a valid email address, like name@example.com.'
    },
    phone_country_code: () => (value('phone_country_code') ? '' : 'Choose a country or area code.'),
    phone_number: () => (value('phone_number') ? '' : 'Enter your phone number.'),
    linkedin: () => {
      const v = value('linkedin')
      return !v || URL_RE.test(v) ? '' : 'Enter a full link, starting with https://.'
    },
    resume: () => {
      const f = fileOf('resume')
      if (!f || !f.size) return 'Attach your resume.'
      const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
      if (!RESUME_EXT.includes(ext)) return 'Use a PDF, DOC, DOCX, ODT, TXT or RTF file.'
      return f.size > MAX_UPLOAD ? 'Each file must be under 4 MB.' : ''
    },
    intro_video_url: () => {
      const v = value('intro_video_url')
      if (!v) return role?.introVideoRequired ? 'Add a link to your intro video.' : ''
      return URL_RE.test(v) ? '' : 'Enter a full link, starting with https://.'
    },
    monthly_income_usd: () => (value('monthly_income_usd') ? '' : incomeNonNumeric ? 'Numbers only, in USD.' : 'Enter your monthly income in USD.'),
    open_time_zone: () => (tzBoxes.some((b) => b.checked) ? '' : 'Choose at least one time zone.'),
    location: () => (value('location') ? '' : 'Choose your country.'),
    additional_attachment: () => {
      const f = fileOf('additional_attachment')
      if (!f || !f.size) return role?.portfolioRequired ? 'Attach your portfolio or work samples.' : ''
      if (f.size > MAX_UPLOAD) return 'Each file must be under 4 MB.'
      const resume = fileOf('resume')
      if (resume && resume.size <= MAX_UPLOAD && resume.size + f.size > MAX_TOTAL_UPLOAD) return 'Your files together are too large. Keep their combined size under 4 MB.'
      return ''
    },
  }

  const register = (box: HTMLElement) => {
    const name = box.dataset.field!
    const controls = name === 'open_time_zone' ? tzBoxes : $$<HTMLElement>('input:not([type="hidden"]), select, textarea', box).filter((c) => (c as HTMLInputElement).name === name)
    const check = checks[name] ?? (() => (value(name) ? '' : 'Answer this question.'))
    const err = $('.f-error', box)
    if (err && !err.firstElementChild) err.append(document.createElement('span'))
    fields.set(name, { name, box, controls, check, dirty: false })
  }
  $$('[data-field]', form).forEach(register)

  const describe = (el: HTMLElement, id: string, add: boolean) => {
    const ids = new Set((el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean))
    add ? ids.add(id) : ids.delete(id)
    if (ids.size) el.setAttribute('aria-describedby', [...ids].join(' '))
    else el.removeAttribute('aria-describedby')
  }

  const setError = (f: Field, message: string, hlDelay = 0) => {
    const err = $('.f-error', f.box)!
    const errText = err.firstElementChild as HTMLElement
    const was = 'invalid' in f.box.dataset
    if (message) {
      f.box.style.setProperty('--hl-d', `${hlDelay}ms`)
      f.box.dataset.invalid = ''
      delete f.box.dataset.wasInvalid
      errText.textContent = message
      f.controls.forEach((c) => {
        c.setAttribute('aria-invalid', 'true')
        describe(c, err.id, true)
      })
    } else {
      if (was) f.box.dataset.wasInvalid = ''
      delete f.box.dataset.invalid
      f.controls.forEach((c) => {
        c.removeAttribute('aria-invalid')
        describe(c, err.id, false)
      })
      // the message fades with the retract, then empties
      if (was) window.setTimeout(() => !('invalid' in f.box.dataset) && (errText.textContent = ''), 300)
      else errText.textContent = ''
    }
  }

  const fieldOf = (el: EventTarget | null) => {
    const box = (el as Element | null)?.closest?.('[data-field]') as HTMLElement | null
    return box ? fields.get(box.dataset.field!) : undefined
  }

  // lenient links: "www.loom.com/share/x" becomes "https://www.loom.com/share/x" on blur
  const completeUrl = (input: HTMLInputElement) => {
    const v = input.value.trim()
    if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v) && /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(v)) input.value = `https://${v}`
  }

  on(form, 'input', (e: Event) => {
    const f = fieldOf(e.target)
    if (!f) return
    f.dirty = true
    // typing never adds an error; it only clears one once the field is right
    if ('invalid' in f.box.dataset && !f.check()) setError(f, '')
    if (submitted) updateSummaryCount()
  })
  on(form, 'change', (e: Event) => {
    const f = fieldOf(e.target)
    if (!f) return
    f.dirty = true
    const t = e.target as HTMLInputElement
    if (t.type === 'file') {
      // a file is a deliberate act: say at once if it cannot be sent
      const msg = f.check()
      const required = (f.name === 'resume' && /^Attach/.test(msg)) || (f.name === 'additional_attachment' && /^Attach/.test(msg))
      setError(f, required && !submitted ? '' : msg)
      // the combined limit lives on the attachment: re-check it when the resume changes
      if (f.name === 'resume') {
        const att = fields.get('additional_attachment')!
        if (fileOf('additional_attachment') || 'invalid' in att.box.dataset) setError(att, submitted || fileOf('additional_attachment') ? att.check() : '')
      }
    } else if ('invalid' in f.box.dataset || (submitted && (t.tagName === 'SELECT' || t.type === 'checkbox'))) {
      setError(f, f.check())
    }
    if (submitted) updateSummaryCount()
  })
  on(form, 'focusout', (e: FocusEvent) => {
    const f = fieldOf(e.target)
    if (!f) return
    const t = e.target as HTMLInputElement
    if (t.type === 'url') completeUrl(t)
    // still inside the same field (time zone pills, file actions): wait
    if (e.relatedTarget && f.box.contains(e.relatedTarget as Node)) return
    if (submitted) setError(f, f.check())
    else if (f.dirty && value(f.name)) setError(f, f.check())
    if (submitted) updateSummaryCount()
  })

  const invalidFields = () => [...fields.values()].filter((f) => !!f.check())

  // "Check the highlighted fields": the word itself carries the highlighter
  const summaryLabel = (n: number) => {
    const hl = document.createElement('span')
    hl.className = 'f-summary__hl'
    hl.textContent = 'highlighted'
    return [document.createTextNode('Check the '), hl, document.createTextNode(` fields: ${n} ${n === 1 ? 'needs' : 'need'} attention.`)]
  }
  const updateSummaryCount = () => {
    if (!('open' in summaryWrap.dataset)) return
    const n = [...fields.values()].filter((f) => 'invalid' in f.box.dataset).length
    if (n === 0) {
      delete summaryWrap.dataset.open
      return
    }
    summaryText.replaceChildren(...summaryLabel(n))
  }
  const showSummary = (n: number) => {
    summaryText.replaceChildren(...summaryLabel(n))
    summaryWrap.dataset.open = ''
    summaryBox.focus({ preventScroll: true })
    glideTo(summaryWrap)
  }

  /* ───────── file fields (1.32) ───────── */

  $$('[data-drop]', form).forEach((drop) => {
    const input = $<HTMLInputElement>('.drop__input', drop)!
    const name = $('[data-file-name]', drop)!
    const fileRow = $<HTMLElement>('.drop__row--file', drop)!
    const replace = $<HTMLButtonElement>('[data-file-replace]', drop)!
    const remove = $<HTMLButtonElement>('[data-file-remove]', drop)!
    const sync = () => {
      const file = input.files?.[0]
      drop.dataset.has = file ? 'true' : 'false'
      fileRow.inert = !file
      if (file) {
        name.textContent = `${file.name} · ${fmtSize(file.size)}`
        remove.setAttribute('aria-label', `Remove ${file.name}`)
      } else {
        remove.removeAttribute('aria-label')
      }
    }
    sync()
    on(input, 'change', sync)
    on(form, 'reset', () => setTimeout(sync, 0))
    on(replace, 'click', () => input.click())
    on(remove, 'click', () => {
      input.value = ''
      sync()
      const f = fieldOf(input)
      if (f) setError(f, submitted ? f.check() : '')
      if (input.name === 'resume') {
        const att = fields.get('additional_attachment')!
        if ('invalid' in att.box.dataset) setError(att, att.check())
      }
      input.focus()
    })
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files')
    let depth = 0
    on(drop, 'dragenter', (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth++
      drop.dataset.drag = ''
    })
    on(drop, 'dragover', (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    })
    on(drop, 'dragleave', () => {
      depth = Math.max(0, depth - 1)
      if (!depth) delete drop.dataset.drag
    })
    on(drop, 'drop', (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      delete drop.dataset.drag
      const file = e.dataTransfer?.files?.[0]
      if (!file) return
      try {
        const dt = new DataTransfer()
        dt.items.add(file)
        input.files = dt.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      } catch {
        /* very old browsers: the button still works */
      }
    })
  })

  /* ───────── submit (1.33) ───────── */

  const setStatus = (message: string, state = '') => {
    statusLine.textContent = message
    statusLine.dataset.state = state
  }
  const submitLoader = $('[data-submit-loader]', submitBtn)!
  submitLoader.replaceChildren(petalLoader())
  const swapA = $('.f-swap__a', submitBtn)!
  const swapB = $('.f-swap__b', submitBtn)!
  const setBusy = (busy: boolean) => {
    if (busy) submitBtn.style.width = `${submitBtn.getBoundingClientRect().width}px`
    else submitBtn.style.width = ''
    submitBtn.disabled = busy
    submitBtn.toggleAttribute('data-busy', busy)
    swapA.setAttribute('aria-hidden', String(busy))
    swapB.setAttribute('aria-hidden', String(!busy))
    if (busy) form.setAttribute('aria-busy', 'true')
    else form.removeAttribute('aria-busy')
  }

  const collectQuestions = () =>
    $$<HTMLTextAreaElement>('[data-role-questions] textarea', form)
      .slice(0, 3)
      .map((t) => ({ question: t.dataset.question ?? '', answer: t.value }))

  /** the request itself, behind the host guard (belt and braces: never callable off carenbloom.com) */
  async function send(body: FormData) {
    if (!canSend()) throw new Error('Preview host: applications are not sent from this address.')
    return fetch(APPLICATIONS_ENDPOINT, { method: 'POST', body })
  }

  on(form, 'submit', async (e: SubmitEvent) => {
    e.preventDefault()
    if (isSubmitting || takenDown || !role) return
    submitted = true

    const invalid = invalidFields()
    fields.forEach((f) => {
      const i = invalid.indexOf(f)
      setError(f, i >= 0 ? f.check() : '', Math.max(0, i) * 60)
    })
    if (invalid.length) {
      setStatus('')
      showSummary(invalid.length)
      return
    }
    delete summaryWrap.dataset.open

    const data = new FormData(form)
    const resumeFile = data.get('resume')
    const attachmentFile = data.get('additional_attachment')
    // the live guards, kept as they were
    const oversized = [resumeFile, attachmentFile].find((f) => f instanceof File && f.size > MAX_UPLOAD)
    if (oversized) {
      setStatus('Each file must be under 4 MB.', 'error')
      return
    }
    const total = [resumeFile, attachmentFile].filter((f): f is File => f instanceof File).reduce((t, f) => t + f.size, 0)
    if (total > MAX_TOTAL_UPLOAD) {
      setStatus('Your files together are too large. Keep their combined size under 4 MB.', 'error')
      return
    }

    // payload: identical to the live careers-apply.js
    const payload = {
      role: role.title,
      roleSlug: role.slug,
      firstName: data.get('first_name'),
      lastName: data.get('last_name'),
      name: `${data.get('first_name') || ''} ${data.get('last_name') || ''}`.trim(),
      email: data.get('email'),
      phoneCountryCode: data.get('phone_country_code'),
      phoneNumber: data.get('phone_number'),
      linkedIn: data.get('linkedin'),
      resume: resumeFile instanceof File && resumeFile.size > 0 ? resumeFile.name : '',
      introVideoUrl: data.get('intro_video_url'),
      introVideoRequired: !!role.introVideoRequired,
      additionalAttachment: attachmentFile instanceof File && attachmentFile.size > 0 ? attachmentFile.name : '',
      monthlyIncomeUsd: data.get('monthly_income_usd'),
      timeZones: data.getAll('open_time_zone'),
      location: data.get('location'),
      questions: collectQuestions(),
      url: window.location.href,
      referrer: document.referrer,
    }

    if (!canSend()) {
      // preview: nothing leaves the page. The payload is kept for inspection only.
      ;(window as unknown as { __cbPreviewPayload?: unknown }).__cbPreviewPayload = payload
      setStatus('Not sent: this is a preview. Your answers are still in the form.', 'preview')
      return
    }

    isSubmitting = true
    setBusy(true)
    setStatus('Submitting application…', 'loading')
    try {
      const body = new FormData()
      body.append('payload', JSON.stringify(payload))
      if (resumeFile instanceof File && resumeFile.size > 0) body.append('resume', resumeFile)
      if (attachmentFile instanceof File && attachmentFile.size > 0) body.append('additional_attachment', attachmentFile)
      const response = await send(body)
      const result = (await response.json().catch(() => ({}))) as { success?: boolean; ref?: string; error?: string }
      if (!response.ok || !result.success) throw Object.assign(new Error('Submission failed.'), { server: result.error })
      submissionReference = result.ref || 'submitted'
      setStatus(`Application received. Reference: ${submissionReference}.`, 'success')
      if (takenDown) showReceipt(submissionReference)
      else await showSuccess(submissionReference)
      form.reset()
    } catch (err) {
      const server = (err as { server?: string }).server
      setStatus(`${server ? cleanDashes(server) : 'Could not submit application right now.'} Your answers are still in the form.`, 'error')
    } finally {
      isSubmitting = false
      setBusy(false)
    }
  })

  /* ───────── success: the one bloom on the page ───────── */

  async function showSuccess(ref: string) {
    const refEl = $('[data-success-ref]', success)!
    const title = $('[data-success-title]', success)!
    const markHost = $('[data-success-mark]', success)!
    const links = $('.apply-success__links', success)!
    refEl.textContent = `Reference: ${ref}. Keep it for your records.`
    statusLine.classList.add('sr-only')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', ICON_VIEWBOX)
    svg.setAttribute('class', 'apply-success__svg')
    markHost.replaceChildren(svg)
    const petals = buildPetals(svg)

    if (reducedMotion()) {
      form.hidden = true
      success.hidden = false
      petals.settle()
      title.focus({ preventScroll: true })
      glideTo(formWrap)
      return
    }
    const from = formWrap.offsetHeight
    formWrap.style.height = `${from}px`
    formWrap.style.overflow = 'hidden'
    await gsap.to(form, { opacity: 0, duration: 0.3, ease: 'power1.out' })
    form.hidden = true
    form.style.opacity = ''
    success.hidden = false
    gsap.set([refEl, links], { opacity: 0, y: 8 })
    const to = success.offsetHeight + statusLine.offsetHeight
    glideTo(formWrap)
    gsap.to(formWrap, {
      height: to,
      duration: 0.6,
      ease: EASE,
      onComplete: () => {
        formWrap.style.height = ''
        formWrap.style.overflow = ''
      },
    })
    openPetals(petals, { duration: 0.8 })
    const lines = maskedLines(title)
    lines.play(0.3)
    gsap.to([refEl, links], { opacity: 1, y: 0, duration: 0.8, ease: EASE, delay: 0.62, stagger: 0.08, clearProps: 'all' })
    title.focus({ preventScroll: true })
  }

  /* ───────── role questions ───────── */

  function renderQuestions(questions: string[]) {
    const host = $('[data-role-questions]', form)!
    // drop any previous registration
    ;['role_question_1', 'role_question_2', 'role_question_3'].forEach((n) => fields.delete(n))
    host.replaceChildren(
      ...questions.slice(0, 3).map((q, i) => {
        const name = `role_question_${i + 1}`
        const id = `f-q${i + 1}`
        const box = document.createElement('div')
        box.className = 'field field--question'
        box.dataset.field = name
        const label = document.createElement('label')
        label.className = 'f-label f-label--question'
        label.htmlFor = id
        const text = document.createElement('span')
        text.className = 'f-label__text'
        text.textContent = cleanDashes(q)
        const req = document.createElement('span')
        req.className = 'f-req'
        req.setAttribute('aria-hidden', 'true')
        req.textContent = '*'
        label.append(text, req)
        const ta = document.createElement('textarea')
        ta.className = 'f-input f-textarea'
        ta.id = id
        ta.name = name
        ta.rows = 4
        ta.required = true
        ta.placeholder = 'Your answer'
        ta.dataset.question = q // the payload carries the question as the API wrote it
        const err = document.createElement('p')
        err.className = 'f-error'
        err.id = `${id}-error`
        box.append(label, ta, err)
        return box
      }),
    )
    $$('[data-field^="role_question_"]', host).forEach(register)
  }

  void load()

  return () => {
    takenDown = true
    clearInterval(tick)
    clearTimeout(boundaryTimer)
    refreshController?.abort()
    cleanups.forEach((f) => f())
  }
}

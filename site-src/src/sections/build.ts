import './build.css'
import { buildPetals, openPetals, type Petals } from '../lib/bloom'
import { SPACE_ICONS } from './spaces.icons'
import { bindCopy } from '../lib/copy'
import { EASE_CSS, reducedMotion } from '../lib/motion'
import { ScrollTrigger } from '../lib/lenis'

// "Build with us": founders and brand owners. There is no backend for this form, so a
// valid submit composes an email to the group's public address (mailto, subject
// "Build with us: {brand}", the answers in the body) and swaps the form for an inline
// confirmation that shows the address as text with copy buttons, for visitors whose
// email app did not open. Validation mirrors the apply form (MOTION-CHALLENGE 1.31):
// on blur once a field was touched, everything on submit, the sun highlighter on the
// label, a message under the field, never a shake. Each category tile carries its
// vertical's icon from the spaces list ("Something else" the mark); choosing a tile
// redraws its icon, or blooms the mark.

const TO = 'hello@carenbloom.com'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const URL_RE = /^https?:\/\/[^\s/$.?#]+\.[^\s]+$/i

type Field = { name: string; box: HTMLElement; controls: HTMLInputElement[]; check: () => string; dirty: boolean }

export function init(root: HTMLElement): () => void {
  const form = root.querySelector<HTMLFormElement>('[data-build-form]')
  const card = root.querySelector<HTMLElement>('[data-build-card]')
  const done = root.querySelector<HTMLElement>('[data-build-done]')
  if (!form || !card || !done) return () => {}
  const offs: (() => void)[] = []
  const on = <K extends keyof HTMLElementEventMap>(t: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    t.addEventListener(type, fn as EventListener)
    offs.push(() => t.removeEventListener(type, fn as EventListener))
  }
  const radios = [...form.querySelectorAll<HTMLInputElement>('input[name="category"]')]
  const status = form.querySelector<HTMLElement>('[data-build-status]')!

  /* ───────── category icons ───────── */
  // Each tile carries its vertical's icon from the spaces list (one family, drawn from
  // the mark's petal); "Something else" carries the mark itself. Choosing a tile redraws
  // its icon (the spaces draw-in, house curve) or blooms the mark.
  const SLUGS = ['sexual-health', 'longevity', 'mental-health', 'education']
  const tileIcons = new Map<HTMLInputElement, { svg: SVGSVGElement; mark: Petals | null }>()
  radios.forEach((r) => {
    const svg = r.parentElement?.querySelector<SVGSVGElement>('svg[data-petal]')
    if (!svg) return
    const key = svg.dataset.petal!
    if (key === 'all') {
      const mark = buildPetals(svg)
      mark.petals.forEach((g) => g.classList.replace('petal', 'bw-petal'))
      mark.settle()
      svg.classList.add('bw-tile__icon--mark')
      tileIcons.set(r, { svg, mark })
      return
    }
    const icon = SPACE_ICONS[SLUGS[Number(key)]]
    if (!icon) return
    svg.innerHTML = `<g transform="translate(${icon.offset[0]} ${icon.offset[1]})">${icon.paths.map((d, i) => `<path d="${d}" pathLength="1" style="--i:${i};--n:${icon.paths.length}"/>`).join('')}</g>`
    tileIcons.set(r, { svg, mark: null })
  })
  const drawPetals = (_instant = false) => {
    tileIcons.forEach(({ svg, mark }, r) => {
      const was = svg.dataset.on === '1'
      svg.dataset.on = r.checked ? '1' : '0'
      if (!r.checked || was || reducedMotion()) return
      if (mark) void openPetals(mark, { duration: 0.8, stagger: 0.08 })
      else {
        svg.classList.remove('is-drawing')
        void svg.getBoundingClientRect()
        svg.classList.add('is-drawing')
      }
    })
  }
  drawPetals(true)

  /* ───────── validation ───────── */
  const val = (name: string) => {
    const el = form.elements.namedItem(name)
    if (el instanceof RadioNodeList) return el.value.trim()
    return el && 'value' in el ? String((el as HTMLInputElement).value).trim() : ''
  }
  const checks: Record<string, () => string> = {
    category: () => (val('category') ? '' : 'Choose a category.'),
    brand: () => (val('brand') ? '' : 'Enter your brand or project name.'),
    link: () => {
      const v = val('link')
      return !v || URL_RE.test(v) ? '' : 'Enter a full link, starting with https://.'
    },
    name: () => (val('name') ? '' : 'Enter your name.'),
    email: () => {
      const v = val('email')
      if (!v) return 'Enter your email address.'
      return EMAIL_RE.test(v) ? '' : 'Enter a valid email address, like name@example.com.'
    },
  }
  const fields: Field[] = [...form.querySelectorAll<HTMLElement>('[data-field]')].map((box) => {
    const name = box.dataset.field!
    const err = box.querySelector<HTMLElement>('.bw-error')
    if (err && !err.firstElementChild) err.append(document.createElement('span'))
    const controls = [...box.querySelectorAll<HTMLInputElement>('input')].filter((c) => c.name === name)
    return { name, box, controls, check: checks[name] ?? (() => ''), dirty: false }
  })
  const fieldOf = (t: EventTarget | null) => {
    const box = (t as Element | null)?.closest?.('[data-field]')
    return fields.find((f) => f.box === box)
  }
  let submitted = false

  const describe = (el: HTMLElement, id: string, add: boolean) => {
    const ids = new Set((el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean))
    if (add) ids.add(id)
    else ids.delete(id)
    if (ids.size) el.setAttribute('aria-describedby', [...ids].join(' '))
    else el.removeAttribute('aria-describedby')
  }
  const setError = (f: Field, message: string, hlDelay = 0) => {
    const err = f.box.querySelector<HTMLElement>('.bw-error')!
    const text = err.firstElementChild as HTMLElement
    const was = 'invalid' in f.box.dataset
    if (message) {
      f.box.style.setProperty('--hl-d', `${hlDelay}ms`)
      f.box.dataset.invalid = ''
      delete f.box.dataset.wasInvalid
      text.textContent = message
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
      if (was) window.setTimeout(() => !('invalid' in f.box.dataset) && (text.textContent = ''), 300)
      else text.textContent = ''
    }
  }

  // "Check the highlighted fields": the word itself carries the highlighter
  const summary = () => {
    const n = fields.filter((f) => 'invalid' in f.box.dataset).length
    status.textContent = ''
    if (!submitted || n === 0) return
    const hl = document.createElement('span')
    hl.className = 'bw-status__hl'
    hl.textContent = 'highlighted'
    status.append('Check the ', hl, ` fields: ${n} ${n === 1 ? 'needs' : 'need'} attention.`)
  }

  // lenient links: "yourbrand.com" becomes "https://yourbrand.com" on blur
  const completeUrl = (input: HTMLInputElement) => {
    const v = input.value.trim()
    if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v) && /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(v)) input.value = `https://${v}`
  }

  on(form, 'input', (e) => {
    const f = fieldOf(e.target)
    if (!f) return
    f.dirty = true
    // typing never adds an error; it only clears one once the field is right
    if ('invalid' in f.box.dataset && !f.check()) setError(f, '')
    if (submitted) summary()
  })
  on(form, 'change', (e) => {
    const t = e.target as HTMLInputElement
    if (t.name === 'category') drawPetals()
    const f = fieldOf(t)
    if (!f) return
    f.dirty = true
    if (t.type === 'radio' && ('invalid' in f.box.dataset || submitted)) setError(f, f.check())
    if (submitted) summary()
  })
  on(form, 'focusout', (e) => {
    const f = fieldOf(e.target)
    if (!f) return
    const t = e.target as HTMLInputElement
    if (t.type === 'url') completeUrl(t)
    // still inside the same field (arrowing through the category radios): wait
    if (e.relatedTarget && f.box.contains(e.relatedTarget as Node)) return
    if (submitted || f.dirty) setError(f, f.check())
    if (submitted) summary()
  })

  /* ───────── compose the email ───────── */
  const compose = () => {
    const brand = val('brand')
    const link = val('link')
    const subject = `Build with us: ${brand}`
    const lines = [`Category: ${val('category')}`, `Brand or project: ${brand}`, ...(link ? [`Link: ${link}`] : []), `Name: ${val('name')}`, `Email: ${val('email')}`]
    const body = lines.join('\r\n')
    const href = `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    const plain = `To: ${TO}\nSubject: ${subject}\n\n${lines.join('\n')}`
    return { href, plain }
  }

  /* ───────── form ⇄ confirmation (one height change, house curve) ───────── */
  const emailLink = done.querySelector<HTMLAnchorElement>('[data-build-email]')!
  const copyAddress = done.querySelector<HTMLElement>('[data-build-copy-address]')
  const copyMessage = done.querySelector<HTMLElement>('[data-build-copy-message]')
  const title = done.querySelector<HTMLElement>('[data-build-done-title]')!
  const markSvg = done.querySelector<SVGSVGElement>('[data-build-mark]')
  const mark = markSvg ? buildPetals(markSvg) : null
  mark?.petals.forEach((g) => g.classList.replace('petal', 'bw-petal'))
  mark?.settle()
  if (copyAddress) offs.push(bindCopy(copyAddress, TO, { fallbackSelect: emailLink }))
  if (copyMessage) offs.push(bindCopy(copyMessage, undefined, { copiedMessage: 'Message copied.', failedMessage: 'Could not copy the message.' }))

  let anim: Animation | null = null
  const swap = (toDone: boolean, after: () => void) => {
    const leaving = toDone ? form : done
    const entering = toDone ? done : form
    const reduced = reducedMotion()
    const from = card.getBoundingClientRect().height
    const out = leaving.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 120 : 180, easing: EASE_CSS, fill: 'forwards' })
    out.onfinish = () => {
      out.cancel()
      leaving.hidden = true
      entering.hidden = false
      const to = card.getBoundingClientRect().height
      anim?.cancel()
      if (!reduced && Math.abs(to - from) > 1) {
        card.style.overflow = 'clip'
        anim = card.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 500, easing: EASE_CSS })
        anim.onfinish = anim.oncancel = () => {
          card.style.overflow = ''
          ScrollTrigger.refresh()
        }
      } else ScrollTrigger.refresh()
      entering.animate(
        reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
        { duration: reduced ? 200 : 500, delay: reduced ? 0 : 80, easing: EASE_CSS, fill: 'backwards' },
      )
      after()
    }
  }

  on(form, 'submit', (e) => {
    e.preventDefault()
    submitted = true
    const invalid = fields.filter((f) => !!f.check())
    fields.forEach((f) => {
      const i = invalid.indexOf(f)
      setError(f, i >= 0 ? f.check() : '', Math.max(0, i) * 60)
    })
    summary()
    if (invalid.length) {
      const first = invalid[0].controls.find((c) => c.checked) ?? invalid[0].controls[0]
      first?.focus()
      return
    }
    const { href, plain } = compose()
    emailLink.href = href
    if (copyMessage) copyMessage.dataset.copy = plain
    // hand the draft to the visitor's email app; the page stays where it is
    window.location.href = href
    swap(true, () => {
      title.focus({ preventScroll: true })
      if (mark && !reducedMotion()) void openPetals(mark, { duration: 0.8, stagger: 0.08 })
    })
  })

  const edit = done.querySelector<HTMLElement>('[data-build-edit]')
  if (edit)
    on(edit, 'click', () =>
      swap(false, () => {
        const target = radios.find((r) => r.checked) ?? radios[0]
        target?.focus({ preventScroll: true })
      }),
    )

  return () => {
    anim?.cancel()
    offs.forEach((off) => off())
  }
}

// Copy to clipboard with a fallback (hidden textarea + execCommand) and a
// "Copied" state on the trigger.
//
// <button class="btn btn--ghost btn--sm" data-copy="hello@carenbloom.com">
//   <span class="swap"><span class="swap__a">Copy</span><span class="swap__b">Copied</span></span>
// </button>
// bindCopy(button)   (reads data-copy, or pass the text)

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  Object.assign(ta.style, { position: 'fixed', top: '0', left: '0', opacity: '0', pointerEvents: 'none' })
  document.body.appendChild(ta)
  const sel = document.getSelection()
  const prev = sel && sel.rangeCount ? sel.getRangeAt(0) : null
  ta.select()
  ta.setSelectionRange(0, text.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  ta.remove()
  if (prev && sel) {
    sel.removeAllRanges()
    sel.addRange(prev)
  }
  return ok
}

// select the text of an element so the visitor can copy it by hand
export function selectText(el: Element) {
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

let live: HTMLElement | null = null
function announce(msg: string) {
  if (!live) {
    live = document.createElement('div')
    live.className = 'sr-only'
    live.setAttribute('role', 'status')
    live.setAttribute('aria-live', 'polite')
    document.body.appendChild(live)
  }
  live.textContent = ''
  requestAnimationFrame(() => (live!.textContent = msg))
}

export function bindCopy(
  el: HTMLElement,
  text?: string,
  opts: { fallbackSelect?: Element; duration?: number; copiedMessage?: string; failedMessage?: string } = {},
) {
  let t = 0
  const click = async (e: Event) => {
    e.preventDefault()
    const value = text ?? el.dataset.copy ?? ''
    const ok = await copyText(value)
    if (!ok) {
      if (opts.fallbackSelect) selectText(opts.fallbackSelect)
      announce(opts.failedMessage ?? 'Could not copy. Select the address above.')
      return
    }
    el.dataset.copied = ''
    announce(opts.copiedMessage ?? 'Email address copied.')
    clearTimeout(t)
    t = window.setTimeout(() => delete el.dataset.copied, opts.duration ?? 2000)
  }
  el.addEventListener('click', click)
  return () => el.removeEventListener('click', click)
}

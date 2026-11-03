// A label slot with several states that swap vertically (500ms house curve):
//   <span class="slot"><span data-slot-item="loading" data-on>Checking…</span><span data-slot-item="ready">…</span></span>
//   setSlot(el, 'ready')
// The active item sets the slot's width; inactive items are aria-hidden.
export function setSlot(slot: HTMLElement, key: string) {
  const items = [...slot.querySelectorAll<HTMLElement>(':scope > [data-slot-item]')]
  const next = items.find((i) => i.dataset.slotItem === key)
  if (!next || next.hasAttribute('data-on')) return
  items.forEach((i) => {
    if (i === next) return
    if (i.hasAttribute('data-on')) {
      i.removeAttribute('data-on')
      i.setAttribute('data-leaving', '')
      i.addEventListener('transitionend', () => i.removeAttribute('data-leaving'), { once: true })
      window.setTimeout(() => i.removeAttribute('data-leaving'), 600)
    }
    i.setAttribute('aria-hidden', 'true')
  })
  next.removeAttribute('aria-hidden')
  next.setAttribute('data-on', '')
  slot.dataset.slot = key
}

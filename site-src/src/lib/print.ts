import { revealAll } from './reveal'

// Print (MOTION-CHALLENGE 2.7): before printing, every reveal is shown at once
// and loops are told to pause. Sections with loops listen for the events:
//   window.addEventListener('print:before', pause); window.addEventListener('print:after', resume)
export function bindPrint() {
  const before = () => {
    revealAll(document, true)
    window.dispatchEvent(new CustomEvent('print:before'))
  }
  const after = () => window.dispatchEvent(new CustomEvent('print:after'))
  window.addEventListener('beforeprint', before)
  window.addEventListener('afterprint', after)
  return () => {
    window.removeEventListener('beforeprint', before)
    window.removeEventListener('afterprint', after)
  }
}

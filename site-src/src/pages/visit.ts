import '../styles/index.css'
import '../chrome/nav.css'
import '../chrome/footer.css'
import '../sections/visit.css'
import { boot } from './boot'

const moreHotels = document.querySelector<HTMLDetailsElement>('.visit-more')
if (moreHotels && !CSS.supports('selector(::details-content)')) {
  let openedForPrint = false
  window.addEventListener('print:before', () => {
    if (moreHotels.open) return
    moreHotels.open = true
    openedForPrint = true
  })
  window.addEventListener('print:after', () => {
    if (!openedForPrint) return
    moreHotels.open = false
    openedForPrint = false
  })
}

void boot()

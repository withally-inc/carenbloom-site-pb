import '../styles/index.css'
import '../chrome/nav.css'
import '../chrome/footer.css'
import { boot } from './boot'
import { init as apply } from '../sections/apply'

void boot({ apply })

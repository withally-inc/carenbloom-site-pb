import '../styles/index.css'
import '../chrome/nav.css'
import '../chrome/footer.css'
import { boot } from './boot'
import { init as notfound } from '../sections/notfound'

void boot({ notfound })

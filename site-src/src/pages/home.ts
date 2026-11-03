import '../styles/index.css'
import '../chrome/nav.css'
import '../chrome/footer.css'
import { boot } from './boot'
import { init as hero } from '../sections/hero'
import { init as record } from '../sections/record'
import { init as brands } from '../sections/brands'
import { init as spaces } from '../sections/spaces'
import { init as people } from '../sections/people'
import { init as work } from '../sections/work'
import { init as build } from '../sections/build'

void boot({ hero, record, brands, spaces, people, work, build })

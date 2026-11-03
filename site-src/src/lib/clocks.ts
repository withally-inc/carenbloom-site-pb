import { odometer } from './odometer'

// Local time in the four cities, shared by the hero clocks and the People map (#places).
//   cityTimes()          [{ city, tz, label: "20:14" }] for now, in display order
//   bindClock(el, tz)    fills el with HH:MM for tz as an odometer and rolls the digits that
//                        change on each minute; returns a cleanup. 24h, tabular.

export type CityTime = { city: string; tz: string; label: string }

export const CITIES: readonly { city: string; tz: string }[] = [
  { city: 'Hong Kong', tz: 'Asia/Hong_Kong' },
  { city: 'Shenzhen', tz: 'Asia/Shanghai' },
  { city: 'London', tz: 'Europe/London' },
  { city: 'San Francisco', tz: 'America/Los_Angeles' },
]

const formatters = new Map<string, Intl.DateTimeFormat>()
const fmt = (tz: string) => {
  let f = formatters.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    formatters.set(tz, f)
  }
  return f
}

/** "20:14" in that time zone */
export function timeIn(tz: string, now: Date = new Date()): string {
  const parts = fmt(tz).formatToParts(now)
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${h.padStart(2, '0')}:${m}`
}

export function cityTimes(now: Date = new Date()): CityTime[] {
  return CITIES.map(({ city, tz }) => ({ city, tz, label: timeIn(tz, now) }))
}

// one timer for every bound clock, aligned on the minute
const subs = new Set<() => void>()
let timer = 0
const schedule = () => {
  clearTimeout(timer)
  if (!subs.size) return
  const ms = 60000 - (Date.now() % 60000) + 40
  timer = window.setTimeout(() => {
    subs.forEach((f) => f())
    schedule()
  }, ms)
}
const onVisible = () => {
  if (document.visibilityState !== 'visible') return
  subs.forEach((f) => f())
  schedule()
}

export function bindClock(el: HTMLElement, tz: string): () => void {
  const odo = odometer(el, timeIn(tz))
  delete el.dataset.odo // driven here, never by the reveal runner
  el.classList.add('tnum')
  const update = () => {
    const next = timeIn(tz)
    if (next !== odo.value) odo.to(next)
  }
  if (!subs.size) document.addEventListener('visibilitychange', onVisible)
  subs.add(update)
  schedule()
  return () => {
    subs.delete(update)
    if (!subs.size) {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }
}

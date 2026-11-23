import { TRIP_DATE, TZ } from '../data/trip'

function zoneOffset(at: Date, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  )
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - at.getTime()
}

/** Wall-clock time in America/New_York → Date. Accepts "25:30" for 1:30 AM next day. */
export function at(hhmm: string, date = TRIP_DATE): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = hhmm.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  let ts = guess - zoneOffset(new Date(guess), TZ)
  ts = guess - zoneOffset(new Date(ts), TZ)
  return new Date(ts)
}

export const fmt = (d: Date, withDay = false) =>
  new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', ...(withDay ? { weekday: 'short' } : {}) }).format(d)

export const toHHMM = (d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.hour}:${p.minute}`
}

export const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60000)
export const diffMin = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 60000)

export function dur(min: number): string {
  const neg = min < 0
  min = Math.abs(Math.round(min))
  const h = Math.floor(min / 60)
  const r = min % 60
  const s = h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`
  return neg ? `−${s}` : s
}

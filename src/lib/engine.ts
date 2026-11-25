import { useMemo } from 'react'
import { DRIVE, PLACES, PLANS, ROUTE_ALTERNATIVES, type Booking, type PlanId, type Stop } from '../data/trip'
import { useDoc } from './doc'
import { getLocal, useLocal } from './store'
import { addMin, at, diffMin } from './time'

export type StopState = 'upcoming' | 'arrived' | 'done' | 'skipped'
export interface StatusRec { s: StopState; at?: number }

/** Personal trip-mode state lives on each phone (it never changes the shared trip). */
export const useLate = () => useLocal<number>('late', 0)
export const useStatus = (id: string) => useLocal<StatusRec>(`st:${id}`, { s: 'upcoming' })
export const usePlanId = (): PlanId => useDoc().plan

export interface PlaceInfo { lat: number; lng: number; elevFt: number; name: string; source: string }
export function placeOf(s: Stop): PlaceInfo {
  if (s.geo) return { lat: s.geo.lat, lng: s.geo.lng, elevFt: s.geo.elevFt ?? PLACES.downtown.elevFt, name: s.title, source: s.geo.source }
  return PLACES[s.place] ?? PLACES.downtown
}
const drive = (a: Stop | undefined, b: Stop, fallback: number) => (a && !a.geo && !b.geo ? DRIVE[a.place]?.[b.place] : undefined) ?? fallback

export interface Projected extends Stop {
  plannedStart: Date
  plannedEnd: Date
  onsiteMin: number
  pStart: Date
  pEnd: Date
  arrive: Date
  driveIn: number
  delta: number
  status: StatusRec
  booking?: Booking
  fixedAt?: Date
  conflict?: number
  slack?: number
  wait?: number
  edited: boolean
  planSkipped: boolean
}

export function useTrip(now = Date.now()) {
  const doc = useDoc()
  const [late] = useLate()
  useLocal('st:tick', 0) // re-render on any local status change
  const statuses = doc.stops.map((s) => getLocal<StatusRec>(`st:${s.id}`, { s: 'upcoming' }))
  const key = JSON.stringify([doc.plan, doc.tripDate, doc.stops, doc.bookings, late, statuses, Math.floor(now / 60000)])

  return useMemo(() => {
    const plan = PLANS.find((p) => p.id === doc.plan) ?? PLANS[0]
    const out: Projected[] = []
    const stops = doc.stops.map((s, i) => ({ ...s, n: i + 1 }))
    let cursor = at(stops[0]?.start ?? '03:30')
    let prev: Stop | undefined
    let lateApplied = false
    stops.forEach((s, i) => {
      const status = statuses[i]
      const planSkipped = plan.skip.includes(s.id)
      const plannedStart = at(s.start)
      const plannedEnd = at(s.end)
      const extra = plan.extend?.[s.id] ?? 0
      const onsiteMin = Math.max(5, diffMin(plannedEnd, plannedStart) - s.travelIn + extra)
      const booking = doc.bookings.find((b) => b.id === s.bookingId)
      const fixedAt = booking?.status === 'Confirmed' && booking.time ? at(booking.time) : undefined
      const base = { ...s, plannedStart, plannedEnd, onsiteMin, booking, edited: false, planSkipped }

      if (i === 0) {
        const dep = status.s === 'done' && status.at ? new Date(status.at) : plannedStart
        cursor = dep
        prev = s
        out.push({ ...base, onsiteMin: 0, pStart: dep, pEnd: dep, arrive: dep, driveIn: 0, delta: diffMin(dep, plannedStart), status })
        return
      }
      if (planSkipped || status.s === 'skipped') {
        out.push({ ...base, pStart: cursor, pEnd: cursor, arrive: cursor, driveIn: 0, delta: 0, status: planSkipped ? { s: 'skipped' } : status })
        return
      }
      let driveIn = s.id === 'home' ? (plan.id === 'C' ? ROUTE_ALTERNATIVES.aroundPark.min : ROUTE_ALTERNATIVES.overPark.min) : drive(prev, s, s.travelIn)
      if (plan.morningVia === 'around' && prev?.place === 'gnv') driveIn = 342
      const checkedIn = status.s === 'arrived' || status.s === 'done'
      const arrive = checkedIn && status.at ? new Date(status.at) : addMin(cursor, driveIn)
      const plannedOnsite = addMin(plannedStart, s.travelIn)
      let pStart = checkedIn || !s.anchor ? arrive : new Date(Math.max(arrive.getTime(), plannedOnsite.getTime()))
      if (!checkedIn && !s.anchor && !out.some((o) => o.status.s === 'skipped' && !o.planSkipped) && pStart < plannedOnsite && plan.id === 'A') pStart = plannedOnsite
      const wait = !checkedIn && s.anchor && plannedOnsite > arrive ? diffMin(plannedOnsite, arrive) : undefined
      if (!lateApplied && late && status.s !== 'done') {
        pStart = addMin(pStart, late)
        lateApplied = true
      }
      let conflict: number | undefined
      let slack: number | undefined
      if (fixedAt) {
        if (pStart > fixedAt) conflict = diffMin(pStart, fixedAt)
        else slack = diffMin(fixedAt, pStart)
        pStart = new Date(Math.max(pStart.getTime(), fixedAt.getTime()))
      }
      const pEnd = status.s === 'done' && status.at ? new Date(status.at) : s.id === 'home' ? pStart : addMin(pStart, onsiteMin)
      out.push({ ...base, pStart, pEnd, arrive, driveIn, delta: diffMin(pStart, plannedOnsite), status, fixedAt, conflict, slack, wait })
      cursor = pEnd
      prev = s
    })
    const active = out.filter((s) => s.status.s !== 'skipped')
    const current = active.find((s) => s.status.s === 'arrived') ?? active.find((s) => s.status.s !== 'done' && s.pEnd.getTime() > now) ?? active.find((s) => s.status.s !== 'done')
    const next = current ? active[active.indexOf(current) + 1] : undefined
    const home = out.at(-1)
    return { plan, stops: out, active, current, next, homeArrival: home && home.status.s !== 'skipped' ? home.pStart : undefined }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

export function leaveBy(stops: Projected[], fromIdx: number): { by: Date; target: Projected } | null {
  const rest = stops.slice(fromIdx + 1).filter((s) => s.status.s !== 'skipped')
  const fi = rest.findIndex((s) => s.fixedAt)
  if (fi < 0) return null
  const target = rest[fi]
  let t = target.fixedAt!
  let nxt: Stop = target
  for (let i = fi - 1; i >= 0; i--) {
    t = addMin(t, -drive(rest[i], nxt, nxt.travelIn) - rest[i].onsiteMin)
    nxt = rest[i]
  }
  t = addMin(t, -drive(stops[fromIdx], nxt, nxt.travelIn))
  return { by: t, target }
}

import { useMemo } from 'react'
import { BOOKINGS, DRIVE, PLACES, PLANS, ROUTE_ALTERNATIVES, STOPS, type BookingStatus, type PlanId, type Stop } from '../data/trip'
import { useShared } from './store'
import { addMin, at, diffMin } from './time'

export type StopState = 'upcoming' | 'arrived' | 'done' | 'skipped'
export interface StatusRec { s: StopState; at?: number }
export interface BookingRec { status: BookingStatus; time?: string; guests?: number; cost?: string }

export const usePlan = () => useShared<PlanId>('plan', 'A')
export const useLate = () => useShared<number>('late', 0)
export const useStatus = (id: string) => useShared<StatusRec>(`st:${id}`, { s: 'upcoming' })
export const useBooking = (id: string) => useShared<BookingRec>(`bk:${id}`, { status: 'Not Booked', guests: BOOKINGS.find((b) => b.id === id)?.guests })
export const useStartEdit = (id: string) => useShared<string | null>(`edit:${id}`, null)

export interface Projected extends Stop {
  plannedStart: Date
  plannedEnd: Date
  onsiteMin: number
  /** Projected (live) times — honour check-ins, skips, lateness and booked times. */
  pStart: Date
  pEnd: Date
  arrive: Date
  driveIn: number
  delta: number
  status: StatusRec
  booking?: BookingRec
  fixedAt?: Date
  conflict?: number
  slack?: number
  /** Free minutes before an anchored stop (time you can spend at the previous stop). */
  wait?: number
  edited: boolean
  planSkipped: boolean
}

/** Hook that reads all shared state and runs the schedule projection. */
export function useTrip(now = Date.now()) {
  const [planId] = usePlan()
  const [late] = useLate()
  // read all statuses/bookings/edits (hooks in fixed order — STOPS is static)
  const statuses = STOPS.map((s) => useStatus(s.id)[0]) // eslint-disable-line react-hooks/rules-of-hooks
  const edits = STOPS.map((s) => useStartEdit(s.id)[0]) // eslint-disable-line react-hooks/rules-of-hooks
  const bookings = Object.fromEntries(BOOKINGS.map((b) => [b.id, useBooking(b.id)[0]])) // eslint-disable-line react-hooks/rules-of-hooks
  const key = JSON.stringify([planId, late, statuses, edits, bookings, Math.floor(now / 60000)])

  return useMemo(() => {
    const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0]
    const out: Projected[] = []
    let cursor = at(STOPS[0].start)
    let prevPlace = STOPS[0].place
    let lateApplied = false
    STOPS.forEach((s0, i) => {
      const status = statuses[i]
      const planSkipped = plan.skip.includes(s0.id)
      const edited = !!edits[i]
      const s = s0
      const plannedStart = at(edits[i] ?? s.start)
      let plannedEnd = at(s.end)
      if (edited) plannedEnd = addMin(plannedStart, diffMin(at(s.end), at(s.start)))
      const extra = plan.extend?.[s.id] ?? 0
      const onsiteMin = Math.max(5, diffMin(plannedEnd, plannedStart) - s.travelIn + extra)
      const booking = s.bookingId ? bookings[s.bookingId] : undefined
      const fixedAt = booking?.status === 'Booked' && booking.time ? at(booking.time) : undefined

      if (i === 0) {
        // departure
        const dep = status.s === 'done' && status.at ? new Date(status.at) : plannedStart
        cursor = dep
        out.push({ ...s, plannedStart, plannedEnd, onsiteMin: 0, pStart: dep, pEnd: dep, arrive: dep, driveIn: 0, delta: diffMin(dep, plannedStart), status, booking, edited, planSkipped })
        return
      }
      if (planSkipped || status.s === 'skipped') {
        out.push({ ...s, plannedStart, plannedEnd, onsiteMin, pStart: cursor, pEnd: cursor, arrive: cursor, driveIn: 0, delta: 0, status: planSkipped ? { s: 'skipped' } : status, booking, edited, planSkipped })
        return
      }
      // Plan C morning goes around the park
      let driveIn = s.id === 'home' ? (plan.id === 'C' ? ROUTE_ALTERNATIVES.aroundPark.min : ROUTE_ALTERNATIVES.overPark.min) : DRIVE[prevPlace]?.[s.place] ?? s.travelIn
      if (plan.morningVia === 'around' && prevPlace === 'gnv') driveIn = 342
      const arrive = status.at && (status.s === 'arrived' || status.s === 'done') ? new Date(status.at) : addMin(cursor, driveIn)
      // earliest on-site start = planned on-site start (we don't rush ahead — buffer is kept)
      const plannedOnsite = addMin(plannedStart, s.travelIn)
      const checkedIn = status.s === 'arrived' || status.s === 'done'
      let pStart = checkedIn || !s.anchor ? arrive : new Date(Math.max(arrive.getTime(), plannedOnsite.getTime()))
      // Unanchored stops never start *before* plan unless time was freed by a skip upstream
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
      out.push({ ...s, plannedStart, plannedEnd, onsiteMin, pStart, pEnd, arrive, driveIn, delta: diffMin(pStart, plannedOnsite), status, booking, fixedAt, conflict, slack, wait, edited, planSkipped })
      cursor = pEnd
      prevPlace = s.place
    })
    const active = out.filter((s) => s.status.s !== 'skipped')
    const current = active.find((s) => s.status.s === 'arrived') ?? active.find((s) => s.status.s !== 'done' && s.pEnd.getTime() > now) ?? active.find((s) => s.status.s !== 'done')
    const next = current ? active[active.indexOf(current) + 1] : undefined
    const home = out.at(-1)!
    return { plan, stops: out, active, current, next, homeArrival: home.status.s === 'skipped' ? undefined : home.pStart }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/** Latest time to leave `from` and still make the next booked stop. */
export function leaveBy(stops: Projected[], fromIdx: number): { by: Date; target: Projected } | null {
  const rest = stops.slice(fromIdx + 1).filter((s) => s.status.s !== 'skipped')
  const fi = rest.findIndex((s) => s.fixedAt)
  if (fi < 0) return null
  const target = rest[fi]
  let t = target.fixedAt!
  let place = target.place
  for (let i = fi - 1; i >= 0; i--) {
    t = addMin(t, -(DRIVE[rest[i].place]?.[place] ?? 0) - rest[i].onsiteMin)
    place = rest[i].place
  }
  t = addMin(t, -(DRIVE[stops[fromIdx].place]?.[place] ?? 0))
  return { by: t, target }
}

export const elevOf = (s: Stop) => PLACES[s.place].elevFt

import { AlertTriangle, BedDouble, Camera, Car, CheckCircle2, CircleDashed, Clock, Fuel, Gauge, KeyRound, MapPin, Moon, Navigation, PartyPopper, Ticket } from 'lucide-react'
import type { ReactNode } from 'react'
import { ROAD_STATUS_URL, search, type DayItem } from '../data/trip'
import { useDoc } from '../lib/doc'
import { useTrip } from '../lib/engine'
import { addMin, at, dur, fmt, getTripDate, shiftDate } from '../lib/time'
import { ExtLink, Note, Reveal, useNow } from './ui'

export type Day = 'fri' | 'sat' | 'sun'
const fromLocal = (s: string) => at(s.slice(11, 16), s.slice(0, 10))
const dayLabel = (offset: number) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(shiftDate(getTripDate(), offset) + 'T12:00:00Z'))

export function DayTabs({ day, setDay }: { day: Day; setDay: (d: Day) => void }) {
  const tabs: [Day, string, string][] = [['fri', 'Friday', 'Rental pickup'], ['sat', 'Saturday', 'Adventure day'], ['sun', 'Sunday', 'Rental return']]
  return (
    <>
      <div className="no-print mb-6 grid grid-cols-3 gap-1.5 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-1.5" role="tablist" aria-label="Trip day">
        {tabs.map(([k, l, sub]) => (
          <button key={k} role="tab" aria-selected={day === k} onClick={() => setDay(k)} className={`rounded-xl px-2 py-2.5 text-left transition-colors ${day === k ? 'bg-[var(--gold)] text-[var(--gold-ink)]' : 'hover:bg-[var(--bg-2)]'}`}>
            <span className="display block text-[0.95rem] leading-tight">{l}</span>
            <span className={`block text-[0.66rem] ${day === k ? 'opacity-80' : 'ink2'}`}>{sub}</span>
          </button>
        ))}
      </div>
      {day === 'fri' && <FridayView />}
      {day === 'sun' && <SundayView />}
    </>
  )
}

function Item({ d, date, children, icon }: { d: DayItem; date: string; children?: ReactNode; icon: ReactNode }) {
  const t = at(d.time, date)
  return (
    <Reveal>
      <div className="relative pl-11 sm:pl-14">
        <div className="absolute top-4 left-0 grid h-9 w-9 place-items-center rounded-xl border-2 border-sunset/70 bg-[var(--bg)] text-[var(--gold)]">{icon}</div>
        <div className="panel mb-4 p-4 sm:p-5">
          <p className="mono text-sm font-semibold">{fmt(t)}</p>
          <h3 className="display mt-1 text-xl">{d.title}</h3>
          <ul className="ink2 mt-2 space-y-1 text-sm">{d.details.map((x) => <li key={x} className="flex gap-2"><span className="gold">›</span>{x}</li>)}</ul>
          {children}
        </div>
      </div>
    </Reveal>
  )
}

export function RentalCard({ compact = false }: { compact?: boolean }) {
  const { rental } = useDoc()
  const now = useNow(30000)
  const returnBy = fromLocal(rental.returnBy)
  const leave = rental.returnDriveMin != null ? addMin(returnBy, -(rental.returnDriveMin + rental.returnBufferMin)) : null
  const toReturn = Math.round((returnBy.getTime() - now) / 60000)
  const rows: [string, string][] = [['Company', rental.company], ['Vehicle', rental.vehicle], ['Pickup', `${fmt(fromLocal(rental.pickupAt), true)}`], ['Return by', fmt(returnBy, true)], ['Drivers', rental.drivers]]
  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label flex items-center gap-1.5"><Car size={12} /> Rental car</p>
        <span className={`chip ${rental.status === 'Returned' ? '!border-emerald-400 !text-emerald-400' : '!text-[var(--gold)]'}`}>{rental.status}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k}><dt className="ink2 text-[0.7rem]">{k}</dt><dd className="font-medium">{v || <span className="ink2 italic">To be entered</span>}</dd></div>
        ))}
        <div><dt className="ink2 text-[0.7rem]">Reservation</dt><dd className="font-medium">{rental.bookingStatus}</dd></div>
      </dl>
      {!compact && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[['Pickup', rental.pickupAddress], ['Return', rental.returnAddress]].map(([k, a]) => (
            <div key={k} className="rounded-xl bg-[var(--bg-2)] p-3 text-sm">
              <p className="label !text-[0.58rem]">{k} location</p>
              {a ? (
                <a className="mt-1 flex items-start gap-1.5 font-medium underline decoration-[var(--line-strong)]" href={search(a)} target="_blank" rel="noopener noreferrer"><MapPin size={14} className="gold mt-0.5 shrink-0" />{a}</a>
              ) : (
                <p className="ink2 mt-1 italic">The organizer will add this</p>
              )}
            </div>
          ))}
        </div>
      )}
      {rental.status !== 'Returned' && (
        <div className="mt-3 rounded-xl bg-sunset/15 p-3">
          <p className="label">Return deadline</p>
          <p className="mono mt-1 text-2xl font-semibold text-[var(--gold)]">{fmt(returnBy, true)}</p>
          <p className="text-xs">{toReturn > 0 ? `in ${dur(toReturn)}` : `${dur(-toReturn)} ago`}</p>
          {leave ? (
            <p className="mt-1.5 text-sm">Leave home by <strong className="mono">{fmt(leave)}</strong> ({rental.returnDriveMin}-min drive + {rental.returnBufferMin}-min buffer).</p>
          ) : (
            <p className="ink2 mt-1.5 text-xs">Leave-by time appears once the return address is entered — it isn’t assumed to be Gainesville.</p>
          )}
        </div>
      )}
      {rental.status === 'Returned' && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-400"><PartyPopper size={16} /> Car returned — the weekend is officially wrapped. 🎉</p>}
    </div>
  )
}

function FridayView() {
  const doc = useDoc()
  const date = shiftDate(doc.tripDate, -1)
  const open = doc.bookings.filter((b) => b.status !== 'Confirmed' && b.status !== 'Not required')
  return (
    <div>
      <p className="label mb-4">{dayLabel(-1)} · Rental preparation</p>
      <div className="mb-5"><RentalCard /></div>
      {doc.friday.map((d) => (
        <Item key={d.id} d={d} date={date} icon={d.kind === 'rental-pickup' ? <KeyRound size={16} /> : d.kind === 'final-check' ? <Ticket size={16} /> : d.time >= '20' ? <Moon size={16} /> : <Fuel size={16} />}>
          {d.kind === 'rental-pickup' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {doc.rental.pickupAddress ? <ExtLink href={search(doc.rental.pickupAddress)} className="btn btn-gold btn-sm"><Navigation size={14} /> Navigate to pickup</ExtLink> : <span className="ink2 text-xs italic">Pickup address not entered yet.</span>}
              <span className="chip"><Camera size={11} /> Photos before driving</span>
            </div>
          )}
          {d.kind === 'final-check' && (
            <div className="mt-3 space-y-2">
              {open.length ? (
                <Note tone="bad"><AlertTriangle size={14} className="mr-1.5 inline" />Still unconfirmed: {open.map((b) => `${b.title} (${b.status.toLowerCase()})`).join(', ')}.</Note>
              ) : (
                <Note tone="good"><CheckCircle2 size={14} className="mr-1.5 inline" />Every booking is confirmed.</Note>
              )}
              <ExtLink href={ROAD_STATUS_URL}>NPS road closures</ExtLink>
            </div>
          )}
        </Item>
      ))}
    </div>
  )
}

function SundayView() {
  const doc = useDoc()
  const { homeArrival } = useTrip()
  const date = shiftDate(doc.tripDate, 1)
  const ret = doc.checklist.filter((c) => c.group.startsWith('Return'))
  return (
    <div>
      <p className="label mb-4">{dayLabel(1)} · Home & rental return</p>
      {doc.sunday.map((d) => (
        <Item key={d.id} d={d} date={date} icon={d.kind === 'rental-return' ? <KeyRound size={16} /> : d.kind === 'home' ? <Moon size={16} /> : d.time < '05' ? <BedDouble size={16} /> : <Gauge size={16} />}>
          {d.kind === 'home' && homeArrival && <p className="mono mt-2 text-sm">Projected ≈ {fmt(homeArrival, true)} before stops — plus rest breaks.</p>}
          {d.kind === 'rental-return' && (
            <div className="mt-3 space-y-3">
              <RentalCard compact />
              {ret.length > 0 && (
                <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                  {ret.map((c) => <li key={c.id} className="flex items-center gap-2">{c.done ? <CheckCircle2 size={15} className="text-emerald-400" /> : <CircleDashed size={15} className="ink2" />}{c.text}</li>)}
                </ul>
              )}
              {doc.rental.returnAddress && <ExtLink href={search(doc.rental.returnAddress)} className="btn btn-gold btn-sm"><Navigation size={14} /> Navigate to return</ExtLink>}
            </div>
          )}
        </Item>
      ))}
      <p className="ink2 mt-2 flex items-center gap-1.5 text-xs"><Clock size={12} /> Tiring schedule — never force the 1–2 AM arrival. A short sleep before the return beats a deadline.</p>
    </div>
  )
}

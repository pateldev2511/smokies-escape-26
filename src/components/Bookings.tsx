import { CheckCircle2, CircleDashed, ExternalLink, Loader, Ticket, XCircle } from 'lucide-react'
import type { Booking, BookingStatus } from '../data/trip'
import { useDoc } from '../lib/doc'
import { useTrip } from '../lib/engine'
import { at, fmt } from '../lib/time'
import { RentalCard } from './Days'
import { ExtLink, Note, Reveal, Section } from './ui'

export const TONE: Record<BookingStatus, string> = {
  'Not booked': 'bg-red-500/85 text-white border-transparent',
  'Booking in progress': 'bg-sunset text-forest border-transparent',
  Confirmed: 'bg-emerald-400 text-forest border-transparent',
  Cancelled: 'border-[var(--line-strong)] text-[var(--ink-2)]',
  'Not required': 'border-[var(--line-strong)] text-[var(--ink-2)]',
  'Holiday hours / seating to confirm': 'bg-sunset text-forest border-transparent',
  'Status unknown': 'border-[var(--line-strong)] text-[var(--ink-2)]',
}
const ICON: Record<BookingStatus, typeof CheckCircle2> = { 'Not booked': CircleDashed, 'Booking in progress': Loader, Confirmed: CheckCircle2, Cancelled: XCircle, 'Holiday hours / seating to confirm': Loader, 'Status unknown': CircleDashed, 'Not required': CheckCircle2 }
const PRI: Record<Booking['priority'], string> = { CRITICAL: 'text-red-400', HIGH: 'text-[var(--gold)]', MEDIUM: 'text-mist', REQUIRED: 'text-[var(--gold)]' }

export function bookingProgress(bookings: Booking[], rentalStatus: BookingStatus) {
  const all = [...bookings.map((b) => b.status), rentalStatus]
  const relevant = all.filter((s) => s !== 'Not required' && s !== 'Cancelled')
  return { done: relevant.filter((s) => s === 'Confirmed').length, total: relevant.length }
}

function Stub({ b, i }: { b: Booking; i: number }) {
  const { stops } = useTrip()
  const stop = stops.find((s) => s.id === b.stopId)
  const I = ICON[b.status]
  return (
    <Reveal delay={i * 70}>
      <div className="stub h-full" style={{ ['--perf' as string]: '118px' }}>
        <div className="p-5 pb-6">
          <div className="flex items-start justify-between gap-2">
            <span className={`mono text-[0.66rem] font-bold tracking-[0.16em] ${PRI[b.priority]}`}>● {b.priority}</span>
            <span className={`chip ${TONE[b.status]}`}><I size={11} /> {b.status}</span>
          </div>
          <h3 className="display mt-2 text-2xl">{b.title}{b.status === 'Confirmed' ? ' ✓' : ''}</h3>
          <p className="ink2 mt-1 text-sm">{b.what}</p>
        </div>
        <div className="perf mx-5" />
        <div className="space-y-3 p-5">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="label !text-[0.56rem]">{b.status === 'Confirmed' ? 'Confirmed time' : 'Target'}</dt><dd className="mono mt-1 font-semibold">{b.status === 'Confirmed' && b.time ? fmt(at(b.time, b.date)) : b.preferred}</dd></div>
            <div><dt className="label !text-[0.56rem]">{b.id === 'parking' ? 'Vehicles' : 'Guests'}</dt><dd className="mono mt-1 font-semibold">{b.guests}</dd></div>
            <div className="col-span-2"><dt className="label !text-[0.56rem]">{b.price ? 'Price paid' : 'Estimated'}</dt><dd className="mono mt-1 font-semibold">{b.price || b.cost}</dd></div>
            {b.cancelBy && <div className="col-span-2"><dt className="label !text-[0.56rem]">Cancel by</dt><dd className="mt-1">{b.cancelBy}</dd></div>}
          </dl>
          {stop?.conflict && <Note tone="bad">Schedule projects arrival {stop.conflict} min after this booking.</Note>}
          {b.publicNote && <Note tone="info">{b.publicNote}</Note>}
          <div className="flex flex-wrap gap-2 pt-1">
            {b.status !== 'Confirmed' && b.status !== 'Not required' && <ExtLink href={b.url} className="btn btn-gold btn-sm flex-1"><Ticket size={15} /> {b.cta}</ExtLink>}
            {b.info && <ExtLink href={b.info.url}><ExternalLink size={14} /> {b.info.label}</ExtLink>}
          </div>
          <ul className="ink2 space-y-1 text-xs">{b.notes.map((n) => <li key={n}>· {n}</li>)}</ul>
        </div>
      </div>
    </Reveal>
  )
}

export function BookingDashboard() {
  const doc = useDoc()
  const p = bookingProgress(doc.bookings, doc.rental.bookingStatus)
  return (
    <Section id="tickets" index="05" kicker="Bookings" title={<>{p.done} of {p.total} <span className="text-[var(--gold)]">confirmed.</span></>} intro="Statuses are set by the organizer — opening a booking link never marks anything confirmed. Confirmation numbers stay private.">
      <div className="panel mb-5 p-4">
        <div className="flex justify-between text-sm"><span className="font-semibold">Preparations confirmed</span><span className="mono">{p.done}/{p.total}</span></div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--bg-2)]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#E8B86D,#7fc8a9)] transition-[width] duration-700" style={{ width: `${(p.done / Math.max(1, p.total)) * 100}%` }} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Reveal><RentalCard /></Reveal>
        {doc.bookings.map((b, i) => <Stub key={b.id} b={b} i={i + 1} />)}
      </div>
    </Section>
  )
}

import { CheckCircle2, ExternalLink, ImagePlus, Lock, Ticket, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BOOKINGS, BOOKING_STATUSES, type Booking, type BookingStatus } from '../data/trip'
import { useBooking, useTrip } from '../lib/engine'
import { delPhoto, getPhoto, putPhoto, shrink, useLocal } from '../lib/store'
import { at, fmt } from '../lib/time'
import { ExtLink, Note, Reveal, Section } from './ui'

const TONE: Record<BookingStatus, string> = {
  'Not Booked': 'bg-red-500/85 text-white border-transparent',
  'Booking Started': 'bg-sunset text-forest border-transparent',
  Booked: 'bg-emerald-400 text-forest border-transparent',
  Cancelled: 'border-[var(--line-strong)] text-[var(--ink-2)]',
  'Not Required': 'border-[var(--line-strong)] text-[var(--ink-2)]',
}
const PRI: Record<Booking['priority'], string> = { CRITICAL: 'text-red-400', HIGH: 'text-[var(--gold)]', MEDIUM: 'text-mist', REQUIRED: 'text-[var(--gold)]' }

function Shot({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const load = () => getPhoto(`bk-${id}`).then((b) => setUrl(b ? URL.createObjectURL(b) : null)).catch(() => {})
  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      {url ? (
        <div className="relative">
          <img src={url} alt="Booking screenshot (this device only)" className="max-h-44 w-full rounded-xl object-cover object-top" />
          <button className="btn btn-ghost btn-sm absolute top-2 right-2 !min-h-[34px] !px-2" aria-label="Remove screenshot" onClick={() => delPhoto(`bk-${id}`).then(() => setUrl(null))}><Trash2 size={14} /></button>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm w-full" onClick={() => input.current?.click()}><ImagePlus size={15} /> Attach screenshot (this device)</button>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0]
        if (!f) return
        await putPhoto(`bk-${id}`, await shrink(f, 1400))
        load()
      }} />
    </div>
  )
}

function Stub({ b, i }: { b: Booking; i: number }) {
  const [rec, setRec] = useBooking(b.id)
  const [note, setNote] = useLocal<string>(`conf:${b.id}`, '')
  const { stops } = useTrip()
  const stop = stops.find((s) => s.id === b.stopId)
  return (
    <Reveal delay={i * 70}>
      <div className="stub h-full" style={{ ['--perf' as string]: '132px' }}>
        <div className="p-5 pb-6">
          <div className="flex items-start justify-between gap-2">
            <span className={`mono text-[0.66rem] font-bold tracking-[0.16em] ${PRI[b.priority]}`}>● {b.priority}</span>
            <span className={`chip ${TONE[rec.status]}`}>{rec.status}</span>
          </div>
          <h3 className="display mt-2 text-2xl">{b.title}</h3>
          <p className="ink2 mt-1 text-sm">{b.what}</p>
          <p className="mono mt-2 text-xs">{b.preferred} · {b.cost}</p>
        </div>
        <div className="perf mx-5" />
        <div className="space-y-3 p-5">
          {stop?.conflict && <Note tone="bad">Schedule projects arrival {stop.conflict} min after this booking.</Note>}
          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-2 block">
              <span className="label">Status</span>
              <select className="input mt-1.5" value={rec.status} onChange={(e) => setRec({ ...rec, status: e.target.value as BookingStatus })}>
                {BOOKING_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            {b.id !== 'parking' && (
              <label className="block">
                <span className="label">Reservation time</span>
                <input type="time" className="input mt-1.5" value={rec.time ?? ''} onChange={(e) => setRec({ ...rec, time: e.target.value })} />
              </label>
            )}
            <label className={`block ${b.id === 'parking' ? 'col-span-2' : ''}`}>
              <span className="label">{b.id === 'parking' ? 'Vehicles' : 'Guests'}</span>
              <input inputMode="numeric" className="input mt-1.5" value={rec.guests ?? b.guests} onChange={(e) => setRec({ ...rec, guests: Math.max(0, parseInt(e.target.value) || 0) })} />
            </label>
            <label className="col-span-2 block">
              <span className="label">Actual cost paid</span>
              <input inputMode="decimal" className="input mt-1.5" placeholder="$ e.g. 171.40" value={rec.cost ?? ''} onChange={(e) => setRec({ ...rec, cost: e.target.value })} />
            </label>
          </div>
          {rec.status === 'Booked' && rec.time && <p className="text-xs text-emerald-400"><CheckCircle2 size={13} className="mr-1 inline" />Timeline locked to {fmt(at(rec.time))} — never moved automatically.</p>}
          <label className="block">
            <span className="label flex items-center gap-1"><Lock size={10} /> Confirmation note · never synced or shared</span>
            <input type="password" autoComplete="off" className="input mt-1.5" placeholder="Hidden on this device" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <Shot id={b.id} />
          <div className="flex flex-wrap gap-2 pt-1">
            <ExtLink href={b.url} className="btn btn-gold btn-sm flex-1"><Ticket size={15} /> {b.cta}</ExtLink>
            {rec.status !== 'Booked' && <button className="btn btn-ghost btn-sm" onClick={() => setRec({ ...rec, status: 'Booked' })}><CheckCircle2 size={15} /> Mark Booked</button>}
            {b.info && <ExtLink href={b.info.url}><ExternalLink size={14} /> {b.info.label}</ExtLink>}
          </div>
          <ul className="ink2 space-y-1 text-xs">{b.notes.map((n) => <li key={n}>· {n}</li>)}</ul>
        </div>
      </div>
    </Reveal>
  )
}

export function BookingDashboard() {
  return (
    <Section id="tickets" index="05" kicker="Tickets" title={<>Four bookings. <span className="text-[var(--gold)]">Zero surprises.</span></>} intro="Status only changes when one of you changes it — tapping a booking link never marks anything booked. Statuses sync with the crew; confirmation notes and screenshots stay on your phone.">
      <div className="grid gap-4 md:grid-cols-2">
        {BOOKINGS.map((b, i) => <Stub key={b.id} b={b} i={i} />)}
      </div>
    </Section>
  )
}

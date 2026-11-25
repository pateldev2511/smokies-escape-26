import { Check, Coffee, Flag, Moon, Navigation, SkipForward, Smartphone, CarFront, Sun, TimerReset, WifiOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { leaveBy, useLate, useStatus, useTrip } from '../lib/engine'
import { useLocal } from '../lib/store'
import { dur, fmt } from '../lib/time'
import { useDoc } from '../lib/doc'
import { AnnouncementBanner } from './Announcement'
import { Photo, useNow } from './ui'
import { SummitAlert } from './SummitAlert'

function useWakeLock(on: boolean) {
  const lock = useRef<WakeLockSentinel | null>(null)
  const [ok, setOk] = useState(false)
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return
    let alive = true
    const get = () => navigator.wakeLock.request('screen').then((l) => { lock.current = l; setOk(true) }).catch(() => setOk(false))
    get()
    const vis = () => document.visibilityState === 'visible' && alive && get()
    document.addEventListener('visibilitychange', vis)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', vis)
      lock.current?.release().catch(() => {})
      setOk(false)
    }
  }, [on])
  return ok
}

function useOnline() {
  const [on, set] = useState(navigator.onLine)
  useEffect(() => {
    const a = () => set(true), b = () => set(false)
    addEventListener('online', a); addEventListener('offline', b)
    return () => (removeEventListener('online', a), removeEventListener('offline', b))
  }, [])
  return on
}

export function CoPilot({ onClose }: { onClose: () => void }) {
  const now = useNow(15000)
  const { stops, current, next, homeArrival } = useTrip(now)
  const [, setCur] = useStatus(current?.id ?? 'depart')
  const [late, setLate] = useLate()
  const [night, setNight] = useLocal<boolean>('night', false)
  const [shift, setShift] = useLocal<{ who: string; since: number } | null>('shift', null)
  const travelers = useDoc().travelers
  const drivers = travelers.filter((t) => t.driver)
  const wake = useWakeLock(true)
  const online = useOnline()

  useEffect(() => {
    document.documentElement.dataset.night = night ? 'on' : 'off'
    return () => void (document.documentElement.dataset.night = 'off')
  }, [night])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => (removeEventListener('keydown', k), void (document.body.style.overflow = ''))
  }, [onClose])

  const ci = current ? stops.indexOf(current) : -1
  const lb = ci >= 0 ? leaveBy(stops, ci) : null
  const lbMin = lb ? Math.round((lb.by.getTime() - now) / 60000) : null
  const driving = shift ? Math.round((now - shift.since) / 60000) : 0
  const nextBooking = next?.booking

  return (
    <div role="dialog" aria-modal="true" aria-label="Co-Pilot" className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-[var(--bg)]" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="mono text-3xl font-semibold">{fmt(new Date(now))}</span>
          {!online && <span className="chip !text-[var(--gold)]"><WifiOff size={11} /> offline</span>}
          {wake && <span className="chip"><Smartphone size={11} /> awake</span>}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm !px-3" onClick={() => setNight(!night)} aria-pressed={night} aria-label="Night drive mode">{night ? <Sun size={17} /> : <Moon size={17} />}</button>
          <button className="btn btn-ghost btn-sm !px-3" onClick={onClose} aria-label="Close Co-Pilot"><X size={18} /></button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl flex-1 space-y-3 px-4 pb-6">
        {current ? (
          <div className="relative overflow-hidden rounded-[28px] border border-[var(--line)] text-cream">
            <Photo k={current.image} alt="" className="absolute inset-0" sizes="600px" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(13_30_25/.55),rgb(13_30_25/.95))]" />
            <div className="relative p-5">
              <p className="label !text-sunset">NOW · STOP {String(current.n).padStart(2, '0')}</p>
              <h2 className="display mt-2 text-[2rem] leading-[1.05]">{current.title}</h2>
              <p className="mono mt-2 text-sm text-cream/80">{current.id === 'depart' ? (now < current.pStart.getTime() ? `Wheels up ${fmt(current.pStart, true)} · in ${dur((current.pStart.getTime() - now) / 60000)}` : `Wheels up ${fmt(current.pStart)}`) : `${fmt(current.pStart)} – ${fmt(current.pEnd)}`}{current.delta > 0 ? ` · +${dur(current.delta)}` : ''}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button className={`btn !min-h-[60px] flex-col !gap-1 text-xs ${current.status.s === 'arrived' ? 'btn-gold' : '!border-white/25 !bg-black/35 !text-cream'}`} onClick={() => setCur({ s: 'arrived', at: Date.now() })}><Flag size={20} /> Arrived</button>
                <button className="btn !border-white/25 !bg-black/35 !min-h-[60px] flex-col !gap-1 text-xs !text-cream" onClick={() => setCur({ s: 'done', at: Date.now() })}><Check size={20} /> {current.id === 'depart' ? 'Departed' : 'Done'}</button>
                <button className="btn !border-white/25 !bg-black/35 !min-h-[60px] flex-col !gap-1 text-xs !text-cream" onClick={() => confirm(`Skip ${current.title}?`) && setCur({ s: 'skipped', at: Date.now() })}><SkipForward size={20} /> Skip</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="panel p-6 text-center"><p className="display text-2xl">Home. What a day. 🏔️</p></div>
        )}

        <AnnouncementBanner />
        <SummitAlert />
        {lb && (
          <div className={`rounded-[24px] p-5 ${lbMin! < 10 ? 'bg-red-500/20' : 'bg-sunset/15'}`}>
            <p className="label">LEAVE BY</p>
            <p className="mono mt-1 text-5xl font-semibold text-[var(--gold)]">{fmt(lb.by)}</p>
            <p className="mt-1 text-sm">{lbMin! >= 0 ? `in ${dur(lbMin!)}` : `${dur(-lbMin!)} ago`} — to make <strong>{lb.target.title}</strong> at {fmt(lb.target.fixedAt!)}</p>
          </div>
        )}

        {next && (
          <a href={next.navUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-[24px] bg-[var(--gold)] p-5 text-[var(--gold-ink)] active:scale-[.98]">
            <Navigation size={34} className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold tracking-widest opacity-75">NAVIGATE NEXT</span>
              <span className="display block truncate text-2xl">{next.title}</span>
              <span className="mono block text-sm opacity-80">≈ {fmt(next.pStart)}{next.fixedAt ? ' · booked' : nextBooking ? ` · ${next.booking?.status}` : ''}</span>
            </span>
          </a>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="panel p-4">
            <p className="label">Home ETA</p>
            <p className="mono mt-1.5 text-2xl font-semibold">{homeArrival ? fmt(homeArrival) : '—'}</p>
            <p className="ink2 text-[0.7rem]">before stops · verify in Maps</p>
          </div>
          <div className="panel p-4">
            <p className="label">Running late?</p>
            <div className="mt-2 flex gap-1.5">
              {[30, 60].map((m) => (
                <button key={m} className={`btn btn-sm flex-1 !px-1 ${late === m ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setLate(late === m ? 0 : m)}><TimerReset size={13} />+{m}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="label flex items-center gap-1.5"><CarFront size={12} /> Driver shift</p>
            {shift && <span className={`mono text-sm font-semibold ${driving >= 120 ? 'text-red-400' : ''}`}>{dur(driving)}</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {drivers.map((d) => (
              <button key={d.id} className={`btn btn-sm flex-1 ${shift?.who === d.id ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setShift({ who: d.id, since: Date.now() })}>{d.emoji} {d.name}</button>
            ))}
          </div>
          {driving >= 120 && <p className="mt-2 flex items-center gap-1.5 text-sm text-red-400"><Coffee size={15} /> Two hours at the wheel — swap drivers or take a real break.</p>}
          <p className="ink2 mt-2 text-[0.7rem]">Sleepy = stop. No deadline beats getting home.</p>
        </div>
      </div>
    </div>
  )
}

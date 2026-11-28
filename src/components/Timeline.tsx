import {
  AlertTriangle, Car, Check, ChevronDown, Clock, CloudSun, DollarSign, Flag, Footprints, Gauge, Lock, MapPin, Mountain, Navigation, Phone,
  RotateCcw, Share2, SkipForward, Ticket, TimerReset, TreePine, Utensils, Zap, Landmark,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { PLACES, WEATHER_POINTS, SITE_URL, type Category } from '../data/trip'
import { leaveBy, placeOf, useLate, useStatus, useTrip, type Projected } from '../lib/engine'
import { useLocal } from '../lib/store'
import { sunTimes } from '../lib/sun'
import { addMin, at, dur, fmt, getTripDate } from '../lib/time'
import { DayTabs } from './Days'
import { hourAt, useWeather, WMO, type Wx } from '../lib/weather'
import { ExtLink, Note, Photo, Reveal, Section, useNow } from './ui'
import { SummitAlert } from './SummitAlert'

export const CAT: Record<Category, (p: { size?: number }) => ReactNode> = {
  Driving: (p) => <Car {...p} />,
  Scenic: (p) => <Mountain {...p} />,
  Hiking: (p) => <Footprints {...p} />,
  Food: (p) => <Utensils {...p} />,
  Adventure: (p) => <Zap {...p} />,
  Attraction: (p) => <Landmark {...p} />,
}

const SUN = sunTimes(at('00:00'), PLACES.anak.lat, PLACES.anak.lng)
export const fillTokens = (s: string) => s.replace('{SUNSET}', SUN.set ? fmt(SUN.set) : '≈ 5:2x PM').replace('{SUNRISE}', SUN.rise ? `~${fmt(SUN.rise)}` : '~7:25 AM')

function forecastFor(s: Projected, wx: Wx | null) {
  if (!wx || wx.forDate !== getTripDate()) return null
  const p = placeOf(s)
  const near = WEATHER_POINTS.map((w) => ({ w, d: Math.hypot(PLACES[w.place].lat - p.lat, PLACES[w.place].lng - p.lng) })).sort((a, b) => a.d - b.d)[0]
  if (near.d > 0.2) return null
  const hr = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(s.pStart))
  return hourAt(wx.points.find((x) => x.id === near.w.id), hr) ?? null
}

async function shareStop(s: Projected) {
  const url = `${SITE_URL}#stop-${s.id}`
  const text = `${s.title} — ${fmt(s.plannedStart)} on Sat Nov 28 · Smokies Escape ’26`
  if (navigator.share) return navigator.share({ title: s.title, text, url }).catch(() => {})
  await navigator.clipboard?.writeText(`${text}\n${url}`)
  alert('Link copied')
}

function Classification({ s }: { s: Projected }) {
  if (s.status.s === 'skipped') return <span className="chip">Skipped{s.skipReason ? ` · ${s.skipReason}` : ''}</span>
  if (s.booking?.status === 'Confirmed' && !s.fixedAt) return <span className="chip !border-emerald-400/50 !text-emerald-300 light:!text-emerald-700"><Lock size={11} /> Booked · entry time TBD</span>
  if (s.fixedAt)
    return (
      <span className="chip !border-emerald-400/50 !text-emerald-300 light:!text-emerald-700">
        <Lock size={11} /> Fixed · confirmed {fmt(s.fixedAt)}
      </span>
    )
  if (s.bookingId) return <span className="chip !border-sunset/50 !text-[var(--gold)]">{s.booking?.url.startsWith('tel:') ? 'Target · call to confirm' : 'Target · needs booking'}</span>
  if (s.optional) return <span className="chip">Optional</span>
  return <span className="chip">Flexible</span>
}

function DestinationCard({ s, trip, next }: { s: Projected; trip: boolean; next?: Projected }) {
  const [, setStatus] = useStatus(s.id)
  const [open, setOpen] = useState(false)
  const { wx } = useWeather()
  const fx = forecastFor(s, wx)
  const Icon = CAT[s.category]
  const st = s.status.s
  const skipped = st === 'skipped'
  const booking = s.booking
  // Confirmed bookings always show their real time, even in Planning Mode
  const start = trip || s.fixedAt ? s.pStart : s.plannedStart
  const end = trip || s.fixedAt ? s.pEnd : s.plannedEnd
  const totalMin = s.id === 'depart' ? s.driveIn || 255 : s.onsiteMin + s.travelIn

  return (
    <article id={`stop-${s.id}`} className="relative scroll-mt-24 pl-11 sm:pl-16">
      {/* node */}
      <div className={`absolute top-5 left-0 grid h-9 w-9 place-items-center rounded-xl border-2 text-xs font-bold sm:h-11 sm:w-11 ${st === 'done' ? 'border-emerald-400 bg-emerald-400 text-forest' : st === 'arrived' ? 'pulse border-sunset bg-sunset text-forest' : skipped ? 'border-[var(--line-strong)] bg-[var(--bg)] text-[var(--ink-2)]' : 'border-sunset/70 bg-[var(--bg)] text-[var(--gold)]'}`}>
        {st === 'done' ? <Check size={16} /> : <span className="mono">{String(s.n).padStart(2, '0')}</span>}
      </div>
      <Reveal>
        <div className={`panel overflow-hidden ${skipped ? 'opacity-55 grayscale' : ''}`}>
          <div className="relative">
            <Photo k={s.image} alt={s.title} className="aspect-[16/10] sm:aspect-[21/9]" sizes="(min-width: 1024px) 960px, 100vw" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(13_30_25/.15)_0%,transparent_35%,rgb(13_30_25/.9)_100%)]" />
            <div className="absolute top-3 right-3 left-3 flex flex-wrap gap-1.5">
              <span className="chip !border-white/25 !bg-black/45 !text-cream backdrop-blur"><Icon size={12} /> {s.category}</span>
              {booking && booking.status !== 'Confirmed' && booking.status !== 'Not required' && <span className="chip !border-red-300/60 !bg-red-500/85 !text-white">{booking.priority} · {booking.status}</span>}
              {booking?.status === 'Confirmed' && <span className="chip !border-emerald-300/60 !bg-emerald-500/85 !text-white">✓ Confirmed{booking.time ? ` ${fmt(at(booking.time))}` : ''}</span>}
              {fx && (
                <span className="chip !border-white/25 !bg-black/45 !text-cream backdrop-blur">
                  {WMO[fx.code]?.[1]} {Math.round(fx.temp)}°F{fx.pop != null ? ` · ${fx.pop}%` : ''}
                </span>
              )}
            </div>
            <div className="absolute right-4 bottom-3 left-4 text-cream">
              <p className="mono text-[0.68rem] tracking-wider text-sunset">{s.kicker.toUpperCase()} · {placeOf(s).elevFt.toLocaleString()} FT</p>
              <h3 className="display mt-1 text-[1.65rem] leading-[1.05] sm:text-4xl">{s.title}</h3>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="mono text-lg font-semibold sm:text-xl">
                  {s.id === 'home' ? `Leave ≈ ${fmt(addMin(s.pStart, -s.driveIn))}` : `${fmt(start)}${s.id === 'depart' ? '' : ` – ${fmt(end)}`}`}
                </div>
                <div className="ink2 mt-0.5 text-xs">
                  {s.id === 'home' ? `Arrive ≈ ${fmt(s.pStart, true)} before stops (projected for the active plan) · not a live ETA` : `${dur(totalMin)}${s.travelIn ? ` incl. ≈ ${s.travelIn}-min ${s.place === 'coaster' ? 'walk' : 'drive'}` : ''}`}
                  {trip && s.delta !== 0 && !skipped && <span className={s.delta > 0 ? ' text-[var(--gold)]' : ' text-emerald-400'}> · {s.delta > 0 ? '+' : ''}{dur(s.delta)} vs plan</span>}
                  {s.edited && ' · edited'}
                </div>
              </div>
              <Classification s={s} />
            </div>

            {trip && !!s.wait && s.wait >= 20 && s.id !== 'ocon' && (
              <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 light:text-emerald-700">≈ {dur(s.wait)} free before this — linger at the previous stop or add a pullout.</p>
            )}
            {trip && s.conflict && (
              <div className="mt-3">
                <Note tone="bad">
                  <AlertTriangle size={14} className="mr-1.5 inline" />
                  Projected to arrive {dur(s.conflict)} after your booked {fmt(s.fixedAt!)} time. Skip or shorten an earlier stop, or call ahead. The confirmed reservation time is never changed automatically.
                </Note>
              </div>
            )}
            {s.alerts?.map((a) => (
              <div key={a.text} className="mt-3">
                <Note>
                  <AlertTriangle size={14} className="mr-1.5 inline" />
                  {a.text}{' '}
                  {a.url && (
                    <a className="font-semibold underline" href={a.url} target="_blank" rel="noopener noreferrer">
                      {a.label}
                    </a>
                  )}
                </Note>
              </div>
            ))}

            <p className="mt-3 text-[0.95rem] leading-relaxed">{s.description}</p>

            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Meta icon={<DollarSign size={13} />} k="Budget" v={s.cost} />
              <Meta icon={<Gauge size={13} />} k="Difficulty" v={s.difficulty} />
              <Meta icon={<CloudSun size={13} />} k="Weather impact" v={s.weather} />
              <Meta icon={<Clock size={13} />} k="Time here" v={s.id === 'depart' || s.id === 'home' ? 'Drive' : dur(s.onsiteMin)} />
            </dl>

            <div className="no-print mt-4 flex flex-wrap gap-2">
              <ExtLink href={s.navUrl} className="btn btn-gold btn-sm"><Navigation size={15} /> Navigate</ExtLink>
              <ExtLink href={s.mapsUrl}><MapPin size={15} /> Maps</ExtLink>
              {booking && <ExtLink href={booking.url} className="btn btn-ghost btn-sm !border-sunset/60">{booking.url.startsWith('tel:') ? <Phone size={15} /> : <Ticket size={15} />} {booking.url.startsWith('tel:') ? 'Call' : booking.cta.length > 18 ? 'Book' : booking.cta}</ExtLink>}
              <button className="btn btn-ghost btn-sm" onClick={() => shareStop(s)} aria-label={`Share ${s.title}`}><Share2 size={15} /></button>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                Details <ChevronDown size={15} className={open ? 'rotate-180' : ''} />
              </button>
            </div>

            {trip && (
              <div className="no-print mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button className={`btn btn-sm ${st === 'arrived' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setStatus({ s: 'arrived', at: Date.now() })}><Flag size={15} /> Mark Arrived</button>
                <button className={`btn btn-sm ${st === 'done' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setStatus({ s: 'done', at: Date.now() })}><Check size={15} /> Completed</button>
                {skipped && !s.planSkipped ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => setStatus({ s: 'upcoming' })}><RotateCcw size={15} /> Un-skip</button>
                ) : (
                  <button className="btn btn-ghost btn-sm" disabled={s.planSkipped} onClick={() => setStatus({ s: 'skipped', at: Date.now() })}><SkipForward size={15} /> Skip Stop</button>
                )}
                {next ? (
                  <ExtLink href={next.navUrl} className="btn btn-ghost btn-sm"><Navigation size={15} /> Navigate Next</ExtLink>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => setStatus({ s: 'upcoming' })}><RotateCcw size={15} /> Reset</button>
                )}
              </div>
            )}

            {open && (
              <div className="mt-5 space-y-4 border-t border-[var(--line)] pt-5 text-sm leading-relaxed">
                {s.address && <p className="mono text-xs"><MapPin size={12} className="mr-1 inline" />{s.address}</p>}
                <div>
                  <p className="label mb-2">Activities</p>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {s.activities.map((a) => <li key={a} className="flex gap-2"><TreePine size={14} className="gold mt-0.5 shrink-0" />{a}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="label mb-2">Tips</p>
                  <ul className="space-y-1.5">{s.tips.map((x) => <li key={x} className="ink2 flex gap-2"><span className="gold">›</span>{fillTokens(x)}</li>)}</ul>
                </div>
                {s.links && <div className="flex flex-wrap gap-2">{s.links.map((l) => <ExtLink key={l.url} href={l.url}>{l.label}</ExtLink>)}</div>}
                <p className="ink2 mono text-[0.66rem]">PIN: {placeOf(s).source} · ELEV: Open-Meteo DEM</p>
              </div>
            )}
          </div>
        </div>
      </Reveal>
      {s.id !== 'home' && !skipped && (
        <p className="ink2 mono flex items-center gap-2 py-3.5 pl-1 text-[0.7rem]">
          <Car size={13} className="gold" /> drive / walk to next ≈ {next ? dur(next.driveIn || 0) : '—'} · OSRM, no traffic
        </p>
      )}
      {skipped && <p className="ink2 mono py-3.5 pl-1 text-[0.7rem]">SKIPPED{s.skipReason ? ` — ${s.skipReason.toUpperCase()}` : ' — SCHEDULE RECALCULATED'}</p>}
    </article>
  )
}

function Meta({ icon, k, v }: { icon: ReactNode; k: string; v: string }) {
  return (
    <div className="rounded-xl bg-[var(--bg-2)] px-3 py-2">
      <dt className="label flex items-center gap-1.5 !text-[0.58rem]">{icon}{k}</dt>
      <dd className="mt-1 leading-snug font-medium">{v}</dd>
    </div>
  )
}

export function TripPanel({ compact = false }: { compact?: boolean }) {
  const now = useNow(30000)
  const { stops, active, current, next, homeArrival } = useTrip(now)
  const [late, setLate] = useLate()
  const ci = current ? stops.indexOf(current) : -1
  const lb = ci >= 0 ? leaveBy(stops, ci) : null
  const before = now < stops[0].plannedStart.getTime()
  return (
    <div className={`panel ${compact ? '' : 'mb-8'} p-4 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label">Trip Mode · {fmt(new Date(now), true)} ET</span>
        <span className="mono text-[0.68rem] ink2">{active.filter((s) => s.status.s === 'done').length}/{active.length} done</span>
      </div>
      {before && <p className="ink2 mt-2 text-sm">Before departure — projections use the plan plus any check-ins. Nothing is tracked by GPS.</p>}
      {current && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--bg-2)] p-4">
            <p className="label">Now</p>
            <p className="display mt-1.5 text-xl">{current.title}</p>
            <p className="mono mt-1 text-xs ink2">{fmt(current.pStart)} – {fmt(current.pEnd)}</p>
          </div>
          <div className="rounded-2xl bg-[var(--bg-2)] p-4">
            <p className="label">Next</p>
            <p className="display mt-1.5 text-xl">{next?.title ?? 'Home'}</p>
            {next && <p className="mono mt-1 text-xs ink2">≈ {fmt(next.pStart)}{next.fixedAt ? ' · booked' : ''}</p>}
          </div>
          <div className="rounded-2xl bg-sunset/15 p-4">
            <p className="label">{lb ? 'Leave by' : 'Home ETA'}</p>
            <p className="mono mt-1.5 text-xl font-semibold text-[var(--gold)]">{lb ? fmt(lb.by) : homeArrival ? fmt(homeArrival, true) : '—'}</p>
            <p className="mt-1 text-xs ink2">{lb ? `to make ${lb.target.title} at ${fmt(lb.target.fixedAt!)}` : 'projected, before stops'}</p>
          </div>
        </div>
      )}
      <div className="no-print mt-4 flex flex-wrap items-center gap-2">
        {[30, 60].map((m) => (
          <button key={m} className={`btn btn-sm ${late === m ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setLate(late === m ? 0 : m)}>
            <TimerReset size={15} /> Running {m} min late
          </button>
        ))}
        {next && <ExtLink href={next.navUrl} className="btn btn-gold btn-sm"><Navigation size={15} /> Navigate Next</ExtLink>}
      </div>
      {late > 0 && <p className="mt-2 text-xs text-[var(--gold)]">+{late} min applied to the current stop — everything after is re-projected. Booked times stay fixed and show conflicts.</p>}
    </div>
  )
}

export function InteractiveTimeline() {
  const { stops, plan } = useTrip()
  const [mode, setMode] = useLocal<'plan' | 'trip'>('mode', 'plan')
  const [day, setDay] = useLocal<'fri' | 'sat' | 'sun'>('day', 'sat')
  const pct = useMemo(() => {
    const a = stops.filter((s) => s.status.s !== 'skipped')
    return Math.round((a.filter((s) => s.status.s === 'done').length / a.length) * 100)
  }, [stops])
  const trip = mode === 'trip'
  return (
    <Section id="timeline" index="03" kicker={`Itinerary · ${plan.name}`} title={<>Three days. <span className="text-[var(--gold)]">One glorious adventure.</span></>} intro="Friday: rental pickup. Saturday: the mountains. Sunday: home and the rental return. All times Eastern; Saturday times are targets with traffic and queue flexibility.">
      <DayTabs day={day} setDay={setDay} />
      {day !== 'sat' ? null : (<>
      <div className="no-print mb-6 inline-flex rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-1" role="tablist">
        {(['plan', 'trip'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`btn btn-sm ${mode === m ? 'btn-gold' : '!bg-transparent'}`}>
            {m === 'plan' ? 'Planning Mode' : 'Trip Mode (this phone)'}
          </button>
        ))}
      </div>
      <SummitAlert className="mb-6" />
      {trip && <TripPanel />}
      <div className="relative">
        <div className="absolute top-5 bottom-5 left-[17px] w-[2px] rounded bg-[var(--line)] sm:left-[21px]" aria-hidden>
          <div className="w-full rounded bg-[linear-gradient(180deg,#E8B86D,#7fc8a9)] transition-[height] duration-700" style={{ height: `${pct}%` }} />
        </div>
        {stops.map((s, i) => (
          <DestinationCard key={s.id} s={s} trip={trip} next={stops.slice(i + 1).find((x) => x.status.s !== 'skipped')} />
        ))}
      </div>
      </>)}
    </Section>
  )
}

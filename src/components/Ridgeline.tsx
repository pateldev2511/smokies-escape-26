import { Moon, Mountain, Navigation, Sun, Thermometer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PLACES, WEATHER_POINTS, type PlaceId } from '../data/trip'
import { placeOf, useTrip, type Projected } from '../lib/engine'
import { getTripDate } from '../lib/time'
import { skyFor, sunAltitude, sunTimes } from '../lib/sun'
import { addMin, at, diffMin, fmt } from '../lib/time'
import { hourAt, useWeather, WMO } from '../lib/weather'
import { ExtLink, Reveal, Section } from './ui'

const T0 = at('03:30')
const T1 = at('26:30')
const SPAN = diffMin(T1, T0)
const W = 1000
const H = 280
const MAXFT = 7000

interface Pt { t: Date; ft: number; place: PlaceId; label?: string; stop?: Projected }

function profile(stops: Projected[], planId: string): Pt[] {
  const pts: Pt[] = []
  const act = stops.filter((s) => s.status.s !== 'skipped')
  act.forEach((s, i) => {
    const ft = placeOf(s).elevFt
    if (i === 0) return void pts.push({ t: s.pStart, ft, place: s.place, stop: s })
    const prev = act[i - 1]
    // Real topography en route: Kuwohi → Sugarlands and the night drive over the park both cross Newfound Gap (5,046 ft)
    if ((prev.place === 'kuwohi' && s.place === 'sugar') || (s.id === 'home' && planId !== 'C')) {
      const tGap = addMin(prev.pEnd, s.id === 'home' ? 50 : 26)
      pts.push({ t: tGap, ft: PLACES.ngap.elevFt, place: 'ngap', label: 'via Newfound Gap' })
    }
    pts.push({ t: s.arrive > s.pStart ? s.pStart : addMin(s.pStart, 0), ft, place: s.place, stop: s })
    if (s.id !== 'home') pts.push({ t: s.pEnd, ft, place: s.place, stop: s })
  })
  pts.sort((a, b) => a.t.getTime() - b.t.getTime())
  const last = pts.at(-1)!
  if (last.t < T1) pts.push({ t: T1, ft: last.ft, place: last.place })
  return pts
}

const x = (t: Date) => (diffMin(t, T0) / SPAN) * W
const y = (ft: number) => H - 24 - (ft / MAXFT) * (H - 60)

export function Ridgeline() {
  const { stops, plan } = useTrip()
  const { wx } = useWeather()
  const pts = useMemo(() => profile(stops, plan.id), [stops, plan.id])
  const defaultMin = (() => {
    const n = diffMin(new Date(), T0)
    return n > 0 && n < SPAN ? n : diffMin(at('09:50'), T0)
  })()
  const [m, setM] = useState(defaultMin)
  const t = addMin(T0, m)

  // interpolate
  let i = pts.findIndex((p) => p.t > t)
  if (i <= 0) i = i === 0 ? 1 : pts.length - 1
  const a = pts[i - 1], b = pts[i]
  const f = Math.min(1, Math.max(0, (t.getTime() - a.t.getTime()) / Math.max(1, b.t.getTime() - a.t.getTime())))
  const ft = Math.round(a.ft + (b.ft - a.ft) * f)
  const pa = a.stop ? placeOf(a.stop) : PLACES[a.place], pb = b.stop ? placeOf(b.stop) : PLACES[b.place]
  const lat = pa.lat + (pb.lat - pa.lat) * f, lng = pa.lng + (pb.lng - pa.lng) * f
  const alt = sunAltitude(t, lat, lng)
  const sky = skyFor(alt)
  const atStop = stops.find((s) => s.status.s !== 'skipped' && s.id !== 'depart' && s.id !== 'home' && t >= s.pStart && t <= s.pEnd)
  const nextStop = stops.find((s) => s.status.s !== 'skipped' && s.pStart > t)
  const where = atStop ? `At ${atStop.title}` : m >= SPAN - 1 || (stops.at(-1)!.pStart <= t) ? 'Home in Gainesville' : `Driving to ${nextStop?.title ?? 'home'}`
  const sun = useMemo(() => sunTimes(at('00:00'), PLACES.anak.lat, PLACES.anak.lng), [])

  // forecast at this hour at the nearest weather point
  const near = WEATHER_POINTS.map((w) => ({ w, d: Math.hypot(PLACES[w.place].lat - lat, PLACES[w.place].lng - lng) })).sort((p, q) => p.d - q.d)[0]
  const hr = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(t))
  const fx = near.d < 0.35 && wx && wx.forDate === getTripDate() ? hourAt(wx.points.find((p) => p.id === near.w.id), hr) : undefined

  const path = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.ft).toFixed(1)}`).join(' ')
  const area = `${path} L${x(pts.at(-1)!.t).toFixed(1)} ${H} L${x(pts[0].t).toFixed(1)} ${H} Z`
  const sunX = x(t), sunY = 30 + Math.max(0, 50 - alt * 1.6)
  const ticks = ['04:00', '08:00', '12:00', '16:00', '20:00', '24:00']

  return (
    <Section id="ridgeline" index="02" kicker="The Ridgeline" title={<>Your day, as the <span className="text-[var(--gold)]">mountain</span> sees it.</>} intro="Drag through Saturday. The profile is real elevation (1,247 → 6,643 ft); the sky follows the true sun position for where you’ll be. Forecast appears for each hour once it’s available.">
      <Reveal>
        <div className="overflow-hidden rounded-[30px] border border-[var(--line)] shadow-[var(--shadow)]">
          <div className="relative transition-[background] duration-500" style={{ background: `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 55%, ${sky[2]} 100%)` }}>
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-[220px] w-full sm:h-[300px]" preserveAspectRatio="none" role="img" aria-label={`Elevation profile. ${fmt(t)}: ${where}, about ${ft.toLocaleString()} feet.`}>
              <defs>
                <linearGradient id="rg" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#183E35" stopOpacity=".95" />
                  <stop offset="1" stopColor="#0b1915" />
                </linearGradient>
              </defs>
              {[2000, 4000, 6000].map((f) => (
                <g key={f}>
                  <line x1="0" x2={W} y1={y(f)} y2={y(f)} stroke="#F7F5EF" strokeOpacity=".12" strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />
                  <text x="6" y={y(f) - 4} fill="#F7F5EF" fillOpacity=".5" fontSize="11" fontFamily="JetBrains Mono, monospace">{f / 1000}k ft</text>
                </g>
              ))}
              {alt > -6 ? <circle cx={sunX} cy={sunY} r="16" fill="#F3D6A1" opacity={alt > 0 ? 0.95 : 0.5} /> : <circle cx={sunX} cy={34} r="10" fill="#F7F5EF" opacity=".75" />}
              <path d={area} fill="url(#rg)" />
              <path d={path} fill="none" stroke="#E8B86D" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              {stops.filter((s) => s.status.s !== 'skipped' && s.id !== 'depart' && s.id !== 'home').map((s) => (
                <g key={s.id}>
                  <circle cx={x(s.pStart)} cy={y(placeOf(s).elevFt)} r="5" fill="#10251F" stroke="#E8B86D" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </g>
              ))}
              <line x1={x(t)} x2={x(t)} y1="0" y2={H} stroke="#F7F5EF" strokeOpacity=".7" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              <circle cx={x(t)} cy={y(ft)} r="8" fill="#E8B86D" stroke="#10251F" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              {ticks.map((h) => (
                <text key={h} x={x(at(h))} y={H - 6} textAnchor="middle" fill="#F7F5EF" fillOpacity=".55" fontSize="11" fontFamily="JetBrains Mono, monospace">
                  {fmt(at(h)).replace(':00', '')}
                </text>
              ))}
            </svg>
          </div>
          <div className="bg-[var(--panel-solid)] p-4 sm:p-6">
            <input aria-label="Scrub through the day" type="range" className="scrub" min={0} max={SPAN} step={5} value={m} onChange={(e) => setM(+e.target.value)} />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Readout label="Time" value={fmt(t, true)} />
              <Readout label="Altitude" value={`${ft.toLocaleString()} ft`} icon={<Mountain size={13} />} />
              <Readout label="Sun" value={alt > 0 ? `${alt.toFixed(0)}° up` : alt > -6 ? 'Twilight' : 'Night'} icon={alt > 0 ? <Sun size={13} /> : <Moon size={13} />} />
              <Readout label="Forecast" value={fx ? `${Math.round(fx.temp)}°F · ${WMO[fx.code]?.[0] ?? ''}` : wx ? 'Not near a station' : 'Loading…'} icon={<Thermometer size={13} />} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="display text-xl sm:text-2xl">{where}</p>
              {(atStop ?? nextStop) && (
                <ExtLink href={(atStop ?? nextStop)!.navUrl} className="btn btn-gold btn-sm">
                  <Navigation size={15} /> Navigate
                </ExtLink>
              )}
            </div>
            {fx && fx.vis != null && fx.vis < 1600 && <p className="mt-2 text-sm text-[var(--gold)]">Visibility forecast {(fx.vis / 1609).toFixed(1)} mi — views may be fogged in.</p>}
            <p className="ink2 mono mt-3 text-[0.68rem]">
              Sunrise {sun.rise ? fmt(sun.rise) : '—'} · Sunset {sun.set ? fmt(sun.set) : '—'} (Gatlinburg, sea-level horizon — valleys go dark earlier). Profile simplified to straight lines between stops; times follow {plan.name.split(' — ')[0]} and your Trip Mode check-ins.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}

function Readout({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[var(--bg-2)] px-3 py-2.5">
      <div className="label flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mono mt-1.5 text-[0.95rem] font-semibold">{value}</div>
    </div>
  )
}

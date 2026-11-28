import { AlertTriangle, Moon, Navigation, Route, Sunrise, Sunset } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { FULL_ROUTE, ROAD_STATUS_URL, ROUTE_ALTERNATIVES, dir } from '../data/trip'
import { useTrip } from '../lib/engine'
import { useDoc } from '../lib/doc'
import { dur, fmt } from '../lib/time'
import { CAT } from './Timeline'
import { ExtLink, Note, Section } from './ui'

const RouteMap = lazy(() => import('./RouteMap'))

export function MapSection({ theme }: { theme: 'dark' | 'light' }) {
  const { stops, plan } = useTrip()
  const { corridor } = useDoc()
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  const [view, setView] = useState<'park' | 'town' | 'all'>('park')
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setShow(true), io.disconnect()), { rootMargin: '500px' })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  const active = stops.filter((s) => s.status.s !== 'skipped')
  return (
    <Section id="map" index="04" kicker="Route" title={<>Every pin, <span className="text-[var(--gold)]">one tap</span> from navigation.</>} intro={corridor ? "Gold dashed line = today’s detour as routed by OSRM (OpenStreetMap), not live traffic. Grey pins = skipped stops. Google Maps does live routing." : "Pins use verified coordinates (Wikidata, US Census geocoder, OpenStreetMap). No road line is drawn — Google Maps does live routing."}>
      <div className="no-print mb-3 inline-flex rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-1" role="tablist" aria-label="Map area">
        {([['park', 'Smokies'], ['town', 'Gatlinburg'], ['all', 'Whole trip']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`btn btn-sm ${view === k ? 'btn-gold' : '!bg-transparent'}`}>{l}</button>
        ))}
      </div>
      <div ref={ref} className="panel overflow-hidden p-1.5">
        {show ? (
          <Suspense fallback={<div className="skeleton h-[460px] sm:h-[600px]" />}>
            <RouteMap theme={theme} view={view} />
          </Suspense>
        ) : (
          <div className="skeleton h-[460px] sm:h-[600px]" />
        )}
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-4">
        {corridor && <ExtLink href={corridor.url} className="btn btn-gold !min-h-[56px] sm:col-span-4"><Route size={18} /> OPEN ALTERNATE ROUTE</ExtLink>}
        <ExtLink href={FULL_ROUTE.all} className={`btn ${corridor ? 'btn-ghost' : 'btn-gold'} sm:col-span-4`}><Route size={18} /> {corridor ? 'Original full route (mountain roads closed)' : 'OPEN FULL TRIP ROUTE'}</ExtLink>
        <ExtLink href={FULL_ROUTE.morning} className="btn btn-ghost"><Sunrise size={16} /> Morning segment</ExtLink>
        <ExtLink href={FULL_ROUTE.afternoon} className="btn btn-ghost"><Sunset size={16} /> Afternoon segment</ExtLink>
        <ExtLink href={FULL_ROUTE.home} className="btn btn-ghost"><Moon size={16} /> Return home</ExtLink>
        <ExtLink href={dir('Gainesville, GA', 'Gatlinburg, TN', ['Pigeon Forge, TN', 'Newport, TN', 'Asheville, NC'])} className="btn btn-ghost"><Route size={16} /> Home around the park</ExtLink>
      </div>
      <div className="mt-4">
        <Note>
          <AlertTriangle size={14} className="mr-1.5 inline" />
          Multi-stop links can hit waypoint limits on some phones — use the segments or the per-stop list below. Always verify roads, times and closures in Google Maps.{' '}
          <a className="font-semibold underline" href={ROAD_STATUS_URL} target="_blank" rel="noopener noreferrer">Park road closures</a>
        </Note>
      </div>

      <h3 className="display mt-10 text-2xl">Night drive home: pick the safe one</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {Object.values(ROUTE_ALTERNATIVES).map((r) => (
          <div key={r.label} className="panel p-4">
            <p className="label">{r.label}</p>
            <p className="mono mt-2 text-2xl font-semibold">{dur(r.min)} <span className="ink2 text-sm">· {r.mi} mi</span></p>
            <p className="ink2 mt-1 text-xs">OSRM estimate without stops or traffic. {r.min < 300 ? (plan.id === 'C' ? '⛔ Mountain road closed today — do not use unless officially reopened.' : 'Crosses Newfound Gap (5,046 ft) in the dark — only if the road is open and conditions are good.') : 'Interstate the whole way — longer, but no high mountain road at night.'}</p>
          </div>
        ))}
      </div>

      <h3 className="display mt-10 text-2xl">Stop-by-stop navigation</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {active.map((s) => {
          const I = CAT[s.category]
          return (
            <a key={s.id} href={s.navUrl} target="_blank" rel="noopener noreferrer" className="panel flex items-center gap-3 !rounded-2xl p-3 transition-colors hover:border-[var(--gold)]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sunset/15 text-[var(--gold)]"><I size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{String(s.n).padStart(2, '0')} · {s.title}</span>
                <span className="mono ink2 block text-xs">{fmt(s.pStart)}</span>
              </span>
              <Navigation size={16} className="gold shrink-0" />
            </a>
          )
        })}
      </div>
    </Section>
  )
}

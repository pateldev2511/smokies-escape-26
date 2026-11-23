import { AlertTriangle, CheckCircle2, Eye, RefreshCw, Snowflake, Sunrise, Sunset, Wind, WifiOff, ExternalLink, ShieldAlert } from 'lucide-react'
import { PLANS, ROAD_STATUS_URL, SAFETY, SKYPARK, WEATHER_POINTS } from '../data/trip'
import { usePlan, useTrip } from '../lib/engine'
import { fmt } from '../lib/time'
import { hourAt, useWeather, WMO } from '../lib/weather'
import { ExtLink, Note, Reveal, Section } from './ui'
import { SummitAlert } from './SummitAlert'

// Open-Meteo returns local wall time (timezone=America/New_York) — format the string directly
const hhmm = (iso?: string) => { if (!iso) return '—'; const h = +iso.slice(11, 13), m = iso.slice(14, 16); return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}` }

export function WeatherDashboard() {
  const { wx, err, busy, refresh } = useWeather()
  const pts = WEATHER_POINTS.map((w) => ({ w, p: wx?.points.find((x) => x.id === w.id) }))
  const k = pts.find((x) => x.w.id === 'kuwohi')
  const g = pts.find((x) => x.w.id === 'gat')
  const kH = hourAt(k?.p, 10), gH = hourAt(g?.p, 10)
  const delta = kH && gH ? Math.round(gH.temp - kH.temp) : null
  const stale = wx && Date.now() - wx.fetchedAt > 3 * 3600000

  return (
    <Section id="conditions" index="06" kicker="Weather & roads" title={<>The summit runs its <span className="text-[var(--gold)]">own weather.</span></>} intro="Forecasts are pulled for each stop’s real elevation (Open-Meteo). Road status is never guessed — check the National Park Service before you leave and again in Cherokee.">
      <Reveal>
        <a href={ROAD_STATUS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-gold w-full !min-h-[56px] text-base sm:w-auto">
          <ShieldAlert size={20} /> Check Road Conditions (NPS)
        </a>
      </Reveal>
      <SummitAlert className="mt-5" />
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {SAFETY.map((s) => (
          <Note key={s.text}>
            <AlertTriangle size={14} className="mr-1.5 inline" />
            {s.text} {s.url && <a className="font-semibold underline" href={s.url} target="_blank" rel="noopener noreferrer">Check</a>}
          </Note>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={busy}><RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> Refresh</button>
        {wx && <span className="mono ink2 text-xs">UPDATED {new Date(wx.fetchedAt).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} ET</span>}
        {stale && <span className="chip !text-[var(--gold)]"><WifiOff size={11} /> Cached — may be outdated</span>}
      </div>
      {wx?.fallback && <div className="mt-3"><Note tone="info">{wx.fallback}</Note></div>}
      {err && <div className="mt-3"><Note tone="bad">Couldn’t refresh ({err}). {wx ? 'Showing the last saved forecast with its timestamp.' : 'No forecast saved yet — use the official links.'}</Note></div>}

      {delta != null && delta > 5 && (
        <Reveal className="mt-5">
          <div className="panel flex items-center gap-4 p-5">
            <Snowflake size={34} className="gold shrink-0" />
            <p className="text-[0.95rem] leading-snug">
              At 10 AM, Kuwohi is forecast <strong className="gold">{delta}°F colder</strong> than Gatlinburg ({Math.round(kH!.temp)}°F, feels {Math.round(kH!.feels)}°F, wind {Math.round(kH!.wind)} mph). Gloves and a hat go in the day bag.
            </p>
          </div>
        </Reveal>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pts.map(({ w, p }, i) => {
          const h = hourAt(p, w.hour)
          return (
            <Reveal key={w.id} delay={i * 60}>
              <div className="panel h-full p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="display text-lg">{w.name}</h3>
                    <p className="mono ink2 text-[0.66rem]">{(p?.elevFt ?? 0).toLocaleString()} FT · AT {w.hour > 12 ? w.hour - 12 : w.hour} {w.hour >= 12 ? 'PM' : 'AM'}</p>
                  </div>
                  {h && <span className="text-3xl" aria-hidden>{WMO[h.code]?.[1]}</span>}
                </div>
                {!wx && !err ? (
                  <div className="mt-3 space-y-2"><div className="skeleton h-10" /><div className="skeleton h-12" /></div>
                ) : h ? (
                  <>
                    <p className="mono mt-3 text-4xl font-semibold">{Math.round(h.temp)}°<span className="ink2 text-base">F</span></p>
                    <p className="ink2 text-sm">{WMO[h.code]?.[0]} · feels {Math.round(h.feels)}°</p>
                    <dl className="mono mt-3 grid grid-cols-2 gap-1.5 text-[0.72rem]">
                      <div>☂ {h.pop ?? '–'}%</div>
                      <div><Wind size={11} className="mr-1 inline" />{Math.round(h.wind)}/{Math.round(h.gust)} mph</div>
                      <div><Eye size={11} className="mr-1 inline" />{h.vis != null ? `${(h.vis / 1609).toFixed(1)} mi` : '–'}</div>
                      <div>H/L {Math.round(p!.tmax ?? 0)}°/{Math.round(p!.tmin ?? 0)}°</div>
                      <div><Sunrise size={11} className="mr-1 inline" />{hhmm(p!.sunrise)}</div>
                      <div><Sunset size={11} className="mr-1 inline" />{hhmm(p!.sunset)}</div>
                    </dl>
                    <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
                      {p!.hours.filter((x) => { const hr = +x.time.slice(11, 13); return hr >= 6 && hr <= 22 && hr % 2 === 0 }).map((x) => (
                        <div key={x.time} className="min-w-[44px] rounded-lg bg-[var(--bg-2)] px-1.5 py-1.5 text-center text-[0.66rem]">
                          <div className="ink2">{+x.time.slice(11, 13) % 12 || 12}{+x.time.slice(11, 13) < 12 ? 'a' : 'p'}</div>
                          <div className="mono font-semibold">{Math.round(x.temp)}°</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="ink2 mt-3 text-sm">No data.</p>
                )}
              </div>
            </Reveal>
          )
        })}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <ExtLink href="https://www.weather.gov/"><ExternalLink size={14} /> National Weather Service</ExtLink>
        <ExtLink href="https://www.nps.gov/grsm/planyourvisit/seasonalroads.htm"><ExternalLink size={14} /> Seasonal roads</ExtLink>
        <ExtLink href={ROAD_STATUS_URL}><ExternalLink size={14} /> Temporary closures</ExtLink>
      </div>
      <p className="ink2 mono mt-3 text-[0.62rem]">FORECAST © OPEN-METEO.COM (CC BY 4.0) · FOR PLANNING ONLY — NOT A ROAD-STATUS SOURCE</p>
    </Section>
  )
}

export function AlternatePlanSelector() {
  const [planId, setPlan] = usePlan()
  const { plan, stops, homeArrival } = useTrip()
  return (
    <Section id="plans" index="07" kicker="Backup plans" title={<>When the mountain <span className="text-[var(--gold)]">says no.</span></>} intro="Switching recalculates the timeline, map, Ridgeline and Co-Pilot for everyone you sync with. Reservations are never changed.">
      <div className="grid gap-3 md:grid-cols-3" role="radiogroup">
        {PLANS.map((p) => (
          <button key={p.id} role="radio" aria-checked={p.id === planId} onClick={() => setPlan(p.id)} className={`panel p-5 text-left transition-colors ${p.id === planId ? '!border-[var(--gold)] ring-1 ring-[var(--gold)]' : 'hover:border-[var(--line-strong)]'}`}>
            <div className="flex items-center justify-between">
              <span className="mono text-sm gold">PLAN {p.id}</span>
              {p.id === planId && <CheckCircle2 size={20} className="gold" />}
            </div>
            <p className="display mt-2 text-xl leading-tight">{p.name.split(' — ')[1]}</p>
            <p className="ink2 mt-2 text-sm leading-relaxed">{p.short}</p>
          </button>
        ))}
      </div>
      <Reveal className="mt-5">
        <div className="panel p-5 sm:p-6">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="md:col-span-1">
              <p className="label">Proposed day</p>
              <ol className="mt-3 space-y-1.5">
                {stops.map((s) => (
                  <li key={s.id} className={`flex gap-3 text-sm ${s.status.s === 'skipped' ? 'ink2 line-through' : ''}`}>
                    <span className="mono gold w-16 shrink-0">{s.status.s === 'skipped' ? 'skip' : fmt(s.pStart)}</span>
                    {s.title}
                  </li>
                ))}
              </ol>
              {homeArrival && <p className="mono mt-3 text-xs">HOME ≈ {fmt(homeArrival, true)} (before stops)</p>}
            </div>
            <div>
              <p className="label">What changes</p>
              <ul className="mt-3 space-y-1.5 text-sm">{plan.notes.map((n) => <li key={n}>› {n}</li>)}</ul>
              {plan.id === 'C' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ExtLink href={SKYPARK.tickets}>SkyPark tickets</ExtLink>
                  <ExtLink href={SKYPARK.maps}>SkyPark on Maps</ExtLink>
                </div>
              )}
            </div>
            <div>
              <p className="label">Reservations</p>
              <ul className="mt-3 space-y-1.5 text-sm">{plan.keeps.map((n) => <li key={n} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />{n}</li>)}</ul>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}

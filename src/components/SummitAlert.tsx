import { Snowflake } from 'lucide-react'
import { ROAD_STATUS_URL } from '../data/trip'
import { usePlan } from '../lib/engine'
import { summitRisk, useWeather } from '../lib/weather'

/** Appears only when the live forecast shows snow/ice up high during the plan. */
export function SummitAlert({ className = '' }: { className?: string }) {
  const { wx } = useWeather()
  const [plan, setPlan] = usePlan()
  const r = summitRisk(wx)
  if (!r) return null
  return (
    <div className={`rounded-2xl border border-sky-300/40 bg-sky-400/10 p-4 text-sm leading-relaxed ${className}`} role="alert">
      <p className="flex items-center gap-2 font-semibold"><Snowflake size={16} className="text-sky-300" /> Forecast: {r.label.toLowerCase()} at {r.where}, {r.temp}°F around {r.hour}</p>
      <p className="ink2 mt-1">Snow or ice is what closes Kuwohi Road and Newfound Gap Road. This is a forecast, not a closure — check the NPS before leaving and again in Cherokee.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a className="btn btn-gold btn-sm" href={ROAD_STATUS_URL} target="_blank" rel="noopener noreferrer">Road status</a>
        {plan === 'A' && <button className="btn btn-ghost btn-sm" onClick={() => setPlan('B')}>Preview Plan B (Kuwohi closed)</button>}
        {plan !== 'A' && <button className="btn btn-ghost btn-sm" onClick={() => setPlan('A')}>Back to Plan A</button>}
      </div>
    </div>
  )
}

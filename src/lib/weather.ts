import { useCallback, useEffect, useState } from 'react'
import { PLACES, TZ, WEATHER_POINTS } from '../data/trip'
import { getTripDate } from './time'

export interface Hour { time: string; temp: number; feels: number; pop: number | null; code: number; wind: number; gust: number; vis: number | null }
export interface PointWx { id: string; name: string; elevFt: number; hours: Hour[]; sunrise?: string; sunset?: string; tmax?: number; tmin?: number }
export interface Wx { points: PointWx[]; fetchedAt: number; forDate: string; fallback?: string }

const CACHE = 'smk:wx'
export const WMO: Record<number, [string, string]> = {
  0: ['Clear', '☀️'], 1: ['Mostly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'], 45: ['Fog', '🌫️'], 48: ['Freezing fog', '🌫️'],
  51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'], 56: ['Freezing drizzle', '🧊'], 57: ['Freezing drizzle', '🧊'],
  61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'], 66: ['Freezing rain', '🧊'], 67: ['Freezing rain', '🧊'],
  71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'], 77: ['Snow grains', '🌨️'], 80: ['Showers', '🌦️'], 81: ['Showers', '🌧️'], 82: ['Violent showers', '⛈️'],
  85: ['Snow showers', '🌨️'], 86: ['Snow showers', '❄️'], 95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm + hail', '⛈️'], 99: ['Thunderstorm + hail', '⛈️'],
}

async function fetchWx(): Promise<Wx> {
  const pts = WEATHER_POINTS.map((w) => ({ ...w, p: PLACES[w.place] }))
  const q = new URLSearchParams({
    latitude: pts.map((x) => x.p.lat).join(','),
    longitude: pts.map((x) => x.p.lng).join(','),
    elevation: pts.map((x) => (x.p.elevFt / 3.28084).toFixed(0)).join(','),
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m,visibility',
    daily: 'sunrise,sunset,temperature_2m_max,temperature_2m_min',
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', timezone: TZ,
  })
  let fallback: string | undefined
  let r = await fetch(`https://api.open-meteo.com/v1/forecast?${q}&start_date=${getTripDate()}&end_date=${getTripDate()}`)
  let forDate = getTripDate()
  if (!r.ok) {
    fallback = 'The trip day is outside the forecast window — showing today.'
    r = await fetch(`https://api.open-meteo.com/v1/forecast?${q}&forecast_days=1`)
    forDate = new Date().toISOString().slice(0, 10)
  }
  if (!r.ok) throw new Error(`Forecast service error ${r.status}`)
  const j = await r.json()
  const arr = Array.isArray(j) ? j : [j]
  return {
    fetchedAt: Date.now(), forDate, fallback,
    points: pts.map((x, i) => {
      const h = arr[i].hourly, d = arr[i].daily
      return {
        id: x.id, name: x.name, elevFt: x.p.elevFt,
        hours: h.time.map((t: string, k: number) => ({ time: t, temp: h.temperature_2m[k], feels: h.apparent_temperature[k], pop: h.precipitation_probability?.[k] ?? null, code: h.weather_code[k], wind: h.wind_speed_10m[k], gust: h.wind_gusts_10m[k], vis: h.visibility?.[k] ?? null })),
        sunrise: d.sunrise?.[0], sunset: d.sunset?.[0], tmax: d.temperature_2m_max?.[0], tmin: d.temperature_2m_min?.[0],
      }
    }),
  }
}

/** Live forecast with offline cache (clearly time-stamped when stale). */
export function useWeather() {
  const [wx, setWx] = useState<Wx | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHE) || 'null')
    } catch {
      return null
    }
  })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const refresh = useCallback(() => {
    setBusy(true)
    setErr(null)
    fetchWx()
      .then((w) => {
        setWx(w)
        try {
          localStorage.setItem(CACHE, JSON.stringify(w))
        } catch {
          /* ignore */
        }
      })
      .catch((e) => setErr(navigator.onLine ? String(e.message ?? e) : 'You’re offline'))
      .finally(() => setBusy(false))
  }, [])
  useEffect(() => {
    if (!wx || wx.forDate !== getTripDate() || Date.now() - wx.fetchedAt > 20 * 60000) refresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return { wx, err, busy, refresh }
}

export function hourAt(p: PointWx | undefined, hour: number): Hour | undefined {
  return p?.hours.find((h) => +h.time.slice(11, 13) === hour)
}

const ICY = new Set([48, 56, 57, 66, 67, 71, 73, 75, 77, 85, 86])
/** Real-forecast check for snow / ice / freezing conditions at the high stops during the planned window. */
export function summitRisk(wx: Wx | null): { where: string; hour: string; temp: number; label: string } | null {
  if (!wx || wx.forDate !== getTripDate()) return null
  for (const id of ['kuwohi', 'ngap']) {
    const p = wx.points.find((x) => x.id === id)
    const h = p?.hours.find((x) => { const hr = +x.time.slice(11, 13); return hr >= 8 && hr <= 11 && (ICY.has(x.code) || (x.temp <= 32 && (x.pop ?? 0) >= 40)) })
    if (p && h) {
      const hr = +h.time.slice(11, 13)
      return { where: p.name, hour: `${hr % 12 || 12} ${hr < 12 ? 'AM' : 'PM'}`, temp: Math.round(h.temp), label: WMO[h.code]?.[0] ?? 'Freezing' }
    }
  }
  return null
}

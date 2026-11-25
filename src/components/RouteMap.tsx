import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { IMAGES } from '../data/images'
import { PLACES } from '../data/trip'
import { useDoc } from '../lib/doc'
import { placeOf, useTrip } from '../lib/engine'
import { fmt } from '../lib/time'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const BASE = import.meta.env.BASE_URL

export default function RouteMap({ theme, view }: { theme: 'dark' | 'light'; view: 'park' | 'town' | 'all' }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const tiles = useRef<L.TileLayer | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const { stops } = useTrip()
  const { rental } = useDoc()

  useEffect(() => {
    if (!el.current || map.current) return
    map.current = L.map(el.current, { scrollWheelZoom: false, zoomSnap: 0.5 })
    layer.current = L.layerGroup().addTo(map.current)
    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    if (!map.current) return
    tiles.current?.remove()
    tiles.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: theme === 'dark' ? 'tiles-dark' : '',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current)
  }, [theme])

  useEffect(() => {
    if (!map.current || !layer.current) return
    layer.current.clearLayers()
    const placed = new Set<string>()
    const all: L.LatLngExpression[] = []
    stops.forEach((s) => {
      const p = placeOf(s)
      const k = `${p.lat},${p.lng}`
      if (placed.has(k)) return
      placed.add(k)
      const cls = s.status.s === 'skipped' ? 'skip' : s.status.s === 'done' ? 'done' : ''
      const label = s.place === 'gnv' ? 'GA' : String(s.n)
      const icon = L.divIcon({ className: '', html: `<div class="mk ${cls}"><span>${label}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18] })
      const img = s.image && IMAGES[s.image] ? `<img src="${BASE}img/${IMAGES[s.image]!.file}-800.webp" alt="" style="width:100%;height:110px;object-fit:cover" loading="lazy">` : ''
      const b = s.booking
      const title = s.place === 'gnv' ? 'Gainesville, GA — start & finish' : s.title
      const time = s.place === 'gnv' ? `Depart ${fmt(s.plannedStart)} · back ~1–2 AM` : `${fmt(s.pStart)} – ${fmt(s.pEnd)}`
      const html = `${img}<div style="padding:12px 14px">
        <div style="font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.14em;color:var(--gold)">${esc(s.category.toUpperCase())} · ${p.elevFt.toLocaleString()} FT${s.status.s === 'skipped' ? ' · SKIPPED' : ''}</div>
        <div style="font:800 15px/1.2 'Plus Jakarta Sans';margin:5px 0 2px">${esc(title)}</div>
        <div style="font:600 12px 'JetBrains Mono',monospace;color:var(--ink-2)">${esc(time)}</div>
        <div style="margin:6px 0 10px;color:var(--ink-2)">${esc(s.kicker)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <a class="btn btn-gold btn-sm" target="_blank" rel="noopener" href="${esc(s.navUrl)}">Navigate</a>
          <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${esc(s.mapsUrl)}">Google Maps</a>
          ${b ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${esc(b.url)}">Book Now</a>` : ''}
        </div></div>`
      L.marker([p.lat, p.lng], { icon, title, alt: title, keyboard: true }).bindPopup(html, { maxWidth: 240, minWidth: 240 }).addTo(layer.current!)
      all.push([p.lat, p.lng])
    })
    // Rental pickup / return pins — only once the organizer has entered (and geocoded) real addresses
    ;[['P', 'Rental pickup · Fri 6:00 PM', rental.pickupGeo, rental.pickupAddress], ['R', `Rental return · by ${rental.returnBy.slice(11)} Sun`, rental.returnGeo, rental.returnAddress]].forEach(([lbl, title, g, addr]) => {
      const geo = g as typeof rental.pickupGeo
      if (!geo) return
      const icon = L.divIcon({ className: '', html: `<div class="mk" style="background:#9DB4E0"><span>${lbl}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18] })
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(String(addr))}&travelmode=driving`
      L.marker([geo.lat, geo.lng], { icon, title: String(title) }).bindPopup(`<div style="padding:12px 14px"><div style="font:800 15px 'Plus Jakarta Sans'">${esc(String(title))}</div><div style="color:var(--ink-2);margin:4px 0 10px">${esc(String(addr))}</div><a class="btn btn-gold btn-sm" target="_blank" rel="noopener" href="${esc(url)}">Navigate</a></div>`, { maxWidth: 240, minWidth: 240 }).addTo(layer.current!)
      all.push([geo.lat, geo.lng])
    })
    const park: L.LatLngExpression[] = [[PLACES.ocon.lat, PLACES.ocon.lng], [PLACES.kuwohi.lat, PLACES.kuwohi.lng], [PLACES.grill.lat, PLACES.grill.lng], [PLACES.coaster.lat, PLACES.coaster.lng]]
    const town: L.LatLngExpression[] = [[PLACES.grill.lat, PLACES.grill.lng], [PLACES.coaster.lat, PLACES.coaster.lng], [PLACES.anak.lat, PLACES.anak.lng], [PLACES.sugar.lat, PLACES.sugar.lng]]
    map.current.fitBounds(L.latLngBounds(view === 'all' ? all : view === 'town' ? town : park), { padding: [30, 30] })
  }, [stops, view, rental])

  return <div ref={el} className="h-[460px] w-full sm:h-[600px]" role="region" aria-label="Interactive trip map" />
}

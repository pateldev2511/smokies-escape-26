import {
  BookOpenCheck, CalendarPlus, CloudSun, Copy, FileDown, GitFork, Home, LayoutGrid, Map, MessageCircle, Moon, Mountain, Printer, Route, Share2,
  Stamp, Sun, Ticket, Users, Wallet, X, Compass, Check,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { IMAGES } from '../data/images'
import { SHARE_MESSAGE, SITE_URL } from '../data/trip'
import { useTrip, type Projected } from '../lib/engine'
import { download } from '../lib/store'
import { Reveal, Section } from './ui'

// ── Calendar ────────────────────────────────────────────────────────────────
const ics = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n')
function buildIcs(stops: Projected[]) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Smokies Escape 26//EN', 'X-WR-CALNAME:Smokies Escape ’26']
  stops.filter((s) => s.status.s !== 'skipped').forEach((s) => {
    const end = s.id === 'home' ? s.pStart : s.pEnd > s.pStart ? s.pEnd : new Date(s.pStart.getTime() + 30 * 60000)
    const start = s.id === 'home' ? new Date(s.pStart.getTime() - s.driveIn * 60000) : s.id === 'depart' ? s.pStart : s.plannedStart
    L.push('BEGIN:VEVENT', `UID:${s.id}-20261127@smokies-escape-26`, `DTSTAMP:${ics(new Date())}`, `DTSTART:${ics(start)}`, `DTEND:${ics(end)}`, `SUMMARY:${esc(s.title)}`, `LOCATION:${esc(s.address ?? s.title)}`, `DESCRIPTION:${esc(`${s.kicker}\nNavigate: ${s.navUrl}\nPlanning target — verify on the day.`)}`, 'END:VEVENT')
  })
  L.push('END:VCALENDAR')
  return L.join('\r\n')
}

export function ShareTrip() {
  const { stops } = useTrip()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard?.writeText(SITE_URL).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  const items = [
    { i: copied ? <Check size={20} /> : <Copy size={20} />, l: copied ? 'Copied!' : 'Copy Website Link', on: copy },
    { i: <MessageCircle size={20} />, l: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}` },
    ...('share' in navigator ? [{ i: <Share2 size={20} />, l: 'Share…', on: () => navigator.share({ title: 'Smokies Escape ’26', text: 'Our Smokies trip plan', url: SITE_URL }).catch(() => {}) }] : []),
    { i: <Printer size={20} />, l: 'Print itinerary', on: () => window.print() },
    { i: <FileDown size={20} />, l: 'Download PDF', on: () => window.print(), hint: 'Choose “Save as PDF”' },
    { i: <CalendarPlus size={20} />, l: 'Add to Calendar', on: () => download('smokies-escape-26.ics', buildIcs(stops), 'text/calendar') },
  ]
  return (
    <Section id="share" index="12" kicker="Share" title={<>Send it to <span className="text-[var(--gold)]">the group chat.</span></>} intro="Every stop card also has its own share button for sending a single destination.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {items.map((a) => {
              const inner = (<><span className="gold">{a.i}</span><span className="text-sm font-semibold">{a.l}</span>{'hint' in a && <span className="ink2 text-[0.68rem]">{a.hint}</span>}</>)
              const cls = 'panel flex min-h-[100px] flex-col items-start gap-2 !rounded-2xl p-4 text-left transition-colors hover:border-[var(--gold)]'
              return 'href' in a && a.href ? <a key={a.l} href={a.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a> : <button key={a.l} onClick={'on' in a ? a.on : undefined} className={cls}>{inner}</button>
            })}
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="panel p-5">
            <p className="label">WhatsApp message</p>
            <pre className="mt-3 font-sans text-sm leading-relaxed whitespace-pre-wrap">{SHARE_MESSAGE}</pre>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}

// ── Navigation ──────────────────────────────────────────────────────────────
export function TopBar({ theme, setTheme, onCoPilot }: { theme: 'dark' | 'light'; setTheme: (t: 'dark' | 'light') => void; onCoPilot: () => void }) {
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const f = () => setSolid(scrollY > 40)
    f()
    addEventListener('scroll', f, { passive: true })
    return () => removeEventListener('scroll', f)
  }, [])
  return (
    <div className={`no-print fixed inset-x-0 top-0 z-40 transition-colors ${solid ? 'glass !border-x-0 !border-t-0' : 'text-cream'}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <a href="#home" className="flex items-center gap-2">
          <Mountain size={20} className="text-sunset" />
          <span className="display text-[0.95rem]">SMOKIES <span className="text-sunset">’26</span></span>
        </a>
        <nav className="hidden items-center gap-0.5 text-sm lg:flex" aria-label="Sections">
          {[['#ridgeline', 'Ridgeline'], ['#timeline', 'Itinerary'], ['#map', 'Map'], ['#tickets', 'Tickets'], ['#conditions', 'Weather'], ['#budget', 'Budget'], ['#passport', 'Passport']].map(([h, l]) => (
            <a key={h} href={h} className="rounded-xl px-3 py-2 opacity-75 hover:opacity-100">{l}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={onCoPilot} className="btn btn-gold btn-sm"><Compass size={16} /> Co-Pilot</button>
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-current/25" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </div>
  )
}

const MORE = [
  { href: '#ridgeline', l: 'Ridgeline', i: Mountain },
  { href: '#conditions', l: 'Weather & Roads', i: CloudSun },
  { href: '#plans', l: 'Backup Plans', i: GitFork },
  { href: '#budget', l: 'Budget', i: Wallet },
  { href: '#packing', l: 'Checklist', i: BookOpenCheck },
  { href: '#crew', l: 'Crew & Sync', i: Users },
  { href: '#passport', l: 'Passport', i: Stamp },
  { href: '#share', l: 'Share & PDF', i: Share2 },
]

export function BottomNav() {
  const [active, setActive] = useState('#home')
  const [more, setMore] = useState(false)
  useEffect(() => {
    const ids = ['home', 'experiences', 'ridgeline', 'timeline', 'map', 'tickets', 'conditions', 'plans', 'budget', 'packing', 'crew', 'passport', 'share']
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive('#' + e.target.id)), { rootMargin: '-45% 0px -50% 0px' })
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])
  const tabs = [
    { href: '#home', l: 'Home', i: Home, match: ['#home', '#experiences'] },
    { href: '#timeline', l: 'Timeline', i: Route, match: ['#timeline'] },
    { href: '#map', l: 'Map', i: Map, match: ['#map'] },
    { href: '#tickets', l: 'Tickets', i: Ticket, match: ['#tickets'] },
  ]
  const isMore = !tabs.some((t) => t.match.includes(active))
  return (
    <>
      <nav aria-label="Main" className="no-print fixed inset-x-3 z-50 md:hidden" style={{ bottom: 'calc(10px + env(safe-area-inset-bottom))' }}>
        <div className="glass mx-auto flex max-w-md rounded-[24px] p-1.5 shadow-[var(--shadow)]">
          {tabs.map(({ href, l, i: I, match }) => {
            const on = match.includes(active)
            return (
              <a key={href} href={href} aria-current={on ? 'true' : undefined} className={`flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-[18px] text-[0.64rem] font-semibold ${on ? 'bg-[var(--gold)] text-[var(--gold-ink)]' : 'ink2'}`}>
                <I size={20} />{l}
              </a>
            )
          })}
          <button onClick={() => setMore(true)} aria-haspopup="dialog" className={`flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-[18px] text-[0.64rem] font-semibold ${isMore ? 'bg-[var(--gold)] text-[var(--gold-ink)]' : 'ink2'}`}>
            <LayoutGrid size={20} />More
          </button>
        </div>
      </nav>
      {more && (
        <div className="no-print fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="More sections">
          <button className="absolute inset-0 bg-black/50" aria-label="Close" onClick={() => setMore(false)} />
          <div className="glass absolute inset-x-3 rounded-[28px] p-4" style={{ bottom: 'calc(10px + env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between px-1 pb-3">
              <span className="label">Everything else</span>
              <button className="btn btn-ghost btn-sm !px-2.5" aria-label="Close" onClick={() => setMore(false)}><X size={16} /></button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MORE.map(({ href, l, i: I }) => (
                <a key={href} href={href} onClick={() => setMore(false)} className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl bg-[var(--bg-2)] text-center text-[0.66rem] font-semibold">
                  <I size={22} className="gold" />{l}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] px-4 pt-12 pb-40 sm:px-6 md:pb-12">
      <div className="mx-auto max-w-6xl">
        <p className="display text-3xl">SMOKIES <span className="gold">’26</span></p>
        <p className="ink2 mt-1">One Day. Four Friends. Endless Views.</p>
        <p className="ink2 mt-5 max-w-2xl text-xs leading-relaxed">
          Every time is a planning target. Bookings are only “Booked” when one of you says so. Road status, prices and forecasts come from the official sources linked — never invented. Drive estimates: OSRM / OpenStreetMap without traffic. Works offline once loaded; your data stays on your phones unless you sync it.
        </p>
        <details className="mt-6 text-xs">
          <summary className="cursor-pointer font-semibold">Photo credits & licences</summary>
          <ul className="ink2 mt-3 space-y-1.5">
            {Object.entries(IMAGES).map(([k, v]) => (
              <li key={k}>
                <a className="underline" href={v!.credit.page} target="_blank" rel="noopener noreferrer">{v!.credit.title}</a> — {v!.credit.artist || 'Unknown'} · {v!.credit.licenseUrl ? <a className="underline" href={v!.credit.licenseUrl} target="_blank" rel="noopener noreferrer">{v!.credit.license}</a> : v!.credit.license} · Wikimedia Commons, resized
              </li>
            ))}
            <li>Map © OpenStreetMap contributors · Weather & elevation © Open-Meteo (CC BY 4.0) · Topographic texture generated for this site.</li>
          </ul>
        </details>
        <p className="ink2 mt-6 text-[0.7rem]">Not affiliated with the National Park Service, Anakeesta, Moonshine Mountain Coaster or The Park Grill.</p>
      </div>
    </footer>
  )
}

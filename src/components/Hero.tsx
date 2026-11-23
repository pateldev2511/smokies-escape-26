import { ArrowDown, Map, Route, Share2, Ticket } from 'lucide-react'
import { STOPS } from '../data/trip'
import { at, fmt } from '../lib/time'
import { Photo, Reveal, useNow } from './ui'

const DEPART = at(STOPS[0].start)

export function TripCountdown() {
  const now = useNow(1000)
  const ms = DEPART.getTime() - now
  if (ms <= 0) {
    const end = at('26:30')
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-black/40 px-4 py-3 text-sm font-semibold backdrop-blur">
        <span className="h-2 w-2 animate-pulse rounded-full bg-sunset" />
        {now < end.getTime() ? 'Trip day — open Co-Pilot ↗' : 'Trip complete. Open your Passport.'}
      </div>
    )
  }
  const s = Math.floor(ms / 1000)
  const parts: [number, string][] = [[Math.floor(s / 86400), 'DAYS'], [Math.floor((s % 86400) / 3600), 'HRS'], [Math.floor((s % 3600) / 60), 'MIN'], [s % 60, 'SEC']]
  return (
    <div role="timer" aria-label="Countdown to departure">
      <div className="flex items-stretch gap-1.5 sm:gap-2">
        {parts.map(([v, l], i) => (
          <div key={l} className="flex items-stretch gap-1.5 sm:gap-2">
            <div className="min-w-[4.1rem] rounded-2xl border border-white/20 bg-black/40 px-2 py-2.5 text-center backdrop-blur sm:min-w-[5rem]">
              <div className="mono text-[1.75rem] leading-none font-semibold tabular-nums sm:text-4xl">{String(v).padStart(2, '0')}</div>
              <div className="label mt-1.5 !text-[0.56rem] !text-cream/60">{l}</div>
            </div>
            {i < 3 && <span className="mono self-center text-cream/40">:</span>}
          </div>
        ))}
      </div>
      <p className="mono mt-2 text-[0.68rem] tracking-wider text-cream/60">T-MINUS TO WHEELS-UP · FRI NOV 27 · {fmt(DEPART)} ET</p>
    </div>
  )
}

const STATS: [string, string][] = [['4', 'Travelers'], ['1', 'Car'], ['2', 'Drivers'], ['8', 'Main stops']]

export function HeroSection() {
  return (
    <header id="home" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden text-cream">
      <Photo k="hero" eager sizes="100vw" alt="Layered blue ridgelines of the Great Smoky Mountains at sunrise from the Oconaluftee Valley Overlook" className="absolute inset-0 -z-20 scale-105" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(13_30_25/.35)_0%,rgb(13_30_25/.05)_30%,rgb(13_30_25/.7)_68%,var(--bg)_100%)]" />
      {/* Altitude ruler */}
      <div className="no-print absolute top-28 right-4 bottom-40 hidden w-10 flex-col justify-between sm:flex" aria-hidden>
        {[6643, 5000, 4000, 3000, 2000, 1247].map((f) => (
          <div key={f} className="flex items-center gap-1.5">
            <span className="h-px w-3 bg-cream/40" />
            <span className="mono text-[0.6rem] text-cream/50">{f.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-4 pt-24 pb-8 sm:px-6 sm:pb-14">
        <p className="rise mono text-[0.72rem] tracking-[0.2em] text-sunset" style={{ animationDelay: '.1s' }}>
          35.5628° N · 83.4986° W · 6,643 FT — FRIDAY, NOVEMBER 27, 2026
        </p>
        <h1 className="rise display mt-3 text-[3.6rem] leading-[0.86] sm:text-8xl lg:text-[9.5rem]" style={{ animationDelay: '.2s' }}>
          SMOKIES
          <br />
          ESCAPE <span className="text-sunset">’26</span>
        </h1>
        <p className="rise mt-4 text-xl font-medium text-cream/90 sm:text-2xl" style={{ animationDelay: '.35s' }}>
          One Day. Four Friends. Endless Views.
        </p>
        <p className="rise mono mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-cream/75" style={{ animationDelay: '.45s' }}>
          GAINESVILLE <span className="text-sunset">→</span> SMOKY MOUNTAINS <span className="text-sunset">→</span> GATLINBURG <span className="text-sunset">→</span> GAINESVILLE
        </p>

        <div className="rise mt-6 grid grid-cols-4 gap-2 sm:max-w-xl" style={{ animationDelay: '.55s' }}>
          {STATS.map(([v, l]) => (
            <div key={l} className="rounded-2xl border border-white/20 bg-black/40 px-3 py-2.5 backdrop-blur">
              <div className="display text-2xl sm:text-3xl">{v}</div>
              <div className="text-[0.68rem] leading-tight text-cream/70">{l}</div>
            </div>
          ))}
        </div>

        <div className="rise mt-6" style={{ animationDelay: '.65s' }}>
          <TripCountdown />
        </div>

        <nav className="rise no-print mt-7 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" style={{ animationDelay: '.75s' }} aria-label="Primary">
          <a href="#timeline" className="btn btn-gold">
            <Route size={18} /> Explore Itinerary
          </a>
          <a href="#map" className="btn !border-white/25 !bg-black/35 !text-cream backdrop-blur">
            <Map size={18} /> View Route
          </a>
          <a href="#tickets" className="btn !border-white/25 !bg-black/35 !text-cream backdrop-blur">
            <Ticket size={18} /> Book Activities
          </a>
          <a href="#share" className="btn !border-white/25 !bg-black/35 !text-cream backdrop-blur">
            <Share2 size={18} /> Share Trip
          </a>
        </nav>
      </div>

      <div className="no-print relative mb-24 overflow-hidden sm:mb-6" aria-label="Destination preview">
        <div className="drift flex w-max gap-2.5 px-4">
          {(['ocon', 'ngap', 'kuwohi', 'kview', 'cataract', 'anak', 'night', 'road'] as const).concat(['ocon', 'ngap', 'kuwohi', 'kview', 'cataract', 'anak', 'night', 'road'] as const).map((k, i) => (
            <Photo key={i} k={k} alt="" sizes="160px" className="h-20 w-32 shrink-0 rounded-xl sm:h-24 sm:w-40" />
          ))}
        </div>
      </div>
      <a href="#experiences" aria-label="Scroll" className="no-print absolute bottom-28 left-1/2 hidden -translate-x-1/2 animate-bounce sm:block">
        <ArrowDown size={20} />
      </a>
    </header>
  )
}

const EXPERIENCES = [
  { k: 'kview' as const, n: '01', title: 'Scenic Smoky Mountains', text: 'Oconaluftee meadows, the Newfound Gap state line and the 6,643-ft summit of Kuwohi — then a forest walk to Cataract Falls.', href: '#stop-ngap', meta: '7:45 AM – 12:30 PM · +5,396 ft' },
  { k: 'anak' as const, n: '02', title: 'Anakeesta Adventure', text: 'Ride above Gatlinburg to a mountaintop village of skywalks, viewpoints and holiday lights — timed for sunset.', href: '#stop-anakeesta', meta: '2:30 – 6:15 PM · timed entry' },
  { k: 'night' as const, n: '03', title: 'Gatlinburg After Dark', text: 'A moonshine-themed mountain coaster in the dark, then steaks at a rustic lodge before the long drive home.', href: '#stop-coaster', meta: '6:15 – 8:30 PM' },
]

export function Experiences() {
  return (
    <section id="experiences" className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
      <Reveal>
        <h2 className="display text-[2.1rem] leading-[1] sm:text-6xl">
          Three Experiences.
          <br />
          <span className="text-[var(--gold)]">One Incredible Day.</span>
        </h2>
      </Reveal>
      <div className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-4">
        {EXPERIENCES.map((e, i) => (
          <Reveal key={e.n} delay={i * 90}>
            <a href={e.href} className="group relative block h-[340px] overflow-hidden rounded-[28px] text-cream sm:h-[440px]">
              <Photo k={e.k} alt={e.title} sizes="(min-width:640px) 33vw, 100vw" className="absolute inset-0 transition-transform duration-[1.2s] group-hover:scale-105" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,rgb(13_30_25/.92)_100%)]" />
              <span className="mono absolute top-4 left-5 text-sm text-sunset">{e.n}</span>
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="mono text-[0.66rem] tracking-wider text-cream/70">{e.meta}</p>
                <h3 className="display mt-1.5 text-[1.7rem] leading-tight">{e.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/80">{e.text}</p>
              </div>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

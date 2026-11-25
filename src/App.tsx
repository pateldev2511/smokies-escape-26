import { Download, Smartphone } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { BookingDashboard } from './components/Bookings'
import { BudgetCalculator } from './components/Budget'
import { PackingChecklist } from './components/Checklist'
import { AlternatePlanSelector, WeatherDashboard } from './components/Conditions'
import { CoPilot } from './components/CoPilot'
import { GroupDashboard } from './components/Crew'
import { Experiences, HeroSection } from './components/Hero'
import { MapSection } from './components/MapSection'
import { Passport } from './components/Passport'
import { Ridgeline } from './components/Ridgeline'
import { BottomNav, Footer, ShareTrip, TopBar } from './components/Shell'
import { InteractiveTimeline } from './components/Timeline'
import { DocProvider, usePublished, useDocMeta } from './lib/doc'
import { useLocal } from './lib/store'

interface BIPEvent extends Event { prompt: () => Promise<void> }

function InstallCard() {
  const [evt, setEvt] = useState<BIPEvent | null>(null)
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
  useEffect(() => {
    const f = (e: Event) => (e.preventDefault(), setEvt(e as BIPEvent))
    addEventListener('beforeinstallprompt', f)
    return () => removeEventListener('beforeinstallprompt', f)
  }, [])
  const { mode } = useDocMeta()
  if (standalone || mode === 'preview') return null
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
      <div className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <Smartphone size={30} className="gold shrink-0" />
        <div className="flex-1">
          <p className="display text-lg">Install it — it works with no signal</p>
          <p className="ink2 text-sm">Cell service in the park is patchy. Installed, the app and the latest itinerary you opened work offline; it refreshes itself when you’re back in coverage. {ios ? 'iPhone: Share → “Add to Home Screen”.' : ''}</p>
        </div>
        {evt && <button className="btn btn-gold btn-sm" onClick={() => evt.prompt().then(() => setEvt(null))}><Download size={15} /> Install</button>}
      </div>
    </div>
  )
}

/** The traveler experience. Read-only: all trip data comes from the provider. */
export function TravelerSite() {
  const [theme, setTheme] = useLocal<'dark' | 'light'>('theme', 'dark')
  const [pilot, setPilot] = useState(() => location.hash === '#copilot')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#10251F' : '#F7F5EF')
  }, [theme])
  const openPilot = useCallback(() => setPilot(true), [])
  return (
    <>
      <a href="#timeline" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[90] focus:rounded-xl focus:bg-sunset focus:px-4 focus:py-2 focus:text-forest">Skip to itinerary</a>
      <TopBar theme={theme} setTheme={setTheme} onCoPilot={openPilot} />
      <HeroSection />
      <main>
        <Experiences />
        <Ridgeline />
        <InteractiveTimeline />
        <MapSection theme={theme} />
        <BookingDashboard />
        <WeatherDashboard />
        <AlternatePlanSelector />
        <BudgetCalculator />
        <PackingChecklist />
        <GroupDashboard />
        <Passport />
        <ShareTrip />
        <InstallCard />
      </main>
      <Footer />
      <BottomNav />
      {pilot && <CoPilot onClose={() => (setPilot(false), location.hash === '#copilot' && history.replaceState(null, '', location.pathname))} />}
    </>
  )
}

export default function App() {
  const ctx = usePublished()
  return (
    <DocProvider value={ctx}>
      <TravelerSite />
    </DocProvider>
  )
}

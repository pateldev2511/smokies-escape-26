import { Car } from 'lucide-react'
import { useDoc } from '../lib/doc'
import { useLocal } from '../lib/store'
import { Reveal, Section } from './ui'

export function GroupDashboard() {
  const doc = useDoc()
  const [me, setMe] = useLocal<string>('me', '')
  const drivers = doc.travelers.filter((t) => t.driver)
  return (
    <Section id="crew" index="10" kicker="The crew" title={<>Four friends. <span className="text-[var(--gold)]">Two drivers.</span></>} intro="Driver assignments and prep tasks from the organizer. Tap your card so the app knows which friend you are on this phone.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {doc.travelers.map((t, i) => (
          <Reveal key={t.id} delay={i * 60}>
            <button onClick={() => setMe(me === t.id ? '' : t.id)} aria-pressed={me === t.id} className="panel h-full w-full p-4 text-left" style={{ borderColor: me === t.id ? t.color : undefined }}>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: `${t.color}26` }}>{t.emoji}</span>
                <div>
                  <p className="display text-lg leading-tight">{t.name}</p>
                  <p className="ink2 text-xs">{me === t.id ? 'This is you' : 'Tap if this is you'}</p>
                </div>
              </div>
              <p className={`chip mt-3 ${t.driver ? '!border-sunset !text-[var(--gold)]' : ''}`}><Car size={11} /> {t.driver ? 'Driver' : 'Passenger'}</p>
              {t.task && <p className="mt-3 text-sm"><span className="label !text-[0.56rem]">Task</span><br />{t.task}</p>}
            </button>
          </Reveal>
        ))}
      </div>
      {drivers.length === 2 && <p className="ink2 mt-4 text-sm">Drivers: <strong className="text-[var(--ink)]">{drivers[0].name}</strong> and <strong className="text-[var(--ink)]">{drivers[1].name}</strong>. Swap at least every two hours — Co-Pilot reminds you.</p>}
    </Section>
  )
}

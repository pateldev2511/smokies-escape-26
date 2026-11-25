import { Check, Download } from 'lucide-react'
import { useDoc } from '../lib/doc'
import { download, useLocal } from '../lib/store'
import { Reveal, Section } from './ui'

/** Checklist status is set by the organizer. Each traveler can also tick their own copy on this phone. */
export function PackingChecklist() {
  const doc = useDoc()
  const [mine, setMine] = useLocal<Record<string, boolean>>('mychecks', {})
  const groups = [...new Set(doc.checklist.map((c) => c.group))]
  const done = doc.checklist.filter((c) => c.done).length
  const pct = Math.round((done / Math.max(1, doc.checklist.length)) * 100)
  const txt = () => ['SMOKIES ESCAPE ’26 — Packing & prep', ''].concat(...groups.map((g) => [g.toUpperCase(), ...doc.checklist.filter((c) => c.group === g).map((c) => `  [${c.done ? 'x' : ' '}] ${c.text}`), ''])).join('\n')
  return (
    <Section id="packing" index="09" kicker="Checklist" title={<>Packed, checked, <span className="text-[var(--gold)]">rolling.</span></>} intro="Group status is kept by the organizer. Tap the small box on the right to tick your own copy — it stays on your phone.">
      <div className="panel mb-4 flex items-center gap-4 p-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--line)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 97.4} 97.4`} />
          </svg>
          <span className="mono absolute inset-0 grid place-items-center text-sm font-bold">{pct}%</span>
        </div>
        <div className="flex-1"><p className="font-semibold">{done} of {doc.checklist.length} ready</p><p className="ink2 text-xs">Group status from the organizer</p></div>
        <button className="btn btn-ghost btn-sm" onClick={() => download('smokies-checklist.txt', txt())}><Download size={15} /><span className="hidden sm:inline">Download</span></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g, gi) => (
          <Reveal key={g} delay={gi * 40}>
            <div className="panel h-full p-4">
              <h3 className="display text-lg">{g}</h3>
              <ul className="mt-2 space-y-1">
                {doc.checklist.filter((c) => c.group === g).map((c) => (
                  <li key={c.id} className="flex min-h-[40px] items-center gap-3 text-[0.95rem]">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${c.done ? 'border-[var(--gold)] bg-[var(--gold)] text-[var(--gold-ink)]' : 'border-[var(--line-strong)]'}`} aria-label={c.done ? 'done' : 'not done'}>{c.done && <Check size={14} strokeWidth={3} />}</span>
                    <span className={`flex-1 ${c.done ? 'ink2 line-through' : ''}`}>{c.text}</span>
                    <button role="checkbox" aria-checked={!!mine[c.id]} aria-label={`My copy: ${c.text}`} onClick={() => setMine({ ...mine, [c.id]: !mine[c.id] })} className={`grid h-7 w-7 place-items-center rounded-md border text-[0.6rem] ${mine[c.id] ? 'border-emerald-400 text-emerald-400' : 'border-[var(--line)] ink2'}`}>{mine[c.id] ? '✓' : 'me'}</button>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

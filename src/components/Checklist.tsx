import { Car, Check, ClipboardCheck, Download, Shirt, Ticket, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { CHECKLIST } from '../data/trip'
import { download, setShared, useShared, useSharedPrefix } from '../lib/store'
import { Reveal, Section } from './ui'

const ICON: Record<string, ReactNode> = { Car: <Car size={18} />, Clothing: <Shirt size={18} />, Personal: <User size={18} />, Bookings: <Ticket size={18} />, 'Before Leaving': <ClipboardCheck size={18} /> }
const key = (g: string, i: string) => `chk:${g}:${i}`

export function useChecklistProgress() {
  const done = useSharedPrefix<boolean>('chk:').filter((x) => x.value)
  const all = Object.values(CHECKLIST).flat().length
  return { done: done.length, all, pct: Math.round((done.length / all) * 100) }
}

function Item({ g, i }: { g: string; i: string }) {
  const [on, set] = useShared<boolean>(key(g, i), false)
  return (
    <li>
      <button role="checkbox" aria-checked={on} onClick={() => set(!on)} className="flex min-h-[46px] w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-[var(--bg-2)]">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-colors ${on ? 'border-[var(--gold)] bg-[var(--gold)] text-[var(--gold-ink)]' : 'border-[var(--line-strong)]'}`}>{on && <Check size={14} strokeWidth={3} />}</span>
        <span className={on ? 'ink2 line-through' : ''}>{i}</span>
      </button>
    </li>
  )
}

export function PackingChecklist() {
  const { done, all, pct } = useChecklistProgress()
  const doneKeys = new Set(useSharedPrefix<boolean>('chk:').filter((x) => x.value).map((x) => x.key))
  const txt = () =>
    ['SMOKIES ESCAPE ’26 — Packing & prep', ''].concat(...Object.entries(CHECKLIST).map(([g, items]) => [g.toUpperCase(), ...items.map((i) => `  [${doneKeys.has(key(g, i)) ? 'x' : ' '}] ${i}`), ''])).join('\n')
  return (
    <Section id="packing" index="09" kicker="Checklist" title={<>Packed, checked, <span className="text-[var(--gold)]">rolling.</span></>}>
      <div className="panel mb-4 flex items-center gap-4 p-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--line)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 97.4} 97.4`} style={{ transition: 'stroke-dasharray .5s' }} />
          </svg>
          <span className="mono absolute inset-0 grid place-items-center text-sm font-bold">{pct}%</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold">{done} of {all} ready</p>
          <p className="ink2 text-xs">Shared with the crew when you sync</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => download('smokies-checklist.txt', txt())}><Download size={15} /><span className="hidden sm:inline">Download</span></button>
        <button className="btn btn-ghost btn-sm" onClick={() => confirm('Uncheck everything?') && Object.entries(CHECKLIST).forEach(([g, items]) => items.forEach((i) => setShared(key(g, i), false)))}>Reset</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(CHECKLIST).map(([g, items], gi) => (
          <Reveal key={g} delay={gi * 50}>
            <div className="panel h-full p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-sunset/15 text-[var(--gold)]">{ICON[g]}</span>
                <h3 className="display flex-1 text-lg">{g}</h3>
              </div>
              <ul className="mt-2">{items.map((i) => <Item key={i} g={g} i={i} />)}</ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

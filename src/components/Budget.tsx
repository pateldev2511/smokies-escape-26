import { ArrowRight } from 'lucide-react'
import { EXPENSE_CATS } from '../data/trip'
import { COL, computeBudget, usd } from '../lib/budget'
import { useDoc } from '../lib/doc'
import { Reveal, Section } from './ui'

export function BudgetCalculator() {
  const doc = useDoc()
  const b = computeBudget(doc.budget, doc.tipPct, doc.expenses, doc.travelers)
  const maxBar = Math.max(b.high, b.spent, 1)
  const expenses = [...doc.expenses].sort((x, y) => y.at - x.at)
  return (
    <Section id="budget" index="08" kicker="Budget" title={<>Who paid. <span className="text-[var(--gold)]">Who owes.</span></>} intro="Planning estimates and real expenses for the group, kept by the organizer. Settle-up uses the fewest transfers.">
      <div className="grid gap-4 lg:grid-cols-5">
        <Reveal className="lg:col-span-3">
          <div className="panel p-4 sm:p-6">
            <h3 className="display text-xl">Plan · group of {b.n}</h3>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Tile k="Total incl. rental" v={b.rentalKnown ? `${usd(b.low)}–${usd(b.high)}` : 'Rental price TBD'} />
              <Tile k="Total without rental" v={`${usd(b.lowNoRental)}–${usd(b.highNoRental)}`} />
              <Tile k="Per person" v={`${usd(b.low / b.n)}–${usd(b.high / b.n)}`} gold />
              <Tile k="Paid attractions / person" v={`${usd(b.actPP[0])}–${usd(b.actPP[1])}`} sub="target $50–$100" />
              <Tile k="Spent so far" v={usd(b.spent)} />
              <Tile k="Remaining (vs high)" v={usd(Math.max(0, b.high - b.spent))} />
            </div>
            <table className="mt-5 w-full text-sm">
              <tbody>
                {doc.budget.map((l) => (
                  <tr key={l.id} className="border-t border-[var(--line)]">
                    <td className="py-2 pr-2"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: COL[l.cat] }} />{l.label}</td>
                    <td className="mono py-2 text-right whitespace-nowrap">{l.high === 0 && l.cat === 'Rental' ? 'TBD' : l.low === l.high ? usd(l.low) : `${usd(l.low)}–${usd(l.high)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {b.deposit > 0 && <p className="ink2 mt-2 text-xs">Refundable deposit {usd(b.deposit)} is tracked separately and not counted.</p>}
          </div>
        </Reveal>
        <Reveal className="lg:col-span-2" delay={80}>
          <div className="panel h-full p-4 sm:p-6">
            <h3 className="display text-xl">Actual vs plan</h3>
            <div className="mt-4 space-y-3">
              {EXPENSE_CATS.map((c) => {
                const e = b.cats.find((x) => x.c === c)!
                const s = b.spentBy.find((x) => x.c === c)!.v
                return (
                  <div key={c}>
                    <div className="flex justify-between text-xs"><span>{c}</span><span className="mono ink2">{usd(s)} / {usd(e.high)}</span></div>
                    <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-[var(--bg-2)]">
                      <div className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: `${(e.high / maxBar) * 100}%`, background: COL[c] }} />
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(s / maxBar) * 100}%`, background: s > e.high && e.high > 0 ? '#f87171' : COL[c] }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="ink2 mt-3 text-[0.7rem]">Faded = estimate · solid = spent</p>
          </div>
        </Reveal>
      </div>
      <Reveal className="mt-4">
        <div className="panel p-4 sm:p-6">
          <h3 className="display text-xl">Expenses</h3>
          {expenses.length === 0 ? <p className="ink2 mt-3 text-sm">Nothing logged yet.</p> : (
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {expenses.map((e) => {
                const t = doc.travelers.find((x) => x.id === e.paidBy)
                return (
                  <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${COL[e.cat]}33` }}>{t?.emoji ?? '•'}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{e.label}</span><span className="ink2 text-xs">{e.cat} · paid by {t?.name ?? '—'}</span></span>
                    <span className="mono font-semibold">{usd(e.amount)}</span>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label">Balances · equal share {usd(b.share)}</p>
              <ul className="mt-2 space-y-1.5 text-sm">{b.bal.map(({ t, b: v }) => <li key={t.id} className="flex justify-between"><span>{t.emoji} {t.name}</span><span className={`mono font-semibold ${v >= 0 ? 'text-emerald-400' : 'text-[var(--gold)]'}`}>{v >= 0 ? '+' : '−'}{usd(Math.abs(v))}</span></li>)}</ul>
            </div>
            <div>
              <p className="label">Who owes whom</p>
              {b.moves.length ? <ul className="mt-2 space-y-1.5 text-sm">{b.moves.map((m, i) => <li key={i} className="flex items-center gap-2 rounded-xl bg-[var(--bg-2)] px-3 py-2">{m.from} <ArrowRight size={14} className="gold" /> {m.to}<span className="mono ml-auto font-semibold">{usd(m.amt)}</span></li>)}</ul> : <p className="ink2 mt-2 text-sm">Everyone is square.</p>}
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}

export function Tile({ k, v, gold, sub }: { k: string; v: string; gold?: boolean; sub?: string }) {
  return (
    <div className={`rounded-2xl p-3 ${gold ? 'bg-sunset/15' : 'bg-[var(--bg-2)]'}`}>
      <p className="label !text-[0.56rem]">{k}</p>
      <p className={`mono mt-1.5 text-[0.95rem] leading-tight font-semibold ${gold ? 'text-[var(--gold)]' : ''}`}>{v}</p>
      {sub && <p className="ink2 mt-0.5 text-[0.65rem]">{sub}</p>}
    </div>
  )
}

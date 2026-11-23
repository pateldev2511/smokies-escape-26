import { ArrowRight, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BUDGET, EXPENSE_CATS, type BudgetLine, type ExpenseCat } from '../data/trip'
import { setShared, useShared, useSharedPrefix } from '../lib/store'
import { useTravelers } from './Crew'
import { Reveal, Section } from './ui'

interface Expense { id: string; label: string; amount: number; cat: ExpenseCat; paidBy: string; at: number }
const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(n) % 1 ? 2 : 0 })
const COL: Record<ExpenseCat, string> = { Activities: '#E8B86D', Food: '#E59A8C', Fuel: '#9DB4E0', Parking: '#7FC8A9', Other: '#B8C8C5' }

export function BudgetCalculator() {
  const [lines, setLines] = useShared<BudgetLine[]>('budget', BUDGET)
  const [tip, setTip] = useShared<number>('tip', 0)
  const [tax, setTax] = useShared<number>('tax', 0)
  const expenses = useSharedPrefix<Expense>('exp:').map((x) => x.value).sort((a, b) => b.at - a.at)
  const travelers = useTravelers()
  const [f, setF] = useState({ label: '', amount: '', cat: 'Food' as ExpenseCat, paidBy: '' })
  const n = travelers.length

  const est = useMemo(() => {
    const by = (c?: ExpenseCat) => lines.filter((l) => !c || l.cat === c)
    const sum = (ls: BudgetLine[], k: 'low' | 'high') => ls.reduce((a, l) => a + l[k] * (l.cat === 'Food' ? 1 + tip / 100 : 1) * (1 + tax / 100), 0)
    return {
      low: sum(by(), 'low'), high: sum(by(), 'high'),
      cats: EXPENSE_CATS.map((c) => ({ c, low: sum(by(c), 'low'), high: sum(by(c), 'high') })),
    }
  }, [lines, tip, tax])
  const spent = expenses.reduce((a, e) => a + e.amount, 0)
  const spentBy = EXPENSE_CATS.map((c) => ({ c, v: expenses.filter((e) => e.cat === c).reduce((a, e) => a + e.amount, 0) }))
  const actPP = est.cats.find((x) => x.c === 'Activities')!

  const settle = useMemo(() => {
    const share = spent / n
    const bal = travelers.map((t) => ({ t, b: expenses.filter((e) => e.paidBy === t.id).reduce((a, e) => a + e.amount, 0) - share }))
    const dr = bal.filter((x) => x.b < -0.005).map((x) => ({ ...x, b: -x.b }))
    const cr = bal.filter((x) => x.b > 0.005).map((x) => ({ ...x }))
    const moves: { from: string; to: string; amt: number }[] = []
    let i = 0, j = 0
    while (i < dr.length && j < cr.length) {
      const amt = Math.min(dr[i].b, cr[j].b)
      moves.push({ from: dr[i].t.name, to: cr[j].t.name, amt })
      dr[i].b -= amt; cr[j].b -= amt
      if (dr[i].b < 0.005) i++
      if (cr[j].b < 0.005) j++
    }
    return { share, bal, moves }
  }, [expenses, travelers, spent, n])

  const add = () => {
    const amount = parseFloat(f.amount)
    if (!f.label.trim() || !(amount > 0)) return
    const id = crypto.randomUUID?.() ?? String(Date.now())
    setShared(`exp:${id}`, { id, label: f.label.trim(), amount: Math.round(amount * 100) / 100, cat: f.cat, paidBy: f.paidBy || travelers[0].id, at: Date.now() })
    setF({ ...f, label: '', amount: '' })
  }
  const setLine = (id: string, k: 'low' | 'high', v: string) => setLines(lines.map((l) => (l.id === id ? { ...l, [k]: Math.max(0, parseFloat(v) || 0) } : l)))
  const maxBar = Math.max(est.high, spent, 1)

  return (
    <Section id="budget" index="08" kicker="Budget" title={<>Split fairly. <span className="text-[var(--gold)]">Settle instantly.</span></>} intro="Editable estimates for the group, live expenses with who paid, and the fewest transfers to square up. Shared with the crew via Sync — otherwise it lives on this phone only.">
      <div className="grid gap-4 lg:grid-cols-5">
        <Reveal className="lg:col-span-3">
          <div className="panel p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="display text-xl">Planning estimate · group of {n}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => (setLines(BUDGET), setTip(0), setTax(0))}><RotateCcw size={14} /> Reset</button>
            </div>
            <table className="mt-4 w-full text-sm">
              <thead><tr className="label text-left"><th className="pb-2 font-medium">Item</th><th className="pb-2 font-medium">Low</th><th className="pb-2 font-medium">High</th></tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-t border-[var(--line)]">
                    <td className="py-1.5 pr-2"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: COL[l.cat] }} />{l.label}</td>
                    <td className="py-1.5 pr-2"><input aria-label={`${l.label} low`} inputMode="decimal" className="input mono !min-h-[38px] !w-[4.6rem] !px-2" value={l.low} onChange={(e) => setLine(l.id, 'low', e.target.value)} /></td>
                    <td className="py-1.5"><input aria-label={`${l.label} high`} inputMode="decimal" className="input mono !min-h-[38px] !w-[4.6rem] !px-2" value={l.high} onChange={(e) => setLine(l.id, 'high', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label><span className="label">Tip % (food)</span><input inputMode="decimal" className="input mono mt-1.5" value={tip} onChange={(e) => setTip(Math.max(0, parseFloat(e.target.value) || 0))} /></label>
              <label><span className="label">Tax / fees %</span><input inputMode="decimal" className="input mono mt-1.5" value={tax} onChange={(e) => setTax(Math.max(0, parseFloat(e.target.value) || 0))} /></label>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Tile k="Group total" v={`${usd(est.low)}–${usd(est.high)}`} />
              <Tile k="Per person" v={`${usd(est.low / n)}–${usd(est.high / n)}`} gold />
              <Tile k="Activities / person" v={`${usd(actPP.low / n)}–${usd(actPP.high / n)}`} sub="target $50–$100" />
              <Tile k="Food / fuel / parking" v={`${usd(est.cats.filter((c) => c.c !== 'Activities').reduce((a, c) => a + c.high, 0))}`} sub="group, high" />
            </div>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-2" delay={80}>
          <div className="panel h-full p-4 sm:p-6">
            <h3 className="display text-xl">Actual vs plan</h3>
            <p className="mono mt-3 text-4xl font-semibold">{usd(spent)}</p>
            <p className="ink2 text-sm">spent · {usd(Math.max(0, est.high - spent))} left of high estimate</p>
            <div className="mt-5 space-y-3">
              {EXPENSE_CATS.map((c) => {
                const e = est.cats.find((x) => x.c === c)!
                const s = spentBy.find((x) => x.c === c)!.v
                return (
                  <div key={c}>
                    <div className="flex justify-between text-xs"><span>{c}</span><span className="mono ink2">{usd(s)} / {usd(e.high)}</span></div>
                    <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-[var(--bg-2)]">
                      <div className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: `${(e.high / maxBar) * 100}%`, background: COL[c] }} />
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(s / maxBar) * 100}%`, background: s > e.high ? '#f87171' : COL[c], transition: 'width .6s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="ink2 mt-3 text-[0.7rem]">Faded bar = high estimate · solid = spent</p>
          </div>
        </Reveal>
      </div>

      <Reveal className="mt-4">
        <div className="panel p-4 sm:p-6">
          <h3 className="display text-xl">Expenses</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1.2fr_auto]">
            <input className="input" placeholder="What? e.g. Anakeesta tickets" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
            <input className="input mono" inputMode="decimal" placeholder="$0.00" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
            <select className="input" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value as ExpenseCat })}>{EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}</select>
            <select className="input" aria-label="Paid by" value={f.paidBy || travelers[0].id} onChange={(e) => setF({ ...f, paidBy: e.target.value })}>{travelers.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.name} paid</option>)}</select>
            <button className="btn btn-gold" onClick={add}><Plus size={16} /> Add</button>
          </div>
          {expenses.length === 0 ? (
            <p className="ink2 mt-5 text-sm">Nothing logged yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--line)]">
              {expenses.map((e) => {
                const t = travelers.find((x) => x.id === e.paidBy)
                return (
                  <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base" style={{ background: `${COL[e.cat]}33` }}>{t?.emoji ?? '•'}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{e.label}</span><span className="ink2 text-xs">{e.cat} · {t?.name ?? '—'}</span></span>
                    <span className="mono font-semibold">{usd(e.amount)}</span>
                    <button className="btn btn-ghost btn-sm !min-h-[36px] !px-2.5" aria-label={`Delete ${e.label}`} onClick={() => setShared(`exp:${e.id}`, null)}><Trash2 size={14} /></button>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label">Balances · equal share {usd(settle.share)}</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {settle.bal.map(({ t, b }) => (
                  <li key={t.id} className="flex justify-between"><span>{t.emoji} {t.name}</span><span className={`mono font-semibold ${b >= 0 ? 'text-emerald-400' : 'text-[var(--gold)]'}`}>{b >= 0 ? '+' : '−'}{usd(Math.abs(b))}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label">Settle up</p>
              {settle.moves.length ? (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {settle.moves.map((m, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-xl bg-[var(--bg-2)] px-3 py-2">{m.from} <ArrowRight size={14} className="gold" /> {m.to}<span className="mono ml-auto font-semibold">{usd(m.amt)}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="ink2 mt-2 text-sm">Everyone is square.</p>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}

function Tile({ k, v, gold, sub }: { k: string; v: string; gold?: boolean; sub?: string }) {
  return (
    <div className={`rounded-2xl p-3 ${gold ? 'bg-sunset/15' : 'bg-[var(--bg-2)]'}`}>
      <p className="label !text-[0.56rem]">{k}</p>
      <p className={`mono mt-1.5 text-[0.95rem] leading-tight font-semibold ${gold ? 'text-[var(--gold)]' : ''}`}>{v}</p>
      {sub && <p className="ink2 mt-0.5 text-[0.65rem]">{sub}</p>}
    </div>
  )
}

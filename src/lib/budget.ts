import { EXPENSE_CATS, type BudgetLine, type Expense, type ExpenseCat } from '../data/trip'
import type { Traveler } from './doc'

export const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(n) % 1 ? 2 : 0 })
export const COL: Record<ExpenseCat, string> = { Rental: '#C9A0DC', Activities: '#E8B86D', Food: '#E59A8C', Fuel: '#9DB4E0', Parking: '#7FC8A9', Other: '#B8C8C5' }

export function computeBudget(lines: BudgetLine[], tipPct: number, expenses: Expense[], travelers: Traveler[]) {
  const n = Math.max(1, travelers.length)
  const counted = lines.filter((l) => !l.deposit)
  const v = (l: BudgetLine, k: 'low' | 'high') => l[k] * (l.cat === 'Food' ? 1 + tipPct / 100 : 1)
  const sum = (ls: BudgetLine[], k: 'low' | 'high') => ls.reduce((a, l) => a + v(l, k), 0)
  const cats = EXPENSE_CATS.map((c) => ({ c, low: sum(counted.filter((l) => l.cat === c), 'low'), high: sum(counted.filter((l) => l.cat === c), 'high') }))
  const noRental = counted.filter((l) => l.cat !== 'Rental')
  const spent = expenses.reduce((a, e) => a + e.amount, 0)
  const spentBy = EXPENSE_CATS.map((c) => ({ c, v: expenses.filter((e) => e.cat === c).reduce((a, e) => a + e.amount, 0) }))
  const share = spent / n
  const bal = travelers.map((t) => ({ t, b: expenses.filter((e) => e.paidBy === t.id).reduce((a, e) => a + e.amount, 0) - share }))
  const dr = bal.filter((x) => x.b < -0.005).map((x) => ({ ...x, b: -x.b }))
  const cr = bal.filter((x) => x.b > 0.005).map((x) => ({ ...x }))
  const moves: { from: string; to: string; amt: number }[] = []
  let i = 0, j = 0
  while (i < dr.length && j < cr.length) {
    const amt = Math.min(dr[i].b, cr[j].b)
    moves.push({ from: dr[i].t.name, to: cr[j].t.name, amt })
    dr[i].b -= amt
    cr[j].b -= amt
    if (dr[i].b < 0.005) i++
    if (cr[j].b < 0.005) j++
  }
  const act = cats.find((x) => x.c === 'Activities')!
  const deposit = lines.filter((l) => l.deposit).reduce((a, l) => a + l.high, 0)
  return {
    n, cats, spent, spentBy, share, bal, moves, deposit,
    low: sum(counted, 'low'), high: sum(counted, 'high'),
    lowNoRental: sum(noRental, 'low'), highNoRental: sum(noRental, 'high'),
    actPP: [act.low / n, act.high / n] as const,
    rentalKnown: counted.some((l) => l.cat === 'Rental' && l.high > 0),
  }
}

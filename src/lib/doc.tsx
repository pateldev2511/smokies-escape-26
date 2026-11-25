import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  BOOKINGS, BUDGET, CHECKLIST, FRIDAY, RENTAL_DEFAULT, STOPS, SUNDAY, TRAVELERS_DEFAULT, TRIP_DATE, TRIP_ID,
  type Booking, type BudgetLine, type DayItem, type Expense, type PlanId, type Rental, type Stop,
} from '../data/trip'
import { setTripDate } from './time'

// ─────────────────────────────────────────────────────────────────────────────
// The whole trip is one JSON document.
//  • Organizer edits a draft (trip_drafts) + private data (trip_private).
//  • "Publish" runs publish_trip() on the server → published_itinerary.
//  • Travelers read published_itinerary (read-only RLS) and get realtime pushes.
// The publishable key below is meant to be public; Row Level Security enforces access.
// ─────────────────────────────────────────────────────────────────────────────
export const SUPABASE_URL = 'https://dwdoecfwjjkvcwphpzvd.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_mBst5neryTv2YcT1lHbu5Q_vP-WlSx7'
let client: SupabaseClient | null = null
export const supa = () => (client ??= createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, storageKey: 'smk-admin-auth' } }))

export interface Traveler { id: string; name: string; emoji: string; driver: boolean; color: string; task?: string }
export interface ChecklistItem { id: string; group: string; text: string; done: boolean }
export interface Announcement { on: boolean; level: 'info' | 'warn' | 'urgent'; title: string; text: string; at?: string }

export interface TripDoc {
  v: 1
  tripDate: string
  plan: PlanId
  announcement: Announcement
  stops: Stop[]
  bookings: Booking[]
  rental: Rental
  friday: DayItem[]
  sunday: DayItem[]
  budget: BudgetLine[]
  tipPct: number
  expenses: Expense[]
  checklist: ChecklistItem[]
  travelers: Traveler[]
}

/** Private, never-published data (organizer only). */
export interface PrivateDoc {
  bookings: Record<string, { confirmation?: string; notes?: string; files?: string[] }>
  rental: { confirmation?: string; account?: string; notes?: string; files?: string[] }
  internalNotes?: string
}
export const EMPTY_PRIVATE: PrivateDoc = { bookings: {}, rental: {} }

export function defaultDoc(): TripDoc {
  let n = 0
  return {
    v: 1,
    tripDate: TRIP_DATE,
    plan: 'A',
    announcement: { on: false, level: 'info', title: '', text: '' },
    stops: STOPS.map((s) => ({ ...s })),
    bookings: BOOKINGS.map((b) => ({ ...b })),
    rental: { ...RENTAL_DEFAULT },
    friday: FRIDAY.map((d) => ({ ...d })),
    sunday: SUNDAY.map((d) => ({ ...d })),
    budget: BUDGET.map((b) => ({ ...b })),
    tipPct: 0,
    expenses: [],
    checklist: Object.entries(CHECKLIST).flatMap(([group, items]) => items.map((text) => ({ id: `c${++n}`, group, text, done: false }))),
    travelers: TRAVELERS_DEFAULT.map((t) => ({ ...t })),
  }
}

/** Forward-compatible merge so older published docs still render. */
export function normalize(d: Partial<TripDoc> | null | undefined): TripDoc {
  const def = defaultDoc()
  if (!d) return def
  return { ...def, ...d, rental: { ...def.rental, ...(d.rental ?? {}) }, announcement: { ...def.announcement, ...(d.announcement ?? {}) } } as TripDoc
}

// ── Context ─────────────────────────────────────────────────────────────────
interface Ctx { doc: TripDoc; mode: 'traveler' | 'admin' | 'preview'; publishedAt?: string; status: 'live' | 'cached' | 'offline' | 'loading' | 'draft' }
const DocCtx = createContext<Ctx>({ doc: defaultDoc(), mode: 'traveler', status: 'loading' })
export const useDoc = () => useContext(DocCtx).doc
export const useDocMeta = () => useContext(DocCtx)

export function DocProvider({ value, children }: { value: Ctx; children: ReactNode }) {
  setTripDate(value.doc.tripDate)
  return <DocCtx.Provider value={value}>{children}</DocCtx.Provider>
}

const CACHE = 'smk:published'
/** Traveler data: cached copy instantly, then live published version + realtime updates. */
export function usePublished(): Ctx {
  const [state, setState] = useState<Ctx>(() => {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE) || 'null')
      if (c) return { doc: normalize(c.data), mode: 'traveler', publishedAt: c.published_at, status: 'cached' }
    } catch {
      /* ignore */
    }
    return { doc: defaultDoc(), mode: 'traveler', status: 'loading' }
  })
  useEffect(() => {
    const sb = supa()
    const apply = (row: { data: TripDoc; published_at: string } | null, status: Ctx['status']) => {
      if (!row) return setState((s) => ({ ...s, status: s.status === 'loading' ? 'offline' : s.status }))
      try {
        localStorage.setItem(CACHE, JSON.stringify(row))
      } catch {
        /* ignore */
      }
      setState({ doc: normalize(row.data), mode: 'traveler', publishedAt: row.published_at, status })
    }
    const load = () =>
      sb.from('published_itinerary').select('data, published_at').eq('trip_id', TRIP_ID).maybeSingle()
        .then(({ data, error }) => (error ? setState((s) => ({ ...s, status: s.doc ? 'offline' : 'loading' })) : apply(data as never, 'live')))
    load()
    const ch = sb
      .channel('published')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'published_itinerary', filter: `trip_id=eq.${TRIP_ID}` }, (p) => apply(p.new as never, 'live'))
      .subscribe()
    // fallback refresh (realtime can drop on mobile networks)
    const id = setInterval(load, 90_000)
    const vis = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', vis)
    addEventListener('online', load)
    return () => {
      sb.removeChannel(ch)
      clearInterval(id)
      document.removeEventListener('visibilitychange', vis)
      removeEventListener('online', load)
    }
  }, [])
  return state
}

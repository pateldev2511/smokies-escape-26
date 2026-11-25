import type { Session } from '@supabase/supabase-js'
import {
  AlertTriangle, ArrowDown, ArrowUp, CalendarDays, Car, CheckCircle2, ClipboardList, Copy, Eye, ExternalLink, FileUp, GripVertical, KeyRound, LayoutDashboard,
  LogOut, Megaphone, MessageCircle, Mountain, Plus, Save, Send, Ticket, Trash2, Users, Wallet, X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { TravelerSite } from '../App'
import { bookingProgress } from '../components/Bookings'
import {
  ADMIN_URL, BOOKING_STATUSES, EXPENSE_CATS, PLANS, RENTAL_STATUSES, SHARE_MESSAGE, SITE_URL, TRIP_ID, dir, search,
  type Booking, type BudgetLine, type Category, type DayItem, type ExpenseCat, type Geo, type Stop,
} from '../data/trip'
import { computeBudget, usd } from '../lib/budget'
import { DocProvider, EMPTY_PRIVATE, defaultDoc, normalize, supa, type PrivateDoc, type TripDoc } from '../lib/doc'
import { shiftDate } from '../lib/time'

// ── helpers ─────────────────────────────────────────────────────────────────
const CATS: Category[] = ['Driving', 'Scenic', 'Hiking', 'Food', 'Adventure', 'Attraction']
const uid = () => crypto.randomUUID?.().slice(0, 8) ?? String(Date.now())
const lines = (a: string[]) => a.join('\n')
const unlines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)
const fmtTs = (t?: string | null) => (t ? new Date(t).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET' : 'never')

async function geocode(q: string): Promise<Geo & { elevFt?: number }> {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: 'json', limit: '1', countrycodes: 'us' })}`)
  const j = await r.json()
  if (!j[0]) throw new Error('Address not found — check spelling or add the city/state.')
  const lat = +j[0].lat, lng = +j[0].lon
  let elevFt: number | undefined
  try {
    const e = await (await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`)).json()
    elevFt = Math.round(e.elevation[0] * 3.28084)
  } catch { /* optional */ }
  return { lat, lng, elevFt, source: `OSM Nominatim: ${String(j[0].display_name).slice(0, 80)}`, label: q }
}
async function driveMinutes(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const r = await (await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`)).json()
  return Math.round(r.routes[0].duration / 60)
}

function F({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="label">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}
const In = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`input ${p.className ?? ''}`} />
const Ta = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={`input !min-h-[88px] py-2.5 leading-relaxed ${p.className ?? ''}`} />
function Sel<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return <select className="input" value={value} onChange={(e) => onChange(e.target.value as T)}>{options.map((o) => <option key={o}>{o}</option>)}</select>
}
function Card({ title, icon, children, right }: { title: string; icon?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="panel mb-4 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="display flex items-center gap-2 text-lg">{icon}{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

// ── Login ───────────────────────────────────────────────────────────────────
function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const go = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const { error } = await supa().auth.signInWithPassword({ email: email.trim(), password: pw })
    setBusy(false)
    if (error) setErr(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message)
  }
  return (
    <div className="grid min-h-[100svh] place-items-center px-4">
      <form onSubmit={go} className="panel w-full max-w-sm p-6">
        <Mountain className="text-sunset" />
        <h1 className="display mt-3 text-2xl">Organizer sign-in</h1>
        <p className="ink2 mt-1 text-sm">Smokies Escape ’26 · private dashboard</p>
        <div className="mt-5 space-y-3">
          <F label="Email"><In type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></F>
          <F label="Password"><In type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></F>
        </div>
        {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
        <button className="btn btn-gold mt-5 w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <a href={SITE_URL} className="ink2 mt-4 block text-center text-xs underline">Looking for the trip? Open the traveler view</a>
      </form>
    </div>
  )
}

function ChangePassword({ forced, onDone }: { forced?: boolean; onDone: () => void }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const save = async () => {
    if (a.length < 10) return setMsg('Use at least 10 characters.')
    if (a !== b) return setMsg('Passwords don’t match.')
    const { error } = await supa().auth.updateUser({ password: a, data: { must_change_password: false } })
    if (error) return setMsg(error.message)
    setMsg('Password updated ✓')
    setTimeout(onDone, 700)
  }
  return (
    <div className={forced ? 'grid min-h-[100svh] place-items-center px-4' : ''}>
      <div className={`panel w-full p-5 ${forced ? 'max-w-sm' : ''}`}>
        <h2 className="display flex items-center gap-2 text-lg"><KeyRound size={18} className="gold" /> {forced ? 'Set your own password' : 'Change password'}</h2>
        {forced && <p className="ink2 mt-1 text-sm">You signed in with a temporary password. Choose a new one to continue.</p>}
        <div className="mt-4 space-y-3">
          <F label="New password"><In type="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} /></F>
          <F label="Repeat"><In type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} /></F>
        </div>
        {msg && <p className="mt-3 text-sm">{msg}</p>}
        <button className="btn btn-gold mt-4 w-full" onClick={save}>Save password</button>
      </div>
    </div>
  )
}

// ── Dashboard ───────────────────────────────────────────────────────────────
type Tab = 'overview' | 'itinerary' | 'bookings' | 'rental' | 'money' | 'crew' | 'checklist' | 'announce' | 'days'
const TABS: [Tab, string, typeof LayoutDashboard][] = [
  ['overview', 'Overview', LayoutDashboard], ['itinerary', 'Itinerary', CalendarDays], ['bookings', 'Bookings', Ticket], ['rental', 'Rental', Car],
  ['money', 'Money', Wallet], ['crew', 'Crew', Users], ['checklist', 'Checklist', ClipboardList], ['announce', 'Announce', Megaphone], ['days', 'Fri / Sun', CalendarDays],
]

function Dashboard({ session }: { session: Session }) {
  const sb = supa()
  const [doc, setDocRaw] = useState<TripDoc | null>(null)
  const [priv, setPrivRaw] = useState<PrivateDoc>(EMPTY_PRIVATE)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [publishedJson, setPublishedJson] = useState<string>('')
  const [tab, setTab] = useState<Tab>('overview')
  const [toast, setToast] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pwOpen, setPwOpen] = useState(false)

  const setDoc = (f: (d: TripDoc) => TripDoc) => (setDocRaw((d) => (d ? f(d) : d)), setDirty(true))
  const setPriv = (f: (p: PrivateDoc) => PrivateDoc) => (setPrivRaw(f), setDirty(true))
  const flash = (m: string) => (setToast(m), setTimeout(() => setToast(null), 2600))

  useEffect(() => {
    ;(async () => {
      const [d, p, pub, org] = await Promise.all([
        sb.from('trip_drafts').select('data, updated_at').eq('trip_id', TRIP_ID).maybeSingle(),
        sb.from('trip_private').select('data').eq('trip_id', TRIP_ID).maybeSingle(),
        sb.from('published_itinerary').select('data, published_at').eq('trip_id', TRIP_ID).maybeSingle(),
        sb.from('organizers').select('user_id').eq('user_id', session.user.id).maybeSingle(),
      ])
      if (!org.data) return setErr('This account is not an organizer for this trip. Travelers use the traveler link — no login needed.')
      if (d.error) return setErr(d.error.message)
      setDocRaw(normalize((d.data?.data ?? pub.data?.data ?? defaultDoc()) as TripDoc))
      setPrivRaw({ ...EMPTY_PRIVATE, ...((p.data?.data as PrivateDoc) ?? {}) })
      setSavedAt(d.data?.updated_at ?? null)
      setPublishedAt(pub.data?.published_at ?? null)
      setPublishedJson(JSON.stringify(pub.data?.data ?? null))
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => dirty && (e.preventDefault(), (e.returnValue = ''))
    addEventListener('beforeunload', f)
    return () => removeEventListener('beforeunload', f)
  }, [dirty])

  const saveDraft = useCallback(async () => {
    if (!doc) return false
    setBusy(true)
    const now = new Date().toISOString()
    const [a, b] = await Promise.all([
      sb.from('trip_drafts').upsert({ trip_id: TRIP_ID, data: doc, updated_at: now, updated_by: session.user.id }),
      sb.from('trip_private').upsert({ trip_id: TRIP_ID, data: priv, updated_at: now }),
    ])
    setBusy(false)
    if (a.error || b.error) return flash(`Save failed: ${(a.error ?? b.error)!.message}`), false
    setSavedAt(now)
    setDirty(false)
    return true
  }, [doc, priv, sb, session.user.id])

  const publish = async () => {
    if (!(await saveDraft())) return
    setBusy(true)
    const { data, error } = await sb.rpc('publish_trip', { p_trip: TRIP_ID })
    setBusy(false)
    if (error) return flash(`Publish failed: ${error.message}`)
    setPublishedAt(data as string)
    setPublishedJson(JSON.stringify(doc))
    flash('Published ✓ — travelers see it now')
  }

  const unpublished = doc ? JSON.stringify(doc) !== publishedJson : false
  if (err) return <div className="grid min-h-[100svh] place-items-center p-6"><div className="panel max-w-md p-6"><p>{err}</p><button className="btn btn-ghost btn-sm mt-4" onClick={() => sb.auth.signOut()}>Sign out</button></div></div>
  if (!doc) return <div className="grid min-h-[100svh] place-items-center"><div className="skeleton h-10 w-48" /></div>

  return (
    <div className="min-h-[100svh] pb-28">
      <header className="glass sticky top-0 z-40 !border-x-0 !border-t-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <Mountain size={20} className="text-sunset" />
          <div className="mr-auto">
            <p className="display text-[0.95rem] leading-tight">Organizer · Smokies ’26</p>
            <p className="ink2 text-[0.68rem]">{dirty ? 'Unsaved changes' : `Draft saved ${fmtTs(savedAt)}`} · Last Published {fmtTs(publishedAt)}{unpublished && !dirty ? ' · draft differs' : ''}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setPreview(true)}><Eye size={15} /> Preview</button>
          <button className="btn btn-ghost btn-sm" disabled={busy || !dirty} onClick={() => saveDraft().then((ok) => ok && flash('Draft saved — not visible to travelers'))}><Save size={15} /> Save Draft</button>
          <button className="btn btn-gold btn-sm" disabled={busy} onClick={publish}><Send size={15} /> Publish Changes</button>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2" aria-label="Sections">
          {TABS.map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} className={`btn btn-sm shrink-0 ${tab === k ? 'btn-gold' : '!bg-transparent'}`}><I size={14} /> {l}</button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-5">
        {tab === 'overview' && <Overview doc={doc} priv={priv} publishedAt={publishedAt} unpublished={unpublished} dirty={dirty} onPreview={() => setPreview(true)} go={setTab} onPassword={() => setPwOpen(true)} email={session.user.email ?? ''} />}
        {tab === 'itinerary' && <ItineraryEditor doc={doc} setDoc={setDoc} />}
        {tab === 'bookings' && <BookingsEditor doc={doc} setDoc={setDoc} priv={priv} setPriv={setPriv} />}
        {tab === 'rental' && <RentalEditor doc={doc} setDoc={setDoc} priv={priv} setPriv={setPriv} />}
        {tab === 'money' && <MoneyEditor doc={doc} setDoc={setDoc} />}
        {tab === 'crew' && <CrewEditor doc={doc} setDoc={setDoc} />}
        {tab === 'checklist' && <ChecklistEditor doc={doc} setDoc={setDoc} />}
        {tab === 'announce' && <AnnounceEditor doc={doc} setDoc={setDoc} />}
        {tab === 'days' && <DaysEditor doc={doc} setDoc={setDoc} />}
      </main>

      {toast && <div role="status" className="glass fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-[var(--shadow)]">{toast}</div>}
      {pwOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-sm"><button className="btn btn-ghost btn-sm absolute -top-12 right-0" onClick={() => setPwOpen(false)}><X size={16} /></button><ChangePassword onDone={() => setPwOpen(false)} /></div>
        </div>
      )}
      {preview && (
        <div className="fixed inset-0 z-[75] overflow-y-auto bg-[var(--bg)]" role="dialog" aria-modal="true" aria-label="Traveler preview">
          <div className="sticky top-0 z-[80] flex items-center justify-between bg-sunset px-4 py-2 text-sm font-semibold text-forest">
            <span>Preview of your draft — travelers see this only after Publish</span>
            <button className="btn btn-sm !bg-forest !text-cream" onClick={() => setPreview(false)}><X size={15} /> Close</button>
          </div>
          <DocProvider value={{ doc, mode: 'preview', status: 'draft' }}>
            <TravelerSite />
          </DocProvider>
        </div>
      )}
    </div>
  )
}

// ── Overview ────────────────────────────────────────────────────────────────
function Overview({ doc, priv, publishedAt, unpublished, dirty, onPreview, go, onPassword, email }: { doc: TripDoc; priv: PrivateDoc; publishedAt: string | null; unpublished: boolean; dirty: boolean; onPreview: () => void; go: (t: Tab) => void; onPassword: () => void; email: string }) {
  const prog = bookingProgress(doc.bookings, doc.rental.bookingStatus)
  const todo: [string, Tab][] = []
  doc.bookings.filter((b) => b.status !== 'Confirmed' && b.status !== 'Not required').forEach((b) => todo.push([`${b.title}: ${b.status.toLowerCase()}`, 'bookings']))
  if (doc.rental.bookingStatus !== 'Confirmed') todo.push([`Rental reservation: ${doc.rental.bookingStatus.toLowerCase()}`, 'rental'])
  if (!doc.rental.pickupAddress) todo.push(['Rental pickup address missing', 'rental'])
  if (!doc.rental.returnAddress) todo.push(['Rental return address missing (needed for the leave-by time)', 'rental'])
  else if (doc.rental.returnDriveMin == null) todo.push(['Return address not geocoded — tap “Locate & time it”', 'rental'])
  if (!doc.rental.company) todo.push(['Rental company not entered', 'rental'])
  doc.bookings.filter((b) => b.status === 'Confirmed' && !priv.bookings[b.id]?.confirmation).forEach((b) => todo.push([`${b.title}: confirmed but no confirmation # saved`, 'bookings']))
  if (doc.travelers.some((t) => /^Friend \d$/.test(t.name))) todo.push(['Traveler names still placeholders', 'crew'])
  const open = doc.checklist.filter((c) => !c.done).length
  if (open) todo.push([`${open} checklist items not done`, 'checklist'])
  const copy = (s: string) => navigator.clipboard?.writeText(s)
  const wa = `https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`
  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="panel p-4"><p className="label">Last Published</p><p className="mono mt-1.5 font-semibold">{fmtTs(publishedAt)}</p><p className={`mt-1 text-xs ${unpublished || dirty ? 'text-[var(--gold)]' : 'text-emerald-400'}`}>{dirty ? 'You have unsaved edits' : unpublished ? 'Draft has changes not yet published' : 'Travelers see the latest version'}</p></div>
        <div className="panel p-4"><p className="label">Preparations confirmed</p><p className="mono mt-1.5 text-2xl font-semibold">{prog.done}/{prog.total}</p></div>
        <div className="panel p-4"><p className="label">Active plan</p><p className="mt-1.5 font-semibold">{PLANS.find((p) => p.id === doc.plan)?.name}</p></div>
      </div>
      <Card title="Unfinished preparation" icon={<AlertTriangle size={18} className="gold" />}>
        {todo.length ? (
          <ul className="space-y-1.5">{todo.map(([t, k], i) => <li key={i}><button className="flex w-full items-center gap-2 rounded-xl bg-[var(--bg-2)] px-3 py-2.5 text-left text-sm hover:border-[var(--gold)]" onClick={() => go(k)}><span className="h-2 w-2 rounded-full bg-sunset" />{t}<span className="ink2 ml-auto text-xs">fix →</span></button></li>)}</ul>
        ) : <p className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 size={16} /> Everything is ready.</p>}
      </Card>
      <Card title="Your two links" icon={<ExternalLink size={18} className="gold" />}>
        <div className="space-y-3">
          <div className="rounded-xl bg-[var(--bg-2)] p-3">
            <p className="label">Traveler view · share with friends (read-only, no login)</p>
            <p className="mono mt-1.5 text-sm break-all">{SITE_URL}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a className="btn btn-gold btn-sm" href={SITE_URL} target="_blank" rel="noopener noreferrer"><Eye size={14} /> Open Traveler View</a>
              <button className="btn btn-ghost btn-sm" onClick={() => copy(SITE_URL)}><Copy size={14} /> Copy</button>
              <a className="btn btn-ghost btn-sm" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> WhatsApp</a>
              <button className="btn btn-ghost btn-sm" onClick={onPreview}><Eye size={14} /> Preview draft</button>
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] p-3">
            <p className="label">Organizer dashboard · keep private</p>
            <p className="mono mt-1.5 text-sm break-all">{ADMIN_URL}</p>
            <div className="mt-2 flex flex-wrap gap-2"><button className="btn btn-ghost btn-sm" onClick={() => copy(ADMIN_URL)}><Copy size={14} /> Copy</button></div>
            <p className="ink2 mt-2 text-xs">Even with this link, only {email} can sign in and edit. Editing is enforced by the database, not by hiding buttons.</p>
          </div>
        </div>
      </Card>
      <Card title="Account" icon={<KeyRound size={18} className="gold" />}>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onPassword}><KeyRound size={14} /> Change password</button>
          <button className="btn btn-ghost btn-sm" onClick={() => supa().auth.signOut()}><LogOut size={14} /> Sign out</button>
        </div>
      </Card>
    </>
  )
}

// ── Itinerary ───────────────────────────────────────────────────────────────
function ItineraryEditor({ doc, setDoc }: { doc: TripDoc; setDoc: (f: (d: TripDoc) => TripDoc) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [drag, setDrag] = useState<number | null>(null)
  const [nw, setNw] = useState({ title: '', address: '', start: '12:00', end: '12:30' })
  const [msg, setMsg] = useState<string | null>(null)
  const upd = (id: string, patch: Partial<Stop>) => setDoc((d) => ({ ...d, stops: d.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  const move = (from: number, to: number) => setDoc((d) => { const a = [...d.stops]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return { ...d, stops: a } })
  const setDate = (v: string) => setDoc((d) => ({
    ...d, tripDate: v,
    rental: { ...d.rental, pickupAt: `${shiftDate(v, -1)}T${d.rental.pickupAt.slice(11)}`, returnBy: `${shiftDate(v, 1)}T${d.rental.returnBy.slice(11)}` },
    bookings: d.bookings.map((b) => ({ ...b, date: v })),
  }))
  const add = async () => {
    if (!nw.title.trim()) return setMsg('Give the stop a name.')
    setMsg('Locating…')
    let geo: Stop['geo']
    if (nw.address.trim()) {
      try { const g = await geocode(nw.address); geo = { lat: g.lat, lng: g.lng, elevFt: g.elevFt, source: g.source } } catch (e) { setMsg(`${(e as Error).message} The stop was added without a map pin.`) }
    }
    const q = nw.address.trim() || nw.title
    const s: Stop = {
      id: `x${uid()}`, n: 0, place: 'downtown', geo, title: nw.title.trim(), kicker: 'Added by the organizer', category: 'Scenic', start: nw.start, end: nw.end, travelIn: 0,
      description: '', activities: [], cost: '—', costLow: 0, costHigh: 0, difficulty: 'Easy', weather: 'Medium', tips: [], mapsUrl: search(q), navUrl: dir(q), missions: [], address: nw.address.trim() || undefined,
    }
    setDoc((d) => ({ ...d, stops: [...d.stops.slice(0, -1), s, d.stops.at(-1)!].filter(Boolean) as Stop[] }))
    setNw({ title: '', address: '', start: '12:00', end: '12:30' })
    if (geo) setMsg(null)
    setOpen(s.id)
  }
  return (
    <>
      <Card title="Trip basics" icon={<CalendarDays size={18} className="gold" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Main adventure date (Saturday)"><In type="date" value={doc.tripDate} onChange={(e) => e.target.value && setDate(e.target.value)} /></F>
          <F label="Active plan (travelers follow this)"><select className="input" value={doc.plan} onChange={(e) => setDoc((d) => ({ ...d, plan: e.target.value as TripDoc['plan'] }))}>{PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></F>
        </div>
        <p className="ink2 mt-2 text-xs">Changing the date moves the Friday pickup and Sunday return with it.</p>
      </Card>
      <Card title={`Saturday stops (${doc.stops.length})`} icon={<Mountain size={18} className="gold" />}>
        <p className="ink2 mb-3 text-xs">Drag to reorder (or use the arrows). Times are Eastern. “Drive in” = minutes of travel included at the start of the window.</p>
        <ol className="space-y-2">
          {doc.stops.map((s, i) => (
            <li key={s.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => (drag != null && drag !== i && move(drag, i), setDrag(null))} className={`rounded-2xl border border-[var(--line)] bg-[var(--bg-2)] ${drag === i ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 p-2.5">
                <GripVertical size={16} className="ink2 shrink-0 cursor-grab" />
                <span className="mono gold w-6 text-xs">{String(i + 1).padStart(2, '0')}</span>
                <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <span className="block truncate text-sm font-semibold">{s.title}</span>
                  <span className="mono ink2 text-xs">{s.start}–{s.end}{s.bookingId ? ' · booking' : ''}{s.geo ? ' · pin' : ''}</span>
                </button>
                <button className="btn btn-ghost btn-sm !min-h-[34px] !px-2" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp size={14} /></button>
                <button className="btn btn-ghost btn-sm !min-h-[34px] !px-2" aria-label="Move down" disabled={i === doc.stops.length - 1} onClick={() => move(i, i + 1)}><ArrowDown size={14} /></button>
              </div>
              {open === s.id && (
                <div className="grid gap-3 border-t border-[var(--line)] p-3 sm:grid-cols-2">
                  <F label="Title"><In value={s.title} onChange={(e) => upd(s.id, { title: e.target.value })} /></F>
                  <F label="Subtitle"><In value={s.kicker} onChange={(e) => upd(s.id, { kicker: e.target.value })} /></F>
                  <F label="Start (ET)"><In type="time" value={s.start} onChange={(e) => e.target.value && upd(s.id, { start: e.target.value })} /></F>
                  <F label="End (ET, 25:30 = 1:30 AM next day)"><In value={s.end} pattern="\d{1,2}:\d{2}" onChange={(e) => upd(s.id, { end: e.target.value })} /></F>
                  <F label="Drive/walk in (min, inside window)"><In inputMode="numeric" value={s.travelIn} onChange={(e) => upd(s.id, { travelIn: Math.max(0, parseInt(e.target.value) || 0) })} /></F>
                  <F label="Category"><Sel value={s.category} options={CATS} onChange={(v) => upd(s.id, { category: v })} /></F>
                  <F label="Cost text"><In value={s.cost} onChange={(e) => upd(s.id, { cost: e.target.value })} /></F>
                  <F label="Difficulty"><In value={s.difficulty} onChange={(e) => upd(s.id, { difficulty: e.target.value })} /></F>
                  <F label="Address"><In value={s.address ?? ''} onChange={(e) => upd(s.id, { address: e.target.value || undefined })} /></F>
                  <F label="Linked booking"><select className="input" value={s.bookingId ?? ''} onChange={(e) => upd(s.id, { bookingId: e.target.value || undefined })}><option value="">None</option>{doc.bookings.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</select></F>
                  <F label="Google Maps link" wide><In value={s.mapsUrl} onChange={(e) => upd(s.id, { mapsUrl: e.target.value })} /></F>
                  <F label="Navigation link" wide><In value={s.navUrl} onChange={(e) => upd(s.id, { navUrl: e.target.value })} /></F>
                  <F label="Description" wide><Ta value={s.description} onChange={(e) => upd(s.id, { description: e.target.value })} /></F>
                  <F label="Activities (one per line)"><Ta value={lines(s.activities)} onChange={(e) => upd(s.id, { activities: unlines(e.target.value) })} /></F>
                  <F label="Tips (one per line)"><Ta value={lines(s.tips)} onChange={(e) => upd(s.id, { tips: unlines(e.target.value) })} /></F>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={!!s.anchor} onChange={(e) => upd(s.id, { anchor: e.target.checked })} /> Anchored (never starts earlier than planned)</label>
                  <div className="flex justify-end sm:col-span-2">
                    <button className="btn btn-ghost btn-sm !text-red-400" disabled={i === 0} onClick={() => confirm(`Remove “${s.title}”?`) && setDoc((d) => ({ ...d, stops: d.stops.filter((x) => x.id !== s.id) }))}><Trash2 size={14} /> Remove stop</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--line-strong)] p-3">
          <p className="label mb-2">Add a stop (inserted before the drive home)</p>
          <div className="grid gap-2 sm:grid-cols-[1.2fr_1.6fr_.7fr_.7fr_auto]">
            <In placeholder="Name" value={nw.title} onChange={(e) => setNw({ ...nw, title: e.target.value })} />
            <In placeholder="Address (for map pin)" value={nw.address} onChange={(e) => setNw({ ...nw, address: e.target.value })} />
            <In type="time" value={nw.start} onChange={(e) => setNw({ ...nw, start: e.target.value })} />
            <In type="time" value={nw.end} onChange={(e) => setNw({ ...nw, end: e.target.value })} />
            <button className="btn btn-gold" onClick={add}><Plus size={15} /> Add</button>
          </div>
          {msg && <p className="mt-2 text-xs">{msg}</p>}
        </div>
      </Card>
    </>
  )
}

// ── Attachments (private storage) ───────────────────────────────────────────
function Attachments({ prefix, files, onChange }: { prefix: string; files: string[]; onChange: (f: string[]) => void }) {
  const [busy, setBusy] = useState(false)
  const upload = async (f: File) => {
    setBusy(true)
    const path = `${prefix}/${Date.now()}-${f.name.replace(/[^\w.-]/g, '_')}`
    const { error } = await supa().storage.from('private-files').upload(path, f, { upsert: false })
    setBusy(false)
    if (error) return alert(error.message)
    onChange([...files, path])
  }
  const open = async (p: string) => {
    const { data } = await supa().storage.from('private-files').createSignedUrl(p, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
  }
  return (
    <div>
      <p className="label">Private attachments</p>
      <ul className="mt-1.5 space-y-1">{files.map((p) => (
        <li key={p} className="flex items-center gap-2 text-sm"><button className="truncate underline" onClick={() => open(p)}>{p.split('/').pop()}</button>
          <button className="ink2 ml-auto" aria-label="Delete attachment" onClick={async () => { await supa().storage.from('private-files').remove([p]); onChange(files.filter((x) => x !== p)) }}><Trash2 size={13} /></button></li>
      ))}</ul>
      <label className="btn btn-ghost btn-sm mt-2 cursor-pointer"><FileUp size={14} /> {busy ? 'Uploading…' : 'Attach file'}<input type="file" hidden accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>
    </div>
  )
}

// ── Bookings ────────────────────────────────────────────────────────────────
function BookingsEditor({ doc, setDoc, priv, setPriv }: { doc: TripDoc; setDoc: (f: (d: TripDoc) => TripDoc) => void; priv: PrivateDoc; setPriv: (f: (p: PrivateDoc) => PrivateDoc) => void }) {
  const upd = (id: string, patch: Partial<Booking>) => setDoc((d) => ({ ...d, bookings: d.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) }))
  const pv = (id: string, patch: Partial<PrivateDoc['bookings'][string]>) => setPriv((p) => ({ ...p, bookings: { ...p.bookings, [id]: { ...p.bookings[id], ...patch } } }))
  return (
    <>
      {doc.bookings.map((b) => (
        <Card key={b.id} title={b.title} icon={<Ticket size={18} className="gold" />} right={b.status !== 'Confirmed' && <button className="btn btn-gold btn-sm" onClick={() => upd(b.id, { status: 'Confirmed' })}><CheckCircle2 size={14} /> Mark Confirmed</button>}>
          <div className="grid gap-3 sm:grid-cols-3">
            <F label="Status"><Sel value={b.status} options={BOOKING_STATUSES} onChange={(v) => upd(b.id, { status: v })} /></F>
            <F label="Date"><In type="date" value={b.date} onChange={(e) => upd(b.id, { date: e.target.value })} /></F>
            <F label="Time (ET)"><In type="time" value={b.time ?? ''} onChange={(e) => upd(b.id, { time: e.target.value || undefined })} /></F>
            <F label={b.id === 'parking' ? 'Vehicles' : 'Guests'}><In inputMode="numeric" value={b.guests} onChange={(e) => upd(b.id, { guests: Math.max(0, parseInt(e.target.value) || 0) })} /></F>
            <F label="Price paid"><In placeholder="$" value={b.price ?? ''} onChange={(e) => upd(b.id, { price: e.target.value })} /></F>
            <F label="Cancellation deadline"><In placeholder="e.g. 24 h before" value={b.cancelBy ?? ''} onChange={(e) => upd(b.id, { cancelBy: e.target.value })} /></F>
            <F label="Booking link" wide><In value={b.url} onChange={(e) => upd(b.id, { url: e.target.value })} /></F>
            <F label="Note for travelers (public)"><In value={b.publicNote ?? ''} onChange={(e) => upd(b.id, { publicNote: e.target.value })} /></F>
          </div>
          <div className="mt-4 grid gap-3 rounded-2xl border border-sunset/30 bg-sunset/5 p-3 sm:grid-cols-2">
            <p className="label sm:col-span-2">🔒 Private — never published</p>
            <F label="Confirmation number"><In value={priv.bookings[b.id]?.confirmation ?? ''} onChange={(e) => pv(b.id, { confirmation: e.target.value })} /></F>
            <F label="Internal notes"><In value={priv.bookings[b.id]?.notes ?? ''} onChange={(e) => pv(b.id, { notes: e.target.value })} /></F>
            <div className="sm:col-span-2"><Attachments prefix={`bookings/${b.id}`} files={priv.bookings[b.id]?.files ?? []} onChange={(files) => pv(b.id, { files })} /></div>
          </div>
          {b.status === 'Confirmed' && !b.time && b.id !== 'parking' && <p className="mt-2 text-xs text-[var(--gold)]">Add the confirmed time so the timeline locks to it.</p>}
        </Card>
      ))}
    </>
  )
}

// ── Rental ──────────────────────────────────────────────────────────────────
function RentalEditor({ doc, setDoc, priv, setPriv }: { doc: TripDoc; setDoc: (f: (d: TripDoc) => TripDoc) => void; priv: PrivateDoc; setPriv: (f: (p: PrivateDoc) => PrivateDoc) => void }) {
  const r = doc.rental
  const upd = (patch: Partial<TripDoc['rental']>) => setDoc((d) => ({ ...d, rental: { ...d.rental, ...patch } }))
  const [msg, setMsg] = useState<string | null>(null)
  const locate = async (which: 'pickup' | 'return') => {
    const addr = which === 'pickup' ? r.pickupAddress : r.returnAddress
    if (!addr.trim()) return setMsg('Enter the address first.')
    setMsg('Locating…')
    try {
      const g = await geocode(addr)
      if (which === 'pickup') upd({ pickupGeo: g })
      else {
        // Drive time from home (Gainesville) — the return trip starts there on Sunday morning
        const min = await driveMinutes({ lat: 34.2978794, lng: -83.8240663 }, g).catch(() => undefined)
        upd({ returnGeo: g, returnDriveMin: min })
      }
      setMsg(`Found: ${g.source.replace('OSM Nominatim: ', '')}`)
    } catch (e) {
      setMsg((e as Error).message)
    }
  }
  return (
    <>
      <Card title="Rental car" icon={<Car size={18} className="gold" />}>
        <div className="grid gap-3 sm:grid-cols-3">
          <F label="Reservation status"><Sel value={r.bookingStatus} options={BOOKING_STATUSES} onChange={(v) => upd({ bookingStatus: v })} /></F>
          <F label="Rental status"><Sel value={r.status} options={RENTAL_STATUSES} onChange={(v) => upd({ status: v })} /></F>
          <F label="Company"><In value={r.company} onChange={(e) => upd({ company: e.target.value })} /></F>
          <F label="Pickup (ET)"><In type="datetime-local" value={r.pickupAt} onChange={(e) => e.target.value && upd({ pickupAt: e.target.value })} /></F>
          <F label="Return by (ET)"><In type="datetime-local" value={r.returnBy} onChange={(e) => e.target.value && upd({ returnBy: e.target.value })} /></F>
          <F label="Return buffer (min)"><In inputMode="numeric" value={r.returnBufferMin} onChange={(e) => upd({ returnBufferMin: Math.max(0, parseInt(e.target.value) || 0) })} /></F>
          <F label="Vehicle make & model"><In value={r.vehicle} onChange={(e) => upd({ vehicle: e.target.value })} /></F>
          <F label="Authorized drivers"><In value={r.drivers} onChange={(e) => upd({ drivers: e.target.value })} /></F>
          <F label="Total rental cost"><In placeholder="$" value={r.cost} onChange={(e) => upd({ cost: e.target.value })} /></F>
          <F label="Mileage at pickup"><In value={r.mileageOut} onChange={(e) => upd({ mileageOut: e.target.value })} /></F>
          <F label="Mileage at return"><In value={r.mileageIn} onChange={(e) => upd({ mileageIn: e.target.value })} /></F>
          <F label="Fuel at pickup"><In placeholder="e.g. Full" value={r.fuelOut} onChange={(e) => upd({ fuelOut: e.target.value })} /></F>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <F label="Pickup address"><In value={r.pickupAddress} onChange={(e) => upd({ pickupAddress: e.target.value, pickupGeo: undefined })} /></F>
            <button className="btn btn-ghost btn-sm mt-2" onClick={() => locate('pickup')}>Locate on map</button>
            {r.pickupGeo && <p className="ink2 mt-1 text-xs">📍 pinned</p>}
          </div>
          <div>
            <F label="Return address"><In value={r.returnAddress} onChange={(e) => upd({ returnAddress: e.target.value, returnGeo: undefined, returnDriveMin: undefined })} /></F>
            <button className="btn btn-ghost btn-sm mt-2" onClick={() => locate('return')}>Locate & time it</button>
            {r.returnDriveMin != null && <p className="ink2 mt-1 text-xs">≈ {r.returnDriveMin} min from Gainesville (OSRM) + {r.returnBufferMin} min buffer</p>}
          </div>
        </div>
        {msg && <p className="mt-2 text-xs">{msg}</p>}
      </Card>
      <Card title="🔒 Private rental details" icon={undefined}>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Rental confirmation reference"><In value={priv.rental.confirmation ?? ''} onChange={(e) => setPriv((p) => ({ ...p, rental: { ...p.rental, confirmation: e.target.value } }))} /></F>
          <F label="Account / loyalty #"><In value={priv.rental.account ?? ''} onChange={(e) => setPriv((p) => ({ ...p, rental: { ...p.rental, account: e.target.value } }))} /></F>
          <F label="Internal notes" wide><Ta value={priv.rental.notes ?? ''} onChange={(e) => setPriv((p) => ({ ...p, rental: { ...p.rental, notes: e.target.value } }))} /></F>
          <div className="sm:col-span-2"><Attachments prefix="rental" files={priv.rental.files ?? []} onChange={(files) => setPriv((p) => ({ ...p, rental: { ...p.rental, files } }))} /></div>
        </div>
      </Card>
    </>
  )
}

// ── Money ───────────────────────────────────────────────────────────────────
function MoneyEditor({ doc, setDoc }: { doc: TripDoc; setDoc: (f: (d: TripDoc) => TripDoc) => void }) {
  const b = useMemo(() => computeBudget(doc.budget, doc.tipPct, doc.expenses, doc.travelers), [doc])
  const [f, setF] = useState({ label: '', amount: '', cat: 'Food' as ExpenseCat, paidBy: doc.travelers[0]?.id ?? '' })
  const line = (id: string, patch: Partial<BudgetLine>) => setDoc((d) => ({ ...d, budget: d.budget.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))
  const add = () => {
    const amount = parseFloat(f.amount)
    if (!f.label.trim() || !(amount > 0)) return
    setDoc((d) => ({ ...d, expenses: [...d.expenses, { id: uid(), label: f.label.trim(), amount: Math.round(amount * 100) / 100, cat: f.cat, paidBy: f.paidBy || d.travelers[0].id, at: Date.now() }] }))
    setF({ ...f, label: '', amount: '' })
  }
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[['Incl. rental', `${usd(b.low)}–${usd(b.high)}`], ['Without rental', `${usd(b.lowNoRental)}–${usd(b.highNoRental)}`], ['Per person', `${usd(b.low / b.n)}–${usd(b.high / b.n)}`], ['Spent', usd(b.spent)]].map(([k, v]) => (
          <div key={k} className="panel p-3"><p className="label !text-[0.56rem]">{k}</p><p className="mono mt-1 text-sm font-semibold">{v}</p></div>
        ))}
      </div>
      <Card title="Planning estimates (group)" icon={<Wallet size={18} className="gold" />}>
        <div className="space-y-2">
          {doc.budget.map((l) => (
            <div key={l.id} className="grid grid-cols-[1fr_5rem_5rem_auto] items-center gap-2">
              <In value={l.label} onChange={(e) => line(l.id, { label: e.target.value })} />
              <In inputMode="decimal" aria-label="Low" value={l.low} onChange={(e) => line(l.id, { low: Math.max(0, parseFloat(e.target.value) || 0) })} />
              <In inputMode="decimal" aria-label="High" value={l.high} onChange={(e) => line(l.id, { high: Math.max(0, parseFloat(e.target.value) || 0) })} />
              <button className="btn btn-ghost btn-sm !px-2" aria-label="Remove line" onClick={() => setDoc((d) => ({ ...d, budget: d.budget.filter((x) => x.id !== l.id) }))}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <F label="Tip % on food"><In inputMode="decimal" className="!w-24" value={doc.tipPct} onChange={(e) => setDoc((d) => ({ ...d, tipPct: Math.max(0, parseFloat(e.target.value) || 0) }))} /></F>
          <button className="btn btn-ghost btn-sm" onClick={() => setDoc((d) => ({ ...d, budget: [...d.budget, { id: uid(), label: 'New item', cat: 'Other', low: 0, high: 0 }] }))}><Plus size={14} /> Add line</button>
        </div>
      </Card>
      <Card title="Expenses (who paid)" icon={<Wallet size={18} className="gold" />}>
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1.2fr_auto]">
          <In placeholder="What?" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
          <In inputMode="decimal" placeholder="$0.00" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          <Sel value={f.cat} options={EXPENSE_CATS} onChange={(v) => setF({ ...f, cat: v })} />
          <select className="input" value={f.paidBy} onChange={(e) => setF({ ...f, paidBy: e.target.value })}>{doc.travelers.map((t) => <option key={t.id} value={t.id}>{t.name} paid</option>)}</select>
          <button className="btn btn-gold" onClick={add}><Plus size={15} /> Add</button>
        </div>
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {[...doc.expenses].sort((a, c) => c.at - a.at).map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="flex-1">{e.label} <span className="ink2 text-xs">· {e.cat} · {doc.travelers.find((t) => t.id === e.paidBy)?.name}</span></span>
              <span className="mono font-semibold">{usd(e.amount)}</span>
              <button className="btn btn-ghost btn-sm !px-2" aria-label="Delete" onClick={() => setDoc((d) => ({ ...d, expenses: d.expenses.filter((x) => x.id !== e.id) }))}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
        {b.moves.length > 0 && <div className="mt-3 rounded-xl bg-[var(--bg-2)] p-3 text-sm">{b.moves.map((m, i) => <p key={i}>{m.from} → {m.to}: <strong className="mono">{usd(m.amt)}</strong></p>)}</div>}
      </Card>
    </>
  )
}

// ── Crew ────────────────────────────────────────────────────────────────────
function CrewEditor({ doc, setDoc }: { doc: TripDoc; setDoc: (f: (d: TripDoc) => TripDoc) => void }) {
  const upd = (id: string, patch: Partial<TripDoc['travelers'][number]>) => setDoc((d) => ({ ...d, travelers: d.travelers.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
  return (
    <Card title="Travelers & drivers" icon={<Users size={18} className="gold" />}>
      <p className="ink2 mb-3 text-xs">Names are shown publicly on the traveler page — no phone numbers or addresses.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {doc.travelers.map((t) => (
          <div key={t.id} className="rounded-2xl bg-[var(--bg-2)] p-3">
            <div className="grid grid-cols-[3.5rem_1fr] gap-2">
              <In aria-label="Emoji" value={t.emoji} maxLength={4} onChange={(e) => upd(t.id, { emoji: e.target.value })} />
              <In aria-label="Name" value={t.name} onChange={(e) => upd(t.id, { name: e.target.value })} />
            </div>
            <In className="mt-2" placeholder="Prep task (optional)" value={t.task ?? ''} onChange={(e) => upd(t.id, { task: e.target.value })} />
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={t.driver} onChange={(e) => upd(t.id, { driver: e.target.checked })} /> Driver</label>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Checklist ───────────────────────────────────────────────────────────────
function ChecklistEditor({ doc, setDoc }: { doc: TripDoc; setDoc: (f: (d: TripDoc) => TripDoc) => void }) {
  const groups = [...new Set(doc.checklist.map((c) => c.group))]
  const [nw, setNw] = useState<Record<string, string>>({})
  const [g, setG] = useState('')
  return (
    <>
      {groups.map((grp) => (
        <Card key={grp} title={grp} icon={<ClipboardList size={18} className="gold" />}>
          <ul className="space-y-1.5">
            {doc.checklist.filter((c) => c.group === grp).map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <input type="checkbox" className="h-5 w-5 shrink-0" checked={c.done} onChange={(e) => setDoc((d) => ({ ...d, checklist: d.checklist.map((x) => (x.id === c.id ? { ...x, done: e.target.checked } : x)) }))} aria-label={`Done: ${c.text}`} />
                <In value={c.text} onChange={(e) => setDoc((d) => ({ ...d, checklist: d.checklist.map((x) => (x.id === c.id ? { ...x, text: e.target.value } : x)) }))} />
                <button className="btn btn-ghost btn-sm !px-2" aria-label="Remove" onClick={() => setDoc((d) => ({ ...d, checklist: d.checklist.filter((x) => x.id !== c.id) }))}><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <In placeholder="New item" value={nw[grp] ?? ''} onChange={(e) => setNw({ ...nw, [grp]: e.target.value })} />
            <button className="btn btn-ghost btn-sm" onClick={() => nw[grp]?.trim() && (setDoc((d) => ({ ...d, checklist: [...d.checklist, { id: uid(), group: grp, text: nw[grp].trim(), done: false }] })), setNw({ ...nw, [grp]: '' }))}><Plus size={14} /></button>
          </div>
        </Card>
      ))}
      <Card title="New group">
        <div className="flex gap-2"><In placeholder="Group name" value={g} onChange={(e) => setG(e.target.value)} /><button className="btn btn-gold btn-sm" onClick={() => g.trim() && (setDoc((d) => ({ ...d, checklist: [...d.checklist, { id: uid(), group: g.trim(), text: 'First item', done: false }] })), setG(''))}><Plus size={14} /> Add</button></div>
      </Card>
    </>
  )
}

// ── Announcement ────────────────────────────────────────────────────────────
function AnnounceEditor({ doc, setDoc }: { doc: TripDoc; setDoc: (f: (d: TripDoc) => TripDoc) => void }) {
  const a = doc.announcement
  const upd = (patch: Partial<TripDoc['announcement']>) => setDoc((d) => ({ ...d, announcement: { ...d.announcement, ...patch, at: new Date().toISOString() } }))
  const templates: [string, Partial<TripDoc['announcement']>, TripDoc['plan']?][] = [
    ['Kuwohi closed → Plan B', { on: true, level: 'urgent', title: 'Route Updated: Kuwohi is closed', text: 'We are following Plan B. Check the updated itinerary before leaving.' }, 'B'],
    ['US-441 closed → Plan C', { on: true, level: 'urgent', title: 'Route Updated: Newfound Gap Road is closed', text: 'We are following Plan C via the interstate. Departure details are in the itinerary.' }, 'C'],
    ['Running late', { on: true, level: 'warn', title: 'Running about 30 minutes late', text: 'Same plan — just later. Check Trip Mode for new times.' }],
    ['All booked!', { on: true, level: 'info', title: 'Everything is booked 🎉', text: 'Tickets, dinner and parking are confirmed. Sleep early Friday!' }],
  ]
  return (
    <Card title="Announcement banner" icon={<Megaphone size={18} className="gold" />}>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5" checked={a.on} onChange={(e) => upd({ on: e.target.checked })} /> Show banner to travelers</label>
      <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr]">
        <F label="Level"><Sel value={a.level} options={['info', 'warn', 'urgent'] as const} onChange={(v) => upd({ level: v })} /></F>
        <F label="Title"><In value={a.title} onChange={(e) => upd({ title: e.target.value })} /></F>
        <F label="Message" wide><Ta value={a.text} onChange={(e) => upd({ text: e.target.value })} /></F>
      </div>
      <p className="label mt-4">Quick templates</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {templates.map(([l, t, plan]) => <button key={l} className="btn btn-ghost btn-sm" onClick={() => setDoc((d) => ({ ...d, plan: plan ?? d.plan, announcement: { ...d.announcement, ...t, at: new Date().toISOString() } }))}>{l}</button>)}
      </div>
      <p className="ink2 mt-3 text-xs">Plan templates also switch the active plan. Nothing goes out until you press Publish Changes.</p>
    </Card>
  )
}

// ── Friday / Sunday ─────────────────────────────────────────────────────────
function DaysEditor({ doc, setDoc }: { doc: TripDoc; setDoc: (f: (d: TripDoc) => TripDoc) => void }) {
  const edit = (k: 'friday' | 'sunday', id: string, patch: Partial<DayItem>) => setDoc((d) => ({ ...d, [k]: d[k].map((x) => (x.id === id ? { ...x, ...patch } : x)) }))
  return (
    <>
      {(['friday', 'sunday'] as const).map((k) => (
        <Card key={k} title={k === 'friday' ? 'Friday — rental pickup' : 'Sunday — rental return'} icon={<CalendarDays size={18} className="gold" />}>
          <div className="space-y-3">
            {doc[k].map((x) => (
              <div key={x.id} className="grid gap-2 rounded-2xl bg-[var(--bg-2)] p-3 sm:grid-cols-[7rem_1fr]">
                <In type="time" value={x.time} onChange={(e) => edit(k, x.id, { time: e.target.value })} />
                <In value={x.title} onChange={(e) => edit(k, x.id, { title: e.target.value })} />
                <Ta className="sm:col-span-2" value={lines(x.details)} onChange={(e) => edit(k, x.id, { details: unlines(e.target.value) })} />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  )
}

// ── Root ────────────────────────────────────────────────────────────────────
export default function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [mustChange, setMustChange] = useState(false)
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark'
    const sb = supa()
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => setMustChange(!!session?.user.user_metadata?.must_change_password), [session])
  if (session === undefined) return <div className="grid min-h-[100svh] place-items-center"><div className="skeleton h-10 w-48" /></div>
  if (!session) return <Login />
  if (mustChange) return <ChangePassword forced onDone={() => setMustChange(false)} />
  return <Dashboard session={session} />
}

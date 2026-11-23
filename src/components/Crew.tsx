import { Car, Copy, MessageCircle, Plus, QrCode, RefreshCw, Share2, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TRAVELERS_DEFAULT } from '../data/trip'
import { lastEdit, syncLink, useLocal, useShared } from '../lib/store'
import { Note, Reveal, Section } from './ui'

export interface Traveler { id: string; name: string; emoji: string; driver: boolean; color: string; task?: string }
const EMOJI = ['🧭', '📸', '🥾', '🎢', '🏔️', '🦌', '🌲', '☕', '🥩', '🌄', '🚗', '🎒']

export function useTravelers(): Traveler[] {
  // each traveler is its own shared key so edits by different friends merge cleanly
  const t = TRAVELERS_DEFAULT.map((d) => useShared<Traveler>(`trav:${d.id}`, d)[0]) // eslint-disable-line react-hooks/rules-of-hooks
  return t
}

function TravelerCard({ id }: { id: string }) {
  const d = TRAVELERS_DEFAULT.find((x) => x.id === id)!
  const [t, setT] = useShared<Traveler>(`trav:${id}`, d)
  const [me, setMe] = useLocal<string>('me', '')
  const [tasks, setTasks] = useShared<string[]>(`tasks:${id}`, [])
  const [task, setTask] = useState('')
  const isMe = me === t.name && !!me
  return (
    <div className="panel h-full p-4" style={{ borderColor: isMe ? t.color : undefined }}>
      <div className="flex items-center gap-3">
        <button className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: `${t.color}26` }} aria-label="Change avatar" onClick={() => setT({ ...t, emoji: EMOJI[(EMOJI.indexOf(t.emoji) + 1) % EMOJI.length] })}>
          {t.emoji}
        </button>
        <input className="input !min-h-[42px] font-semibold" maxLength={20} aria-label="Name" value={t.name} onChange={(e) => (isMe && setMe(e.target.value), setT({ ...t, name: e.target.value }))} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={`btn btn-sm ${t.driver ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setT({ ...t, driver: !t.driver })} aria-pressed={t.driver}><Car size={14} /> {t.driver ? 'Driver' : 'Passenger'}</button>
        <button className={`btn btn-sm ${isMe ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setMe(isMe ? '' : t.name)} aria-pressed={isMe}>{isMe ? 'This is me' : 'Is this you?'}</button>
      </div>
      <p className="label mt-4">Prep tasks</p>
      <ul className="mt-2 space-y-1">
        {tasks.map((x, i) => (
          <li key={i} className="flex items-center gap-2 rounded-lg bg-[var(--bg-2)] px-2.5 py-1.5 text-sm">
            <span className="flex-1">{x}</span>
            <button className="ink2 p-1" aria-label={`Remove ${x}`} onClick={() => setTasks(tasks.filter((_, j) => j !== i))}><X size={14} /></button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-1.5">
        <input className="input !min-h-[40px] text-sm" placeholder="e.g. Book Anakeesta" value={task} onChange={(e) => setTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && task.trim() && (setTasks([...tasks, task.trim()]), setTask(''))} />
        <button className="btn btn-ghost btn-sm !px-3" aria-label="Add task" onClick={() => task.trim() && (setTasks([...tasks, task.trim()]), setTask(''))}><Plus size={15} /></button>
      </div>
    </div>
  )
}

export function CrewSync({ compact = false }: { compact?: boolean }) {
  const [me] = useLocal<string>('me', '')
  const [qr, setQr] = useState<string | null>(null)
  const [link, setLink] = useState('')
  const [, force] = useState(0)
  const le = lastEdit()
  const build = () => setLink(syncLink())
  useEffect(build, [])
  const showQr = async () => {
    const l = syncLink()
    setLink(l)
    const { default: qrcode } = await import('qrcode-generator')
    try {
      const q = qrcode(0, 'L')
      q.addData(l)
      q.make()
      setQr(q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }))
    } catch {
      setQr('TOO_BIG')
    }
  }
  const msg = `🏔️ Smokies Escape sync from ${me || 'a friend'} — tap to merge my latest checklist, tickets & expenses into yours:\n${link}`
  return (
    <div className={`panel ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label flex items-center gap-1.5"><Users size={12} /> Crew Sync · no server, works offline</p>
          <h3 className="display mt-2 text-xl">Pass your updates around the car</h3>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => (build(), force((n) => n + 1))}><RefreshCw size={14} /> Refresh</button>
      </div>
      <p className="ink2 mt-2 text-sm leading-relaxed">
        Your shared data (plan, check-ins, tickets, expenses, checklist, crew) travels inside a link. Opening it merges by keeping the <em>newest</em> change for each item — nothing gets wiped. In the mountains with no signal, show the QR and a friend scans it with their camera.
      </p>
      {!me && <div className="mt-3"><Note>Tap “Is this you?” on your card first so friends see who sent updates.</Note></div>}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button className="btn btn-gold btn-sm" onClick={showQr}><QrCode size={15} /> Show QR</button>
        <a className="btn btn-ghost btn-sm" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> WhatsApp</a>
        {'share' in navigator && <button className="btn btn-ghost btn-sm" onClick={() => navigator.share({ title: 'Smokies sync', text: msg }).catch(() => {})}><Share2 size={15} /> Share</button>}
        <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(link)}><Copy size={15} /> Copy link</button>
      </div>
      {qr && (
        <div className="mt-4 grid place-items-center rounded-2xl bg-white p-4">
          {qr === 'TOO_BIG' ? <p className="text-sm text-forest">Too much data for one QR — use WhatsApp/Share instead.</p> : <div className="w-full max-w-[300px]" dangerouslySetInnerHTML={{ __html: qr }} />}
          <button className="btn btn-sm mt-2 !text-forest" onClick={() => setQr(null)}>Hide</button>
        </div>
      )}
      <p className="ink2 mono mt-3 text-[0.65rem]">PAYLOAD {Math.round(link.length / 100) / 10} KB · LAST EDIT {le ? `${new Date(le.t).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} BY ${le.by.toUpperCase()}` : '—'}</p>
    </div>
  )
}

export function GroupDashboard() {
  const [notes, setNotes] = useShared<string>('notes', '')
  const travelers = useTravelers()
  const drivers = travelers.filter((t) => t.driver)
  return (
    <Section id="crew" index="10" kicker="The crew" title={<>Four friends. <span className="text-[var(--gold)]">One brain.</span></>} intro="Names, drivers and prep tasks. No phone numbers, addresses or confirmations are stored in anything that gets shared.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TRAVELERS_DEFAULT.map((t, i) => (
          <Reveal key={t.id} delay={i * 60}><TravelerCard id={t.id} /></Reveal>
        ))}
      </div>
      {drivers.length !== 2 && <div className="mt-3"><Note>The plan assumes two drivers — {drivers.length} selected.</Note></div>}
      {drivers.length === 2 && (
        <p className="ink2 mt-3 text-sm">
          Driver plan: <strong className="text-[var(--ink)]">{drivers[0].name}</strong> drives out to Cherokee, <strong className="text-[var(--ink)]">{drivers[1].name}</strong> takes the park roads; swap at dinner — the fresher driver starts the night leg. Edit to taste.
        </p>
      )}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <div className="panel h-full p-5">
            <label htmlFor="notes" className="display text-xl">Group notes</label>
            <textarea id="notes" className="input mt-3 !min-h-[180px] py-3 leading-relaxed" placeholder="Snacks, playlist, who brings the cooler…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </Reveal>
        <Reveal delay={80}><CrewSync /></Reveal>
      </div>
    </Section>
  )
}

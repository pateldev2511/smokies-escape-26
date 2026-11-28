import { AlertOctagon, Info, Megaphone, Radio, WifiOff } from 'lucide-react'
import { useDocMeta } from '../lib/doc'

export function AnnouncementBanner() {
  const { doc } = useDocMeta()
  const a = doc.announcement
  if (!a.on || (!a.title && !a.text)) return null
  const tone = a.level === 'urgent' ? 'border-red-400/60 bg-red-600 text-white' : a.level === 'warn' ? 'border-sunset bg-sunset text-forest' : 'border-[var(--line-strong)] bg-[var(--panel-solid)] text-[var(--ink)]'
  const I = a.level === 'urgent' ? AlertOctagon : a.level === 'warn' ? Megaphone : Info
  return (
    <div role={a.level === 'urgent' ? 'alert' : 'status'} className={`mb-5 w-full max-w-2xl rounded-2xl border px-4 py-3 text-left shadow-[var(--shadow)] ${tone}`}>
      <p className="flex items-start gap-2 font-semibold"><I size={18} className="mt-0.5 shrink-0" />{a.title || 'Update from the organizer'}</p>
      {a.text && <p className="mt-1 pl-6 text-sm leading-relaxed whitespace-pre-line opacity-90">{a.text}</p>}
    </div>
  )
}

export function LiveBadge() {
  const { status, publishedAt, mode } = useDocMeta()
  if (mode === 'preview') return <span className="chip !border-sunset !text-[var(--gold)]">Draft preview</span>
  const when = publishedAt ? new Date(publishedAt).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'
  if (status === 'live') return <span className="chip !border-emerald-400/60 !text-emerald-400" title={`Updated ${when} ET`}><Radio size={11} /> Live · {when}</span>
  if (status === 'loading') return <span className="chip">Loading…</span>
  return <span className="chip !text-[var(--gold)]" title="Showing the last saved copy"><WifiOff size={11} /> Saved copy · {when}</span>
}

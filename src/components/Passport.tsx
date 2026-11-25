import { Camera, Check, Download, Share2, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Stop } from '../data/trip'
import { placeOf, useTrip, type Projected } from '../lib/engine'
import { delPhoto, download, getPhoto, putPhoto, shrink, useLocal } from '../lib/store'
import { tripDayLong } from './Hero'
import { Reveal, Section } from './ui'

const ROT = [-9, 6, -4, 11, -7, 4, -12, 8, -5, 7]
const INK = ['#E8B86D', '#7FC8A9', '#9DB4E0', '#E59A8C']

function Stamp({ s, i, earned }: { s: Projected; i: number; earned: boolean }) {
  const color = INK[i % INK.length]
  const name = s.id === 'home' ? 'HOME SAFE' : s.title.replace('Gatlinburg Lunch & Downtown', 'GATLINBURG').replace('Dinner at Spice Express Indian Kitchen', 'SPICE EXPRESS').replace('Kuwohi Observation Tower', 'KUWOHI').replace('Oconaluftee Visitor Center', 'OCONA- LUFTEE').replace('Moonshine Mountain Coaster', 'MOONSHINE').replace('Depart Gainesville', 'WHEELS UP').toUpperCase()
  return (
    <div className={`stamp aspect-square w-full p-2 ${earned ? 'stamp-in' : 'opacity-25'}`} style={{ color: earned ? color : 'var(--ink-2)', ['--r' as string]: `${ROT[i]}deg`, borderStyle: earned ? 'solid' : 'dashed', animationDelay: `${i * 60}ms` }}>
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-current/60 p-1.5">
        <span className="mono text-[0.5rem] tracking-[0.18em] opacity-80">NOV 27 2026</span>
        <span className="display my-0.5 max-w-full text-[0.6rem] leading-tight break-words sm:text-xs">{name}</span>
        <span className="mono text-[0.5rem] opacity-80">{placeOf(s).elevFt.toLocaleString()} FT</span>
      </div>
    </div>
  )
}

function Mission({ stop, i, text }: { stop: string; i: number; text: string }) {
  const [done, setDone] = useLocal<boolean>(`mis:${stop}:${i}`, false)
  const [url, setUrl] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const k = `mis-${stop}-${i}`
  useEffect(() => {
    getPhoto(k).then((b) => b && setUrl(URL.createObjectURL(b))).catch(() => {})
  }, [k])
  return (
    <li className="flex items-center gap-3 rounded-xl bg-[var(--bg-2)] p-2">
      <button role="checkbox" aria-checked={done} aria-label={text} onClick={() => setDone(!done)} className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 ${done ? 'border-[var(--gold)] bg-[var(--gold)] text-[var(--gold-ink)]' : 'border-[var(--line-strong)]'}`}>{done && <Check size={14} strokeWidth={3} />}</button>
      <span className={`flex-1 text-sm ${done ? 'ink2 line-through' : ''}`}>{text}</span>
      {url ? (
        <span className="relative">
          <img src={url} alt="" className="h-11 w-11 rounded-lg object-cover" />
          <button aria-label="Remove photo" onClick={() => delPhoto(k).then(() => setUrl(null))} className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--bg)] text-[var(--ink-2)]"><Trash2 size={10} /></button>
        </span>
      ) : (
        <button className="btn btn-ghost btn-sm !min-h-[40px] !px-2.5" aria-label={`Add photo for ${text}`} onClick={() => input.current?.click()}><Camera size={15} /></button>
      )}
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={async (e) => {
        const f = e.target.files?.[0]
        if (!f) return
        await putPhoto(k, await shrink(f))
        setUrl(URL.createObjectURL((await getPhoto(k))!))
        setDone(true)
      }} />
    </li>
  )
}

async function makeStory(stops: Projected[]): Promise<Blob> {
  const W = 1080, H = 1920
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H })
  const g = c.getContext('2d')!
  await document.fonts?.ready
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0c1630'); bg.addColorStop(0.35, '#183E35'); bg.addColorStop(1, '#0b1915')
  g.fillStyle = bg; g.fillRect(0, 0, W, H)
  // photos collage
  const photos: ImageBitmap[] = []
  for (const s of stops as Stop[]) for (let i = 0; i < s.missions.length && photos.length < 4; i++) {
    const b = await getPhoto(`mis-${s.id}-${i}`).catch(() => undefined)
    if (b) photos.push(await createImageBitmap(b))
  }
  const cell = (W - 120) / 2
  photos.forEach((p, i) => {
    const x = 60 + (i % 2) * (cell + 0), y = 470 + Math.floor(i / 2) * (cell * 0.75)
    const s = Math.max(cell / p.width, (cell * 0.75) / p.height)
    g.save(); g.beginPath(); g.roundRect(x + 6, y + 6, cell - 12, cell * 0.75 - 12, 28); g.clip()
    g.drawImage(p, x + 6 + (cell - 12 - p.width * s) / 2, y + 6 + (cell * 0.75 - 12 - p.height * s) / 2, p.width * s, p.height * s); g.restore()
  })
  g.fillStyle = '#E8B86D'; g.font = '600 30px "JetBrains Mono", monospace'; g.fillText(tripDayLong(stops[0] ? (stops[0].plannedStart.toISOString().slice(0, 10)) : '').toUpperCase(), 60, 120)
  g.fillStyle = '#F7F5EF'; g.font = '800 130px "Plus Jakarta Sans", sans-serif'; g.fillText('SMOKIES', 56, 260); g.fillText('ESCAPE ’26', 56, 390)
  // elevation ridge
  const act = stops.filter((s) => s.status.s !== 'skipped')
  const ry = photos.length ? 470 + Math.ceil(photos.length / 2) * cell * 0.75 + 60 : 520
  g.strokeStyle = '#E8B86D'; g.lineWidth = 6; g.lineJoin = 'round'; g.beginPath()
  act.forEach((s, i) => { const x = 60 + (i / (act.length - 1)) * (W - 120), y = ry + 260 - (placeOf(s).elevFt / 7000) * 240; i ? g.lineTo(x, y) : g.moveTo(x, y) })
  g.stroke()
  act.forEach((s, i) => { const x = 60 + (i / (act.length - 1)) * (W - 120), y = ry + 260 - (placeOf(s).elevFt / 7000) * 240; g.fillStyle = s.status.s === 'done' ? '#E8B86D' : '#B8C8C5'; g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill() })
  // stats
  const done = act.filter((s) => s.status.s === 'done').length
  const climbed = act.reduce((a, s, i) => (i ? a + Math.max(0, placeOf(s).elevFt - placeOf(act[i - 1]).elevFt) : a), 0)
  const stats: [string, string][] = [[`${done}/${act.length}`, 'STOPS'], ['6,643', 'FT HIGH POINT'], [climbed.toLocaleString(), 'FT CLIMBED'], ['4', 'FRIENDS']]
  stats.forEach(([v, l], i) => {
    const x = 60 + (i % 2) * 490, y = ry + 380 + Math.floor(i / 2) * 170
    g.fillStyle = '#F7F5EF'; g.font = '700 84px "JetBrains Mono", monospace'; g.fillText(v, x, y)
    g.fillStyle = '#B8C8C5'; g.font = '600 26px "JetBrains Mono", monospace'; g.fillText(l, x, y + 44)
  })
  // the day's log
  let ly = ry + 760
  act.forEach((s) => {
    if (ly > H - 170) return
    const ok = s.status.s === 'done'
    g.fillStyle = ok ? '#E8B86D' : 'rgba(184,200,197,.45)'; g.font = '600 30px "JetBrains Mono", monospace'; g.fillText(ok ? '✓' : '○', 60, ly)
    g.fillStyle = ok ? '#F7F5EF' : 'rgba(247,245,239,.55)'; g.font = '700 34px "Plus Jakarta Sans", sans-serif'; g.fillText(s.title, 110, ly)
    g.fillStyle = 'rgba(184,200,197,.7)'; g.font = '500 24px "JetBrains Mono", monospace'; g.textAlign = 'right'; g.fillText(`${placeOf(s).elevFt.toLocaleString()} FT`, W - 60, ly); g.textAlign = 'left'
    ly += photos.length ? 52 : 62
  })
  g.fillStyle = '#E8B86D'; g.font = '600 32px "Plus Jakarta Sans", sans-serif'; g.fillText('One Day. Four Friends. Endless Views.', 60, H - 90)
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'))
}

export function Passport() {
  const { stops } = useTrip()
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const active = stops.filter((s) => s.status.s !== 'skipped')
  const earned = active.filter((s) => s.status.s === 'done').length
  const story = async (share: boolean) => {
    setBusy(true)
    try {
      const blob = await makeStory(stops)
      setPreview(URL.createObjectURL(blob))
      const file = new File([blob], 'smokies-escape-26.png', { type: 'image/png' })
      if (share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Smokies Escape ’26' }).catch(() => {})
      else if (share) download('smokies-escape-26.png', blob)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Section id="passport" index="11" kicker="Smokies Passport" title={<>Earn every <span className="text-[var(--gold)]">stamp.</span></>} intro="Each completed stop stamps your passport. Photo missions keep everyone playing; pictures stay on your phone. At the end, generate a story card of the day to post or send home.">
      <Reveal>
        <div className="panel p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <p className="label">{earned} of {active.length} stamps</p>
            <p className="mono gold text-xs">NATIONAL PARK · TN/NC</p>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-5">
            {active.map((s, i) => <Stamp key={s.id} s={s} i={i} earned={s.status.s === 'done'} />)}
          </div>
          <p className="ink2 mt-4 text-xs">Tip: stamps appear when a stop is marked Completed in Trip Mode or Co-Pilot.</p>
        </div>
      </Reveal>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {active.filter((s) => s.missions.length).map((s, i) => (
          <Reveal key={s.id} delay={(i % 2) * 60}>
            <div className="panel p-4">
              <p className="label">{String(s.n).padStart(2, '0')} · {s.title}</p>
              <ul className="mt-3 space-y-2">{s.missions.map((m, j) => <Mission key={m} stop={s.id} i={j} text={m} />)}</ul>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-5">
        <div className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Sparkles size={30} className="gold shrink-0" />
          <div className="flex-1">
            <h3 className="display text-xl">Trip Story card</h3>
            <p className="ink2 text-sm">A 1080×1920 image with your photos, the day’s ridge line and stats — made on your phone, nothing uploaded.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-gold btn-sm" disabled={busy} onClick={() => story(true)}><Share2 size={15} /> {busy ? 'Making…' : 'Create & share'}</button>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => story(false)}><Download size={15} /> Preview</button>
          </div>
        </div>
      </Reveal>
      {preview && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <img src={preview} alt="Trip story preview" className="w-56 rounded-2xl shadow-[var(--shadow)]" />
          <button className="btn btn-ghost btn-sm" onClick={() => fetch(preview).then((r) => r.blob()).then((b) => download('smokies-escape-26.png', b))}><Download size={15} /> Save image</button>
        </div>
      )}
    </Section>
  )
}

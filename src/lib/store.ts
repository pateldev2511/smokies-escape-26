import LZ from 'lz-string'
import { useCallback, useSyncExternalStore } from 'react'
import { SITE_URL } from '../data/trip'

// ─────────────────────────────────────────────────────────────────────────────
// Crew Sync without a server.
// Shared state is a flat map of keys → { value, timestamp, author }.
// Phones exchange the whole map via a link or QR code; merging keeps the newest
// value per key (last-writer-wins), so nobody's edits are wiped and it works
// with zero signal (QR scan in the car).
// Device-only data (private notes, photos, theme) never enters the shared map.
// ─────────────────────────────────────────────────────────────────────────────

type Entry = { v: unknown; t: number; by: string }
type Doc = Record<string, Entry>
const DOC_KEY = 'smk:doc'
const LOCAL = 'smk:local:'

let doc: Doc = load()
const subs = new Set<() => void>()
let version = 0

function load(): Doc {
  try {
    return JSON.parse(localStorage.getItem(DOC_KEY) || '{}')
  } catch {
    return {}
  }
}
function persist() {
  try {
    localStorage.setItem(DOC_KEY, JSON.stringify(doc))
  } catch {
    /* quota / private mode */
  }
  version++
  subs.forEach((f) => f())
}
if (typeof window !== 'undefined')
  window.addEventListener('storage', (e) => {
    if (e.key === DOC_KEY) {
      doc = load()
      version++
      subs.forEach((f) => f())
    } else if (e.key?.startsWith(LOCAL)) {
      version++
      subs.forEach((f) => f())
    }
  })

const subscribe = (f: () => void) => (subs.add(f), () => subs.delete(f))
const getVersion = () => version

export function deviceName(): string {
  return getLocal<string>('me', '') || 'A friend'
}

/** Shared, syncable state. */
export function useShared<T>(key: string, fallback: T) {
  useSyncExternalStore(subscribe, getVersion)
  const value = (key in doc && doc[key].v !== undefined ? doc[key].v : fallback) as T
  const set = useCallback(
    (next: T | ((p: T) => T)) => {
      const prev = (key in doc ? doc[key].v : fallback) as T
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      doc = { ...doc, [key]: { v, t: Date.now(), by: deviceName() } }
      persist()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  return [value, set] as const
}

/** All shared keys with a prefix, e.g. "exp:" → expense records (tombstones removed). */
export function useSharedPrefix<T>(prefix: string) {
  useSyncExternalStore(subscribe, getVersion)
  return Object.entries(doc)
    .filter(([k, e]) => k.startsWith(prefix) && e.v != null)
    .map(([k, e]) => ({ key: k, value: e.v as T, t: e.t, by: e.by }))
}
export function setShared(key: string, v: unknown) {
  doc = { ...doc, [key]: { v, t: Date.now(), by: deviceName() } }
  persist()
}

// ── Device-only state ───────────────────────────────────────────────────────
export function getLocal<T>(key: string, fallback: T): T {
  try {
    const r = localStorage.getItem(LOCAL + key)
    return r == null ? fallback : (JSON.parse(r) as T)
  } catch {
    return fallback
  }
}
export function useLocal<T>(key: string, fallback: T) {
  useSyncExternalStore(subscribe, getVersion)
  const value = getLocal(key, fallback)
  const set = useCallback(
    (next: T | ((p: T) => T)) => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(getLocal(key, fallback)) : next
      try {
        localStorage.setItem(LOCAL + key, JSON.stringify(v))
      } catch {
        /* ignore */
      }
      version++
      subs.forEach((f) => f())
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  return [value, set] as const
}

// ── Sync payloads ───────────────────────────────────────────────────────────
export function syncLink(): string {
  const payload = LZ.compressToEncodedURIComponent(JSON.stringify({ a: 'smk26', from: deviceName(), d: doc }))
  return `${SITE_URL}#sync=${payload}`
}

export function mergePayload(encoded: string): { from: string; changed: number } {
  const raw = LZ.decompressFromEncodedURIComponent(encoded)
  if (!raw) throw new Error('This sync link is damaged or incomplete.')
  const p = JSON.parse(raw) as { a: string; from: string; d: Doc }
  if (p.a !== 'smk26') throw new Error('Not a Smokies Escape sync link.')
  let changed = 0
  const next = { ...doc }
  for (const [k, e] of Object.entries(p.d)) {
    if (!next[k] || e.t > next[k].t) {
      next[k] = e
      changed++
    }
  }
  doc = next
  persist()
  return { from: p.from, changed }
}

export function lastEdit(): { t: number; by: string } | null {
  let best: Entry | null = null
  for (const e of Object.values(doc)) if (!best || e.t > best.t) best = e
  return best ? { t: best.t, by: best.by } : null
}

export function download(name: string, content: string | Blob, type = 'text/plain') {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

// ── Photos (IndexedDB, device-only) ─────────────────────────────────────────
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('smk-photos', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('p')
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
export async function putPhoto(key: string, blob: Blob) {
  const db = await idb()
  await new Promise((res, rej) => {
    const tx = db.transaction('p', 'readwrite')
    tx.objectStore('p').put(blob, key)
    tx.oncomplete = res
    tx.onerror = () => rej(tx.error)
  })
}
export async function getPhoto(key: string): Promise<Blob | undefined> {
  const db = await idb()
  return new Promise((res) => {
    const r = db.transaction('p').objectStore('p').get(key)
    r.onsuccess = () => res(r.result)
    r.onerror = () => res(undefined)
  })
}
export async function delPhoto(key: string) {
  const db = await idb()
  db.transaction('p', 'readwrite').objectStore('p').delete(key)
}

/** Downscale a camera photo before storing (keeps storage small). */
export async function shrink(file: Blob, max = 1280): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * s), height: Math.round(bmp.height * s) })
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.82))
}

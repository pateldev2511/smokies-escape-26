import { useCallback, useSyncExternalStore } from 'react'

// Device-only state (theme, personal trip-mode check-ins, passport missions, photos).
// Shared trip data lives in Supabase — see lib/doc.tsx.
const LOCAL = 'smk:local:'
const subs = new Set<() => void>()
let version = 0
const bump = () => (version++, subs.forEach((f) => f()))
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => e.key?.startsWith(LOCAL) && bump())
const subscribe = (f: () => void) => (subs.add(f), () => subs.delete(f))
const getVersion = () => version

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
      bump()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  return [value, set] as const
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

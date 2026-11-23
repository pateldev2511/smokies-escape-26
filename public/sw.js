// Smokies Escape ’26 service worker — offline-first app shell.
const VERSION = 'smk-__BUILD__'
const SHELL = `shell-${VERSION}`
const RUNTIME = 'runtime-v1'
const scope = self.registration.scope

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const list = await fetch(scope + 'precache.json', { cache: 'no-store' }).then((r) => r.json()).catch(() => [])
    const c = await caches.open(SHELL)
    await c.addAll(['./', ...list].map((p) => new URL(p, scope).href))
    self.skipWaiting()
  })())
})
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('shell-') && k !== SHELL) await caches.delete(k)
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // App navigation: network first, fall back to cached shell
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { caches.open(SHELL).then((c) => c.put(scope, r.clone())); return r }).catch(() => caches.match(scope, { ignoreVary: true })))
    return
  }
  // Same-origin static assets: cache first
  if (url.href.startsWith(scope)) {
    e.respondWith(caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then((r) => { if (r.ok) caches.open(RUNTIME).then((c) => c.put(req, r.clone())); return r })))
    return
  }
  // Map tiles & fonts you've already viewed: stale-while-revalidate (no bulk prefetching)
  if (/tile\.openstreetmap\.org|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.open(RUNTIME).then(async (c) => {
      const hit = await c.match(req, { ignoreVary: true })
      const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r }).catch(() => hit)
      return hit || net
    }))
  }
})

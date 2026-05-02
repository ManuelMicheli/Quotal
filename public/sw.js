/**
 * Quotal Member PWA — service worker (hand-rolled).
 *
 * Why hand-rolled instead of next-pwa / Serwist:
 *   Next 16 App Router doesn't ship a stable PWA plugin yet, the popular
 *   wrappers either bundle their own webpack passes that fight Turbopack
 *   or are unmaintained. For the surface we need (offline shell + last QR
 *   cached + push-ready) about 80 lines of plain SW code is far simpler
 *   and easier to reason about.
 *
 * Caching strategies:
 *   - Static assets (icons, manifest, /offline): cache-first, long-lived.
 *   - Member API (subscription, profile): network-first with 3s timeout +
 *     stale-while-revalidate fallback. NEVER cached aggressively because
 *     the data is personal and expires.
 *   - QR API (/api/member/qr): network-first with cache fallback so the
 *     last successful QR can be shown even when offline at the door.
 *   - HTML navigations: network-first → /offline.html fallback.
 *
 * Bumping the cache version below invalidates ALL caches on next install.
 */
/* global self, caches, fetch, Response, URL */

const VERSION = 'quotal-v3'
const STATIC_CACHE = `${VERSION}-static`
const RUNTIME_CACHE = `${VERSION}-runtime`
const QR_CACHE = `${VERSION}-qr`

const IS_LOCALHOST =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname.endsWith('.local')

// Dev: never let an old SW serve a cached offline shell when the dev server
// is just slow to compile. Wipe caches, unregister, and let every fetch go
// straight to the network. Prod listeners below are guarded with an early
// return so they no-op on localhost.
if (IS_LOCALHOST) {
  self.addEventListener('install', () => self.skipWaiting())
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
        await self.registration.unregister()
        const all = await self.clients.matchAll({ type: 'window' })
        for (const client of all) client.navigate(client.url)
      })(),
    )
  })
}

// Pre-cache the bare-minimum offline shell. Keep this list short — every
// asset here adds install time and storage pressure on low-end phones.
const PRECACHE_URLS = [
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  if (IS_LOCALHOST) return
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      // Tolerate failures here so we never block install on a 404 of one
      // optional asset.
      await Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u)))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  if (IS_LOCALHOST) return
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

// Helper: race the network with a timeout. Resolves to a Response on
// success, throws on timeout/network error so the caller can fall back.
async function fetchWithTimeout(request, ms) {
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    fetch(request)
      .then((res) => {
        clearTimeout(timer)
        resolve(res)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

self.addEventListener('fetch', (event) => {
  if (IS_LOCALHOST) return
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Only handle same-origin requests. Cross-origin (Stripe, Google Fonts)
  // goes straight through to the network.
  if (url.origin !== self.location.origin) return

  // -----------------------------------------------------------------
  // QR code endpoint — network-first with timeout, cache fallback.
  // The QR is mission-critical: at the door, the member MUST be able to
  // show *something*, even an expired QR is better than nothing because
  // staff can fall back to manual lookup.
  // -----------------------------------------------------------------
  if (url.pathname === '/api/member/qr') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetchWithTimeout(req, 4000)
          if (res && res.ok) {
            const cache = await caches.open(QR_CACHE)
            cache.put(req, res.clone())
          }
          return res
        } catch {
          const cached = await caches.match(req, { cacheName: QR_CACHE })
          if (cached) return cached
          return new Response(
            JSON.stringify({
              error: 'offline',
              message:
                'Offline e nessun QR salvato. Riconnettiti per generarne uno nuovo.',
            }),
            { status: 503, headers: { 'content-type': 'application/json' } },
          )
        }
      })(),
    )
    return
  }

  // -----------------------------------------------------------------
  // All other API routes — pure network. Never cache personalised
  // payloads (subscription state, payments, profile).
  // -----------------------------------------------------------------
  if (url.pathname.startsWith('/api/')) return

  // -----------------------------------------------------------------
  // Static assets under /icons, /_next/static, /manifest, /offline,
  // images: cache-first.
  // -----------------------------------------------------------------
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/offline' ||
    /\.(png|jpg|jpeg|svg|webp|woff2?|ico)$/i.test(url.pathname)

  if (isStatic) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req, { cacheName: STATIC_CACHE })
        if (cached) return cached
        try {
          const res = await fetch(req)
          if (res && res.ok) {
            const cache = await caches.open(STATIC_CACHE)
            cache.put(req, res.clone())
          }
          return res
        } catch {
          return cached ?? Response.error()
        }
      })(),
    )
    return
  }

  // -----------------------------------------------------------------
  // HTML navigation requests — network-first with offline fallback.
  // Keeps members on the latest UI when online but lets them open the
  // app shell when not.
  // -----------------------------------------------------------------
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetchWithTimeout(req, 5000)
          if (res && res.ok) {
            const cache = await caches.open(RUNTIME_CACHE)
            cache.put(req, res.clone())
          }
          return res
        } catch {
          const cached = await caches.match(req, { cacheName: RUNTIME_CACHE })
          if (cached) return cached
          const offline = await caches.match('/offline', {
            cacheName: STATIC_CACHE,
          })
          return (
            offline ??
            new Response(
              '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font-family:system-ui;padding:24px"><h1>Offline</h1><p>Riconnettiti per continuare.</p></body>',
              { status: 503, headers: { 'content-type': 'text/html' } },
            )
          )
        }
      })(),
    )
    return
  }
})

// -----------------------------------------------------------------
// Push notifications (Phase 09 send pipeline). The handler is
// installed now so subscriptions registered in Phase 07 will already
// receive payloads when the backend starts publishing them.
// -----------------------------------------------------------------
self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Quotal', body: event.data.text() }
  }
  const title = payload.title || 'Quotal'
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url || '/app' },
    tag: payload.tag,
    renotify: !!payload.renotify,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/app'
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of all) {
        if ('focus' in client && client.url.includes(url)) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })(),
  )
})

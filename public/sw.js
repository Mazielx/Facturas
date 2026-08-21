const CACHE_NAME = "grydex-v2"
const STATIC_CACHE = "grydex-static-v2"

// V-26 FIX: Don't precache authenticated routes — they contain PII
const PRECACHE_URLS = [
  "/",
  "/login",
  "/planes",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json",
  "/og-image.svg",
]

// Routes that should never be cached (authenticated)
const AUTH_ROUTES = ["/dashboard", "/facturas", "/empresa", "/configuracion", "/admin"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

// V-26 FIX: Clear all caches on logout message
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "LOGOUT") {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => caches.delete(k)))
      )
    )
  }
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== "GET") return

  // Never cache API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: "Sin conexion" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      })
    )
    return
  }

  // V-26 FIX: Never cache authenticated page navigations
  const isAuthRoute = AUTH_ROUTES.some((route) => url.pathname.startsWith(route))
  if (isAuthRoute && request.mode === "navigate") {
    event.respondWith(fetch(request))
    return
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
        })
      )
    )
    return
  }

  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
        })
      )
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.mode === "navigate") {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        if (request.mode === "navigate") {
          return caches.match(request).then((cached) => cached || caches.match("/"))
        }
        return caches.match(request)
      })
  )
})

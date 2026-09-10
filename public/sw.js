const CACHE = 'nfc-attendance-shell-v2'
const SHELL = ['/offline', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // ห้าม cache ข้อมูลผู้ใช้, Auth/API, NFC และหน้าครู/นักเรียน
  const sensitive = url.pathname.startsWith('/api/') || url.pathname.startsWith('/nfc/') || url.pathname.startsWith('/teacher') || url.pathname.startsWith('/student')
  if (request.mode === 'navigate' || sensitive) {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => caches.match('/offline')))
    return
  }

  // Cache เฉพาะไฟล์หน้าตาเว็บและไอคอนที่ไม่มีข้อมูลส่วนตัว
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest') {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone()
      caches.open(CACHE).then((cache) => cache.put(request, copy))
      return response
    })))
  }
})

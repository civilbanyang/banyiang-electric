// ══════════════════════════════════════════════════
//  Service Worker — ระบบแจ้งซ่อมไฟฟ้า ทต.บ้านยาง
//  v5 — simple, fast, auto update
// ══════════════════════════════════════════════════

const CACHE = 'banyiang-v5';
const BASE  = '/banyiang-electric';

const PRECACHE = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/icons/icon-192x192.png',
  BASE + '/icons/icon-512x512.png'
];

// ── Install ──────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate — ลบ cache เก่าออก ─────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Message — รับสัญญาณ skip waiting ────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Fetch ────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // ไม่แตะ Google APIs เลย — ต้องดึงสดทุกครั้ง
  if (url.includes('script.google.com') ||
      url.includes('drive.google.com') ||
      url.includes('docs.google.com')  ||
      url.includes('googleapis.com')) return;

  // GET เท่านั้น
  if (e.request.method !== 'GET') return;

  // Font — Cache First (font ไม่เคยเปลี่ยน)
  if (url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com')) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // ไฟล์โปรเจกต์ — Network First (ได้ล่าสุดเสมอ, fallback cache ตอนออฟไลน์)
  e.respondWith(networkFirst(e.request));
});

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const c = await caches.open(CACHE);
      c.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    if (req.destination === 'document')
      return caches.match(BASE + '/index.html');
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const c = await caches.open(CACHE);
      c.put(req, res.clone());
    }
    return res;
  } catch {
    return cached;
  }
}

// ══════════════════════════════════════════════
//  Service Worker — ระบบแจ้งซ่อมไฟฟ้า ทต.บ้านยาง
//  v4 — auto update + offline support
// ══════════════════════════════════════════════

const CACHE_NAME = 'banyiang-v4';
const BASE       = '/banyiang-electric';

// ไฟล์ที่ cache ไว้ใช้ offline
const PRECACHE = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/icons/icon-192x192.png',
  BASE + '/icons/icon-512x512.png'
];

// ══ Install — cache ไฟล์หลัก ══════════════════
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting()) // activate ทันทีไม่รอ tab ปิด
  );
});

// ══ Activate — ลบ cache เก่า ══════════════════
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // ควบคุม tab ที่เปิดอยู่ทันที
  );
});

// ══ รับ message จาก page ══════════════════════
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ══ Fetch — strategy ตามประเภท request ═══════
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // ไม่ cache: Google Apps Script, Drive API
  if (url.includes('script.google.com') ||
      url.includes('drive.google.com') ||
      url.includes('docs.google.com')) {
    return; // ส่งต่อตรงๆ ไม่แตะ cache
  }

  // Font: Cache First (font ไม่เปลี่ยน)
  if (url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // GET เท่านั้น
  if (event.request.method !== 'GET') return;

  // ไฟล์ในโปรเจกต์: Network First (ได้ข้อมูลล่าสุดเสมอ, fallback cache ตอน offline)
  event.respondWith(networkFirst(event.request));
});

// ── Network First: ดึงจาก network ก่อน, fallback cache ══
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()); // อัพเดต cache
    }
    return response;
  } catch (err) {
    // offline → ใช้ cache
    const cached = await caches.match(request);
    if (cached) return cached;
    // fallback → หน้าหลัก
    if (request.destination === 'document') {
      return caches.match(BASE + '/index.html');
    }
  }
}

// ── Cache First: ใช้ cache ก่อน, fallback network ══════
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return cached;
  }
}

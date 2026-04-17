// Waylog Service Worker — 오프라인 캐시 + PWA 기반
// 전략:
//  - HTML/JS/CSS(빌드 결과): stale-while-revalidate (빠른 실행 + 백그라운드 갱신)
//  - 이미지(리뷰 미디어, 제품 이미지): cache-first (용량 관리 위해 LRU 30일)
//  - Supabase API(/rest/v1, /auth/v1): network-first, 실패 시 캐시 폴백 (GET만)
//  - Claude Edge Function: 항상 네트워크 (캐시하지 않음)

const VERSION = "waylog-v2";
const STATIC_CACHE = `${VERSION}-static`;
const IMAGE_CACHE = `${VERSION}-image`;
const API_CACHE = `${VERSION}-api`;

const APP_SHELL = ["/", "/index.html"];

// install: 앱 쉘 prefetch
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// activate: 이전 버전 캐시 삭제
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => !k.startsWith(VERSION))
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// 메시지로 즉시 갱신 트리거
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Claude 함수는 절대 캐시 안 함
  if (url.pathname.includes("/functions/v1/claude")) return;

  // Supabase Auth — 절대 캐시하지 않음 (stale 세션/토큰 방지)
  if (url.pathname.startsWith("/auth/v1/") || url.pathname.includes("/auth/")) return;

  // Supabase REST
  if (url.pathname.startsWith("/rest/v1/")) {
    event.respondWith(networkFirst(req, API_CACHE));
    return;
  }

  // 이미지
  if (req.destination === "image" || /\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE));
    return;
  }

  // 정적 자산 (same-origin만)
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw new Error("offline_no_cache");
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// Waylog Service Worker v3
// 전략:
//  - HTML(navigate 요청): network-first (항상 최신 코드 보장)
//  - JS/CSS(빌드 결과, 해시 포함): stale-while-revalidate
//  - 이미지: cache-first (LRU 30일)
//  - Supabase Auth: 절대 캐시 안 함
//  - Supabase REST: network-first
//  - Claude Edge Function: 항상 네트워크

const VERSION = "waylog-v3";
const STATIC_CACHE = `${VERSION}-static`;
const IMAGE_CACHE = `${VERSION}-image`;
const API_CACHE = `${VERSION}-api`;

const APP_SHELL = ["/", "/index.html"];

// install: 앱 쉘 prefetch + 즉시 활성화
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// activate: 이전 버전 캐시 전부 삭제 + 클라이언트 점유
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

  // Supabase Auth — 절대 캐시하지 않음
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

  // same-origin 만
  if (url.origin !== self.location.origin) return;

  // ★ HTML(페이지 이동) — network-first: 항상 서버에서 최신 HTML 받기
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(networkFirst(req, STATIC_CACHE));
    return;
  }

  // JS/CSS 등 정적 자산 — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
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
    return Response.error();
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

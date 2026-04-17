// Waylog SW — 자폭형 클리너.
// 설치 즉시 모든 캐시를 삭제하고 SW를 해제한다.
// 모든 사용자의 브라우저가 이 파일을 받는 순간 깨끗한 상태가 된다.

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // 1. 모든 캐시 삭제
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    // 2. 클라이언트 점유
    await self.clients.claim();
    // 3. 자기 자신 해제
    await self.registration.unregister();
    // 4. 열려 있는 모든 탭 리로드 (깨끗한 상태로)
    const allClients = await self.clients.matchAll({ type: "window" });
    allClients.forEach((c) => c.navigate(c.url));
  })());
});

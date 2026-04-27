// Waylog FCM Web 푸시 Service Worker
// 등록 시 query string 으로 firebaseConfig 를 전달받는다 (registerFirebaseSW 참조).
// 백그라운드 메시지 도착 → 알림 표시. 클릭 시 data.url 로 이동.

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

(function init() {
  try {
    const params = new URL(self.location).searchParams;
    const config = {
      apiKey: params.get("apiKey"),
      authDomain: params.get("authDomain"),
      projectId: params.get("projectId"),
      storageBucket: params.get("storageBucket"),
      messagingSenderId: params.get("messagingSenderId"),
      appId: params.get("appId"),
    };
    if (!config.apiKey || !config.projectId || !config.appId) {
      console.warn("[fcm-sw] config missing — push handler disabled");
      return;
    }
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const noti = payload.notification || {};
      const data = payload.data || {};
      const title = noti.title || data.title || "웨이로그";
      const options = {
        body: noti.body || data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag || undefined,
        data,
      };
      self.registration.showNotification(title, options);
    });
  } catch (e) {
    console.warn("[fcm-sw] init failed:", e);
  }
})();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // 이미 열려있는 탭이 있으면 focus + navigate
    for (const c of allClients) {
      if ("focus" in c) {
        await c.focus();
        if ("navigate" in c) await c.navigate(url);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});

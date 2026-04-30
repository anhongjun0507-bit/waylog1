// 네이티브(Capacitor) 와 웹을 통합하는 얇은 어댑터.
// Capacitor 가 없는(= 순수 웹) 환경에서도 문제없이 동작하도록
// 동적 import 로 감싸고 실패 시 웹 구현을 사용한다.

/**
 * 현재 실행 환경이 Capacitor 네이티브 (iOS/Android) 인지 확인.
 * 웹 브라우저에서는 항상 false.
 */
export const isNative = () => {
  try {
    // Capacitor 는 window.Capacitor 를 주입한다.
    return !!(typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.());
  } catch { return false; }
};

/** 현재 플랫폼: "web" | "ios" | "android" */
export const getPlatform = () => {
  try { return window.Capacitor?.getPlatform?.() || "web"; }
  catch { return "web"; }
};

// ---------- Push Notifications ----------
// 웹: 기존 VAPID Web Push (utils/push.js) 사용
// 네이티브: @capacitor/push-notifications 로 FCM/APNs 토큰 획득 후
//   push_subscriptions 테이블에 동일 스키마로 저장 (endpoint 대신 토큰)

// 1.4.5: Android 8+ 알림 채널 생성 — IMPORTANCE_HIGH 로 heads-up 알림 보장.
// FCM 의 send-push 가 channel_id="waylog_push_default" 로 메시지 전송하므로
// 동일 ID 의 채널이 디바이스에 존재해야 OS 가 그 채널 importance 로 표시.
// 채널은 한 번 생성되면 OS 영구 보존 — 매번 호출해도 멱등.
export const ensurePushChannel = async () => {
  if (!isNative() || getPlatform() !== "android") return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    if (typeof PushNotifications.createChannel !== "function") return;
    await PushNotifications.createChannel({
      id: "waylog_push_default",
      name: "웨이로그 알림",
      description: "좋아요·댓글·팔로우·챌린지 알림",
      importance: 5, // IMPORTANCE_HIGH (heads-up + 사운드)
      visibility: 1, // VISIBILITY_PUBLIC (잠금화면 표시)
      sound: "default",
      vibration: true,
      lights: true,
    });
  } catch (e) {
    console.warn("createChannel 실패:", e);
  }
};

/**
 * 네이티브 푸시 권한 요청 + 토큰 등록.
 * 반환: { platform, token } | null
 */
export const registerNativePush = async (userId) => {
  if (!isNative() || !userId) return null;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return null;
    // 1.4.5: register() 전에 채널 보장 — 첫 메시지가 default 채널로 가지 않도록.
    await ensurePushChannel();
    await PushNotifications.register();
    // 실제 토큰 수신은 이벤트로. Promise 로 감싸 반환.
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 10_000);
      PushNotifications.addListener("registration", async (t) => {
        clearTimeout(timer);
        try {
          const { supabase } = await import("../supabase.js");
          if (supabase) {
            await supabase.from("push_subscriptions").upsert({
              user_id: userId,
              endpoint: `native:${getPlatform()}:${t.value}`,
              keys: { token: t.value, platform: getPlatform() },
              updated_at: new Date().toISOString(),
            }, { onConflict: "endpoint" });
          }
        } catch (e) { console.warn("native push 저장 실패:", e); }
        resolve({ platform: getPlatform(), token: t.value });
      });
      PushNotifications.addListener("registrationError", () => {
        clearTimeout(timer);
        resolve(null);
      });
    });
  } catch (e) {
    console.warn("native push 로드 실패:", e);
    return null;
  }
};

// ---------- Status Bar / Splash ----------
// 앱 부팅 직후 1회 호출 — dark 모드 상태에 맞춰 상태바 조정 + 스플래시 숨김

export const initNativeChrome = async (dark = false) => {
  if (!isNative()) return;
  try {
    const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
      import("@capacitor/status-bar"),
      import("@capacitor/splash-screen"),
    ]);
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: dark ? "#111827" : "#0071CE" });
    // 앱 준비 완료 후 스플래시 해제
    await SplashScreen.hide();
  } catch (e) {
    console.warn("native chrome init 실패:", e);
  }
};

// 다크모드 토글 시 상태바 재적용
export const setNativeStatusBar = async (dark) => {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: dark ? "#111827" : "#0071CE" });
  } catch {}
};

// ---------- Deep Link (Supabase OAuth 콜백) ----------
// 네이티브에서 OAuth 후 com.waylog.app://auth-callback 로 돌아오면
// URL 의 access_token/refresh_token 을 Supabase 세션에 주입.

export const initDeepLinkHandler = async () => {
  if (!isNative()) return;
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appUrlOpen", async (event) => {
      if (!event?.url) return;
      try {
        const url = new URL(event.url);
        // OAuth 리다이렉트만 처리
        if (url.pathname.includes("auth-callback") || url.hash) {
          const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
          const params = new URLSearchParams(hash || url.search);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            const { supabase } = await import("../supabase.js");
            if (supabase) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          }
        }
      } catch (e) { console.warn("deep link 처리 실패:", e); }
    });
  } catch (e) { console.warn("App 플러그인 로드 실패:", e); }
};

// ---------- Back Button (Android 물리 뒤로가기) ----------
// Capacitor 의 backButton 이벤트를 호출측 handler 로 위임.
// handler 는 { canGoBack: boolean } 을 받고, 앱 상태에 맞춰 모달/라우트/종료를 결정.
// 반환: 해제용 subscription 객체 (remove 메서드), 또는 null.

export const initBackButtonHandler = async (handler) => {
  if (!isNative() || getPlatform() !== "android") return null;
  if (typeof handler !== "function") return null;
  try {
    const { App } = await import("@capacitor/app");
    return await App.addListener("backButton", (event) => {
      try { handler(event || {}); }
      catch (e) { console.warn("backButton handler 오류:", e); }
    });
  } catch (e) {
    console.warn("backButton 등록 실패:", e);
    return null;
  }
};

// ---------- Push Click (네이티브 알림 탭 → deep link) ----------
// 사용자가 OS 알림 트레이에서 푸시 알림을 탭하면 호출. notification.data.url 을
// handler 로 전달 → 호출측이 라우터로 이동.
//
// Capacitor PushNotifications 는 두 가지 click 이벤트를 통합 처리한다:
//   - 백그라운드/종료 상태에서 알림 탭 → 앱 부팅 후 발화
//   - 포그라운드에서 알림 탭 (드물지만 가능)
//
// 반환: { remove() } subscription 객체 또는 null.
export const initPushClickHandler = async (handler) => {
  if (!isNative()) return null;
  if (typeof handler !== "function") return null;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    return await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      try {
        const url = action?.notification?.data?.url || "/";
        handler(url, action.notification);
      } catch (e) {
        console.warn("push click handler 오류:", e);
      }
    });
  } catch (e) {
    console.warn("push click listener 등록 실패:", e);
    return null;
  }
};

// Capacitor App.exitApp — 명시적으로 앱 종료 (호출측에서 조건 판단 후 사용).
export const exitApp = async () => {
  if (!isNative()) return;
  try {
    const { App } = await import("@capacitor/app");
    await App.exitApp();
  } catch {}
};

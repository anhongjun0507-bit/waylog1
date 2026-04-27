// Waylog 푸시 구독 어댑터.
//
// 웹: Firebase FCM Web Push (firebase-messaging-sw.js + getToken).
// 네이티브: Capacitor PushNotifications → FCM 토큰.
// 두 경로 모두 push_subscriptions 테이블에 endpoint/keys 저장.
//
// 1.2.0 부터 웹 측은 VAPID PushManager → FCM 토큰 방식으로 통일.
// send-push Edge Function 이 endpoint 접두어(web:/native:) 로 분기해 FCM HTTP v1 호출.
//
// 준비물 (Vercel env):
//   VITE_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / STORAGE_BUCKET
//   VITE_FIREBASE_MESSAGING_SENDER_ID / APP_ID
//   VITE_FIREBASE_VAPID_KEY ← FCM Web Push VAPID public key

import { supabase } from "../supabase.js";
import { isNative, registerNativePush, getPlatform } from "./platform.js";

export function pushSupported() {
  if (isNative()) return true;
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export async function requestPushPermission() {
  if (!pushSupported()) return "unsupported";
  // 네이티브는 Capacitor 가 자체적으로 권한 다이얼로그 처리 (subscribePush 안에서)
  if (isNative()) return "granted";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

// FCM Web 토큰 등록. 성공 시 { token } 반환, 실패 시 null.
async function subscribeWebFCM(userId) {
  try {
    const { registerFirebaseSW, getFirebaseMessaging, getToken, VAPID_KEY } = await import("../firebase.js");
    if (!VAPID_KEY) {
      console.warn("VITE_FIREBASE_VAPID_KEY 미설정 — Web 푸시 비활성화");
      return null;
    }
    const swReg = await registerFirebaseSW();
    if (!swReg) return null;
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    if (!token) return null;
    if (supabase && userId) {
      try {
        await supabase.from("push_subscriptions").upsert({
          user_id: userId,
          endpoint: `web:${token}`,
          keys: { fcm_token: token, platform: "web" },
          updated_at: new Date().toISOString(),
        }, { onConflict: "endpoint" });
        // 같은 user 의 stale (30일 +) endpoint 정리
        const staleCutoff = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
        await supabase.from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .neq("endpoint", `web:${token}`)
          .lt("updated_at", staleCutoff);
      } catch (e) {
        console.warn("push subscription 저장 실패:", e);
      }
    }
    return { token, platform: "web" };
  } catch (e) {
    console.warn("FCM web subscribe 실패:", e);
    return null;
  }
}

export async function subscribePush(userId) {
  if (isNative()) return registerNativePush(userId);
  if (!pushSupported() || !userId) return null;
  return subscribeWebFCM(userId);
}

// 사용자가 앱을 열고 있을 때 도착하는 메시지(foreground) 처리.
// 기본적으로 OS 알림이 뜨지 않으므로 호출측이 인앱 토스트 등으로 표시.
// 반환: unsubscribe 함수 또는 null.
export async function subscribeForegroundMessages(handler) {
  if (typeof window === "undefined" || isNative()) return null;
  try {
    const { getFirebaseMessaging, onMessage } = await import("../firebase.js");
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;
    return onMessage(messaging, (payload) => {
      try { handler && handler(payload); }
      catch (e) { console.warn("onMessage handler error:", e); }
    });
  } catch (e) {
    console.warn("onMessage subscribe 실패:", e);
    return null;
  }
}

export async function unsubscribePush(userId) {
  if (!pushSupported()) return;
  if (isNative()) {
    // 네이티브: 토큰 자체는 OS 가 관리. Supabase 행만 삭제.
    if (supabase && userId) {
      try {
        const platform = getPlatform();
        await supabase.from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .like("endpoint", `native:${platform}:%`);
      } catch {}
    }
    return;
  }
  // 웹: FCM 토큰 sub 만 정리
  try {
    const { getFirebaseMessaging } = await import("../firebase.js");
    const messaging = await getFirebaseMessaging();
    if (messaging) {
      const { deleteToken } = await import("firebase/messaging");
      try { await deleteToken(messaging); } catch {}
    }
    if (supabase && userId) {
      try {
        await supabase.from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .like("endpoint", "web:%");
      } catch {}
    }
  } catch (e) {
    console.warn("unsubscribePush 실패:", e);
  }
}

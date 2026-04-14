// Web Push 구독 유틸 (VAPID 기반).
// - 실제 푸시 전송은 서버 측 구현 필요 (Supabase Edge Function 추천).
// - 여기서는 (1) 브라우저 권한 요청 (2) PushManager 구독 (3) 구독 정보 Supabase 저장 역할.
//
// 준비물 (사용자):
//   1) VAPID key 쌍 생성: `npx web-push generate-vapid-keys`
//   2) 공개 키를 VITE_VAPID_PUBLIC_KEY 환경변수에 넣기
//   3) push_subscriptions 테이블 생성 (migrations 참조)

import { supabase } from "../supabase.js";

const PUB = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

export function pushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export async function requestPushPermission() {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export async function subscribePush(userId) {
  if (!pushSupported() || !PUB || !userId) return null;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUB),
    });
  }
  if (supabase) {
    try {
      // 같은 endpoint 는 conflict 로 업데이트.
      // 추가로 같은 user 의 오래된(updated_at > 30일) orphan 구독은 정리
      //  — 기기 분실·브라우저 변경 등으로 더 이상 valid 하지 않을 가능성.
      await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        endpoint: sub.endpoint,
        keys: sub.toJSON().keys || {},
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });

      const staleCutoff = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
      await supabase.from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .neq("endpoint", sub.endpoint)
        .lt("updated_at", staleCutoff);
    } catch (e) {
      console.warn("push subscription 저장 실패:", e);
    }
  }
  return sub;
}

export async function unsubscribePush(userId) {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    if (supabase && userId) {
      try { await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); } catch {}
    }
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

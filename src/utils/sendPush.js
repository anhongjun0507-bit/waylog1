// 1.2.0 푸시 알림 호출 헬퍼.
// supabase/functions/send-push (Edge Function) 으로 위임.
// 함수가 인앱 알림(notifications insert) + 푸시 발송 둘 다 처리.
//
// 실패는 silent — 알림 발송 실패가 핵심 액션(좋아요/댓글/팔로우)을 막지 않도록.

import { supabase } from "../supabase.js";

/**
 * @param {string} userId — 알림 받을 사용자 UUID
 * @param {"like"|"comment"|"follow"|"challenge"|"news"} type
 * @param {string} title
 * @param {string} body
 * @param {object} [data] — { url, ... } (모두 string 으로 직렬화됨)
 */
export async function sendPushNotification(userId, type, title, body, data = {}) {
  if (!supabase || !userId || !type || !title || !body) return;
  try {
    await supabase.functions.invoke("send-push", {
      body: { userId, type, title, body, data },
    });
  } catch (e) {
    console.warn("[push] send failed:", e?.message || e);
  }
}

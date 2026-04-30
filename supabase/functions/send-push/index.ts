// Supabase Edge Function: Waylog 푸시 알림 발송
//
// 배포: supabase functions deploy send-push
//   (verify_jwt 기본 true — 익명 호출 차단. 클라이언트는 supabase.functions.invoke 사용 시 자동으로 user JWT 첨부)
//   Vercel Cron 등 서버 측 호출은 SUPABASE_SERVICE_ROLE_KEY 를 Authorization Bearer 로 전달.
//
// 비밀 설정 (한 번만):
//   supabase secrets set FIREBASE_SERVICE_ACCOUNT='<service-account.json 내용 통째로>'
//
// 입력 (JSON):
//   {
//     "userId": "uuid",                              // 알림 받을 사용자
//     "type": "like" | "comment" | "follow" | "challenge" | "news",
//     "title": "string (≤ 60)",
//     "body": "string (≤ 200)",
//     "data": { "url": "/review/xxx", ... }          // (선택) 클릭 시 이동 URL 등
//   }
//
// 동작:
//   1) sender 신원 + type 별 권한 검증 (1.4.0)
//   2) profiles.notif_prefs[type] 이 false 면 skip
//   3) notifications 테이블 row insert (인앱 알림)
//   4) push_subscriptions fetch 후 endpoint 분기:
//      - "web:<fcm_token>"            → FCM HTTP v1
//      - "native:android:<fcm_token>" → FCM HTTP v1
//      - 그 외 (legacy raw URL)        → 1.2.0 미지원, skip
//   5) 응답 NOT_REGISTERED/INVALID_ARGUMENT/404 → push_subscriptions 행 삭제
//
// 1.4.0 보안 강화 (audit-2026-04-28.md P0-2, P0-3)
//   sender 검증 부재 → 임의 사용자가 임의 userId 에게 임의 푸시 발송 가능했음.
//   호출 모드 3 가지로 분기:
//     1. service_role (cron / 내부 호출): Authorization 이 SERVICE_ROLE_KEY → 모든 type 허용.
//     2. admin user JWT: app_metadata.role === "admin" → 모든 type 허용 (NewsBroadcast 포함).
//     3. 일반 user JWT:
//          - like / comment / follow → sender.id !== userId 강제 (셀프 푸시 차단)
//          - news / challenge        → 거부 (admin / cron 만 가능)

// deno-lint-ignore-file no-explicit-any
// @ts-ignore - Deno 런타임 (로컬 타입체크 무시)
declare const Deno: { env: { get(key: string): string | undefined } };

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TYPE_TO_PREF_KEY: Record<string, string> = {
  like: "likes",
  comment: "comments",
  follow: "follows",
  challenge: "challenge",
  news: "news",
};

// FCM HTTP v1 OAuth2 access token 캐시 (Edge Function 인스턴스 콜드 스타트 동안만 유효)
let _fcmAccessToken: string | null = null;
let _fcmAccessTokenExpiry = 0;

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s/g, "");
  const bin = atob(cleaned);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function base64UrlEncode(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    bytes = new Uint8Array(input);
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getFCMAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (_fcmAccessToken && _fcmAccessTokenExpiry > now + 60) {
    return _fcmAccessToken;
  }
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${payload}`;

  const keyData = pemToArrayBuffer(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${base64UrlEncode(signature)}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`FCM token exchange failed: ${tokenRes.status} ${errText}`);
  }
  const tokenJson = await tokenRes.json();
  _fcmAccessToken = tokenJson.access_token;
  _fcmAccessTokenExpiry = now + (tokenJson.expires_in || 3600);
  return _fcmAccessToken!;
}

type PushResult = "ok" | "invalid" | "error";

async function sendFCM(
  serviceAccount: any,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<PushResult> {
  try {
    const accessToken = await getFCMAccessToken(serviceAccount);
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            // FCM data 페이로드는 모든 값이 string 이어야 함
            data,
            // 웹 클릭 시 fcm_options.link 로 이동
            webpush: {
              fcm_options: { link: data.url || "/" },
            },
            // 1.4.5: 알림 도달 즉시화 + heads-up 표시.
            //   priority "high" — FCM 메시지 전달 즉시 (Android Doze 우회)
            //   notification_priority "PRIORITY_MAX" — heads-up 알림으로 표시
            //   channel_id "waylog_push_default" — Android 8+ IMPORTANCE_HIGH 채널
            //   default_sound true — 기본 알림음
            //   default_vibrate_timings true — 기본 진동
            android: {
              priority: "high",
              notification: {
                sound: "default",
                channel_id: "waylog_push_default",
                notification_priority: "PRIORITY_MAX",
                default_sound: true,
                default_vibrate_timings: true,
              },
            },
          },
        }),
      },
    );
    if (res.ok) return "ok";
    const errBody = await res.json().catch(() => ({}));
    const errorCode = errBody?.error?.details?.[0]?.errorCode
      || errBody?.error?.status
      || "";
    // invalid registration token (앱 삭제·재설치, 만료 등)
    if (
      errorCode === "UNREGISTERED" ||
      errorCode === "INVALID_ARGUMENT" ||
      errorCode === "NOT_FOUND" ||
      res.status === 404
    ) {
      return "invalid";
    }
    console.warn("FCM send error:", res.status, JSON.stringify(errBody).slice(0, 300));
    return "error";
  } catch (e) {
    console.warn("sendFCM threw:", e);
    return "error";
  }
}

// @ts-ignore - Deno.serve 런타임 제공
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const FIREBASE_SA = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "supabase_not_configured" }), {
      status: 500,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }
  if (!FIREBASE_SA) {
    return new Response(JSON.stringify({ error: "firebase_not_configured" }), {
      status: 500,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }
  const { userId, type, title, body: text, data } = body || {};
  if (!userId || !type || !title || !text) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }
  const prefKey = TYPE_TO_PREF_KEY[type as string];
  if (!prefKey) {
    return new Response(JSON.stringify({ error: "unknown_type" }), {
      status: 400,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(FIREBASE_SA);
  } catch {
    return new Response(JSON.stringify({ error: "service_account_invalid_json" }), {
      status: 500,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 1.4.0 sender 검증 + type 별 권한 ────────────────────────────────
  // verify_jwt 가 켜져 있어 Authorization 헤더는 게이트웨이에서 1차 검증되지만,
  // 함수 안에서도 sender 신원을 직접 꺼내야 type 별 가드를 적용할 수 있다.
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!bearer) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  // service_role 호출 (send-challenge-reminders cron 등) 은 모든 type 허용.
  // SERVICE_ROLE 토큰을 정확히 일치 비교 — 부분 매치는 위험.
  const isServiceRole = bearer === SERVICE_ROLE;
  let senderId: string | null = null;
  let senderIsAdmin = false;
  if (!isServiceRole) {
    const { data: userData, error: userErr } = await supabase.auth.getUser(bearer);
    const sender = userData?.user;
    if (userErr || !sender?.id) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...CORS, "content-type": "application/json" },
      });
    }
    senderId = sender.id;
    // app_metadata.role 은 Supabase Dashboard 또는 admin API 로만 설정 가능 → 신뢰 가능.
    senderIsAdmin = (sender.app_metadata as Record<string, unknown> | null)?.role === "admin";
  }

  // type 별 가드
  if (!isServiceRole) {
    if (type === "news" || type === "challenge") {
      // news: AdminModerationScreen 의 NewsBroadcast — admin 만.
      // challenge: 평소엔 cron(service_role) 만 발송. 일반 user 가 보낼 일 없음.
      if (!senderIsAdmin) {
        return new Response(JSON.stringify({ error: "admin_only" }), {
          status: 403,
          headers: { ...CORS, "content-type": "application/json" },
        });
      }
    } else if (type === "like" || type === "comment" || type === "follow") {
      // 셀프 푸시 차단 — 다른 사용자에게만 발송 가능.
      // 클라이언트(App.jsx)가 이미 if (authorId !== user.id) 가드하지만 서버에서도 강제.
      if (senderId === userId) {
        return new Response(JSON.stringify({ error: "self_push_not_allowed" }), {
          status: 403,
          headers: { ...CORS, "content-type": "application/json" },
        });
      }
      // 추가 정합성 (sender 가 실제로 해당 review/comment/follow 를 했는지) 은
      // 호출 빈도·DB 부하·UX 지연 trade-off 로 현 시점 미적용.
      // 1.5.0 에서 type 별 review_id/comment_id/follow target 검증 검토.
    }
    // 다른 type (이미 위에서 unknown_type 으로 차단됨) — 도달 불가.
  }

  // 1) notif_prefs 체크 — 기본값 ON. 명시적으로 false 면 skip.
  const { data: profile } = await supabase
    .from("profiles")
    .select("notif_prefs")
    .eq("id", userId)
    .maybeSingle();
  const prefs = (profile?.notif_prefs as Record<string, boolean>) || {};
  const allowed = prefs[prefKey] !== false;
  if (!allowed) {
    return new Response(JSON.stringify({ ok: true, skipped: "pref_disabled" }), {
      status: 200,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  // 2) 인앱 알림 row insert (notifications 테이블 — RLS 우회 위해 service_role)
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      text: `${title} — ${text}`.slice(0, 200),
      data: { type, title, body: text, ...(data || {}) },
    });
  } catch (e) {
    console.warn("notifications insert failed:", e);
  }

  // 3) push_subscriptions fetch
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint")
    .eq("user_id", userId);

  // 4) 각 endpoint 발송 — FCM 만 지원
  // FCM data payload 는 모든 값이 string 이어야 함
  const dataString: Record<string, string> = {
    type: String(type),
    url: data?.url ? String(data.url) : "/",
  };
  if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data)) {
      if (k !== "url" && v != null) dataString[k] = String(v);
    }
  }

  let sentCount = 0;
  let invalidCount = 0;
  let errorCount = 0;
  let skippedLegacy = 0;

  for (const sub of subs || []) {
    const ep: string = sub.endpoint || "";
    let token: string | null = null;
    if (ep.startsWith("web:")) {
      token = ep.substring(4);
    } else if (ep.startsWith("native:")) {
      // native:android:<token> 또는 native:ios:<token>
      const parts = ep.split(":");
      token = parts.slice(2).join(":"); // 토큰에 ":" 가 있을 가능성 대비
    } else {
      // legacy raw PushSubscription URL — 1.2.0 미지원
      // (사용자가 푸시 재등록 시 push.js 가 FCM 토큰으로 마이그레이션)
      skippedLegacy++;
      continue;
    }
    if (!token) continue;

    const result = await sendFCM(serviceAccount, token, title, text, dataString);
    if (result === "ok") sentCount++;
    else if (result === "invalid") {
      invalidCount++;
      try {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      } catch {}
    } else {
      errorCount++;
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    sent: sentCount,
    invalid: invalidCount,
    error: errorCount,
    skipped_legacy: skippedLegacy,
    total: (subs || []).length,
  }), {
    status: 200,
    headers: { ...CORS, "content-type": "application/json" },
  });
});

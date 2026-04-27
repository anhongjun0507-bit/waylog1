// Supabase Edge Function: 챌린지 일일 리마인더 발송 (KST 19:00)
//
// 호출 흐름:
//   Vercel Cron (UTC 10:00 = KST 19:00)
//     → /api/cron/challenge-reminder (Vercel Serverless)
//     → 이 함수 (CRON_SECRET 인증)
//     → 각 활성 사용자에게 send-push 호출
//
// 배포: supabase functions deploy send-challenge-reminders
//   (verify_jwt 기본 true. CRON_SECRET 헤더로 자체 인증)
//
// 비밀 설정 (한 번만):
//   supabase secrets set CRON_SECRET=<랜덤 문자열, Vercel 측과 동일 값>
//
// 활성 사용자 정의:
//   최근 7일 내 challenge_logs 에 row 가 있는 user_id (= 챌린지 진행 중)
//   AND
//   오늘 (KST) day_key 행이 없음 (= 아직 기록 안 함)
//
// 응답: { ok, active, target, sent, failed }

// deno-lint-ignore-file no-explicit-any
// @ts-ignore - Deno 런타임
declare const Deno: { env: { get(key: string): string | undefined } };

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function todayKST(): string {
  // UTC + 9시간 → KST 기준 ISO date.
  // challenge_logs.day_key 는 클라이언트가 작성 시점의 로컬 날짜로 저장 (한국 사용자만 가정).
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kstNow.toISOString().slice(0, 10);
}

function dateKeyDaysAgoKST(days: number): string {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kstNow.setUTCDate(kstNow.getUTCDate() - days);
  return kstNow.toISOString().slice(0, 10);
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

  // CRON_SECRET 인증 — Vercel Cron 측에서 동일 값을 Authorization Bearer 로 전달
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${Deno.env.get("CRON_SECRET") || ""}`;
  if (!Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "cron_secret_not_configured" }), {
      status: 500,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }
  if (auth !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "supabase_not_configured" }), {
      status: 500,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) 최근 7일 내 challenge_logs 가 있는 사용자 = 활성 사용자
  const sevenDaysAgo = dateKeyDaysAgoKST(7);
  const { data: activeRows, error: activeErr } = await supabase
    .from("challenge_logs")
    .select("user_id")
    .gte("day_key", sevenDaysAgo);
  if (activeErr) {
    return new Response(JSON.stringify({ error: "active_fetch_failed", detail: activeErr.message }), {
      status: 500,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }
  const activeUserIds = Array.from(new Set((activeRows || []).map((r: any) => r.user_id).filter(Boolean)));

  // 2) 오늘(KST) 이미 기록한 사용자 = 리마인더 제외
  const today = todayKST();
  const { data: todayRows } = await supabase
    .from("challenge_logs")
    .select("user_id")
    .eq("day_key", today);
  const todayUserIds = new Set((todayRows || []).map((r: any) => r.user_id));

  // 3) 활성 사용자 중 오늘 미기록 = 리마인더 대상
  const targetIds = activeUserIds.filter((id) => !todayUserIds.has(id));

  // 4) 각 사용자에게 send-push 호출 (병렬 — 100명 이하면 OK)
  const results = await Promise.allSettled(targetIds.map(async (userId) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        type: "challenge",
        title: "오늘 운동하셨나요? 🏃",
        body: "챌린지 기록을 남겨보세요",
        data: { url: "/challenge" },
      }),
    });
    if (!res.ok) throw new Error(`send-push ${res.status}`);
    return true;
  }));

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  return new Response(JSON.stringify({
    ok: true,
    active: activeUserIds.length,
    target: targetIds.length,
    sent,
    failed,
  }), {
    status: 200,
    headers: { ...CORS, "content-type": "application/json" },
  });
});

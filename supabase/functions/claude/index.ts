// Supabase Edge Function: Claude API 프록시
//
// 1.4.0 보안 강화 (audit-2026-04-28.md P0-1, P1-7)
//   - verify_jwt 강제 (배포 명령에서 --no-verify-jwt 제거).
//   - 함수 안에서 user JWT decode → user_id 추출.
//   - DB 기반 사용자별 일일 쿼터 (user_ai_quota, cap = DAILY_CAP).
//   - 메모리 IP rate limit 폐기 (콜드스타트 초기화·헤더 스푸핑으로 무력).
//
// 배포: supabase functions deploy claude
// 비밀 설정: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 Supabase 가 자동 주입.
//
// 클라이언트는 VITE_ANTHROPIC_API_KEY 를 갖지 않는다.
// 이 함수가 서버에서만 키를 읽어 Anthropic 에 호출한다.

// deno-lint-ignore-file no-explicit-any
// @ts-ignore - Deno 런타임 (로컬 타입체크 무시)
declare const Deno: { env: { get(key: string): string | undefined } };

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

// 사용자별 일일 호출 cap. vision + text 합산.
// 1.3.0 에서 클라이언트 cap 5회 제거 → 무제한 UX 유지하되 abuse 방지선.
// 변경 시 user_ai_quota 마이그레이션 주석도 같이 갱신.
const DAILY_CAP = 50;

// content 는 text 외에 vision(image) 블록 배열도 허용한다.
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };
type Body = {
  prompt?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string | ContentBlock[] }>;
  model?: string;
  max_tokens?: number;
  system?: string;
};

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

// @ts-ignore - Deno.serve 런타임 제공
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey) return jsonResponse({ error: "server_not_configured" }, 500);
  if (!SUPABASE_URL || !SERVICE_ROLE) return jsonResponse({ error: "supabase_not_configured" }, 500);

  // ── 인증: user JWT 필수 ────────────────────────────────────────────
  // verify_jwt 가 켜져 있으면 Supabase 게이트웨이가 헤더를 1차 확인하지만,
  // 함수 안에서도 user 객체를 직접 꺼내 user_id 를 확보해야 쿼터 적용 가능.
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }
  const token = authHeader.slice(7).trim();
  if (!token) return jsonResponse({ error: "unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user?.id) return jsonResponse({ error: "invalid_token" }, 401);

  // ── 일일 쿼터 ─────────────────────────────────────────────────────
  // 같은 사용자×날짜 row 가 있으면 count 확인, 없으면 0 으로 간주.
  // KST 자정 기준이 아니라 UTC 자정 기준 — 운영상 유의 (사용자 체감 cap 시점 약 9시간 차).
  const today = new Date().toISOString().slice(0, 10);
  const { data: quotaRow } = await supabase
    .from("user_ai_quota")
    .select("count")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();
  const currentCount = (quotaRow?.count as number | null) ?? 0;
  if (currentCount >= DAILY_CAP) {
    return jsonResponse({
      error: "quota_exceeded",
      message: `오늘 AI 호출 한도(${DAILY_CAP}회) 를 초과했어요. 내일 다시 시도해주세요.`,
      cap: DAILY_CAP,
      used: currentCount,
    }, 429);
  }

  // ── 입력 파싱 ─────────────────────────────────────────────────────
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const messages = body.messages
    ?? (body.prompt ? [{ role: "user" as const, content: body.prompt }] : null);
  if (!messages || messages.length === 0) {
    return jsonResponse({ error: "messages_required" }, 400);
  }

  const payload: Record<string, unknown> = {
    model: body.model || DEFAULT_MODEL,
    max_tokens: Math.min(Math.max(body.max_tokens ?? 500, 1), 4096),
    messages,
  };
  if (body.system) payload.system = body.system;

  // ── Anthropic 호출 ────────────────────────────────────────────────
  let upstreamRes: Response;
  try {
    upstreamRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(payload),
    });
  } catch (e: any) {
    return jsonResponse({ error: "upstream_error", detail: String(e?.message || e) }, 502);
  }

  const data = await upstreamRes.json().catch(() => ({}));
  const text = data?.content?.[0]?.text ?? "";

  // ── 쿼터 증가 (성공·실패 무관 1회 차감) ────────────────────────────
  // 정책: Anthropic 에 요청이 도달했으면 비용 발생 가능 → 실패해도 카운트.
  //       upstream 자체가 안 닿은 경우 (네트워크 throw) 는 위에서 502 로 빠져나가 차감 없음.
  // upsert: PK (user_id, date) 충돌 시 count 만 갱신. 단순 +1 은 race 위험이 있으나
  //         오차 1~2회 정도이며 cap 50 의 의미를 흔들지 않는다.
  try {
    await supabase
      .from("user_ai_quota")
      .upsert({
        user_id: user.id,
        date: today,
        count: currentCount + 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,date" });
  } catch (e) {
    console.warn("[claude] quota upsert failed:", e);
    // 쿼터 기록 실패해도 사용자 응답은 막지 않는다 — fail-open (운영 가시성 < 가용성).
  }

  return jsonResponse({ ok: upstreamRes.ok, text, raw: data }, upstreamRes.ok ? 200 : upstreamRes.status);
});

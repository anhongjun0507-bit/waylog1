// Supabase Edge Function: Claude API 프록시
// 배포: supabase functions deploy claude --no-verify-jwt
// 비밀 설정: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// 클라이언트는 VITE_ANTHROPIC_API_KEY를 더 이상 갖지 않는다.
// 이 함수가 서버에서만 키를 읽어 Anthropic에 호출한다.

// deno-lint-ignore-file no-explicit-any
// @ts-ignore - Deno 런타임 (로컬 타입체크 무시)
declare const Deno: { env: { get(key: string): string | undefined } };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

type Body = {
  prompt?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  max_tokens?: number;
  system?: string;
};

// 간단한 IP 기반 레이트리밋 (프로세스 메모리 — 함수 콜드스타트 시 초기화)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const rateMap = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.reset < now) {
    rateMap.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
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

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "server_not_configured" }), {
      status: 500,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  const messages = body.messages
    ?? (body.prompt ? [{ role: "user" as const, content: body.prompt }] : null);
  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages_required" }), {
      status: 400,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  const payload: Record<string, unknown> = {
    model: body.model || DEFAULT_MODEL,
    max_tokens: Math.min(Math.max(body.max_tokens ?? 500, 1), 4096),
    messages,
  };
  if (body.system) payload.system = body.system;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    const text = data?.content?.[0]?.text ?? "";
    return new Response(JSON.stringify({ ok: res.ok, text, raw: data }), {
      status: res.ok ? 200 : res.status,
      headers: { ...CORS, "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "upstream_error", detail: String(e?.message || e) }), {
      status: 502,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }
});

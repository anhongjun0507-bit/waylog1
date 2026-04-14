// Admin-only 모더레이션 Edge Function
// - 관리자는 auth.users.app_metadata.role === 'admin' 으로 판별
// - GET: 대기중 신고 목록 / PATCH: 신고 처리(status 변경 + 대상 조치)
//
// 배포: supabase functions deploy moderation
// 호출: supabase.functions.invoke('moderation', { body: { action, ... } })

// @ts-ignore Deno 런타임
declare const Deno: { env: { get(k: string): string | undefined } };
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, serviceKey);

  // 관리자 검증
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user || (user.app_metadata as any)?.role !== "admin") {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...CORS, "content-type": "application/json" },
    });
  }

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const action = (body as any).action;

  if (action === "list") {
    const status = (body as any).status || "pending";
    const { data, error } = await supabase.from("reports").select("*")
      .eq("status", status).order("created_at", { ascending: false }).limit(100);
    return new Response(JSON.stringify({ data, error }), {
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  if (action === "resolve") {
    const { id, newStatus, deleteTarget } = body as any;
    if (!id || !newStatus) return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: { ...CORS, "content-type": "application/json" } });
    const { data: report } = await supabase.from("reports").select("*").eq("id", id).single();
    if (deleteTarget && report) {
      if (report.target_type === "review") {
        await supabase.from("reviews").delete().eq("id", report.target_id);
      } else if (report.target_type === "comment") {
        await supabase.from("comments").delete().eq("id", report.target_id);
      }
    }
    const { error } = await supabase.from("reports").update({
      status: newStatus, resolved_by: user.id, resolved_at: new Date().toISOString(),
    }).eq("id", id);
    return new Response(JSON.stringify({ ok: !error, error }), {
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "unknown_action" }), {
    status: 400, headers: { ...CORS, "content-type": "application/json" },
  });
});

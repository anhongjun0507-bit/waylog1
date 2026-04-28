import { useEffect, useState } from "react";
import { ArrowLeft, Shield, Trash2, Check, X, RefreshCw, Send } from "lucide-react";
import { cls, formatRelativeTime } from "../utils/ui.js";
import { useExit } from "../hooks.js";
import { supabase } from "../supabase.js";
import { useAppContext } from "../contexts/AppContext.js";

const STATUS_TABS = [
  { key: "pending", label: "대기중" },
  { key: "reviewing", label: "검토중" },
  { key: "resolved", label: "처리완료" },
];

const NEWS_TITLE_MAX = 50;
const NEWS_BODY_MAX = 200;
const NEWS_BATCH = 20;

// 1.2.0 — 관리자 전용 앱 소식 일괄 발송. send-push 호출 + notif_prefs.news 체크는 함수가 처리.
const NewsBroadcastForm = ({ dark, onShowToast }) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const canSend = !sending && title.trim().length > 0 && body.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;
    if (!supabase) {
      onShowToast?.("Supabase 연결이 필요해요");
      return;
    }
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`정말 모든 사용자에게 발송하시겠어요?\n\n제목: ${cleanTitle}\n본문: ${cleanBody.slice(0, 80)}${cleanBody.length > 80 ? "…" : ""}`);
    if (!ok) return;

    setSending(true);
    setProgress({ done: 0, total: 0 });
    try {
      // 1) 모든 user_id fetch
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id");
      if (pErr || !Array.isArray(profiles)) {
        onShowToast?.("사용자 목록을 가져오지 못했어요");
        return;
      }
      const userIds = profiles.map((p) => p.id).filter(Boolean);
      if (userIds.length === 0) {
        onShowToast?.("발송할 사용자가 없어요");
        return;
      }
      setProgress({ done: 0, total: userIds.length });

      // 2) batch 별 병렬 발송. send-push 가 notif_prefs.news 체크 → OFF 사용자는 자동 skip.
      let sentCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < userIds.length; i += NEWS_BATCH) {
        const batch = userIds.slice(i, i + NEWS_BATCH);
        const results = await Promise.allSettled(
          batch.map((uid) => supabase.functions.invoke("send-push", {
            body: {
              userId: uid,
              type: "news",
              title: cleanTitle,
              body: cleanBody,
              data: { url: "/" },
            },
          }))
        );
        for (const r of results) {
          if (r.status !== "fulfilled") { failedCount++; continue; }
          const resp = r.value?.data;
          if (resp?.skipped === "pref_disabled") skippedCount++;
          else if (resp?.ok) sentCount++;
          else failedCount++;
        }
        setProgress({ done: Math.min(i + NEWS_BATCH, userIds.length), total: userIds.length });
      }

      const parts = [`${sentCount}명에게 발송 완료`];
      if (skippedCount > 0) parts.push(`${skippedCount}명 알림 OFF`);
      if (failedCount > 0) parts.push(`${failedCount}명 실패`);
      onShowToast?.(parts.join(" · "));
      if (failedCount === 0) {
        setTitle(""); setBody("");
      }
    } catch (e) {
      console.warn("news broadcast failed:", e);
      onShowToast?.("발송 중 오류가 발생했어요");
    } finally {
      setSending(false);
      setProgress({ done: 0, total: 0 });
    }
  };

  const inputCls = cls("w-full px-3 py-2.5 rounded-xl text-[14px] outline-none border transition focus:ring-2 focus:ring-brand-500/20",
    dark ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500 focus:border-brand-500"
         : "bg-white text-gray-900 border-gray-200 placeholder-gray-400 focus:border-brand-500");

  return (
    <div className={cls("rounded-2xl p-4 mt-4", dark ? "bg-gray-800" : "bg-white shadow-sm")}>
      <p className={cls("text-sm font-black mb-3", dark ? "text-white" : "text-gray-900")}>
        📢 앱 소식 발송
      </p>
      <p className={cls("text-xs mb-3 leading-relaxed", dark ? "text-gray-400" : "text-gray-500")}>
        모든 사용자에게 일괄 푸시 + 인앱 알림. 알림 OFF 한 사용자는 자동 제외돼요.
      </p>

      <div className="space-y-2.5">
        <div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, NEWS_TITLE_MAX))}
            placeholder="예: 새 기능 출시"
            disabled={sending}
            className={inputCls}/>
          <p className={cls("text-xs mt-1 text-right tabular-nums",
            title.length >= NEWS_TITLE_MAX
              ? "text-rose-500"
              : dark ? "text-gray-500" : "text-gray-400")}>
            {title.length}/{NEWS_TITLE_MAX}
          </p>
        </div>
        <div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, NEWS_BODY_MAX))}
            placeholder="예: 인바디 AI 분석 기능이 추가됐어요"
            disabled={sending}
            rows={3}
            className={cls(inputCls, "resize-none")}/>
          <p className={cls("text-xs mt-1 text-right tabular-nums",
            body.length >= NEWS_BODY_MAX
              ? "text-rose-500"
              : dark ? "text-gray-500" : "text-gray-400")}>
            {body.length}/{NEWS_BODY_MAX}
          </p>
        </div>
      </div>

      <button onClick={handleSend} disabled={!canSend}
        className={cls("w-full mt-2 py-3 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition active:scale-[0.98]",
          canSend
            ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
            : sending
              ? "bg-brand-500/60 text-white cursor-wait"
              : (dark ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-gray-100 text-gray-400 cursor-not-allowed"))}>
        {sending ? (
          <>
            <RefreshCw size={14} className="animate-spin"/>
            발송 중... {progress.total > 0 ? `${progress.done}/${progress.total}` : ""}
          </>
        ) : (
          <><Send size={14}/> 모든 사용자에게 발송</>
        )}
      </button>
    </div>
  );
};

/**
 * 관리자 전용 신고/모더레이션 큐.
 * - user.app_metadata.role === "admin" 일 때만 진입 가능.
 * - 백엔드: supabase.functions.invoke("moderation", { action: "list" | "resolve", ... })
 * - Edge Function 에서 service_role 로 RLS 우회하여 전체 조회.
 */
export const AdminModerationScreen = ({ dark, onClose }) => {
  const [exiting, close] = useExit(onClose);
  const { setToast } = useAppContext();
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);

  const load = async (status) => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("moderation", {
        body: { action: "list", status },
      });
      if (error) throw error;
      setItems((data?.data) || []);
    } catch (e) {
      console.warn("moderation list 실패", e);
      setToast("신고 목록을 불러오지 못했어요 (관리자 권한 필요)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolve = async (id, newStatus, deleteTarget = false) => {
    if (!supabase) return;
    setActingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("moderation", {
        body: { action: "resolve", id, newStatus, deleteTarget },
      });
      if (error || (data && data.ok === false)) throw error || new Error("failed");
      setItems((prev) => prev.filter((r) => r.id !== id));
      setToast(deleteTarget ? "삭제 및 처리 완료" : "처리 완료");
    } catch {
      setToast("처리에 실패했어요. 다시 시도해주세요");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-[60] max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col pt-safe pb-safe", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <div className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-rose-500"/>
          <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>모더레이션</p>
        </div>
        <button onClick={() => load(tab)} aria-label="새로고침"
          className={cls("p-2 rounded-full", dark ? "hover:bg-gray-700" : "hover:bg-gray-100")}>
          <RefreshCw size={16} className={cls(loading && "animate-spin", dark ? "text-gray-300" : "text-gray-600")}/>
        </button>
      </div>

      <div className={cls("flex p-1 m-3 rounded-full", dark ? "bg-gray-800" : "bg-gray-100")}>
        {STATUS_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cls("flex-1 py-2 rounded-full text-xs font-black transition",
              tab === t.key
                ? dark ? "bg-gray-900 text-white shadow" : "bg-white text-gray-900 shadow"
                : dark ? "text-gray-400" : "text-gray-500")}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-2">
        {loading && items.length === 0 && (
          <div className={cls("text-center py-12 text-xs", dark ? "text-gray-400" : "text-gray-500")}>불러오는 중...</div>
        )}
        {!loading && items.length === 0 && (
          <div className={cls("text-center py-16", dark ? "text-gray-400" : "text-gray-500")}>
            <Shield size={40} strokeWidth={1.5} className="mx-auto opacity-30 mb-2"/>
            <p className="text-xs font-bold">처리할 신고가 없어요</p>
          </div>
        )}
        {items.map((r) => (
          <div key={r.id} className={cls("rounded-2xl p-3", dark ? "bg-gray-800" : "bg-white shadow-sm")}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className={cls("text-xs font-bold", dark ? "text-gray-200" : "text-gray-800")}>
                  {r.target_type} · <span className="opacity-60">{String(r.target_id).slice(0, 12)}</span>
                </p>
                <p className={cls("text-xs mt-1", dark ? "text-gray-400" : "text-gray-600")}>
                  사유: <b>{r.reason}</b>{r.detail && <> · {r.detail}</>}
                </p>
                <p className={cls("text-xs mt-1 opacity-60", dark ? "text-gray-400" : "text-gray-500")}>
                  {formatRelativeTime(r.created_at)} · reporter {String(r.reporter_id).slice(0, 8)}
                </p>
              </div>
            </div>
            {tab !== "resolved" && (
              <div className="flex gap-1.5 mt-3">
                <button disabled={actingId === r.id}
                  onClick={() => resolve(r.id, "resolved", false)}
                  className={cls("flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 disabled:opacity-50",
                    dark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700")}>
                  <Check size={12}/> 반려
                </button>
                <button disabled={actingId === r.id}
                  onClick={() => resolve(r.id, "resolved", true)}
                  className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 disabled:opacity-50">
                  <Trash2 size={12}/> 삭제 후 처리
                </button>
                <button disabled={actingId === r.id}
                  onClick={() => resolve(r.id, "rejected", false)}
                  className={cls("flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 disabled:opacity-50",
                    dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600")}>
                  <X size={12}/> 기각
                </button>
              </div>
            )}
          </div>
        ))}
        <NewsBroadcastForm dark={dark} onShowToast={setToast}/>
      </div>
    </div>
  );
};

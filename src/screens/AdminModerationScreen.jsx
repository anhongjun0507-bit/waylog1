import { useEffect, useState } from "react";
import { ArrowLeft, Shield, Trash2, Check, X, RefreshCw } from "lucide-react";
import { cls, formatRelativeTime } from "../utils/ui.js";
import { useExit } from "../hooks.js";
import { supabase } from "../supabase.js";
import { useAppContext } from "../contexts/AppContext.js";

const STATUS_TABS = [
  { key: "pending", label: "대기중" },
  { key: "reviewing", label: "검토중" },
  { key: "resolved", label: "처리완료" },
];

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
      setToast("처리 실패");
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
      </div>
    </div>
  );
};

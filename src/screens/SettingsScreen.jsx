import { useState, useEffect } from "react";
import {
  ArrowLeft, Bell, BookOpen, Calendar, ChevronRight, ExternalLink,
  Inbox, Moon, Sparkles, Sun, User, X
} from "lucide-react";
import { cls } from "../utils/ui.js";
import { useExit } from "../hooks.js";
import { useAppContext } from "../contexts/AppContext.js";
import { supabase } from "../supabase.js";
import pkg from "../../package.json";

const APP_VERSION = pkg.version;

// 1.2.0 — 알림 종류별 토글 (profiles.notif_prefs jsonb)
const NOTIF_TYPES = [
  { key: "likes", icon: "❤️", label: "좋아요 알림", desc: "회원님 글에 좋아요가 달리면" },
  { key: "comments", icon: "💬", label: "댓글 알림", desc: "회원님 글에 댓글이 달리면" },
  { key: "follows", icon: "👥", label: "팔로우 알림", desc: "누군가 회원님을 팔로우하면" },
  { key: "challenge", icon: "🏃", label: "챌린지 리마인더", desc: "매일 저녁 7시" },
  { key: "news", icon: "📢", label: "앱 소식", desc: "새 기능·이벤트 안내" },
];
const DEFAULT_NOTIF_PREFS = { likes: true, comments: true, follows: true, challenge: true, news: true };

const NotifTypePrefs = ({ user, dark, onShowToast }) => {
  const [prefs, setPrefs] = useState(DEFAULT_NOTIF_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(null); // 저장 중 토글 key
  const [permState, setPermState] = useState("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermState(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!user?.id || !supabase) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    supabase.from("profiles").select("notif_prefs").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.notif_prefs && typeof data.notif_prefs === "object") {
          setPrefs({ ...DEFAULT_NOTIF_PREFS, ...data.notif_prefs });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const updatePref = async (key, nextValue) => {
    if (!user?.id || !supabase || !loaded) return;
    const prev = prefs[key];
    if (prev === nextValue) return;
    const next = { ...prefs, [key]: nextValue };
    setPrefs(next); // optimistic
    setSaving(key);
    const { error } = await supabase.from("profiles")
      .update({ notif_prefs: next })
      .eq("id", user.id);
    setSaving(null);
    if (error) {
      // 롤백
      setPrefs((p) => ({ ...p, [key]: prev }));
      onShowToast?.("알림 설정 저장에 실패했어요");
    }
  };

  const isPermDenied = permState === "denied";

  return (
    <div className={cls("border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
      <p className={cls("text-[12px] font-semibold uppercase tracking-wider px-4 pt-4 pb-2", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
        알림 종류
      </p>
      {isPermDenied && (
        <div className={cls("mx-4 mb-2 p-3 rounded-xl text-[12px] leading-relaxed",
          dark ? "bg-amber-900/30 text-amber-200" : "bg-amber-50 text-amber-800")}>
          알림 권한이 차단되어 있어요. 브라우저(또는 기기) 설정에서 알림을 허용한 뒤 토글이 적용돼요.
        </div>
      )}
      {NOTIF_TYPES.map(({ key, icon, label, desc }) => {
        const value = !!prefs[key];
        const disabled = !loaded || isPermDenied;
        return (
          <div key={key} className="w-full flex items-center gap-4 px-4 py-3 text-left">
            <span className="text-[20px] leading-none w-5 text-center select-none">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className={cls("text-[14px]", dark ? "text-white" : "text-black", disabled && "opacity-60")}>{label}</p>
              <p className={cls("text-[12px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{desc}</p>
            </div>
            <button
              onClick={() => !disabled && updatePref(key, !value)}
              disabled={disabled}
              aria-label={`${label} ${value ? "끄기" : "켜기"}`}
              aria-pressed={value}
              className={cls("relative w-[34px] h-[18px] rounded-full transition shrink-0",
                disabled
                  ? (dark ? "bg-[#1a1a1a]" : "bg-[#ececec]")
                  : value
                    ? "bg-brand-500"
                    : dark ? "bg-[#262626]" : "bg-[#dbdbdb]",
                saving === key && "opacity-70")}>
              <div className={cls("absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all",
                value ? "left-[18px]" : "left-[2px]")}/>
            </button>
          </div>
        );
      })}
    </div>
  );
};

const SettingsScreen = ({ user, dark, setDark, blockedList, onUnblock, onClose, onLogout, onClearData, onReplayOnboarding, onEnablePush, onOpenAdmin }) => {
  // setToast 는 Context 에서 구독 — prop drilling 제거
  const { setToast: onShowToast } = useAppContext();
  // app_metadata.role 은 Supabase 관리자 콘솔에서 사용자 별로 수동 설정
  const isAdmin = user?.app_metadata?.role === "admin" || user?.role === "admin";
  const [exiting, close] = useExit(onClose);
  const [confirmClear, setConfirmClear] = useState(false);
  const [blockListOpen, setBlockListOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(null); // "terms" | "privacy" | null
  const [storageInfo, setStorageInfo] = useState({ used: 0, quota: 0, percent: 0 });

  useEffect(() => {
    (async () => {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          const used = est.usage || 0;
          const quota = est.quota || 0;
          setStorageInfo({ used, quota, percent: quota > 0 ? Math.round((used / quota) * 100) : 0 });
        }
      } catch {}
    })();
  }, []);

  const formatBytes = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const cleanDraftCache = async () => {
    try {
      const list = await window.storage?.list?.("waylog:draft:");
      if (list && list.keys) {
        await Promise.all(list.keys.map((k) => window.storage.delete(k)));
      }
      onShowToast && onShowToast("임시 저장 캐시를 정리했어요");
    } catch {
      onShowToast && onShowToast("정리 중 오류가 발생했어요");
    }
  };

  const items = [
    { group: "표시", rows: [
      { icon: dark ? Sun : Moon, label: "다크모드", value: dark, type: "toggle", onChange: () => setDark(!dark) },
    ]},
    { group: "알림", rows: [
      // 1.4.0 — "앱 내 알림" 단일 토글 폐기. 알림 종류별 토글(NotifTypePrefs)로 통합.
      // 웹 푸시: Notification 권한 + Service Worker 구독을 요청.
      // 브라우저가 지원하지 않거나 VAPID 미설정이면 비활성화 상태로 표시.
      ...(typeof window !== "undefined" && "Notification" in window ? [
        { icon: Bell, label: "푸시 알림 켜기",
          sub: Notification.permission === "granted" ? "권한 허용됨 — 탭해서 구독 갱신"
            : Notification.permission === "denied" ? "브라우저에서 차단됨 — 사이트 설정에서 허용"
            : "브라우저 알림 받기",
          type: "action", onClick: () => onEnablePush && onEnablePush() },
      ] : []),
    ]},
    { group: "계정", rows: [
      { icon: User, label: "이메일", sub: user?.email, type: "info" },
      { icon: Calendar, label: "가입일", sub: user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString("ko-KR") : "-", type: "info" },
      { icon: X, label: "차단 사용자 관리", sub: blockedList && blockedList.length > 0 ? `${blockedList.length}명` : "없음", type: "action", onClick: () => setBlockListOpen(true) },
    ]},
    { group: "데이터", rows: [
      { icon: Inbox, label: "저장 공간", sub: storageInfo.quota > 0 ? `${formatBytes(storageInfo.used)} / ${formatBytes(storageInfo.quota)} (${storageInfo.percent}%)` : "측정 중...", type: "info" },
      { icon: Inbox, label: "임시 저장 캐시 정리", sub: "작성 중이던 글의 임시 데이터를 비워요", type: "action", onClick: cleanDraftCache },
      { icon: Inbox, label: "모든 데이터 삭제", type: "action", danger: true, onClick: () => setConfirmClear(true) },
    ]},
    { group: "정보", rows: [
      { icon: Sparkles, label: "버전", sub: APP_VERSION, type: "info" },
      { icon: BookOpen, label: "앱 안내 (비공식 앱)", sub: "상표·저작권 안내", type: "action", onClick: () => setDocOpen("about") },
      { icon: BookOpen, label: "온보딩 다시 보기", type: "action", onClick: () => onReplayOnboarding && onReplayOnboarding() },
      { icon: BookOpen, label: "이용약관", type: "action", onClick: () => setDocOpen("terms") },
      { icon: BookOpen, label: "개인정보 처리방침", type: "action", onClick: () => setDocOpen("privacy") },
    ]},
    // 관리자 전용 모더레이션 큐 (일반 사용자에게는 그룹 자체가 숨겨짐)
    ...(isAdmin ? [{ group: "관리자", rows: [
      { icon: Bell, label: "신고 모더레이션", sub: "사용자 신고 큐 관리", type: "action", onClick: () => onOpenAdmin && onOpenAdmin() },
    ]}] : []),
  ];

  return (
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col pt-safe", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-black" : "bg-white")}>
      <header className={cls("flex items-center justify-between px-4 h-12 border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={22} className={dark ? "text-white" : "text-black"}/></button>
        <p className={cls("text-[16px] font-bold", dark ? "text-white" : "text-black")}>설정</p>
        <div className="w-6"/>
      </header>
      <div className="flex-1 overflow-y-auto">
        {items.map((section) => (
          <div key={section.group} className={cls("border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
            <p className={cls("text-[12px] font-semibold uppercase tracking-wider px-4 pt-4 pb-2", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              {section.group}
            </p>
            {section.rows.map((row, i) => {
              const RowIcon = row.icon;
              const Tag = row.type === "action" ? "button" : "div";
              return (
                <Tag key={i} onClick={row.type === "action" ? row.onClick : undefined}
                  className={cls("w-full flex items-center gap-4 px-4 py-3 text-left transition",
                    row.type === "action" && (dark ? "active:bg-[#121212]" : "active:bg-[#fafafa]"))}>
                  <RowIcon size={20} strokeWidth={1.8}
                    className={cls(row.danger ? "text-red-500" : dark ? "text-white" : "text-black")}/>
                  <div className="flex-1 min-w-0">
                    <p className={cls("text-[14px]", row.danger ? "text-red-500" : dark ? "text-white" : "text-black")}>{row.label}</p>
                    {row.sub && <p className={cls("text-[12px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{row.sub}</p>}
                  </div>
                  {row.type === "toggle" && (
                    <button onClick={row.onChange}
                      className={cls("relative w-[34px] h-[18px] rounded-full transition", row.value ? "bg-brand-500" : dark ? "bg-[#262626]" : "bg-[#dbdbdb]")}>
                      <div className={cls("absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all", row.value ? "left-[18px]" : "left-[2px]")}/>
                    </button>
                  )}
                  {row.type === "action" && <ChevronRight size={18} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>}
                </Tag>
              );
            })}
          </div>
        ))}
        {user && <NotifTypePrefs user={user} dark={dark} onShowToast={onShowToast}/>}
        <div className={cls("border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
          <button onClick={() => { onLogout(); close(); }}
            className="w-full py-3 text-left px-4 text-[14px] text-red-500 font-semibold active:opacity-60">
            로그아웃
          </button>
        </div>
        <p className={cls("text-[12px] text-center py-6", dark ? "text-[#737373]" : "text-[#a8a8a8]")}>웨이로그 v{APP_VERSION}</p>
      </div>

      {confirmClear && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmClear(false)}/>
          <div className={cls("relative w-full rounded-3xl p-6 shadow-2xl animate-slide-up", dark ? "bg-gray-900" : "bg-white")}>
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
              <Inbox size={26} className="text-rose-500"/>
            </div>
            <p className={cls("text-base font-black text-center", dark ? "text-white" : "text-gray-900")}>모든 데이터를 삭제할까요?</p>
            <p className={cls("text-xs text-center mt-2 opacity-70", dark ? "text-gray-400" : "text-gray-600")}>좋아요, 무드, 작성한 글, 댓글이 모두 삭제돼요. 되돌릴 수 없어요.</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirmClear(false)}
                className={cls("flex-1 py-3 rounded-2xl font-bold text-sm border", dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600")}>취소</button>
              <button onClick={() => { onClearData(); setConfirmClear(false); close(); }}
                className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm">삭제</button>
            </div>
          </div>
        </div>
      )}

      {docOpen && (
        <div className="absolute inset-0 z-10 flex items-end animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDocOpen(null)}/>
          <div className={cls("relative w-full rounded-t-3xl shadow-2xl animate-slide-up max-h-[80vh] flex flex-col pb-safe", dark ? "bg-gray-900" : "bg-white")}>
            <div className={cls("w-12 h-1 rounded-full mx-auto mt-3 mb-2 shrink-0", dark ? "bg-gray-700" : "bg-gray-300")}/>
            <div className="px-6 py-2 flex items-center justify-between shrink-0">
              <p className={cls("text-base font-black", dark ? "text-white" : "text-gray-900")}>
                {docOpen === "terms" ? "이용약관" : docOpen === "privacy" ? "개인정보 처리방침" : "앱 안내"}
              </p>
              <button onClick={() => setDocOpen(null)} aria-label="닫기" className={cls("w-8 h-8 rounded-full flex items-center justify-center", dark ? "bg-gray-800" : "bg-gray-100")}>
                <X size={14} className={dark ? "text-gray-400" : "text-gray-500"}/>
              </button>
            </div>
            <div className={cls("flex-1 overflow-y-auto px-6 pb-8 text-xs leading-relaxed", dark ? "text-gray-400" : "text-gray-600")}>
              {docOpen === "about" ? (
                <div className="space-y-4">
                  <div className={cls("p-3 rounded-2xl border-l-4 border-brand-500", dark ? "bg-brand-900/20" : "bg-brand-50")}>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-brand-200" : "text-brand-700")}>비공식 앱 안내</p>
                    <p className={cls(dark ? "text-brand-200" : "text-brand-800")}>
                      웨이로그는 <b>Amway Corp. / 암웨이 코리아와 관련이 없는 독립 앱</b>입니다. 개인 사용자가 자신이 사용한 제품에 대한 후기를 기록하고 공유할 수 있도록 돕는 비영리 도구로 운영됩니다.
                    </p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>상표·브랜드 사용</p>
                    <p>이 앱에 표시되는 제품명, 브랜드명(예: Artistry, Nutrilite, 퀸, 바디키 등)은 해당 상표권자의 것이며, 사용자가 후기를 작성할 때 해당 제품을 지칭하기 위한 <b>지명적 공정 사용</b> 목적으로만 사용됩니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>제품 이미지</p>
                    <p>카탈로그에 표시되는 제품 이미지는 <b>amway.co.kr 공식 미디어 서버</b>에서 실시간으로 불러옵니다. 앱이 이미지를 복제하거나 저장하지 않으며, 상표권자의 요청이 있을 경우 즉시 제거합니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>구매 경로</p>
                    <p>모든 제품의 구매는 <b>amway.co.kr 공식 사이트</b>에서만 이뤄지며, 이 앱 내에서는 결제·주문·수익 창출이 일절 발생하지 않습니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>문의 / 삭제 요청</p>
                    <p>상표권·저작권 관련 문의나 콘텐츠 삭제 요청은 앱 설정의 개인정보 처리방침에 기재된 연락처로 보내주시면 지체 없이 대응합니다.</p>
                  </div>
                </div>
              ) : docOpen === "terms" ? (
                <div className="space-y-4">
                  <p>웨이로그 이용약관 전문은 아래 링크에서 확인하실 수 있습니다.</p>
                  <a href="/terms.html" target="_blank" rel="noopener noreferrer"
                    className={cls("inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition active:scale-95",
                      dark ? "bg-brand-900/40 text-brand-200 hover:bg-brand-900/60" : "bg-brand-50 text-brand-700 hover:bg-brand-100")}>
                    <ExternalLink size={14}/> 이용약관 전문 보기
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  <p>웨이로그 개인정보 처리방침 전문은 아래 링크에서 확인하실 수 있습니다.</p>
                  <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
                    className={cls("inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition active:scale-95",
                      dark ? "bg-brand-900/40 text-brand-200 hover:bg-brand-900/60" : "bg-brand-50 text-brand-700 hover:bg-brand-100")}>
                    <ExternalLink size={14}/> 개인정보 처리방침 전문 보기
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {blockListOpen && (
        <div className="absolute inset-0 z-10 flex items-end animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setBlockListOpen(false)}/>
          <div className={cls("relative w-full rounded-t-3xl shadow-2xl animate-slide-up max-h-[70vh] flex flex-col pb-safe", dark ? "bg-gray-900" : "bg-white")}>
            <div className={cls("w-12 h-1 rounded-full mx-auto mt-3 mb-2 shrink-0", dark ? "bg-gray-700" : "bg-gray-300")}/>
            <div className="px-6 py-2 flex items-center justify-between shrink-0">
              <p className={cls("text-base font-black", dark ? "text-white" : "text-gray-900")}>차단된 사용자</p>
              <button onClick={() => setBlockListOpen(false)} aria-label="닫기" className={cls("w-8 h-8 rounded-full flex items-center justify-center", dark ? "bg-gray-800" : "bg-gray-100")}>
                <X size={14} className={dark ? "text-gray-400" : "text-gray-500"}/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-8">
              {(!blockedList || blockedList.length === 0) ? (
                <div className={cls("py-12 text-center", dark ? "text-gray-400" : "text-gray-500")}>
                  <X size={40} strokeWidth={1.5} className="mx-auto mb-3 opacity-40"/>
                  <p className="text-sm font-bold">차단한 사용자가 없어요</p>
                  <p className="text-xs mt-1 opacity-80">불편한 사용자는 미니 시트에서 차단할 수 있어요</p>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  {blockedList.map((author) => (
                    <div key={author} className={cls("flex items-center gap-3 p-3 rounded-2xl", dark ? "bg-gray-800" : "bg-gray-50")}>
                      <div className={cls("w-10 h-10 rounded-full flex items-center justify-center shrink-0", dark ? "bg-gray-700" : "bg-gray-200")}>
                        <User size={16} className={dark ? "text-gray-400" : "text-gray-500"}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cls("text-sm font-bold truncate", dark ? "text-white" : "text-gray-900")}>{author}</p>
                        <p className={cls("text-xs opacity-70", dark ? "text-gray-400" : "text-gray-500")}>차단됨</p>
                      </div>
                      <button onClick={() => onUnblock && onUnblock(author)}
                        className="px-3 py-1.5 bg-brand-500 text-white text-xs font-black rounded-full active:scale-95 transition shrink-0">
                        해제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default SettingsScreen;

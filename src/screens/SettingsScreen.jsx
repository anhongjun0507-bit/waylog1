import { useState, useEffect } from "react";
import {
  ArrowLeft, Bell, BookOpen, Calendar, ChevronRight,
  Inbox, Moon, Sparkles, Sun, User, X
} from "lucide-react";
import { cls } from "../utils/ui.js";
import { useExit } from "../hooks.js";
import { useAppContext } from "../contexts/AppContext.js";

const SettingsScreen = ({ user, dark, setDark, notifPref, setNotifPref, blockedList, onUnblock, onClose, onLogout, onClearData, onReplayOnboarding, onEnablePush, onOpenAdmin }) => {
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
      { icon: Bell, label: "앱 내 알림", value: notifPref, type: "toggle", onChange: () => setNotifPref(!notifPref) },
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
      { icon: Sparkles, label: "버전", sub: "5.5.0", type: "info" },
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
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>설정</p>
        <div className="w-6"/>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {items.map((section) => (
          <div key={section.group}>
            <p className={cls("text-xs font-bold uppercase tracking-wider mb-2 px-2", dark ? "text-gray-500" : "text-gray-500")}>{section.group}</p>
            <div className={cls("rounded-2xl overflow-hidden", dark ? "bg-gray-800" : "bg-white")}>
              {section.rows.map((row, i) => {
                const RowIcon = row.icon;
                const Tag = row.type === "action" ? "button" : "div";
                return (
                  <Tag key={i} onClick={row.type === "action" ? row.onClick : undefined}
                    className={cls("w-full flex items-center gap-3 p-4 text-left transition",
                      row.type === "action" && (dark ? "active:bg-gray-700/30" : "active:bg-gray-50"),
                      i !== section.rows.length - 1 && (dark ? "border-b border-gray-700/50" : "border-b border-gray-100"))}>
                    <div className={cls("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", row.danger ? dark ? "bg-rose-900/30" : "bg-rose-50" : dark ? "bg-gray-700/50" : "bg-gray-100")}>
                      <RowIcon size={16} className={row.danger ? "text-rose-500" : dark ? "text-gray-300" : "text-gray-600"}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cls("text-sm font-bold", row.danger ? "text-rose-500" : dark ? "text-white" : "text-gray-900")}>{row.label}</p>
                      {row.sub && <p className={cls("text-xs font-normal opacity-70 mt-0.5", dark ? "text-gray-400" : "text-gray-600")}>{row.sub}</p>}
                    </div>
                    {row.type === "toggle" && (
                      <button onClick={row.onChange}
                        className={cls("relative w-11 h-6 rounded-full transition", row.value ? "bg-emerald-500" : dark ? "bg-gray-600" : "bg-gray-300")}>
                        <div className={cls("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", row.value ? "left-[22px]" : "left-0.5")}/>
                      </button>
                    )}
                    {row.type === "action" && <ChevronRight size={18} className={dark ? "text-gray-400" : "text-gray-500"}/>}
                  </Tag>
                );
              })}
            </div>
          </div>
        ))}
        <button onClick={() => { onLogout(); close(); }}
          className={cls("w-full py-3.5 rounded-2xl font-bold text-sm border", dark ? "border-gray-700 text-rose-400 bg-gray-800" : "border-gray-200 text-rose-500 bg-white")}>
          로그아웃
        </button>
        <p className={cls("text-xs text-center pb-4", dark ? "text-gray-600" : "text-gray-400")}>웨이로그 v5.5.0</p>
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
          <div className={cls("relative w-full rounded-t-3xl shadow-2xl animate-slide-up max-h-[80vh] flex flex-col", dark ? "bg-gray-900" : "bg-white")}>
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
                  <div className={cls("p-3 rounded-2xl border-l-4 border-emerald-500", dark ? "bg-emerald-900/20" : "bg-emerald-50")}>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-emerald-300" : "text-emerald-700")}>비공식 앱 안내</p>
                    <p className={cls(dark ? "text-emerald-200" : "text-emerald-800")}>
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
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>제1조 (목적)</p>
                    <p>이 약관은 웨이로그(이하 "서비스")가 제공하는 라이프스타일 리뷰 공유 서비스의 이용과 관련하여 회사와 회원의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>제2조 (회원가입)</p>
                    <p>회원가입은 이용자가 약관에 동의하고 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 가입신청을 하는 것으로 성립합니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>제3조 (서비스 이용)</p>
                    <p>회원은 서비스가 제공하는 모든 기능을 자유롭게 이용할 수 있으며, 다른 회원의 권리를 침해하거나 서비스 운영을 방해해서는 안 됩니다. 위반 시 서비스 이용이 제한될 수 있습니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>제4조 (콘텐츠 저작권)</p>
                    <p>회원이 서비스 내에서 작성한 게시물의 저작권은 회원 본인에게 귀속됩니다. 단, 서비스는 게시물을 서비스 운영, 홍보, 개선 목적으로 활용할 수 있습니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>제5조 (책임 제한)</p>
                    <p>천재지변, 시스템 장애 등 회사의 귀책사유 없이 발생한 손해에 대해 회사는 책임을 지지 않습니다.</p>
                  </div>
                  <p className={cls("text-center pt-4 opacity-60", dark ? "text-gray-400" : "text-gray-500")}>본 약관은 데모 버전입니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>1. 수집하는 개인정보 항목</p>
                    <p>회원가입 시 닉네임, 이메일 주소, 비밀번호를 수집합니다. 서비스 이용 과정에서 작성한 글, 댓글, 좋아요, 무드 등의 활동 정보가 자동 수집됩니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>2. 개인정보 이용 목적</p>
                    <p>회원 식별, 서비스 제공, 추천 알고리즘 학습, 통계 분석 및 서비스 개선 목적으로 활용됩니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>3. 보관 기간</p>
                    <p>회원 탈퇴 시 모든 개인정보가 즉시 파기됩니다. 단, 관계 법령에 따라 일정 기간 보관해야 하는 정보는 그 기간 동안 보관됩니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>4. 제3자 제공</p>
                    <p>회원의 동의 없이 개인정보를 외부에 제공하지 않습니다. 단, 법적 요청이 있는 경우 예외로 합니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>5. 회원의 권리</p>
                    <p>회원은 언제든지 자신의 개인정보를 열람, 수정, 삭제할 수 있습니다. 설정 메뉴의 *모든 데이터 삭제* 기능을 통해 즉시 처리됩니다.</p>
                  </div>
                  <p className={cls("text-center pt-4 opacity-60", dark ? "text-gray-400" : "text-gray-500")}>본 처리방침은 데모 버전입니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {blockListOpen && (
        <div className="absolute inset-0 z-10 flex items-end animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setBlockListOpen(false)}/>
          <div className={cls("relative w-full rounded-t-3xl shadow-2xl animate-slide-up max-h-[70vh] flex flex-col", dark ? "bg-gray-900" : "bg-white")}>
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
                        className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-black rounded-full active:scale-95 transition shrink-0">
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

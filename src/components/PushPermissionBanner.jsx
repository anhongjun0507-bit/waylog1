import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { cls } from "../utils/ui.js";
import { pushSupported, requestPushPermission, subscribePush } from "../utils/push.js";
import { useAppContext } from "../contexts/AppContext.js";

const DISMISS_KEY = "waylog:banner:push-dismissed";
const MIN_DAYS = 2;
const MAX_DAYS = 14;

// 가입 후 2~14일 경과 + 권한 미요청 + 미닫음 + 푸시 지원 시
// 홈 상단에 부드러운 권유 banner 노출. "X" 누르면 영구 비노출.
export const PushPermissionBanner = ({ user, dark }) => {
  const { setToast } = useAppContext();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (typeof window === "undefined") return;
    if (!pushSupported()) return;
    // 웹: Notification.permission, 네이티브: 항상 default 로 간주 (Capacitor 가 처리)
    if (typeof Notification !== "undefined" && Notification.permission !== "default") return;

    // localStorage 닫기 가드
    try { if (localStorage.getItem(DISMISS_KEY)) return; }
    catch { return; }

    // 가입일 경과 체크
    if (!user.joinedAt) return;
    const signup = new Date(user.joinedAt);
    if (Number.isNaN(signup.getTime())) return;
    const days = (Date.now() - signup.getTime()) / (1000 * 60 * 60 * 24);
    if (days < MIN_DAYS || days > MAX_DAYS) return;

    setShow(true);
  }, [user?.id, user?.joinedAt]);

  if (!show) return null;

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const perm = await requestPushPermission();
      if (perm === "granted") {
        const sub = await subscribePush(user.id);
        if (sub) setToast("알림을 켰어요");
        else setToast("푸시 구독을 완료하지 못했어요. 설정에서 다시 시도해주세요");
      } else if (perm === "denied") {
        setToast("나중에 설정에서 켜실 수 있어요");
      } else {
        setToast("알림 권한을 허용해주세요");
      }
    } catch {
      setToast("알림 설정 중 문제가 생겼어요");
    } finally {
      setBusy(false);
      setShow(false); // 한 번 시도 후엔 banner 사라짐 (재노출은 SettingsScreen 에서)
    }
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setShow(false);
  };

  return (
    <div className={cls("mx-4 mt-3 px-4 py-3 rounded-2xl flex items-center gap-3 border",
      dark ? "bg-brand-900/25 border-brand-800/40" : "bg-brand-50 border-brand-100")}>
      <div className={cls("shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
        dark ? "bg-brand-800/50" : "bg-white")}>
        <Bell size={16} className={dark ? "text-brand-200" : "text-brand-600"}/>
      </div>
      <div className="flex-1 min-w-0">
        <p className={cls("text-[13px] font-bold leading-tight", dark ? "text-brand-100" : "text-brand-900")}>
          알림을 켜시겠어요?
        </p>
        <p className={cls("text-[11px] mt-0.5 leading-snug", dark ? "text-brand-200/80" : "text-brand-700")}>
          댓글·좋아요·팔로우 소식을 받으실 수 있어요
        </p>
      </div>
      <button onClick={handleEnable} disabled={busy}
        className={cls("shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition active:scale-95",
          busy ? "bg-brand-500/50 text-white cursor-wait" : "bg-brand-500 text-white")}>
        켜기
      </button>
      <button onClick={handleDismiss} aria-label="알림 권유 닫기"
        className={cls("shrink-0 w-7 h-7 rounded-full flex items-center justify-center active:opacity-60",
          dark ? "bg-brand-800/40 text-brand-300" : "bg-brand-100 text-brand-600")}>
        <X size={12}/>
      </button>
    </div>
  );
};

export default PushPermissionBanner;

import { useState } from "react";
import {
  ArrowLeft, BookOpen, Camera, Check, Eye, MessageCircle, PenLine,
  RefreshCw, RotateCcw, Sparkles, Target, X
} from "lucide-react";
import { supabase, auth as supabaseAuth } from "../supabase.js";
import { friendlyError } from "../utils/errors.js";
import { cls } from "../utils/ui.js";
import { useExit } from "../hooks.js";
import { Avatar } from "../components/index.js";

// 패스워드 정책 (가입용) — 8자 이상, 영문+숫자 필수.
export const isValidPassword = (pw) =>
  typeof pw === "string" && pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);

export const isValidEmail = (em) =>
  typeof em === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.trim());

export const isValidNickname = (nn) => {
  if (typeof nn !== "string") return false;
  const t = nn.trim();
  return t.length >= 2 && t.length <= 12;
};

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);

const AuthScreen = ({ onClose, onAuth, dark }) => {
  const [exiting, close] = useExit(onClose);
  const [mode, setMode] = useState("login"); // signup | login | forgot-password
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [recoverInput, setRecoverInput] = useState("");
  const [avatar, setAvatar] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("이미지는 2MB 이하만 가능해요"); return; }
    const reader = new FileReader();
    reader.onload = () => { setAvatar(reader.result); setError(""); };
    reader.readAsDataURL(file);
  };

  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (loading) return; // 중복 클릭 방지 (disabled + 명시적 가드)
    setError(""); setInfo("");
    if (mode === "signup") {
      const trimmedEmail = email.trim();
      const trimmedNickname = nickname.trim();
      if (!trimmedNickname || !trimmedEmail || !password.trim()) { setError("모든 항목을 입력해주세요"); return; }
      if (!isValidNickname(trimmedNickname)) { setError("닉네임은 2~12자여야 해요"); return; }
      if (!isValidEmail(trimmedEmail)) { setError("올바른 이메일 형식이 아니에요 (예: name@email.com)"); return; }
      if (!isValidPassword(password)) { setError("비밀번호는 8자 이상이며 영문과 숫자를 모두 포함해야 해요"); return; }
      if (password !== passwordConfirm) { setError("비밀번호가 일치하지 않아요"); return; }
      if (avatar && avatar.length > 500000) { setError("프로필 이미지가 너무 커요. 더 작은 이미지를 선택해주세요"); return; }
      setLoading(true);
      try {
        const { data, error: signUpError } = await withTimeout(
          supabaseAuth.signUp(trimmedEmail, password, trimmedNickname),
          10000
        );
        if (signUpError) {
          setLoading(false);
          // Supabase 연결 실패 시 로컬 모드 폴백
          if (signUpError.message === "Failed to fetch" || signUpError.message?.includes("fetch")) {
            onAuth({ id: Date.now(), nickname: trimmedNickname, email: trimmedEmail, avatar, joinedAt: new Date().toISOString() });
            close();
            return;
          }
          setError(friendlyError(signUpError, "가입에 실패했어요. 입력 내용을 확인해주세요"));
          return;
        }
        if (data?.user && !data.user.identities?.length) {
          setLoading(false);
          setError("이미 가입된 이메일이에요");
          return;
        }
        // 가입 성공 — profile 테이블에 row 보장 (DB trigger 미설정 환경 방어).
        // 실패해도 onAuth 는 진행 (백그라운드 작업).
        if (data?.user?.id) {
          supabaseAuth.ensureProfile(data.user.id, { nickname: trimmedNickname, avatar_url: avatar || "" }).catch(() => {});
        }
        setLoading(false);
        // session 유무와 관계없이 onAuth 호출 (세션 없으면 이메일 인증 대기 안내 필요하지만, 현재 UX 는 바로 들어감)
        onAuth({
          id: data?.user?.id || Date.now(),
          nickname: trimmedNickname,
          email: trimmedEmail,
          avatar,
          joinedAt: data?.user?.created_at || new Date().toISOString(),
        });
        close();
      } catch (e) {
        setLoading(false);
        setError(friendlyError(e, "회원가입 중 문제가 발생했어요. 다시 시도해주세요"));
      }
    } else if (mode === "login") {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password.trim()) { setError("이메일과 비밀번호를 입력해주세요"); return; }
      if (!isValidEmail(trimmedEmail)) { setError("올바른 이메일 형식이 아니에요"); return; }
      setLoading(true);
      try {
        const { data, error: signInError } = await withTimeout(
          supabaseAuth.signIn(trimmedEmail, password),
          8000
        );
        if (signInError) {
          setLoading(false);
          if (signInError.message === "Failed to fetch" || signInError.message?.includes("fetch")) {
            onAuth({ id: Date.now(), nickname: trimmedEmail.split("@")[0], email: trimmedEmail, avatar: "", joinedAt: new Date().toISOString() });
            close();
            return;
          }
          setError(friendlyError(signInError, "로그인에 실패했어요. 다시 시도해주세요"));
          return;
        }
        const meta = data?.user?.user_metadata;
        const resolvedNickname = meta?.nickname || trimmedEmail.split("@")[0];
        // 최초 로그인인데 profile row 가 없는 경우 보장 (DB trigger 미설정 환경 방어)
        if (data?.user?.id) {
          supabaseAuth.ensureProfile(data.user.id, { nickname: resolvedNickname, avatar_url: meta?.avatar_url || "" }).catch(() => {});
        }
        setLoading(false);
        onAuth({
          id: data.user.id,
          nickname: resolvedNickname,
          email: trimmedEmail,
          avatar: meta?.avatar_url || "",
          joinedAt: data.user.created_at,
        });
        close();
      } catch (e) {
        setLoading(false);
        setError(friendlyError(e, "로그인 중 문제가 발생했어요. 다시 시도해주세요"));
      }
    } else if (mode === "forgot-password") {
      const trimmed = recoverInput.trim();
      if (!isValidEmail(trimmed)) { setError("올바른 이메일을 입력해주세요"); return; }
      setLoading(true);
      try {
        if (supabase) await withTimeout(supabase.auth.resetPasswordForEmail(trimmed), 5000);
      } catch {}
      setLoading(false);
      setInfo(`${trimmed} 으로 비밀번호 재설정 링크를 보냈어요`);
      setTimeout(() => { setMode("login"); setRecoverInput(""); setInfo(""); }, 2200);
    }
  };

  // DS 리뉴얼 — 15px 본문, 48px 터치 타겟, 브랜드 포커스 링.
  const inputCls = cls("w-full min-h-tap text-[15px] outline-none rounded-btn px-4 py-3 mt-2 border transition-colors focus:ring-2 focus:ring-brand-500/20",
    dark ? "bg-ink-900 text-ink-50 placeholder-ink-400 border-ink-700 focus:border-brand-500"
         : "bg-white text-ink-900 placeholder-ink-400 border-ink-200 focus:border-brand-500");
  const inputInvalid = "!border-error";
  const inputValid = "!border-ink-200";

  const isRecover = mode === "forgot-password";
  const headerTitle = {
    signup: "회원가입",
    login: "로그인",
    "forgot-password": "비밀번호 찾기",
  }[mode];

  return (
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col pt-safe", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-black" : "bg-white")}>
      <header className={cls("flex items-center justify-between px-4 h-12 border-b", dark ? "bg-black border-[#262626]" : "bg-white border-[#dbdbdb]")}>
        {isRecover ? (
          <button onClick={() => { setMode("login"); setError(""); setInfo(""); setRecoverInput(""); }}
            aria-label="뒤로" className="min-w-tap min-h-tap flex items-center justify-center -ml-2.5 active:opacity-60">
            <ArrowLeft size={22} className={dark ? "text-white" : "text-black"}/>
          </button>
        ) : (
          <button onClick={close} aria-label="닫기"
            className="min-w-tap min-h-tap flex items-center justify-center -ml-2.5 active:opacity-60">
            <X size={22} className={dark ? "text-white" : "text-black"}/>
          </button>
        )}
        <p className={cls("text-[14px] font-bold", dark ? "text-white" : "text-black")}>{headerTitle}</p>
        <div className="w-6"/>
      </header>
      <div className="flex-1 overflow-y-auto px-8 pt-10 pb-8">
        <div className="text-center mb-10">
          {/* IG 식 로고 — 크게, 세로 정렬 */}
          <h1 className={cls("text-[42px] font-black leading-none tracking-tight", dark ? "text-white" : "text-black")}
            style={{ fontFamily: "'Pretendard', serif" }}>
            Waylog<span className="text-brand-500">·</span>
          </h1>
          <p className={cls("text-[13px] mt-6", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
            {mode === "signup" && "친구들의 라이프스타일을 보려면 가입하세요."}
            {mode === "login" && "아이디로 로그인하여 친구와 즐거운 일상을 공유하세요."}
            {mode === "forgot-password" && "재설정 링크를 받을 이메일을 입력하세요."}
          </p>
        </div>

        {mode === "signup" && (
          <div className="mb-4 flex flex-col items-center">
            <div className="relative">
              <Avatar id={avatar} size={48} className="w-24 h-24" rounded="rounded-full"/>
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center cursor-pointer active:scale-90 transition border-2"
                style={{ borderColor: dark ? "#000" : "#fff" }}>
                <Camera size={14} className="text-white"/>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
              </label>
            </div>
            <p className={cls("text-[12px] mt-3", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              {avatar ? "사진 변경" : "프로필 사진 추가 (선택)"}
            </p>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임 (2~12자)"
              className={cls(inputCls,
                nickname && (nickname.trim().length < 2 || nickname.trim().length > 12) && inputInvalid,
                nickname && nickname.trim().length >= 2 && nickname.trim().length <= 12 && inputValid)}/>
            {nickname && (nickname.trim().length < 2 || nickname.trim().length > 12) && (
              <p className="text-[12px] text-red-500 mt-1.5">닉네임은 2~12자여야 해요 (현재 {nickname.trim().length}자)</p>
            )}
          </div>
        )}

        {(mode === "signup" || mode === "login") && (
          <>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" type="email" autoComplete="email"
              className={cls(inputCls,
                email && !isValidEmail(email) && inputInvalid,
                email && isValidEmail(email) && inputValid)}/>
            {mode === "signup" && email && !isValidEmail(email) && (
              <p className="text-xs text-rose-500 mt-1.5 font-medium">올바른 이메일 형식이 아니에요</p>
            )}
            <div className="relative">
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" type={showPw ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className={cls(inputCls, "pr-10",
                  mode === "signup" && password && !isValidPassword(password) && inputInvalid,
                  mode === "signup" && password && isValidPassword(password) && inputValid)}/>
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                className={cls("absolute right-0 top-1/2 -translate-y-1/2 p-2", dark ? "text-gray-400" : "text-gray-500")}>
                {showPw ? <Eye size={16}/> : <Eye size={16} className="opacity-40"/>}
              </button>
            </div>
            {mode === "signup" && password && (
              <div className="mt-2 flex flex-col gap-0.5">
                <p className={cls("text-[12px] inline-flex items-center gap-1", password.length >= 8 ? "text-brand-500" : "text-red-500")}>
                  <Check size={10}/> 8자 이상
                </p>
                <p className={cls("text-[12px] inline-flex items-center gap-1", /[a-zA-Z]/.test(password) && /[0-9]/.test(password) ? "text-brand-500" : "text-red-500")}>
                  <Check size={10}/> 영문 + 숫자 포함
                </p>
              </div>
            )}
            {mode === "signup" && (
              <>
                <input value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="비밀번호 확인" type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  className={cls(inputCls,
                    passwordConfirm && passwordConfirm !== password && inputInvalid,
                    passwordConfirm && passwordConfirm === password && inputValid)}/>
                {passwordConfirm && passwordConfirm !== password && (
                  <p className="text-[12px] text-red-500 mt-1.5">비밀번호가 일치하지 않아요</p>
                )}
              </>
            )}
          </>
        )}

        {mode === "forgot-password" && (
          <input value={recoverInput} onChange={(e) => setRecoverInput(e.target.value)} placeholder="가입한 이메일" type="email" className={inputCls}/>
        )}

        {error && (
          <div className={cls("text-[12px] mt-3 p-2.5 rounded flex items-start gap-2", dark ? "bg-red-900/30 text-red-400" : "bg-red-50 text-red-600 border border-red-100")}>
            <span className="shrink-0">⚠</span>
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className={cls("text-[12px] mt-3 p-2.5 rounded flex items-start gap-2", dark ? "bg-brand-900/30 text-brand-300" : "bg-brand-50 text-brand-700")}>
            <Check size={14} className="mt-0.5 shrink-0"/>
            <span>{info}</span>
          </div>
        )}

        <button onClick={submit} disabled={loading}
          className={cls("w-full py-3 rounded-full text-white text-[14px] font-bold mt-6 active:scale-[0.98] transition",
            loading ? "bg-brand-500/50 cursor-wait" : "bg-brand-500 hover:bg-brand-600")}>
          {loading ? (
            <span className="inline-flex items-center gap-2"><RefreshCw size={14} className="animate-spin"/> 처리 중</span>
          ) : (
            <>
              {mode === "signup" && "가입하기"}
              {mode === "login" && "로그인"}
              {mode === "forgot-password" && "재설정 링크 보내기"}
            </>
          )}
        </button>

        {mode === "login" && (
          <div className="flex items-center justify-center mt-6">
            <button onClick={() => { setMode("forgot-password"); setError(""); setInfo(""); setRecoverInput(""); }}
              className={cls("text-[12px]", dark ? "text-brand-300" : "text-brand-700")}>
              비밀번호를 잊으셨나요?
            </button>
          </div>
        )}

        {(mode === "signup" || mode === "login") && (
          <>
            <div className="flex items-center gap-4 my-6">
              <div className={cls("flex-1 h-px", dark ? "bg-[#262626]" : "bg-[#dbdbdb]")}/>
              <span className={cls("text-[13px] font-semibold", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>또는</span>
              <div className={cls("flex-1 h-px", dark ? "bg-[#262626]" : "bg-[#dbdbdb]")}/>
            </div>
            <div className="space-y-3">
              <button disabled
                className={cls("relative w-full py-2 rounded-lg font-semibold text-[14px] flex items-center justify-center gap-2 opacity-50 cursor-not-allowed",
                  dark ? "text-white" : "text-[#385185]")}>
                <MessageCircle size={16} strokeWidth={2}/>
                카카오로 로그인 <span className="text-[11px] ml-1">(준비중)</span>
              </button>
              <button disabled
                className={cls("relative w-full py-2 rounded-lg font-semibold text-[14px] flex items-center justify-center gap-2 opacity-50 cursor-not-allowed",
                  dark ? "text-white" : "text-[#385185]")}>
                Google로 로그인 <span className="text-[11px] ml-1">(준비중)</span>
              </button>
            </div>
          </>
        )}

        {!isRecover && (
          <div className={cls("mt-10 pt-5 border-t text-center", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
            <p className={cls("text-[13px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              {mode === "signup" ? "계정이 있으신가요? " : "계정이 없으신가요? "}
              <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setInfo(""); }}
                className="text-brand-700 font-semibold">
                {mode === "signup" ? "로그인" : "가입하기"}
              </button>
            </p>
          </div>
        )}

        {!isRecover && (
          <button onClick={async () => {
            try {
              // 1. auth 관련 localStorage 키만 선별 삭제.
              //   - sb-* : Supabase 기본 세션 키 (신 포맷)
              //   - supabase* : Supabase 기타 내부 키
              //   - waylog-auth-v2 / waylog-direct-token / waylog:user / waylog:auth-ver : 구버전 잔재
              //   - waylog:migrated-auth-v3 : 다음 로드에서 재정리 트리거 되도록 제거
              // waylog:dark · waylog:taste · waylog:community-clean-ver 등 비-auth 키는 보존.
              const AUTH_LEGACY = [
                'waylog-auth-v2', 'waylog-direct-token', 'waylog:user',
                'waylog:auth-ver', 'waylog:migrated-auth-v3',
              ];
              const keys = Object.keys(localStorage);
              for (const key of keys) {
                if (key.startsWith('sb-') || key.startsWith('supabase') || AUTH_LEGACY.includes(key)) {
                  localStorage.removeItem(key);
                }
              }
              // 2. Supabase signOut
              if (supabase) {
                try { await supabase.auth.signOut(); } catch {}
              }
              // 3. Service Worker 캐시 전체 정리
              if ('caches' in window) {
                const names = await caches.keys();
                await Promise.all(names.map((n) => caches.delete(n)));
              }
              // 4. Service Worker 재등록 강제
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((r) => r.unregister()));
              }
            } catch {}
            window.location.reload();
          }}
            className={cls("w-full mt-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition", dark ? "text-gray-500 hover:text-gray-300 hover:bg-gray-800" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100")}>
            <RotateCcw size={12}/>
            로그인 문제가 있나요? 초기화하기
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;

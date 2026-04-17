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

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);

const AuthScreen = ({ onClose, onAuth, dark }) => {
  const [exiting, close] = useExit(onClose);
  const [mode, setMode] = useState("login"); // signup | login | forgot-password | forgot-email
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(""); setInfo("");
    if (mode === "signup") {
      if (!nickname.trim() || !email.trim() || !password.trim()) { setError("모든 항목을 입력해주세요"); return; }
      if (nickname.trim().length < 2) { setError("닉네임은 2자 이상이어야 해요"); return; }
      if (nickname.trim().length > 12) { setError("닉네임은 12자 이하여야 해요"); return; }
      if (!emailRegex.test(email.trim())) { setError("올바른 이메일 형식이 아니에요 (예: name@email.com)"); return; }
      if (password.length < 8) { setError("비밀번호는 8자 이상이어야 해요"); return; }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) { setError("비밀번호는 영문과 숫자를 모두 포함해야 해요"); return; }
      if (password !== passwordConfirm) { setError("비밀번호가 일치하지 않아요"); return; }
      if (avatar && avatar.length > 500000) { setError("프로필 이미지가 너무 커요. 더 작은 이미지를 선택해주세요"); return; }
      setLoading(true);
      try {
        const { data, error: signUpError } = await withTimeout(
          supabaseAuth.signUp(email.trim(), password, nickname.trim()),
          10000
        );
        if (signUpError) {
          setLoading(false);
          // Supabase 연결 실패 시 로컬 모드 폴백
          if (signUpError.message === "Failed to fetch" || signUpError.message?.includes("fetch")) {
            onAuth({ id: Date.now(), nickname: nickname.trim(), email: email.trim(), avatar, joinedAt: new Date().toISOString() });
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
        setLoading(false);
        if (data?.session) {
          onAuth({ id: data.user.id, nickname: nickname.trim(), email: email.trim(), avatar, joinedAt: new Date().toISOString() });
          close();
        } else {
          // 이메일 ���인 필요 또는 세션 없음 — ���컬 폴백
          onAuth({ id: data?.user?.id || Date.now(), nickname: nickname.trim(), email: email.trim(), avatar, joinedAt: new Date().toISOString() });
          close();
        }
      } catch (e) {
        setLoading(false);
        setError(friendlyError(e, "회���가입 중 문제가 발생했어요. 다시 시도해주��요"));
      }
    } else if (mode === "login") {
      if (!email.trim() || !password.trim()) { setError("이메일과 비밀번호를 입력해주세요"); return; }
      if (!emailRegex.test(email.trim())) { setError("올바른 이메일 형식이 아니에요"); return; }
      setLoading(true);
      try {
        const { data, error: signInError } = await withTimeout(
          supabaseAuth.signIn(email.trim(), password),
          8000
        );
        if (signInError) {
          setLoading(false);
          if (signInError.message === "Failed to fetch" || signInError.message?.includes("fetch")) {
            onAuth({ id: Date.now(), nickname: email.split("@")[0], email: email.trim(), avatar: "", joinedAt: new Date().toISOString() });
            close();
            return;
          }
          setError(friendlyError(signInError, "로그인에 실패했어요. 다시 시도해주세요"));
          return;
        }
        const meta = data?.user?.user_metadata;
        setLoading(false);
        onAuth({
          id: data.user.id,
          nickname: meta?.nickname || email.split("@")[0],
          email: email.trim(),
          avatar: meta?.avatar_url || "",
          joinedAt: data.user.created_at,
        });
        close();
      } catch (e) {
        setLoading(false);
        setError(friendlyError(e, "로그인 중 문제가 발생했어요. 다시 시도해주세요"));
      }
    } else if (mode === "forgot-password") {
      if (!emailRegex.test(recoverInput.trim())) { setError("올바른 이메일을 입력해주세요"); return; }
      setLoading(true);
      try {
        if (supabase) await withTimeout(supabase.auth.resetPasswordForEmail(recoverInput.trim()), 5000);
      } catch {}
      setLoading(false);
      setInfo(`${recoverInput.trim()} 으로 비밀번호 재설정 링크를 보냈어요`);
      setTimeout(() => { setMode("login"); setRecoverInput(""); setInfo(""); }, 2200);
    } else if (mode === "forgot-email") {
      if (!recoverInput.trim()) { setError("이름 또는 전화번호를 입력해주세요"); return; }
      setInfo("해당 기능은 준비 중이에요");
      setTimeout(() => { setMode("login"); setRecoverInput(""); setInfo(""); }, 2800);
    }
  };

  const handleSocial = (provider, label) => {
    onAuth({
      id: Date.now(),
      nickname: `${label}유저`,
      email: `${provider}_${Date.now()}@waylog.demo`,
      avatar: "",
      joinedAt: new Date().toISOString(),
      provider,
    });
    close();
  };

  const inputCls = cls("w-full text-sm bg-transparent outline-none border-b-2 pb-2 mt-4 transition-colors", dark ? "text-white placeholder-gray-600 border-gray-700 focus:border-emerald-500" : "text-gray-900 placeholder-gray-400 border-gray-200 focus:border-emerald-500");
  // valid/invalid 상태용 클래스 — 값이 비어있지 않을 때만 색을 띄운다.
  const inputInvalid = "!border-rose-400";
  const inputValid = dark ? "!border-emerald-500/60" : "!border-emerald-500/50";

  const isRecover = mode === "forgot-password" || mode === "forgot-email";
  const headerTitle = {
    signup: "회원가입",
    login: "로그인",
    "forgot-password": "비밀번호 찾기",
    "forgot-email": "이메일 찾기",
  }[mode];

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        {isRecover ? (
          <button onClick={() => { setMode("login"); setError(""); setInfo(""); setRecoverInput(""); }}>
            <ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/>
          </button>
        ) : (
          <button onClick={close} aria-label="닫기"><X size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        )}
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>{headerTitle}</p>
        <div className="w-6"/>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <Sparkles size={40} className="text-white" strokeWidth={2}/>
          </div>
          <h1 className={cls("text-2xl font-black mt-4 tracking-tight", dark ? "text-white" : "text-gray-900")}>
            {mode === "signup" && <>웨이로그에 오신 걸<br/>환영해요</>}
            {mode === "login" && <>다시 만나서<br/>반가워요</>}
            {mode === "forgot-password" && <>비밀번호를<br/>잊으셨나요?</>}
            {mode === "forgot-email" && <>이메일을<br/>잊으셨나요?</>}
          </h1>
          <p className={cls("text-xs mt-2", dark ? "text-gray-400" : "text-gray-500")}>
            {mode === "signup" && "나만의 라이프스타일을 기록하세요"}
            {mode === "login" && "이메일로 로그인하거나 소셜 계정을 사용하세요"}
            {mode === "forgot-password" && "가입한 이메일로 재설정 링크를 보내드려요"}
            {mode === "forgot-email" && "가입 시 입력한 이름이나 전화번호를 입력하세요"}
          </p>
        </div>

        {mode === "signup" && (
          <div className={cls("rounded-2xl p-4 mb-6", dark ? "bg-gray-800" : "bg-white border border-gray-100")}>
            <p className={cls("text-xs font-bold uppercase tracking-wider mb-3", dark ? "text-gray-400" : "text-gray-500")}>가입하면 이런 게 가능해요</p>
            <div className="space-y-2.5">
              {[
                { Icon: Target,  title: "취향 학습 추천",     desc: "내 취향에 맞는 리뷰가 자동으로" },
                { Icon: BookOpen,title: "무드 다이어리",      desc: "내가 좋아한 것들을 시간순으로" },
                { Icon: PenLine, title: "나만의 웨이로그 작성", desc: "리뷰와 댓글을 자유롭게" },
              ].map((b) => (
                <div key={b.title} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0">
                    <b.Icon size={16} className="text-emerald-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cls("text-xs font-bold", dark ? "text-white" : "text-gray-900")}>{b.title}</p>
                    <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "signup" && (
          <div className="mb-4 flex flex-col items-center">
            <div className="relative">
              <Avatar id={avatar} size={48} className="w-24 h-24 shadow-lg" rounded="rounded-full"/>
              <label className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-90 transition border-2 border-white">
                <Camera size={15} className="text-white"/>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
              </label>
            </div>
            <p className={cls("text-xs mt-3 font-medium", dark ? "text-gray-400" : "text-gray-500")}>
              {avatar ? "사진을 변경하려면 카메라 아이콘을 누르세요" : "프로필 사진 추가 (선택)"}
            </p>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임 (2~12자)"
              className={cls(inputCls,
                nickname && (nickname.trim().length < 2 || nickname.trim().length > 12) && inputInvalid,
                nickname && nickname.trim().length >= 2 && nickname.trim().length <= 12 && inputValid)}/>
            {nickname && (nickname.trim().length < 2 || nickname.trim().length > 12) && (
              <p className="text-xs text-rose-500 mt-1.5 font-medium">닉네임은 2~12자여야 해요 (현재 {nickname.trim().length}자)</p>
            )}
          </div>
        )}

        {(mode === "signup" || mode === "login") && (
          <>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" type="email" autoComplete="email"
              className={cls(inputCls,
                email && !emailRegex.test(email.trim()) && inputInvalid,
                email && emailRegex.test(email.trim()) && inputValid)}/>
            {mode === "signup" && email && !emailRegex.test(email.trim()) && (
              <p className="text-xs text-rose-500 mt-1.5 font-medium">올바른 이메일 형식이 아니에요</p>
            )}
            <div className="relative">
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" type={showPw ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className={cls(inputCls, "pr-10",
                  mode === "signup" && password && (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) && inputInvalid,
                  mode === "signup" && password && password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password) && inputValid)}/>
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                className={cls("absolute right-0 top-1/2 -translate-y-1/2 p-2", dark ? "text-gray-400" : "text-gray-500")}>
                {showPw ? <Eye size={16}/> : <Eye size={16} className="opacity-40"/>}
              </button>
            </div>
            {mode === "signup" && password && (
              <div className="mt-1.5 flex flex-col gap-0.5">
                <p className={cls("text-xs font-medium inline-flex items-center gap-1", password.length >= 8 ? dark ? "text-emerald-400" : "text-emerald-600" : "text-rose-500")}>
                  <Check size={10}/> 8자 이상
                </p>
                <p className={cls("text-xs font-medium inline-flex items-center gap-1", /[a-zA-Z]/.test(password) && /[0-9]/.test(password) ? dark ? "text-emerald-400" : "text-emerald-600" : "text-rose-500")}>
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
                  <p className="text-xs text-rose-500 mt-1.5 font-medium">비밀번호가 일치하지 않아요</p>
                )}
              </>
            )}
          </>
        )}

        {mode === "forgot-password" && (
          <input value={recoverInput} onChange={(e) => setRecoverInput(e.target.value)} placeholder="가입한 이메일" type="email" className={inputCls}/>
        )}

        {mode === "forgot-email" && (
          <input value={recoverInput} onChange={(e) => setRecoverInput(e.target.value)} placeholder="이름 또는 전화번호" className={inputCls}/>
        )}

        {error && (
          <div className={cls("text-xs mt-3 p-3 rounded-xl flex items-start gap-2 font-medium", dark ? "bg-rose-900/40 text-rose-300" : "bg-rose-50 text-rose-700 border border-rose-200")}>
            <span className="shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className={cls("text-xs mt-3 p-3 rounded-xl flex items-start gap-2 font-medium", dark ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-50 text-emerald-700")}>
            <Check size={14} className="mt-0.5 shrink-0"/>
            <span>{info}</span>
          </div>
        )}

        <button onClick={submit} disabled={loading}
          className={cls("w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold mt-6 active:scale-[0.98] transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2", loading && "opacity-70 cursor-wait")}>
          {loading ? (
            <><RefreshCw size={16} className="animate-spin"/> 처리 중...</>
          ) : (
            <>
              {mode === "signup" && "회원가입 완료"}
              {mode === "login" && "로그인"}
              {mode === "forgot-password" && "재설정 링크 보내기"}
              {mode === "forgot-email" && "이메일 찾기"}
            </>
          )}
        </button>

        {mode === "login" && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => { setMode("forgot-email"); setError(""); setInfo(""); setRecoverInput(""); }}
              className={cls("text-xs font-medium", dark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700")}>
              이메일 찾기
            </button>
            <span className={cls("text-xs", dark ? "text-gray-700" : "text-gray-300")}>·</span>
            <button onClick={() => { setMode("forgot-password"); setError(""); setInfo(""); setRecoverInput(""); }}
              className={cls("text-xs font-medium", dark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700")}>
              비밀번호 찾기
            </button>
          </div>
        )}

        {(mode === "signup" || mode === "login") && (
          <>
            <div className="flex items-center gap-3 my-6">
              <div className={cls("flex-1 h-px", dark ? "bg-gray-700" : "bg-gray-200")}/>
              <span className={cls("text-xs font-medium", dark ? "text-gray-400" : "text-gray-500")}>또는</span>
              <div className={cls("flex-1 h-px", dark ? "bg-gray-700" : "bg-gray-200")}/>
            </div>
            <div className="space-y-2.5">
              <button disabled
                className="relative w-full py-3.5 bg-[#FEE500]/50 text-gray-900/50 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed shadow-md">
                <MessageCircle size={18} fill="currentColor" strokeWidth={0}/>
                카카오로 계속하기
                <span className="absolute top-1.5 right-2.5 text-[9px] font-black bg-black/15 px-1.5 py-0.5 rounded text-gray-800 tracking-wider">준비중</span>
              </button>
              <button disabled
                className="relative w-full py-3.5 bg-[#03C75A]/50 text-white/50 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed shadow-md">
                <span className="font-black text-base tracking-tight">N</span>
                네이버로 계속하기
                <span className="absolute top-1.5 right-2.5 text-[9px] font-black bg-white/20 px-1.5 py-0.5 rounded text-white tracking-wider">준비중</span>
              </button>
              <button disabled
                className={cls("relative w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed shadow-md border opacity-50", dark ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200")}>
                <span className="font-black text-base" style={{ background: "linear-gradient(45deg,#4285F4 0%,#EA4335 30%,#FBBC05 65%,#34A853 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>G</span>
                Google로 계속하기
                <span className={cls("absolute top-1.5 right-2.5 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider", dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-500")}>준비중</span>
              </button>
            </div>
          </>
        )}

        {!isRecover && (
          <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setInfo(""); }}
            className={cls("w-full mt-5 text-xs", dark ? "text-gray-400" : "text-gray-500")}>
            {mode === "signup" ? "이미 계정이 있으신가요? " : "처음이신가요? "}
            <span className="text-emerald-500 font-bold">{mode === "signup" ? "로그인" : "회원가입"}</span>
          </button>
        )}

        {!isRecover && (
          <button onClick={async () => {
            try {
              // 1. localStorage 인증 관련 키 전부 정리
              const keys = Object.keys(localStorage);
              for (const key of keys) {
                if (key.startsWith('sb-') || key.startsWith('waylog-auth') || key.startsWith('waylog:')) {
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

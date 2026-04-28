import { useState } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import { cls } from "../utils/ui.js";
import { useExit } from "../hooks.js";
import { CATEGORIES } from "../constants.js";
import { Avatar } from "../components/index.js";

const ProfileScreen = ({ user, onClose, onLogout, onUpdateProfile, onOpenSettings, dark, favs, moods, userReviews, taste }) => {
  const [exiting, close] = useExit(onClose);
  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState(user.nickname);
  const [avatar, setAvatar] = useState(user.avatar);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const moodCount = Object.values(moods).filter(Boolean).length;
  const totalCats = Object.values(taste.cats).reduce((a,b) => a+b, 0);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onUpdateProfile(
        { ...user, nickname: nick.trim() || user.nickname, avatar },
        avatarFile
      );
      setAvatarFile(null);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto overflow-y-auto pt-safe", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-black" : "bg-white")}>
      <header className={cls("sticky top-0 z-10 flex items-center justify-between px-4 h-12 border-b", dark ? "bg-black border-[#262626]" : "bg-white border-[#dbdbdb]")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={22} className={dark ? "text-white" : "text-black"}/></button>
        <p className={cls("text-[16px] font-bold", dark ? "text-white" : "text-black")}>프로필 편집</p>
        <button onClick={() => editing ? save() : setEditing(true)} disabled={saving}
          className={cls("px-4 py-1.5 rounded-full text-[13px] font-bold transition active:scale-95",
            editing
              ? saving ? "bg-brand-500/50 text-white cursor-wait" : "bg-brand-500 text-white"
              : dark ? "bg-[#1a1a1a] text-white border border-[#262626]" : "bg-white text-black border border-[#dbdbdb]")}>
          {editing ? (saving ? "저장 중" : "완료") : "편집"}
        </button>
      </header>

      <div className="px-4 py-6">
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar id={avatar} size={48} className="w-24 h-24" rounded="rounded-full"/>
            {editing && (
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center cursor-pointer active:opacity-80 transition border-2"
                style={{ borderColor: dark ? "#000" : "#fff" }}>
                <Camera size={14} className="text-white"/>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
              </label>
            )}
          </div>
          {editing ? (
            <input value={nick} onChange={(e) => setNick(e.target.value)}
              className={cls("mt-4 text-[18px] font-bold text-center bg-transparent outline-none border-b pb-1 focus:border-brand-500", dark ? "text-white border-ink-800" : "text-black border-ink-200")}/>
          ) : (
            <h2 className={cls("mt-4 text-[18px] font-bold", dark ? "text-white" : "text-black")}>{user.nickname}</h2>
          )}
          <p className={cls("text-[13px] mt-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{user.email}</p>
          <p className={cls("text-[12px] mt-1", dark ? "text-[#a8a8a8]" : "text-[#a8a8a8]")}>
            가입일 · {new Date(user.joinedAt).toLocaleDateString("ko-KR")}
          </p>
        </div>

        <div className={cls("grid grid-cols-3 gap-0 mt-6 border-y py-4", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
          <div className="text-center">
            <p className={cls("text-[18px] font-bold tabular-nums", dark ? "text-white" : "text-black")}>{userReviews.length}</p>
            <p className={cls("text-[13px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>게시물</p>
          </div>
          <div className="text-center">
            <p className={cls("text-[18px] font-bold tabular-nums", dark ? "text-white" : "text-black")}>{favs.size}</p>
            <p className={cls("text-[13px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>저장됨</p>
          </div>
          <div className="text-center">
            <p className={cls("text-[18px] font-bold tabular-nums", dark ? "text-white" : "text-black")}>{moodCount}</p>
            <p className={cls("text-[13px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>무드</p>
          </div>
        </div>

        {totalCats > 0 && (
          <div className={cls("mt-4 p-5 rounded-card border", dark ? "border-ink-800" : "border-ink-200")}>
            <p className={cls("text-[12px] font-semibold mb-3 uppercase tracking-wider", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              카테고리 비율
            </p>
            <div className={cls("flex h-2 rounded-full overflow-hidden", dark ? "bg-[#121212]" : "bg-[#fafafa]")}>
              {Object.entries(taste.cats).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([k,v]) => (
                <div key={k} className={cls("bg-gradient-to-r", CATEGORIES[k].color)} style={{ width: `${(v/totalCats)*100}%` }}/>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(taste.cats).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([k,v]) => (
                <div key={k} className="flex items-center gap-1">
                  <div className={cls("w-1.5 h-1.5 rounded-full bg-gradient-to-br", CATEGORIES[k].color)}/>
                  <span className={cls("text-[11px] font-semibold", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                    {CATEGORIES[k].label} {Math.round((v/totalCats)*100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => onOpenSettings && onOpenSettings()}
          className={cls("w-full mt-5 py-3 rounded-xl text-[14px] font-bold transition active:scale-[0.98]",
            dark ? "bg-[#1a1a1a] text-white border border-[#262626]" : "bg-white text-black border border-[#dbdbdb]")}>
          설정
        </button>
        <button onClick={() => { onLogout(); close(); }}
          className="w-full mt-2 py-3 rounded-xl text-[14px] font-bold text-rose-500 active:opacity-60">
          로그아웃
        </button>
      </div>
    </div>
  );
};


export default ProfileScreen;

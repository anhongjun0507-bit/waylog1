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
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto overflow-y-auto", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("sticky top-0 z-10 flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={20} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>프로필</p>
        <button onClick={() => editing ? save() : setEditing(true)} disabled={saving}
          className={cls("text-sm font-bold", saving ? "text-emerald-300" : "text-emerald-500")}>
          {editing ? (saving ? "저장 중…" : "저장") : "편집"}
        </button>
      </header>

      <div className="p-6">
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar id={avatar} size={48} className="w-24 h-24 shadow-lg shadow-emerald-500/20" rounded="rounded-full"/>
            {editing && (
              <label className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-90 transition border-2 border-white">
                <Camera size={15} className="text-white"/>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
              </label>
            )}
          </div>
          {editing ? (
            <input value={nick} onChange={(e) => setNick(e.target.value)}
              className={cls("mt-4 text-xl font-black text-center bg-transparent outline-none border-b-2", dark ? "text-white border-gray-700" : "text-gray-900 border-gray-200")}/>
          ) : (
            <h2 className={cls("mt-4 text-xl font-black", dark ? "text-white" : "text-gray-900")}>{user.nickname}</h2>
          )}
          <p className={cls("text-xs mt-1", dark ? "text-gray-400" : "text-gray-500")}>{user.email}</p>
          <p className={cls("text-xs font-normal opacity-70 mt-1", dark ? "text-gray-400" : "text-gray-600")}>
            가입 {new Date(user.joinedAt).toLocaleDateString("ko-KR")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className={cls("rounded-2xl p-4 text-center", dark ? "bg-gray-800" : "bg-white")}>
            <p className="text-2xl font-black text-rose-500">{favs.size}</p>
            <p className={cls("text-xs mt-1 font-semibold", dark ? "text-gray-400" : "text-gray-500")}>찜</p>
          </div>
          <div className={cls("rounded-2xl p-4 text-center", dark ? "bg-gray-800" : "bg-white")}>
            <p className="text-2xl font-black text-amber-500">{moodCount}</p>
            <p className={cls("text-xs mt-1 font-semibold", dark ? "text-gray-400" : "text-gray-500")}>무드</p>
          </div>
          <div className={cls("rounded-2xl p-4 text-center", dark ? "bg-gray-800" : "bg-white")}>
            <p className="text-2xl font-black text-emerald-500">{userReviews.length}</p>
            <p className={cls("text-xs mt-1 font-semibold", dark ? "text-gray-400" : "text-gray-500")}>작성</p>
          </div>
        </div>

        {totalCats > 0 && (
          <div className={cls("mt-4 p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
            <p className={cls("text-xs font-bold mb-3", dark ? "text-gray-300" : "text-gray-700")}>카테고리 비율</p>
            <div className="flex h-2 rounded-full overflow-hidden">
              {Object.entries(taste.cats).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([k,v]) => (
                <div key={k} className={cls("bg-gradient-to-r", CATEGORIES[k].color)} style={{ width: `${(v/totalCats)*100}%` }}/>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(taste.cats).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([k,v]) => (
                <div key={k} className="flex items-center gap-1">
                  <div className={cls("w-2 h-2 rounded-full bg-gradient-to-br", CATEGORIES[k].color)}/>
                  <span className={cls("text-xs font-semibold", dark ? "text-gray-400" : "text-gray-500")}>
                    {CATEGORIES[k].label} {Math.round((v/totalCats)*100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => onOpenSettings && onOpenSettings()}
          className={cls("w-full mt-6 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border", dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-50")}>
          설정
        </button>
        <button onClick={() => { onLogout(); close(); }}
          className={cls("w-full mt-2 py-3 rounded-2xl text-sm font-bold border", dark ? "border-gray-700 text-rose-400" : "border-gray-200 text-rose-500")}>
          로그아웃
        </button>
      </div>
    </div>
  );
};


export default ProfileScreen;

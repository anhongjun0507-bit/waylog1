import { useState } from "react";
import { ArrowLeft, PenLine, Users, Heart, CircleUser } from "lucide-react";
import { cls } from "../utils/ui.js";
import { useExit } from "../hooks.js";

// 챌린지 참가자들의 익명 커뮤니티. challenge, anonPosts, onAddPost 는 props 로 받음.
export const AnonCommunityScreen = ({ challenge, onClose, dark, anonPosts, onAddPost, getChallengeDay }) => {
  const [exiting, close] = useExit(onClose);
  const [composing, setComposing] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");

  const anonId = challenge?.anonId || "익명";
  const dayNum = getChallengeDay ? getChallengeDay(challenge?.startDate) : 0;

  const handlePost = () => {
    if (!postBody.trim()) return;
    onAddPost({
      id: Date.now(),
      anonId,
      dayNum,
      title: postTitle.trim(),
      body: postBody.trim(),
      likes: Math.floor(Math.random() * 15) + 1,
      createdAt: Date.now(),
    });
    setPostTitle(""); setPostBody(""); setComposing(false);
  };

  const sorted = [...(anonPosts || [])].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>챌린지 커뮤니티</p>
        <button onClick={() => setComposing(true)} aria-label="새 글 쓰기" className="text-emerald-500"><PenLine size={20}/></button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {composing && (
          <div className={cls("p-4 rounded-2xl space-y-3", dark ? "bg-gray-800" : "bg-white")}>
            <div className="flex items-center gap-2 mb-1">
              <CircleUser size={16} className="text-emerald-500"/>
              <span className={cls("text-xs font-bold", dark ? "text-gray-300" : "text-gray-700")}>{anonId}</span>
              <span className={cls("text-xs px-2 py-0.5 rounded-full font-bold", dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")}>Day {dayNum}</span>
            </div>
            <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="제목 (선택)"
              className={cls("w-full px-3 py-2 rounded-xl text-sm font-bold", dark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900")}/>
            <textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} placeholder="오늘의 챌린지를 공유해보세요..."
              rows={3} className={cls("w-full px-3 py-2 rounded-xl text-sm resize-none", dark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900")}/>
            <div className="flex gap-2">
              <button onClick={() => { setComposing(false); setPostTitle(""); setPostBody(""); }}
                className={cls("flex-1 py-2.5 rounded-xl text-sm font-bold", dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600")}>취소</button>
              <button onClick={handlePost} disabled={!postBody.trim()}
                className={cls("flex-1 py-2.5 rounded-xl text-sm font-black",
                  postBody.trim() ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" : dark ? "bg-gray-700 text-gray-600" : "bg-gray-200 text-gray-400")}>
                공유하기
              </button>
            </div>
          </div>
        )}

        {sorted.length === 0 && !composing && (
          <div className={cls("py-12 text-center rounded-2xl border-2 border-dashed", dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400")}>
            <Users size={32} className="mx-auto mb-2 opacity-50"/>
            <p className="text-sm font-bold">아직 게시물이 없어요</p>
            <p className="text-xs mt-1">첫 번째로 챌린지 후기를 공유해보세요!</p>
          </div>
        )}

        {sorted.map((p) => (
          <div key={p.id} className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
            <div className="flex items-center gap-2 mb-2">
              <CircleUser size={16} className={p.anonId === anonId ? "text-emerald-500" : dark ? "text-gray-400" : "text-gray-500"}/>
              <span className={cls("text-xs font-bold", dark ? "text-gray-300" : "text-gray-700")}>{p.anonId}</span>
              <span className={cls("text-xs px-2 py-0.5 rounded-full font-bold", dark ? "bg-amber-900/40 text-amber-300" : "bg-amber-50 text-amber-700")}>Day {p.dayNum}</span>
              {p.anonId === anonId && <span className={cls("text-xs px-1.5 py-0.5 rounded-full font-bold", dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")}>나</span>}
            </div>
            {p.title && <p className={cls("text-sm font-black mb-1", dark ? "text-white" : "text-gray-900")}>{p.title}</p>}
            <p className={cls("text-sm leading-relaxed", dark ? "text-gray-300" : "text-gray-700")}>{p.body}</p>
            <div className={cls("flex items-center gap-2 mt-3 pt-2 border-t", dark ? "border-gray-700" : "border-gray-100")}>
              <Heart size={14} className="text-rose-500" fill="currentColor"/>
              <span className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>{p.likes} 응원</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

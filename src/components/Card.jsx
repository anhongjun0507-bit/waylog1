import { Heart, Eye, Layers } from "lucide-react";
import { cls } from "../utils/ui.js";
import { SmartImg } from "./SmartImg.jsx";
import { CategoryChip } from "./CategoryIcon.jsx";
import { HeartBtn } from "./HeartBtn.jsx";

// 리뷰 카드 — 피드/검색/즐겨찾기 공용
export const Card = ({ r, onOpen, favs, toggleFav, dark }) => (
  <button onClick={() => onOpen(r)} className={cls("text-left rounded-2xl shadow-sm overflow-hidden w-full transition active:scale-[0.98]", dark ? "bg-gray-800" : "bg-white")}>
    <div className="relative">
      <SmartImg r={r} className="w-full h-44 object-cover"/>
      <div className="absolute top-2 left-2"><CategoryChip cat={r.category} dark={dark} /></div>
      <div className="absolute top-2 right-2"><HeartBtn on={favs.has(r.id)} onClick={() => toggleFav(r.id)} dark={dark} /></div>
      {r.media && r.media.length > 0 && (() => {
        const hasVideo = r.media.some((m) => m.type === "video");
        const showBadge = r.media.length > 1 || hasVideo;
        if (!showBadge) return null;
        return (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-black tabular-nums shadow-lg ring-1 ring-white/30 inline-flex items-center gap-1">
            {hasVideo ? (
              <div className="w-0 h-0 border-l-[5px] border-l-white border-y-[3px] border-y-transparent ml-0.5"/>
            ) : (
              <Layers size={10} strokeWidth={2.5}/>
            )}
            {r.media.length > 1 && <span>{r.media.length}</span>}
          </div>
        );
      })()}
    </div>
    <div className="p-3">
      <p className={cls("text-sm font-bold leading-snug line-clamp-2", dark ? "text-white" : "text-gray-900")}>{r.title}</p>
      {r.product && <p className={cls("text-xs font-medium mt-1.5 line-clamp-1 opacity-90", dark ? "text-gray-300" : "text-gray-600")}>{r.product}</p>}
      <div className={cls("flex items-center gap-2.5 mt-2 text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>
        <span className="flex items-center gap-1"><Heart size={11}/> {r.likes}</span>
        <span className="flex items-center gap-1"><Eye size={11}/> {r.views}</span>
      </div>
    </div>
  </button>
);

import { memo, useState } from "react";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Film, Images } from "lucide-react";
import { cls, formatRelativeTime } from "../utils/ui.js";
import { SmartImg } from "./SmartImg.jsx";
import { Avatar } from "./Avatar.jsx";
import { CATEGORIES } from "../constants.js";

// Waylog 피드 카드 — 라이프스타일 매거진 톤
// 레이아웃:
//   Header: Avatar + 작성자 · 시간 + 더보기
//   Image: 정사각형 (매거진 사진) rounded
//   Meta: 카테고리 칩 + 제품명 (있을 때)
//   Title/Body: 제목 굵게 + 본문 2줄 클램프 + "더 보기"
//   Action bar: 좋아요 + 댓글 + 저장 (공유/DM 제거)
const PostImpl = ({ r, onOpen, isFav, toggleFav, dark, highlight = false }) => {
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const timestamp = formatRelativeTime(r.createdAt || (r.date ? new Date(r.date).getTime() : null), "방금");
  const hasImg = !!r.img;
  const mediaCount = r.media ? r.media.length : 0;
  const hasVideo = r.media && r.media.some((m) => m.type === "video");
  const cat = r.category && CATEGORIES[r.category];

  return (
    <article data-rid={r.id}
      className={cls("block w-full", highlight && "bg-mint-500/5")}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden">
          <Avatar id={r.authorAvatar} size={10} className="w-full h-full"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className={cls("text-[14px] font-bold truncate", dark ? "text-white" : "text-black")}>
            {r.author || "익명"}
          </p>
          {timestamp && (
            <p className={cls("text-[11px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{timestamp}</p>
          )}
        </div>
        <button aria-label="더보기" className="active:opacity-60">
          <MoreHorizontal size={18} className={dark ? "text-white" : "text-black"}/>
        </button>
      </div>

      {/* Image — rounded (매거진 톤), 가로 여백 주어 edge-to-edge 지양 */}
      {hasImg && (
        <button onClick={() => onOpen(r)} className="block w-full px-4">
          <div className={cls("relative w-full aspect-square overflow-hidden rounded-xl", dark ? "bg-[#121212]" : "bg-[#fafafa]")}>
            <SmartImg r={r} className="w-full h-full object-cover"/>
            {(hasVideo || mediaCount > 1) && (
              <div className="absolute top-3 right-3 bg-black/50 backdrop-blur rounded-full w-8 h-8 flex items-center justify-center">
                {hasVideo
                  ? <Film size={16} className="text-white" strokeWidth={2}/>
                  : <Images size={16} className="text-white" strokeWidth={2}/>}
              </div>
            )}
          </div>
        </button>
      )}

      {/* 텍스트 전용 포스트 */}
      {!hasImg && r.title && (
        <button onClick={() => onOpen(r)} className="w-full text-left px-4 pb-3">
          <p className={cls("text-[15px] font-semibold leading-[1.4]", dark ? "text-white" : "text-black")}>
            {r.title}
          </p>
          {r.body && (
            <p className={cls("text-[14px] leading-[1.4] mt-1", dark ? "text-white/90" : "text-black/90")}>
              {r.body}
            </p>
          )}
        </button>
      )}

      {/* 카테고리 + 제품 메타 */}
      {(cat || r.product) && (
        <div className="px-4 pt-3 flex items-center gap-2 flex-wrap">
          {cat && (
            <span className={cls("px-2.5 py-1 rounded-full text-[11px] font-bold", dark ? cat.dchip : cat.chip)}>
              {cat.label}
            </span>
          )}
          {r.product && (
            <span className={cls("text-[12px] truncate", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              {r.product}
            </span>
          )}
        </div>
      )}

      {/* 제목/본문 */}
      {hasImg && r.title && (
        <button onClick={() => onOpen(r)} className="w-full text-left px-4 pt-2">
          <h3 className={cls("text-[15px] font-bold leading-[1.35]", dark ? "text-white" : "text-black")}>
            {r.title}
          </h3>
          {r.body && (
            <p className={cls("text-[13.5px] leading-[1.5] mt-1", dark ? "text-[#d4d4d4]" : "text-[#404040]", !captionExpanded && "line-clamp-2")}>
              {r.body}
            </p>
          )}
          {r.body && r.body.length > 80 && !captionExpanded && (
            <span onClick={(e) => { e.stopPropagation(); setCaptionExpanded(true); }}
              className={cls("text-[13px] font-medium mt-1 inline-block", dark ? "text-mint-400" : "text-mint-700")}>
              더 보기
            </span>
          )}
          {r.tags && r.tags.length > 0 && captionExpanded && (
            <p className={cls("text-[13px] mt-1.5", dark ? "text-mint-400" : "text-mint-700")}>
              {r.tags.map((t) => `#${t}`).join(" ")}
            </p>
          )}
        </button>
      )}

      {/* Action bar — 좋아요 / 댓글 / 저장 */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); toggleFav(r.id); }}
          aria-label={isFav ? "좋아요 취소" : "좋아요"} aria-pressed={isFav}
          className="p-1.5 active:scale-90 transition inline-flex items-center gap-1.5">
          <Heart size={24} strokeWidth={1.8}
            className={cls(isFav ? "fill-mint-500 text-mint-500" : dark ? "text-white" : "text-black")}/>
          {r.likes > 0 && (
            <span className={cls("text-[13px] font-semibold tabular-nums", dark ? "text-white" : "text-black")}>
              {r.likes.toLocaleString()}
            </span>
          )}
        </button>
        <button onClick={() => onOpen(r)} aria-label="댓글" className="p-1.5 active:scale-90 transition inline-flex items-center gap-1.5">
          <MessageCircle size={24} strokeWidth={1.8} className={dark ? "text-white" : "text-black"}/>
          {r.comments > 0 && (
            <span className={cls("text-[13px] font-semibold tabular-nums", dark ? "text-white" : "text-black")}>
              {r.comments}
            </span>
          )}
        </button>
        <button aria-label="저장" className="ml-auto p-1.5 active:scale-90 transition">
          <Bookmark size={24} strokeWidth={1.8} className={dark ? "text-white" : "text-black"}/>
        </button>
      </div>

      <div className={cls("mx-4 border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")}/>
    </article>
  );
};

export const Card = memo(PostImpl);

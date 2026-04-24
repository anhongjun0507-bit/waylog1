import { memo, useState } from "react";
import { Heart, MessageCircle, MoreHorizontal, Film, Images, ShoppingBag, PenLine, X } from "lucide-react";
import { cls, formatRelativeTime } from "../utils/ui.js";
import { getReviewProductNames } from "../utils/products.js";
import { useCatalog } from "../catalog.js";
import { SmartImg } from "./SmartImg.jsx";
import { Avatar } from "./Avatar.jsx";
import { CATEGORIES } from "../constants.js";

// Waylog 피드 카드 — 라이프스타일 매거진 톤
// 레이아웃:
//   Header: Avatar + 작성자 · 시간 + (본인 글이면) ⋯ 메뉴
//   Image: 정사각형 (매거진 사진) rounded
//   Meta: 카테고리 칩 + 제품명 (있을 때)
//   Title/Body: 제목 굵게 + 본문 2줄 클램프 + "더 보기"
//   Action bar: 좋아요 + 댓글
const PostImpl = ({ r, onOpen, isFav, toggleFav, dark, highlight = false, user, onEdit, onDelete }) => {
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const catalog = useCatalog();
  // authorId 우선, 닉네임 폴백 — 사용자가 닉네임 변경해도 본인 글 판정 유지.
  // pending 로컬 리뷰(authorId 미설정)는 닉네임으로 커버.
  const isMine = !!(user && onEdit && onDelete && (r.authorId === user.id || r.author === user.nickname));

  const timestamp = formatRelativeTime(r.createdAt || (r.date ? new Date(r.date).getTime() : null), "방금");
  const hasImg = !!r.img;
  const mediaCount = r.media ? r.media.length : 0;
  const hasVideo = r.media && r.media.some((m) => m.type === "video");
  const cat = r.category && CATEGORIES[r.category];

  return (
    <article data-rid={r.id}
      className={cls("block w-full", highlight && "bg-brand-500/5")}>
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
            <p className={cls("text-[11px]", dark ? "text-ink-400" : "text-ink-500")}>{timestamp}</p>
          )}
        </div>
        {isMine && (
          <div className="relative shrink-0">
            <button onClick={() => setMenuOpen((v) => !v)} aria-label="옵션 메뉴" className="min-w-tap min-h-tap flex items-center justify-center active:opacity-60 -m-2.5">
              <MoreHorizontal size={18} className={dark ? "text-white" : "text-black"}/>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)}/>
                <div className={cls("absolute right-0 top-8 z-20 rounded-2xl shadow-2xl overflow-hidden min-w-[140px] animate-fade-in", dark ? "bg-gray-800" : "bg-white")}>
                  <button onClick={() => { setMenuOpen(false); onEdit(r); }}
                    className={cls("w-full px-4 py-3 text-sm font-bold text-left flex items-center gap-2.5 transition", dark ? "text-gray-200 active:bg-gray-700" : "text-gray-700 active:bg-gray-50")}>
                    <PenLine size={14}/> 수정하기
                  </button>
                  <div className={cls("h-px", dark ? "bg-gray-700" : "bg-gray-100")}/>
                  <button onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                    className="w-full px-4 py-3 text-sm font-bold text-left flex items-center gap-2.5 text-rose-500 transition active:bg-rose-50 dark:active:bg-rose-900/20">
                    <X size={14}/> 삭제하기
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {confirmDelete && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50 animate-fade-in" onClick={() => setConfirmDelete(false)}/>
          <div className={cls("fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[90%] max-w-sm rounded-2xl p-5 shadow-2xl animate-fade-in", dark ? "bg-gray-900" : "bg-white")}>
            <p className={cls("text-[15px] font-bold", dark ? "text-white" : "text-black")}>이 웨이로그를 삭제할까요?</p>
            <p className={cls("text-[13px] mt-1.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>삭제된 글은 복구할 수 없어요.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmDelete(false)}
                className={cls("flex-1 py-2.5 rounded-xl text-sm font-bold", dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700")}>
                취소
              </button>
              <button onClick={() => { setConfirmDelete(false); onDelete(r); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-rose-500 text-white active:opacity-80">
                삭제
              </button>
            </div>
          </div>
        </>
      )}

      {/* Image — 4:3 landscape 비율로 카드 세로 부피 축소. 스크롤 피로 ↓ */}
      {hasImg && (
        <button onClick={() => onOpen(r)} className="block w-full px-4">
          <div className={cls("relative w-full aspect-[4/3] overflow-hidden rounded-card", dark ? "bg-ink-900" : "bg-ink-50")}>
            <SmartImg r={r} className="w-full h-full object-cover"/>
            {(hasVideo || mediaCount > 1) && (
              <div className="absolute top-3 right-3 bg-black/60 rounded-full w-8 h-8 flex items-center justify-center">
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

      {/* 카테고리 + 제품 메타 — 제품은 웨이로그 핵심 정보라 민트 칩으로 강조 */}
      {(cat || r.product) && (() => {
        const productNames = getReviewProductNames(r, catalog);
        return (
          <div className="px-4 pt-3 flex items-center gap-2 flex-wrap">
            {cat && (
              <span className={cls("px-2.5 py-1 rounded-full text-[11px] font-bold", dark ? cat.dchip : cat.chip)}>
                {cat.label}
              </span>
            )}
            {productNames.map((name, i) => (
              <span key={i} className={cls("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold max-w-[200px]",
                dark ? "bg-brand-900/40 text-brand-200" : "bg-brand-50 text-brand-700")}>
                <ShoppingBag size={10} strokeWidth={2.2} className="shrink-0"/>
                <span className="truncate">{name}</span>
              </span>
            ))}
          </div>
        );
      })()}

      {/* 제목/본문 */}
      {hasImg && r.title && (
        <button onClick={() => onOpen(r)} className="w-full text-left px-4 pt-2">
          <h3 className={cls("text-[15px] font-bold leading-[1.35]", dark ? "text-white" : "text-black")}>
            {r.title}
          </h3>
          {r.body && (
            <p className={cls("text-[13.5px] leading-[1.5] mt-1", dark ? "text-ink-200" : "text-ink-700", !captionExpanded && "line-clamp-2")}>
              {r.body}
            </p>
          )}
          {r.body && r.body.length > 80 && !captionExpanded && (
            <span onClick={(e) => { e.stopPropagation(); setCaptionExpanded(true); }}
              className={cls("text-[13px] font-medium mt-1 inline-block", dark ? "text-brand-300" : "text-brand-700")}>
              더 보기
            </span>
          )}
          {r.tags && r.tags.length > 0 && captionExpanded && (
            <p className={cls("text-[13px] mt-1.5", dark ? "text-brand-300" : "text-brand-700")}>
              {r.tags.map((t) => `#${t}`).join(" ")}
            </p>
          )}
        </button>
      )}

      {/* Action bar — 좋아요 / 댓글 */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); toggleFav(r.id); }}
          aria-label={isFav ? "좋아요 취소" : "좋아요"} aria-pressed={isFav}
          className="p-1.5 active:scale-90 transition inline-flex items-center gap-1.5">
          <Heart size={24} strokeWidth={1.8}
            className={cls(isFav ? "fill-accent-500 text-accent-500" : dark ? "text-white" : "text-black")}/>
          {r.likes > 0 && (
            <span className={cls("text-[13px] font-semibold tabular-nums", dark ? "text-white" : "text-black")}>
              {r.likes.toLocaleString()}
            </span>
          )}
        </button>
        <button onClick={() => onOpen(r)} aria-label="댓글" className="min-w-tap min-h-tap active:scale-90 transition inline-flex items-center justify-center gap-1.5">
          <MessageCircle size={24} strokeWidth={1.8} className={dark ? "text-white" : "text-black"}/>
          {r.comments > 0 && (
            <span className={cls("text-[13px] font-semibold tabular-nums", dark ? "text-white" : "text-black")}>
              {r.comments}
            </span>
          )}
        </button>
      </div>

      <div className={cls("mx-4 border-b", dark ? "border-ink-800" : "border-ink-200")}/>
    </article>
  );
};

export const Card = memo(PostImpl);

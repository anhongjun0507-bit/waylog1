import { useState, useRef } from "react";
import {
  Check, Download, ExternalLink, Heart, MessageCircle, RefreshCw, Sparkles, X
} from "lucide-react";
import { cls } from "../utils/ui.js";
import { sanitizeImageUrl } from "../utils/sanitize.js";
import { useExit } from "../hooks.js";
import { useAppContext } from "../contexts/AppContext.js";
import { CATEGORIES, CAT_SOLID } from "../constants.js";
import { CategoryIcon } from "../components/index.js";

const ShareCardModal = ({ review, onClose, dark, user: _user }) => {
  const { setToast: onShowToast } = useAppContext();
  const [exiting, close] = useExit(onClose);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  const cat = CATEGORIES[review.category] || CATEGORIES.food;
  const accent = CAT_SOLID[review.category] || "#10b981";
  const shareUrl = `waylog.kr/r/${review.id}`;
  const bodyPreview = (review.body || "").slice(0, 50) + ((review.body || "").length > 50 ? "…" : "");
  // review.img 를 항상 올바른 URL 로 정규화 (상대경로/공백/null 모두 처리).
  const safeImg = sanitizeImageUrl(review.img || "");

  const handleSaveImage = async () => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    // 캡처 전 외부 이미지(amway.co.kr 등)를 fetch 로 data URL 로 바꿔둔다.
    // 그래야 canvas tainted 가 안 나고 toPng 가 성공. 실패해도 원상복구.
    const imgEls = cardRef.current.querySelectorAll("img");
    const originals = [];
    for (const img of imgEls) {
      originals.push({ el: img, src: img.src, crossOrigin: img.getAttribute("crossorigin") });
      if (!img.src || img.src.startsWith("data:")) continue;
      try {
        const res = await fetch(img.src, { mode: "cors" });
        if (!res.ok) throw new Error(`http ${res.status}`);
        const blob = await res.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        img.removeAttribute("crossorigin");
        img.src = dataUrl;
        await new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) resolve();
          else {
            img.onload = resolve;
            img.onerror = resolve;
          }
        });
      } catch (e) {
        console.warn("[ShareCard] 이미지 data URL 변환 실패 — 스킵:", img.src, e?.message || e);
      }
    }

    let dataUrl = null;
    try {
      const { toPng } = await import("html-to-image");
      dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
      });
    } catch (e) {
      console.error("[ShareCard] toPng 실패 (1차):", e?.message || e);
      // 한 번 더 — 이미지 제외하고 시도
      try {
        const { toPng } = await import("html-to-image");
        dataUrl = await toPng(cardRef.current, {
          quality: 0.95,
          pixelRatio: 2,
          cacheBust: true,
          skipFonts: true,
          filter: (node) => node?.tagName !== "IMG",
        });
        onShowToast && onShowToast("이미지 없이 저장됐어요 (원본 로드 실패)");
      } catch (e2) {
        console.error("[ShareCard] toPng 실패 (2차):", e2?.message || e2);
      }
    }

    // 원상복구 (모달이 계속 열려있을 수 있음)
    originals.forEach(({ el, src, crossOrigin }) => {
      el.src = src;
      if (crossOrigin) el.setAttribute("crossorigin", crossOrigin);
    });

    if (dataUrl) {
      const link = document.createElement("a");
      link.download = `waylog-${review.id}.png`;
      link.href = dataUrl;
      link.click();
    } else {
      onShowToast && onShowToast("공유 카드 저장에 실패했어요. 잠시 후 다시 시도해주세요");
    }
    setSaving(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className={cls("fixed inset-0 z-[60] max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <div className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close} aria-label="닫기"><X size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>공유 카드</p>
        <div className="w-6"/>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center gap-5">
        {/* 미리보기 카드 */}
        <div ref={cardRef} className="w-full rounded-3xl overflow-hidden shadow-2xl" style={{ aspectRatio: "5/4" }}>
          <div className="relative w-full h-full flex flex-col" style={{ background: `linear-gradient(135deg, ${accent}18, ${accent}30)` }}>
            {/* 배경 장식 */}
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${accent}, transparent)` }}/>
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${accent}, transparent)` }}/>

            {/* 상단: 제품 이미지 */}
            <div className="flex-1 relative flex items-center justify-center p-5 pb-2">
              {safeImg ? (
                <img src={safeImg} alt="" crossOrigin="anonymous" loading="lazy" decoding="async"
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-lg"/>
              ) : (
                <div className={cls("w-28 h-28 rounded-3xl bg-gradient-to-br flex items-center justify-center", cat.color)}>
                  <CategoryIcon cat={review.category} size={48} className="text-white/80"/>
                </div>
              )}
            </div>

            {/* 중앙: 제품명, 작성자 */}
            <div className="px-5 pb-1">
              <p className="text-base font-black text-gray-900 leading-tight line-clamp-2">{review.title || review.product}</p>
              <p className="text-xs font-bold text-gray-500 mt-1">by {review.author}</p>
            </div>

            {/* 본문 요약 */}
            {bodyPreview && (
              <div className="px-5 py-2">
                <p className="text-xs text-gray-600 leading-relaxed italic">"{bodyPreview}"</p>
              </div>
            )}

            {/* 하단 */}
            <div className="px-5 pb-4 pt-1 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 inline-flex items-center gap-1">
                  <Heart size={10} style={{ color: accent }} fill={accent}/> {review.likes || 0}
                </span>
                <span className="text-xs text-gray-400">{review.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <Sparkles size={8} className="text-white"/>
                </div>
                <span className="text-[10px] font-black text-gray-400 tracking-tight">{shareUrl}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 공유 버튼들 */}
        <div className="w-full space-y-2">
          <button onClick={handleSaveImage} disabled={saving}
            className={cls("w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition active:scale-[0.98]",
              saving ? "opacity-60 cursor-wait" : "",
              "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20")}>
            {saving ? (
              <><RefreshCw size={16} className="animate-spin"/> 이미지 생성 중...</>
            ) : (
              <><Download size={16}/> 이미지로 저장</>
            )}
          </button>

          <button disabled
            className={cls("w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed",
              dark ? "bg-yellow-900/30 text-yellow-300" : "bg-yellow-50 text-yellow-700 border border-yellow-200")}>
            <MessageCircle size={16}/> 카카오톡 공유 <span className="text-[10px] font-normal">(준비 중)</span>
          </button>

          <button onClick={handleCopyLink}
            className={cls("w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-[0.98]",
              copied
                ? dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700"
                : dark ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-700")}>
            {copied ? (
              <><Check size={16}/> 복사됨!</>
            ) : (
              <><ExternalLink size={16}/> 링크 복사</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// 댓글 본문 중 @멘션을 클릭 가능한 버튼으로 렌더.



export default ShareCardModal;

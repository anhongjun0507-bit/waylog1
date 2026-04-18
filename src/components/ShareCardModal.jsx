import { useState, useRef } from "react";
import {
  Check, Download, ExternalLink, Heart, MessageCircle, RefreshCw, Share2, Sparkles, Star, X
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
  const accent = CAT_SOLID[review.category] || "#00C9A7";
  const shareUrl = `waylog.kr/r/${review.id}`;
  const bodyPreview = (review.body || "").slice(0, 60) + ((review.body || "").length > 60 ? "…" : "");
  const safeImg = sanitizeImageUrl(review.img || "");
  const rating = review.rating || (review.likes > 50 ? 5 : review.likes > 20 ? 4 : 3);

  // 카드를 PNG data URL 로 캡처
  const captureCard = async () => {
    if (!cardRef.current) return null;
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
          else { img.onload = resolve; img.onerror = resolve; }
        });
      } catch {}
    }

    let dataUrl = null;
    try {
      const { toPng } = await import("html-to-image");
      dataUrl = await toPng(cardRef.current, { quality: 0.95, pixelRatio: 3, cacheBust: true, skipFonts: true });
    } catch {
      try {
        const { toPng } = await import("html-to-image");
        dataUrl = await toPng(cardRef.current, {
          quality: 0.95, pixelRatio: 3, cacheBust: true, skipFonts: true,
          filter: (node) => node?.tagName !== "IMG",
        });
      } catch {}
    }

    originals.forEach(({ el, src, crossOrigin }) => {
      el.src = src;
      if (crossOrigin) el.setAttribute("crossorigin", crossOrigin);
    });
    return dataUrl;
  };

  const dataUrlToBlob = (dataUrl) => {
    const [header, base64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const bin = atob(base64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const handleSaveImage = async () => {
    if (saving) return;
    setSaving(true);
    const dataUrl = await captureCard();
    if (!dataUrl) {
      onShowToast && onShowToast("카드 저장에 실패했어요");
      setSaving(false);
      return;
    }

    const blob = dataUrlToBlob(dataUrl);
    const file = new File([blob], `waylog-${review.id}.png`, { type: "image/png" });

    // 1) navigator.share (files) — 안드로이드 갤러리 저장 가능
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        onShowToast && onShowToast("저장/공유 완료!");
        setSaving(false);
        return;
      } catch (e) {
        if (e.name === "AbortError") { setSaving(false); return; }
      }
    }

    // 2) 폴백: 다운로드
    const link = document.createElement("a");
    link.download = file.name;
    link.href = dataUrl;
    link.click();
    onShowToast && onShowToast("이미지가 저장됐어요");
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
        {/* ── 카드 미리보기 ── */}
        <div ref={cardRef} className="w-full overflow-hidden" style={{ borderRadius: 24, aspectRatio: "4/5" }}>
          <div className="relative w-full h-full flex flex-col" style={{ background: "#fff" }}>
            {/* 히어로 이미지 */}
            <div className="relative flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              {safeImg ? (
                <img src={safeImg} alt="" crossOrigin="anonymous" loading="lazy" decoding="async"
                  className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accent}30, ${accent}60)` }}>
                  <CategoryIcon cat={review.category} size={64} className="text-white/60"/>
                </div>
              )}
              {/* 그라데이션 오버레이 */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }}/>
              {/* 카테고리 칩 */}
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-black text-white" style={{ background: accent }}>
                {cat.label}
              </div>
              {/* 제목 + 작성자 오버레이 */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-white text-xl font-black leading-tight line-clamp-2 drop-shadow-lg">{review.title || review.product}</p>
                <p className="text-white/70 text-xs font-bold mt-1.5">by {review.author}</p>
              </div>
            </div>

            {/* 하단 정보 영역 */}
            <div className="px-5 py-4" style={{ background: "#fff" }}>
              {/* 본문 미리보기 */}
              {bodyPreview && (
                <p className="text-gray-600 text-xs leading-relaxed mb-3 line-clamp-2">"{bodyPreview}"</p>
              )}
              {/* 별점 + 통계 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < rating ? "text-amber-400" : "text-gray-200"} fill={i < rating ? "#fbbf24" : "none"}/>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 inline-flex items-center gap-1">
                    <Heart size={11} fill={accent} style={{ color: accent }}/> {review.likes || 0}
                  </span>
                  <span className="text-xs text-gray-400">{review.date}</span>
                </div>
              </div>
              {/* 브랜딩 */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-mint-400 to-teal-500 flex items-center justify-center">
                    <Sparkles size={10} className="text-white"/>
                  </div>
                  <span className="text-xs font-black text-gray-800 tracking-tight">Waylog</span>
                </div>
                <span className="text-xs font-bold text-gray-400">{shareUrl}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 버튼 영역 ── */}
        <div className="w-full space-y-2">
          <button onClick={handleSaveImage} disabled={saving}
            className={cls("w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition active:scale-[0.98]",
              saving ? "opacity-60 cursor-wait" : "",
              "bg-gradient-to-r from-mint-500 to-teal-500 text-white shadow-lg shadow-mint-500/20")}>
            {saving ? (
              <><RefreshCw size={16} className="animate-spin"/> 이미지 생성 중...</>
            ) : (
              <><Share2 size={16}/> 갤러리에 저장 / 공유</>
            )}
          </button>

          <button onClick={handleCopyLink}
            className={cls("w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-[0.98]",
              copied
                ? dark ? "bg-mint-900/40 text-mint-300" : "bg-mint-50 text-mint-700"
                : dark ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-700")}>
            {copied ? <><Check size={16}/> 복사됨!</> : <><ExternalLink size={16}/> 링크 복사</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareCardModal;

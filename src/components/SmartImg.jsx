import { memo, useState } from "react";
import { BASE, CATEGORIES } from "../constants.js";
import { cls } from "../utils/ui.js";
import { sanitizeImageUrl } from "../utils/sanitize.js";
import { CategoryIcon } from "./CategoryIcon.jsx";

// 리뷰 이미지가 없거나 실패할 때 카테고리 색 그라디언트 + 아이콘으로 대체
const FallbackImgBase = ({ r, className }) => {
  const c = CATEGORIES[r.category] || CATEGORIES.food;
  return (
    <div className={cls("flex items-center justify-center bg-gradient-to-br text-white", c.color, className)}>
      <CategoryIcon cat={r.category} size={42} strokeWidth={1.8}/>
    </div>
  );
};
export const FallbackImg = memo(FallbackImgBase);

// 리뷰 r.img 를 안전하게 렌더 - 상대 경로는 BASE 접두, URL 프로토콜 검증,
// 로딩 중 shimmer, 에러 시 FallbackImg 대체
const SmartImgBase = ({ r, className }) => {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!r.img || errored) return <FallbackImg r={r} className={className}/>;
  const raw = r.img.startsWith("data:") || r.img.startsWith("http") ? r.img : `${BASE}${r.img}`;
  const src = sanitizeImageUrl(raw);
  if (!src) return <FallbackImg r={r} className={className}/>;
  return (
    <div className={cls("relative overflow-hidden", className)}>
      {!loaded && <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer"/>}
      <img src={src} alt="" loading="lazy" decoding="async"
        className={cls("w-full h-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        onLoad={() => setLoaded(true)} onError={() => setErrored(true)}/>
    </div>
  );
};
export const SmartImg = memo(SmartImgBase);

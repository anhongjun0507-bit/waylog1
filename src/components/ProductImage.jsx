import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { cls } from "../utils/ui.js";

// 제품 이미지 - 로드 실패 시 fallback 아이콘.
// fallbackGradient 가 주어지면 그라디언트 배경 + 흰 아이콘 (카탈로그 카드용),
// 없으면 회색 아이콘 (인라인용).
export const ProductImage = ({ src, alt, className, iconSize = 32, fallbackGradient }) => {
  const [error, setError] = useState(false);
  if (!src || error) {
    if (fallbackGradient) {
      return (
        <div className={cls("flex items-center justify-center bg-gradient-to-br", fallbackGradient, className)}>
          <ShoppingBag size={iconSize} className="text-white"/>
        </div>
      );
    }
    return (
      <div className={cls("flex items-center justify-center text-gray-300", className)}>
        <ShoppingBag size={iconSize}/>
      </div>
    );
  }
  return (
    <img src={src} alt={alt || ""} className={className} loading="lazy" decoding="async" onError={() => setError(true)}/>
  );
};

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { cls } from "../utils/ui.js";

// 제품 이미지 - 로드 실패 시 fallback 아이콘
export const ProductImage = ({ src, alt, className, iconSize = 32 }) => {
  const [error, setError] = useState(false);
  if (!src || error) {
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

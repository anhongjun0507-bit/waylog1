import { memo } from "react";
import { User } from "lucide-react";
import { AVATAR_OPTIONS } from "../constants.js";
import { cls } from "../utils/ui.js";

// 아바타 - id 가 data:/http(s) URL 이면 이미지, AVATAR_OPTIONS 키면 아이콘 원, 그 외는 placeholder
// memo: 부모 리렌더 시 props 동일하면 skip (큰 리스트에서 불필요한 재렌더 방지)
const AvatarBase = ({ id, size = 24, className = "", rounded = "rounded-full" }) => {
  if (id && typeof id === "string" && (id.startsWith("data:") || /^https?:\/\//i.test(id))) {
    return (
      <div className={cls("overflow-hidden bg-gray-200", rounded, className)}>
        <img src={id} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover"/>
      </div>
    );
  }
  const opt = id ? AVATAR_OPTIONS.find((a) => a.id === id) : null;
  if (opt) {
    return (
      <div className={cls("bg-gradient-to-br flex items-center justify-center text-white shrink-0", opt.color, rounded, className)}>
        <opt.Icon size={Math.floor(size * 0.6)} strokeWidth={2.2}/>
      </div>
    );
  }
  return (
    <div className={cls("bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-end justify-center text-gray-500 dark:text-gray-400 shrink-0 overflow-hidden", rounded, className)}>
      <User size={Math.floor(size * 1.1)} strokeWidth={2} className="translate-y-[8%]" fill="currentColor"/>
    </div>
  );
};

export const Avatar = memo(AvatarBase);

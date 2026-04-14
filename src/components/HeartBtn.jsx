import { Heart } from "lucide-react";
import { cls } from "../utils/ui.js";

// 이미지 오버레이용 하트 토글 버튼. 44×44 터치 타겟 보장.
export const HeartBtn = ({ on, onClick, dark, size = 14 }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    aria-label={on ? "좋아요 취소" : "좋아요"}
    aria-pressed={on}
    className={cls(
      "min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full backdrop-blur transition-transform active:scale-90",
      on ? "bg-rose-500/95" : dark ? "bg-black/50" : "bg-white/85"
    )}
  >
    <Heart size={size} className={on ? "text-white fill-white" : dark ? "text-white" : "text-gray-700"} />
  </button>
);

import { Sparkles } from "lucide-react";
import { CAT_ICON, CATEGORIES } from "../constants.js";
import { cls } from "../utils/ui.js";

export const CategoryIcon = ({ cat, size = 22, strokeWidth = 2, className }) => {
  const Icon = CAT_ICON[cat] || Sparkles;
  return <Icon size={size} strokeWidth={strokeWidth} className={className}/>;
};

export const CategoryChip = ({ cat, dark }) => {
  const c = CATEGORIES[cat] || CATEGORIES.food;
  return (
    <span className={cls(
      "text-xs px-2 py-0.5 rounded-full font-bold ring-1 shadow-sm",
      dark ? cls(c.dchip, "ring-white/20") : cls(c.chip, "ring-white/90")
    )}>
      {c.label}
    </span>
  );
};

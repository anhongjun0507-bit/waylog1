import { memo } from "react";
import { cls } from "../utils/ui.js";

// 피드 초기 로딩 시 카드 크기 그대로 shimmer placeholder
const SkeletonCardBase = ({ dark }) => (
  <div className={cls("rounded-2xl overflow-hidden shadow-sm", dark ? "bg-gray-800" : "bg-white")}>
    <div className="w-full h-44 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer"/>
    <div className="p-3 space-y-2">
      <div className="h-3 w-3/4 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer"/>
      <div className="h-3 w-1/2 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer"/>
    </div>
  </div>
);
export const SkeletonCard = memo(SkeletonCardBase);

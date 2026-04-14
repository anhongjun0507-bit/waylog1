import { cls } from "../utils/ui.js";

// 섹션 헤더. tier 1(큰 제목) / 2(중간) / 3(라벨) 으로 구분
export const SectionTitle = ({ title, sub, dark, tier = 1 }) => {
  if (tier === 3) {
    return (
      <div className="px-4 mt-10 mb-3">
        <h2 className={cls("text-xs font-bold uppercase tracking-widest", dark ? "text-gray-500" : "text-gray-500")}>{title}</h2>
        {sub && <p className={cls("text-xs mt-1", dark ? "text-gray-500" : "text-gray-500")}>{sub}</p>}
      </div>
    );
  }
  if (tier === 2) {
    return (
      <div className="px-4 mt-8 mb-3">
        <h2 className={cls("text-base font-bold tracking-tight", dark ? "text-gray-200" : "text-gray-800")}>{title}</h2>
        {sub && <p className={cls("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>{sub}</p>}
      </div>
    );
  }
  return (
    <div className="px-4 mt-7 mb-3">
      <h2 className={cls("text-lg font-extrabold tracking-tight", dark ? "text-white" : "text-gray-900")}>{title}</h2>
      {sub && <p className={cls("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>{sub}</p>}
    </div>
  );
};

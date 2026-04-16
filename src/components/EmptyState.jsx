import { cls } from "../utils/ui.js";

// 검색 결과/리스트 0건 등 빈 상태에 일관된 시각 피드백을 주기 위한 컴포넌트.
// icon: lucide-react 아이콘 컴포넌트, title/desc: 텍스트, action: 선택적 CTA 버튼 노드.
export const EmptyState = ({ icon: Icon, title, desc, action, dark, className }) => (
  <div className={cls("flex flex-col items-center justify-center text-center px-6 py-12", className)}>
    {Icon && (
      <div className={cls("w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
        dark ? "bg-gray-800" : "bg-gradient-to-br from-gray-50 to-gray-100")}>
        <Icon size={28} strokeWidth={1.6} className={dark ? "text-gray-400" : "text-gray-500"}/>
      </div>
    )}
    <p className={cls("text-sm font-bold", dark ? "text-gray-200" : "text-gray-800")}>{title}</p>
    {desc && (
      <p className={cls("text-xs mt-1.5 max-w-[260px]", dark ? "text-gray-500" : "text-gray-500")}>{desc}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

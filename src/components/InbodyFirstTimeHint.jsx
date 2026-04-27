import { Sparkles, X } from "lucide-react";
import { cls } from "../utils/ui.js";

// 인바디 AI 자동 입력 첫 사용 안내 모달.
// localStorage("waylog:hint:inbody-first") 가드로 한 번만 표시.
// "시작하기" 버튼 → 사진 선택 시작 / "닫기" → 모달만 닫고 사진 선택 X.
export const InbodyFirstTimeHint = ({ onStart, onClose, dark }) => {
  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-safe">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose}/>
      <div className={cls("relative w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slide-up",
        dark ? "bg-gray-900" : "bg-white")}>
        <button onClick={onClose} aria-label="닫기"
          className={cls("absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition active:opacity-60",
            dark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500")}>
          <X size={14}/>
        </button>

        <div className={cls("w-12 h-12 rounded-2xl flex items-center justify-center mb-4",
          dark ? "bg-brand-900/40" : "bg-brand-50")}>
          <Sparkles size={22} className="text-brand-500"/>
        </div>

        <h3 className={cls("text-[18px] font-black", dark ? "text-white" : "text-gray-900")}>
          📸 어떤 사진을 찍어야 하나요?
        </h3>
        <p className={cls("text-[14px] mt-2 leading-relaxed", dark ? "text-gray-300" : "text-gray-600")}>
          인바디 결과지 또는 측정 앱 화면을 찍어주세요
        </p>

        <ul className={cls("mt-4 space-y-2 text-[14px]", dark ? "text-gray-200" : "text-gray-700")}>
          <li className="flex items-start gap-2">
            <span className="shrink-0 text-brand-500">✅</span>
            <span>인바디 결과지 (종이 출력본)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 text-brand-500">✅</span>
            <span>인바디 970 앱 화면</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 text-brand-500">✅</span>
            <span>다른 측정 앱 (X-SCAN 등)</span>
          </li>
        </ul>

        <p className={cls("text-[12px] mt-4 leading-relaxed", dark ? "text-gray-500" : "text-gray-500")}>
          체중·골격근·체지방·BMI·체지방률 5개 수치를 자동으로 입력해드려요.
          AI 분석은 의학적 진단이 아니에요.
        </p>

        <button onClick={onStart}
          className="w-full mt-5 py-3 rounded-xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.98] transition shadow-lg shadow-brand-500/30">
          시작하기
        </button>
      </div>
    </div>
  );
};

export default InbodyFirstTimeHint;

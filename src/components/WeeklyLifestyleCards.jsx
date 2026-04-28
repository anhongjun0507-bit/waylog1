import { cls } from "../utils/ui.js";

// AI 인바디 분석 결과의 weekly_lifestyle 5개 카드 (운동·식습관·수면·물·핵심 팁).
// InbodyAnalysisResult 모달과 ChallengeMainScreen 메인에서 공통 사용.
export const WeeklyLifestyleCards = ({ weeklyLifestyle, dark }) => {
  const lifestyle = weeklyLifestyle || {};
  const cards = [
    { icon: "🏃", title: "운동", content: lifestyle.exercise },
    { icon: "🥗", title: "식습관", content: lifestyle.diet },
    { icon: "😴", title: "수면", content: lifestyle.sleep },
    { icon: "💧", title: "물 섭취", content: lifestyle.hydration },
  ].filter((c) => !!c.content);

  if (cards.length === 0 && !lifestyle.tip) return null;

  return (
    <div className="space-y-2">
      {cards.map((c) => (
        <div key={c.title}
          className={cls("p-3.5 rounded-2xl border flex gap-3", dark ? "bg-[#121212] border-[#262626]" : "bg-white border-[#dbdbdb]")}>
          <div className="text-[24px] leading-none shrink-0">{c.icon}</div>
          <div className="min-w-0 flex-1">
            <p className={cls("text-[13px] font-bold mb-0.5", dark ? "text-white" : "text-black")}>{c.title}</p>
            <p className={cls("text-[13px] leading-[1.55]", dark ? "text-[#d4d4d4]" : "text-[#525252]")}>{c.content}</p>
          </div>
        </div>
      ))}
      {lifestyle.tip && (
        <div className={cls("p-3.5 rounded-2xl border-l-4 border-brand-500", dark ? "bg-brand-900/20" : "bg-brand-50")}>
          <p className={cls("text-[12px] font-bold mb-1", dark ? "text-brand-200" : "text-brand-700")}>이번 주 핵심 팁</p>
          <p className={cls("text-[13px] leading-[1.55]", dark ? "text-brand-100" : "text-brand-900")}>{lifestyle.tip}</p>
        </div>
      )}
    </div>
  );
};

export default WeeklyLifestyleCards;

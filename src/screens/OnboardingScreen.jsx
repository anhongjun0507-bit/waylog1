import { useState } from "react";
import { Sparkles, Heart, Star, PenLine, ChevronRight } from "lucide-react";
import { cls } from "../utils/ui.js";

// 첫 실행 시 4-step 온보딩. dark 는 props, 나머지 상태는 자체 관리.
export const OnboardingScreen = ({ onClose, dark }) => {
  const [step, setStep] = useState(0);
  const slides = [
    {
      Icon: Sparkles,
      gradient: "from-emerald-400 via-teal-500 to-cyan-500",
      title: "웨이로그에 오신 걸 환영해요",
      desc: "나만의 라이프스타일을 한 곳에 기록하고\n매주 자라나는 취향을 발견해보세요",
    },
    {
      Icon: Heart,
      gradient: "from-rose-400 via-pink-500 to-fuchsia-500",
      title: "좋아요로 취향을 학습해요",
      desc: "마음에 드는 카드의 하트를 누르면\n추천이 점점 정교해져요",
    },
    {
      Icon: Star,
      gradient: "from-amber-400 via-orange-500 to-rose-500",
      title: "무드를 부여해 보세요",
      desc: "Love · Good · Save · Wow 4가지 무드로\n내 감정을 카드에 담아요",
    },
    {
      Icon: PenLine,
      gradient: "from-violet-500 via-purple-500 to-pink-500",
      title: "매주 시그니처 카드를 받아요",
      desc: "활동 3개를 모으면 매주 자동으로\n나만의 취향 카드가 생성돼요",
    },
  ];

  const cur = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div className={cls("fixed inset-0 z-[60] max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col animate-slide-up", dark ? "bg-gray-900" : "bg-white")}>
      <div className="flex justify-end px-4 pt-safe pb-2 mt-3">
        {!isLast && (
          <button onClick={onClose} className={cls("text-xs font-bold px-3 py-1.5 rounded-full", dark ? "text-gray-400 bg-gray-800" : "text-gray-500 bg-gray-100")}>
            건너뛰기
          </button>
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className={cls("w-32 h-32 rounded-[2.5rem] bg-gradient-to-br flex items-center justify-center shadow-2xl mb-8 transition-all duration-500", cur.gradient)} key={step}>
          <cur.Icon size={56} className="text-white animate-fade-in" strokeWidth={2}/>
        </div>
        <h2 className={cls("text-2xl font-black tracking-tight animate-fade-in", dark ? "text-white" : "text-gray-900")} key={`t-${step}`}>{cur.title}</h2>
        <p className={cls("text-sm mt-3 leading-relaxed whitespace-pre-line animate-fade-in", dark ? "text-gray-400" : "text-gray-500")} key={`d-${step}`}>{cur.desc}</p>
      </div>
      <div className="px-8 pb-10">
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <div key={i} className={cls("rounded-full transition-all duration-300",
              i === step ? "w-6 h-2 bg-emerald-500" : "w-2 h-2 bg-gray-300 dark:bg-gray-700")}/>
          ))}
        </div>
        <button onClick={() => isLast ? onClose() : setStep(step + 1)}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-base shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition flex items-center justify-center gap-2">
          {isLast ? "시작하기" : "다음"}
          <ChevronRight size={18}/>
        </button>
      </div>
    </div>
  );
};

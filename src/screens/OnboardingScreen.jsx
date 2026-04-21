import { useState } from "react";
import { Sparkles, Heart, Star, ChevronRight } from "lucide-react";
import { cls } from "../utils/ui.js";

// 첫 실행 시 4-step 온보딩. dark 는 props, 나머지 상태는 자체 관리.
export const OnboardingScreen = ({ onClose, dark }) => {
  const [step, setStep] = useState(0);
  const slides = [
    {
      Icon: Sparkles,
      gradient: "from-brand-300 via-brand-400 to-brand-500",
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
  ];

  const cur = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div className={cls("fixed inset-0 z-[60] max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col animate-slide-up", dark ? "bg-black" : "bg-white")}>
      <div className="flex justify-end px-4 pt-safe pb-2 mt-3">
        {!isLast && (
          <button onClick={onClose} className={cls("text-[14px] font-semibold px-3 py-1.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
            건너뛰기
          </button>
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className={cls("w-28 h-28 rounded-full flex items-center justify-center mb-8 transition-all duration-500", dark ? "bg-white/5" : "bg-black/5")} key={step}>
          <cur.Icon size={56} strokeWidth={1.6} className={cls("animate-fade-in", dark ? "text-white" : "text-black")}/>
        </div>
        <h2 className={cls("text-[26px] font-black tracking-tight animate-fade-in", dark ? "text-white" : "text-black")} key={`t-${step}`}>{cur.title}</h2>
        <p className={cls("text-[14px] mt-3 leading-[1.5] whitespace-pre-line animate-fade-in", dark ? "text-[#a8a8a8]" : "text-[#737373]")} key={`d-${step}`}>{cur.desc}</p>
      </div>
      <div className="px-8 pb-10">
        <div className="flex justify-center gap-1.5 mb-7">
          {slides.map((_, i) => (
            <div key={i} className={cls("rounded-full transition-all duration-300",
              i === step
                ? "w-6 h-1.5 bg-brand-500"
                : (dark ? "w-1.5 h-1.5 bg-[#262626]" : "w-1.5 h-1.5 bg-[#dbdbdb]"))}/>
          ))}
        </div>
        <button onClick={() => isLast ? onClose() : setStep(step + 1)}
          className="w-full py-3.5 bg-brand-500 text-white rounded-full font-bold text-[14px] active:scale-[0.98] transition flex items-center justify-center gap-2">
          {isLast ? "시작하기" : "다음"}
          {!isLast && <ChevronRight size={16} strokeWidth={2.5}/>}
        </button>
      </div>
    </div>
  );
};

import { useState } from "react";
import {
  X, Trophy, BarChart3, Dumbbell, TrendingUp, Flame, Leaf, Check, ChevronRight,
} from "lucide-react";
import { cls } from "../utils/ui.js";
import { useExit } from "../hooks.js";
import { AI_COACH_TONES, CHALLENGE_DAYS } from "../constants.js";
import { calcBMR, calcTargetCalories } from "../utils/challenge.js";

// YYYY-MM-DD 에 일수 더하기
const addDays = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// 8주 챌린지 시작 - 5-step 온보딩 (소개 → 신체정보 → 목표 → AI 코치 → 확인)
export const ChallengeStartScreen = ({ onClose, onStart, dark }) => {
  const [exiting, close] = useExit(onClose);
  const [step, setStep] = useState(0);
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, CHALLENGE_DAYS - 1));
  const [endDateTouched, setEndDateTouched] = useState(false);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("female");
  const [goal, setGoal] = useState("");
  const [coachTone, setCoachTone] = useState("");
  const [warning, setWarning] = useState("");

  const bmr = weight && height && age ? calcBMR(parseFloat(weight), parseFloat(height), parseInt(age), gender) : 0;
  const targetCal = bmr && goal ? calcTargetCalories(bmr, goal) : 0;
  const bmiVal = weight && height ? (parseFloat(weight) / ((parseFloat(height) / 100) ** 2)).toFixed(1) : 0;

  const checkWarnings = () => {
    setWarning("");
    if (parseFloat(bmiVal) < 18.5 && goal === "lose") {
      setWarning("BMI가 18.5 미만이에요. 감량보다 건강 유지를 추천드려요.");
      return false;
    }
    if (targetCal > 0 && targetCal < 1200) {
      setWarning("일일 칼로리가 1200 미만이면 건강에 해로울 수 있어요. 목표를 조정해주세요.");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && (!height || !weight || !age)) return;
    if (step === 2) {
      if (!goal) return;
      if (!checkWarnings()) return;
    }
    if (step === 3 && !coachTone) return;
    if (step === 4) {
      const anonId = `챌린저${Math.floor(Math.random() * 9000) + 1000}`;
      onStart({
        startDate: new Date(`${startDate}T00:00:00`).toISOString(),
        endDate: new Date(`${endDate}T23:59:59`).toISOString(),
        height: parseFloat(height),
        weight: parseFloat(weight),
        bodyFat: parseFloat(bodyFat) || 0,
        age: parseInt(age),
        gender,
        goal,
        coachTone,
        bmr,
        targetCalories: targetCal,
        bmi: parseFloat(bmiVal),
        anonId,
        status: "active",
      });
      close();
      return;
    }
    setStep(step + 1);
    setWarning("");
  };

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return height && weight && age;
    if (step === 2) return !!goal;
    if (step === 3) return !!coachTone;
    if (step === 4) return true;
    return false;
  };

  const inputCls = cls("w-full min-h-tap px-4 py-3 rounded-btn text-[15px] border outline-none focus:ring-2 focus:ring-brand-500/20",
    dark ? "bg-ink-900 border-ink-700 text-ink-50 placeholder-ink-400 focus:border-brand-500"
         : "bg-white border-ink-200 text-ink-900 placeholder-ink-400 focus:border-brand-500");

  return (
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col pt-safe", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-black" : "bg-white")}>
      <header className={cls("flex items-center justify-between px-4 h-12 border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
        <button onClick={close} aria-label="닫기"><X size={22} className={dark ? "text-white" : "text-black"}/></button>
        <div className="flex gap-1">
          {[0,1,2,3,4].map((i) => (
            <div key={i} className={cls("h-[3px] rounded-full transition-all",
              i === step ? "w-6 bg-brand-500" :
              i < step ? "w-3 bg-brand-500/60" :
              (dark ? "w-3 bg-[#262626]" : "w-3 bg-[#dbdbdb]"))}/>
          ))}
        </div>
        <div className="w-6"/>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {step === 0 && (
          <div className="flex flex-col items-center justify-center text-center pt-10 animate-fade-in">
            <div className={cls("w-24 h-24 rounded-full bg-brand-500 flex items-center justify-center mb-8")}>
              <Trophy size={44} className="text-white"/>
            </div>
            <h2 className={cls("text-[26px] font-bold tracking-tight", dark ? "text-white" : "text-black")}>바디키 8주 챌린지</h2>
            <p className={cls("text-[14px] mt-3 leading-relaxed max-w-xs", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              8주간의 체계적인 식단 관리와 운동으로{"\n"}
              건강한 변화를 만들어보세요.{"\n\n"}
              AI 코치가 매일 맞춤 피드백을 드리고,{"\n"}
              주차별 미션으로 꾸준함을 만들어요.
            </p>
            <div className="grid grid-cols-3 gap-3 mt-8 w-full max-w-sm">
              {[
                { Icon: BarChart3, label: "AI 식단분석" },
                { Icon: Dumbbell, label: "운동 기록" },
                { Icon: TrendingUp, label: "변화 그래프" },
              ].map((f) => (
                <div key={f.label} className={cls("px-3 py-3 rounded-xl text-center flex flex-col items-center gap-2 border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
                  <div className={cls("w-9 h-9 rounded-lg flex items-center justify-center", dark ? "bg-[#262626]" : "bg-white")}>
                    <f.Icon size={16} className={dark ? "text-white" : "text-black"}/>
                  </div>
                  <span className={cls("text-[11px] font-semibold", dark ? "text-white" : "text-black")}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="pt-4 space-y-4 animate-fade-in">
            <h2 className={cls("text-xl font-black", dark ? "text-white" : "text-gray-900")}>신체 정보를 알려주세요</h2>
            <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>맞춤 칼로리와 운동량 계산에 사용돼요</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>시작일</label>
                <input value={startDate} type="date"
                  onChange={(e) => {
                    const v = e.target.value;
                    setStartDate(v);
                    if (!endDateTouched) setEndDate(addDays(v, CHALLENGE_DAYS - 1));
                  }}
                  className={inputCls}/>
              </div>
              <div>
                <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>종료일</label>
                <input value={endDate} type="date" min={startDate}
                  onChange={(e) => { setEndDate(e.target.value); setEndDateTouched(true); }}
                  className={inputCls}/>
              </div>
            </div>
            <p className={cls("text-xs -mt-2", dark ? "text-gray-400" : "text-gray-500")}>
              {(() => {
                const days = Math.max(0, Math.round((new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`)) / 86400000) + 1);
                const weeks = Math.floor(days / 7);
                const rest = days % 7;
                const label = weeks > 0 ? (rest > 0 ? `${weeks}주 ${rest}일` : `${weeks}주`) : `${days}일`;
                const note = days === CHALLENGE_DAYS ? " (기본 8주)" : days < CHALLENGE_DAYS ? " · 주차 미션이 일부 건너뛰어요" : " · 마지막 주 미션이 반복돼요";
                return `총 ${label} (${days}일)${note}`;
              })()}
            </p>
            <div>
              <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>키 (cm)</label>
              <input value={height} onChange={(e) => setHeight(e.target.value)} type="number" inputMode="numeric" placeholder="165" className={inputCls}/>
            </div>
            <div>
              <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>몸무게 (kg)</label>
              <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" inputMode="numeric" placeholder="65" className={inputCls}/>
            </div>
            <div>
              <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>체지방 (%, 선택)</label>
              <input value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} type="number" inputMode="numeric" placeholder="25" className={inputCls}/>
            </div>
            <div>
              <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>나이</label>
              <input value={age} onChange={(e) => setAge(e.target.value)} type="number" inputMode="numeric" placeholder="30" className={inputCls}/>
            </div>
            <div>
              <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>성별</label>
              <div className="flex gap-2">
                <button onClick={() => setGender("female")}
                  className={cls("flex-1 py-3 rounded-2xl text-sm font-bold transition",
                    gender === "female" ? "bg-gradient-to-r from-pink-400 to-rose-500 text-white shadow" : dark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600")}>
                  여성
                </button>
                <button onClick={() => setGender("male")}
                  className={cls("flex-1 py-3 rounded-2xl text-sm font-bold transition",
                    gender === "male" ? "bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow" : dark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600")}>
                  남성
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="pt-4 space-y-4 animate-fade-in">
            <h2 className={cls("text-xl font-black", dark ? "text-white" : "text-gray-900")}>목표를 선택해주세요</h2>
            <div className="space-y-3">
              {[
                { key: "lose", Icon: Flame, color: "from-rose-400 to-orange-500", label: "체중 감량", desc: "체지방 줄이기에 집중" },
                { key: "muscle", Icon: Dumbbell, color: "from-sky-400 to-blue-500", label: "근력 강화", desc: "근육량 늘리기에 집중" },
                { key: "health", Icon: Leaf, color: "from-brand-300 to-brand-500", label: "건강 유지", desc: "균형 잡힌 생활 습관" },
              ].map((g) => (
                <button key={g.key} onClick={() => { setGoal(g.key); setWarning(""); }}
                  className={cls("w-full p-3.5 rounded-2xl flex items-center gap-3 text-left transition active:scale-[0.98] border-2",
                    goal === g.key
                      ? "bg-brand-500/5 border-brand-500"
                      : (dark ? "bg-[#121212] border-[#262626]" : "bg-white border-[#dbdbdb]"))}>
                  <div className={cls("w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br", g.color)}>
                    <g.Icon size={20} className="text-white"/>
                  </div>
                  <div className="flex-1">
                    <p className={cls("text-[14px] font-bold", dark ? "text-white" : "text-black")}>{g.label}</p>
                    <p className={cls("text-[12px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{g.desc}</p>
                  </div>
                  {goal === g.key && <Check size={18} className={dark ? "text-white" : "text-black"}/>}
                </button>
              ))}
            </div>
            {bmr > 0 && goal && (
              <div className={cls("p-4 rounded-xl border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
                <p className={cls("text-[12px] font-semibold uppercase tracking-wider mb-3", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>자동 계산 결과</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className={cls("text-[11px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>기초대사량</p>
                    <p className={cls("text-[16px] font-bold tabular-nums mt-0.5", dark ? "text-white" : "text-black")}>{bmr} <span className="text-[11px] opacity-60">kcal</span></p>
                  </div>
                  <div>
                    <p className={cls("text-[11px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>목표</p>
                    <p className={cls("text-[16px] font-bold tabular-nums mt-0.5", dark ? "text-white" : "text-black")}>{targetCal} <span className="text-[11px] opacity-60">kcal</span></p>
                  </div>
                  <div>
                    <p className={cls("text-[11px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>BMI</p>
                    <p className={cls("text-[16px] font-bold tabular-nums mt-0.5", dark ? "text-white" : "text-black")}>{bmiVal}</p>
                  </div>
                </div>
                <div className={cls("mt-3 pt-3 border-t text-[12px] leading-relaxed space-y-1.5",
                  dark ? "border-[#262626] text-[#a8a8a8]" : "border-[#dbdbdb] text-[#737373]")}>
                  <p><span className="font-semibold">기초대사량</span>은 아무 활동 없이도 하루에 소비되는 최소 칼로리예요.</p>
                  <p>
                    <span className="font-semibold">목표 칼로리</span>는 하루에 섭취하길 권장하는 양이에요.
                    {goal === "lose" && " 기초대사량 + 활동량에서 약 500kcal를 빼서 건강하게 감량을 도와줍니다."}
                    {goal === "muscle" && " 근육 성장에 필요한 잉여 칼로리를 더해 충분히 먹어야 할 양을 알려줘요."}
                    {goal === "health" && " 현재 체중을 유지하면서 균형잡힌 생활을 지원하는 양이에요."}
                  </p>
                </div>
              </div>
            )}
            {warning && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                <Flame size={14} className="text-red-500 mt-0.5 shrink-0"/>
                <p className="text-[13px] text-red-500">{warning}</p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="pt-4 space-y-4 animate-fade-in">
            <h2 className={cls("text-[22px] font-bold tracking-tight", dark ? "text-white" : "text-black")}>AI 코치 선택</h2>
            <p className={cls("text-[13px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>매일 맞춤 피드백을 보내드려요</p>
            <div className="space-y-2">
              {AI_COACH_TONES.map((t) => (
                <button key={t.key} onClick={() => setCoachTone(t.key)}
                  className={cls("w-full p-3.5 rounded-2xl text-left transition active:scale-[0.98] border-2",
                    coachTone === t.key
                      ? "bg-brand-500/5 border-brand-500"
                      : (dark ? "bg-[#121212] border-[#262626]" : "bg-white border-[#dbdbdb]"))}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cls("w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br", t.color)}>
                      <t.Icon size={18} className="text-white"/>
                    </div>
                    <div className="flex-1">
                      <p className={cls("text-[14px] font-bold", dark ? "text-white" : "text-black")}>{t.label}</p>
                      <p className={cls("text-[12px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{t.desc}</p>
                    </div>
                    {coachTone === t.key && <Check size={18} className={dark ? "text-white" : "text-black"}/>}
                  </div>
                  <p className={cls("text-xs italic px-2 py-2 rounded-xl", coachTone === t.key ? "bg-white/20" : dark ? "bg-gray-700" : "bg-white")}>
                    "{t.example}"
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="pt-10 text-center animate-fade-in">
            <div className={cls("w-20 h-20 rounded-full bg-brand-500 flex items-center justify-center mx-auto mb-6")}>
              <Check size={40} className="text-white" strokeWidth={2.5}/>
            </div>
            <h2 className={cls("text-[26px] font-bold tracking-tight", dark ? "text-white" : "text-black")}>준비 완료</h2>
            <p className={cls("text-[14px] mt-3 leading-relaxed", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              8주간의 여정을 시작합니다.{"\n"}매일 꾸준히 기록하면 놀라운 변화가 찾아올 거예요.
            </p>
            <div className={cls("mt-6 rounded-xl border text-left", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
              {[
                { label: "시작일", value: startDate },
                { label: "종료일", value: endDate },
                { label: "목표", value: goal === "lose" ? "체중 감량" : goal === "muscle" ? "근력 강화" : "건강 유지" },
                { label: "목표 칼로리", value: `${targetCal} kcal/일` },
                { label: "AI 코치", value: AI_COACH_TONES.find((t) => t.key === coachTone)?.label || "-" },
                { label: "기간", value: (() => {
                  const days = Math.max(1, Math.round((new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`)) / 86400000) + 1);
                  const weeks = Math.floor(days / 7);
                  const rest = days % 7;
                  return weeks > 0 ? (rest > 0 ? `${days}일 (${weeks}주 ${rest}일)` : `${days}일 (${weeks}주)`) : `${days}일`;
                })() },
              ].map((row, i) => (
                <div key={i} className={cls("flex justify-between px-4 py-3", i > 0 && (dark ? "border-t border-[#262626]" : "border-t border-[#dbdbdb]"))}>
                  <span className={cls("text-[13px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{row.label}</span>
                  <span className={cls("text-[13px] font-semibold", dark ? "text-white" : "text-black")}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={cls("px-6 pb-8 pt-3 border-t", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
        <div className="flex gap-2">
          {step > 0 && (
            <button onClick={() => { setStep(step - 1); setWarning(""); }}
              className={cls("flex-1 py-3 rounded-2xl text-[14px] font-bold transition active:scale-[0.98]",
                dark ? "bg-[#1a1a1a] text-white border border-[#262626]" : "bg-white text-black border border-[#dbdbdb]")}>
              이전
            </button>
          )}
          <button onClick={handleNext} disabled={!canNext()}
            className={cls("flex-[2] py-3 rounded-2xl text-[14px] font-bold transition active:scale-[0.98]",
              canNext()
                ? "bg-brand-500 text-white"
                : "bg-brand-500/30 text-white cursor-not-allowed")}>
            {step === 4 ? "챌린지 시작" : step === 0 ? "시작하기" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
};

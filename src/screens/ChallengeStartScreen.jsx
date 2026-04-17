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

  const inputCls = cls("w-full px-4 py-3 rounded-2xl text-sm font-bold", dark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900");

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-white")}>
      <header className={cls("flex items-center justify-between p-4")}>
        <button onClick={close} aria-label="닫기"><X size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <div className="flex gap-1.5">
          {[0,1,2,3,4].map((i) => (
            <div key={i} className={cls("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-emerald-500" : i < step ? "w-3 bg-emerald-300" : "w-3 bg-gray-300 dark:bg-gray-700")}/>
          ))}
        </div>
        <div className="w-6"/>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {step === 0 && (
          <div className="flex flex-col items-center justify-center text-center pt-8 animate-fade-in">
            <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-emerald-400 via-teal-500 to-amber-400 flex items-center justify-center shadow-2xl mb-8">
              <Trophy size={52} className="text-white"/>
            </div>
            <h2 className={cls("text-2xl font-black", dark ? "text-white" : "text-gray-900")}>바디키 8주 챌린지</h2>
            <p className={cls("text-sm mt-3 leading-relaxed max-w-xs", dark ? "text-gray-400" : "text-gray-500")}>
              8주간의 체계적인 식단 관리와 운동으로{"\n"}
              건강한 변화를 만들어보세요.{"\n\n"}
              AI 코치가 매일 맞춤 피드백을 드리고,{"\n"}
              주차별 미션으로 꾸준함을 만들어요.
            </p>
            <div className="flex gap-4 mt-8">
              {[
                { Icon: BarChart3, label: "AI 식단분석", color: "from-emerald-400 to-teal-500" },
                { Icon: Dumbbell, label: "운동 기록", color: "from-amber-400 to-orange-500" },
                { Icon: TrendingUp, label: "변화 그래프", color: "from-violet-400 to-purple-500" },
              ].map((f) => (
                <div key={f.label} className={cls("px-4 py-3 rounded-2xl text-center flex flex-col items-center gap-2", dark ? "bg-gray-800" : "bg-gray-50")}>
                  <div className={cls("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", f.color)}>
                    <f.Icon size={18} className="text-white"/>
                  </div>
                  <span className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>{f.label}</span>
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
                { key: "health", Icon: Leaf, color: "from-emerald-400 to-teal-500", label: "건강 유지", desc: "균형 잡힌 생활 습관" },
              ].map((g) => (
                <button key={g.key} onClick={() => { setGoal(g.key); setWarning(""); }}
                  className={cls("w-full p-4 rounded-2xl flex items-center gap-4 text-left transition active:scale-[0.98]",
                    goal === g.key
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
                      : dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700")}>
                  <div className={cls("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", goal === g.key ? "bg-white/20" : `bg-gradient-to-br ${g.color}`)}>
                    <g.Icon size={22} className="text-white"/>
                  </div>
                  <div>
                    <p className="text-sm font-black">{g.label}</p>
                    <p className={cls("text-xs mt-0.5", goal === g.key ? "text-white/80" : dark ? "text-gray-500" : "text-gray-500")}>{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {bmr > 0 && goal && (
              <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-emerald-50")}>
                <p className={cls("text-xs font-bold mb-2", dark ? "text-gray-400" : "text-gray-600")}>자동 계산 결과</p>
                <div className="flex gap-4">
                  <div>
                    <p className={cls("text-xs", dark ? "text-gray-500" : "text-gray-500")}>기초대사량</p>
                    <p className={cls("text-lg font-black", dark ? "text-white" : "text-gray-900")}>{bmr} kcal</p>
                  </div>
                  <div>
                    <p className={cls("text-xs", dark ? "text-gray-500" : "text-gray-500")}>목표 칼로리</p>
                    <p className="text-lg font-black text-emerald-500">{targetCal} kcal</p>
                  </div>
                  <div>
                    <p className={cls("text-xs", dark ? "text-gray-500" : "text-gray-500")}>BMI</p>
                    <p className={cls("text-lg font-black", dark ? "text-white" : "text-gray-900")}>{bmiVal}</p>
                  </div>
                </div>
                <div className={cls("mt-3 pt-3 border-t text-xs leading-relaxed space-y-1.5",
                  dark ? "border-gray-700 text-gray-400" : "border-emerald-100 text-gray-600")}>
                  <p><span className="font-bold">기초대사량</span>은 아무 활동 없이도 하루에 소비되는 최소 칼로리예요.</p>
                  <p>
                    <span className="font-bold">목표 칼로리</span>는 하루에 섭취하길 권장하는 양이에요.
                    {goal === "lose" && " 기초대사량 + 활동량에서 약 500kcal를 빼서 건강하게 감량을 도와줍니다."}
                    {goal === "muscle" && " 근육 성장에 필요한 잉여 칼로리를 더해 충분히 먹어야 할 양을 알려줘요."}
                    {goal === "health" && " 현재 체중을 유지하면서 균형잡힌 생활을 지원하는 양이에요."}
                  </p>
                  <p><span className="font-bold">BMI</span>는 체질량 지수예요. 정상 범위는 18.5~24.9입니다.</p>
                </div>
              </div>
            )}
            {warning && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-start gap-2">
                <Flame size={16} className="text-rose-500 mt-0.5 shrink-0"/>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-300">{warning}</p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="pt-4 space-y-4 animate-fade-in">
            <h2 className={cls("text-xl font-black", dark ? "text-white" : "text-gray-900")}>AI 코치를 선택하세요</h2>
            <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>매일 당신의 활동에 맞는 피드백을 보내드려요</p>
            <div className="space-y-3">
              {AI_COACH_TONES.map((t) => (
                <button key={t.key} onClick={() => setCoachTone(t.key)}
                  className={cls("w-full p-4 rounded-2xl text-left transition active:scale-[0.98]",
                    coachTone === t.key
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
                      : dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700")}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cls("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", coachTone === t.key ? "bg-white/20" : `bg-gradient-to-br ${t.color}`)}>
                      <t.Icon size={18} className="text-white"/>
                    </div>
                    <div>
                      <p className="text-sm font-black">{t.label}</p>
                      <p className={cls("text-xs", coachTone === t.key ? "text-white/80" : dark ? "text-gray-500" : "text-gray-500")}>{t.desc}</p>
                    </div>
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
          <div className="pt-8 text-center animate-fade-in">
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-emerald-400 via-teal-500 to-amber-400 flex items-center justify-center shadow-2xl mx-auto mb-6">
              <Check size={44} className="text-white"/>
            </div>
            <h2 className={cls("text-2xl font-black", dark ? "text-white" : "text-gray-900")}>준비 완료!</h2>
            <p className={cls("text-sm mt-3 leading-relaxed", dark ? "text-gray-400" : "text-gray-500")}>
              8주간의 여정을 시작합니다.{"\n"}매일 꾸준히 기록하면{"\n"}놀라운 변화가 찾아올 거예요.
            </p>
            <div className={cls("mt-6 p-4 rounded-2xl mx-4 text-left", dark ? "bg-gray-800" : "bg-gray-50")}>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>시작일</span>
                  <span className={cls("text-xs font-bold", dark ? "text-white" : "text-gray-900")}>{startDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>종료일</span>
                  <span className={cls("text-xs font-bold", dark ? "text-white" : "text-gray-900")}>{endDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>목표</span>
                  <span className={cls("text-xs font-bold", dark ? "text-white" : "text-gray-900")}>
                    {goal === "lose" ? "체중 감량" : goal === "muscle" ? "근력 강화" : "건강 유지"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>목표 칼로리</span>
                  <span className="text-xs font-bold text-emerald-500">{targetCal} kcal/일</span>
                </div>
                <div className="flex justify-between">
                  <span className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>AI 코치</span>
                  <span className={cls("text-xs font-bold", dark ? "text-white" : "text-gray-900")}>
                    {AI_COACH_TONES.find((t) => t.key === coachTone)?.label || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>기간</span>
                  <span className={cls("text-xs font-bold", dark ? "text-white" : "text-gray-900")}>
                    {(() => {
                      const days = Math.max(1, Math.round((new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`)) / 86400000) + 1);
                      const weeks = Math.floor(days / 7);
                      const rest = days % 7;
                      return weeks > 0 ? (rest > 0 ? `${days}일 (${weeks}주 ${rest}일)` : `${days}일 (${weeks}주)`) : `${days}일`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-8 pt-2">
        {step > 0 && (
          <button onClick={() => { setStep(step - 1); setWarning(""); }}
            className={cls("w-full py-3 rounded-2xl text-sm font-bold mb-2", dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600")}>
            이전
          </button>
        )}
        <button onClick={handleNext} disabled={!canNext()}
          className={cls("w-full py-4 rounded-2xl font-black text-base shadow-xl active:scale-[0.98] transition flex items-center justify-center gap-2",
            canNext()
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30"
              : dark ? "bg-gray-800 text-gray-600" : "bg-gray-200 text-gray-400")}>
          {step === 4 ? "챌린지 시작!" : step === 0 ? "시작하기" : "다음"}
          <ChevronRight size={18}/>
        </button>
      </div>
    </div>
  );
};

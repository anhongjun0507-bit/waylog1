import { useState } from "react";
import { ArrowLeft, Edit3, Sparkles } from "lucide-react";
import { cls } from "../utils/ui.js";
import { WeeklyLifestyleCards } from "./WeeklyLifestyleCards.jsx";

// 인바디 사진 AI 분석 결과 — 5필드 수정 + 해석 + 주간 생활습관 5카드.
// readOnly 모드에서는 저장된 기록을 다시 보여주는 용도로 재사용 (수정/저장 버튼 숨김).
export const InbodyAnalysisResult = ({ result, onSave, onCancel, dark, readOnly = false }) => {
  const [data, setData] = useState({
    weight: result?.data?.weight ?? "",
    skeletal_muscle: result?.data?.skeletal_muscle ?? "",
    body_fat_mass: result?.data?.body_fat_mass ?? "",
    bmi: result?.data?.bmi ?? "",
    body_fat_percentage: result?.data?.body_fat_percentage ?? "",
  });
  const [saving, setSaving] = useState(false);

  const fields = [
    { key: "weight", label: "체중", unit: "kg", step: "0.1" },
    { key: "skeletal_muscle", label: "골격근량", unit: "kg", step: "0.1" },
    { key: "body_fat_mass", label: "체지방량", unit: "kg", step: "0.1" },
    { key: "bmi", label: "BMI", unit: "kg/m²", step: "0.1" },
    { key: "body_fat_percentage", label: "체지방률", unit: "%", step: "0.1" },
  ];

  const lifestyle = result?.weekly_lifestyle || {};
  const hasLifestyle = !!(lifestyle.exercise || lifestyle.diet || lifestyle.sleep || lifestyle.hydration || lifestyle.tip);

  const handleSave = async () => {
    if (saving || readOnly) return;
    setSaving(true);
    try {
      const num = (v) => {
        if (v === "" || v === null || v === undefined) return null;
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : null;
      };
      await onSave({
        data: {
          weight: num(data.weight),
          skeletal_muscle: num(data.skeletal_muscle),
          body_fat_mass: num(data.body_fat_mass),
          bmi: num(data.bmi),
          body_fat_percentage: num(data.body_fat_percentage),
        },
        interpretation: result.interpretation,
        weekly_lifestyle: result.weekly_lifestyle,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true"
      className={cls("fixed inset-0 z-[60] max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col pt-safe animate-slide-up",
        dark ? "bg-black" : "bg-white")}>
      <header className={cls("flex items-center justify-between px-4 h-12 border-b shrink-0",
        dark ? "border-[#262626] bg-black" : "border-[#dbdbdb] bg-white")}>
        <button onClick={onCancel} aria-label="닫기" className="min-w-tap min-h-tap flex items-center">
          <ArrowLeft size={22} className={dark ? "text-white" : "text-black"}/>
        </button>
        <p className={cls("text-[16px] font-bold flex items-center gap-1.5", dark ? "text-white" : "text-black")}>
          <Sparkles size={16} className="text-brand-500"/>
          {readOnly ? "AI 분석 결과" : "분석 결과 확인"}
        </p>
        <div className="w-6"/>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 측정 결과 (수정 가능) */}
        <section className={cls("p-4 rounded-2xl border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
          <div className="flex items-center justify-between mb-3">
            <p className={cls("text-[13px] font-bold uppercase tracking-wider", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              📊 측정 결과
            </p>
            {!readOnly && (
              <span className={cls("text-[10px] font-semibold inline-flex items-center gap-1", dark ? "text-[#a8a8a8]" : "text-[#a8a8a8]")}>
                <Edit3 size={10}/> 수정 가능
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key}>
                <label className={cls("text-[11px] font-semibold block mb-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                  {f.label} <span className="font-normal opacity-60">({f.unit})</span>
                </label>
                <input
                  value={data[f.key] === null ? "" : data[f.key]}
                  onChange={(e) => setData((d) => ({ ...d, [f.key]: e.target.value }))}
                  type="number" inputMode="decimal" step={f.step}
                  readOnly={readOnly}
                  placeholder={readOnly ? "-" : "값 입력"}
                  className={cls("w-full min-h-tap px-3 py-2.5 rounded-btn text-[15px] font-semibold border outline-none focus:ring-2 focus:ring-brand-500/20",
                    dark
                      ? "bg-ink-900 text-ink-50 border-ink-700 focus:border-brand-500"
                      : "bg-white text-ink-900 border-ink-200 focus:border-brand-500",
                    readOnly && "opacity-80")}
                />
              </div>
            ))}
          </div>
          {!readOnly && (
            <p className={cls("text-[11px] mt-3", dark ? "text-[#a8a8a8]" : "text-[#a8a8a8]")}>
              💡 인식이 정확하지 않은 항목은 직접 수정해주세요
            </p>
          )}
        </section>

        {/* AI 해석 */}
        {result?.interpretation && (
          <section className={cls("p-4 rounded-2xl border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
            <p className={cls("text-[13px] font-bold uppercase tracking-wider mb-2", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              🤖 AI 분석
            </p>
            <p className={cls("text-[14px] leading-[1.7] whitespace-pre-wrap", dark ? "text-white" : "text-black")}>
              {result.interpretation}
            </p>
          </section>
        )}

        {/* 주간 생활습관 */}
        {hasLifestyle && (
          <section className="space-y-2">
            <p className={cls("text-[13px] font-bold uppercase tracking-wider px-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              ✨ 이번 주 권장 생활습관
            </p>
            <WeeklyLifestyleCards weeklyLifestyle={lifestyle} dark={dark}/>
          </section>
        )}

        <p className={cls("text-[11px] text-center pt-2 pb-4", dark ? "text-[#a8a8a8]" : "text-[#a8a8a8]")}>
          AI 분석은 의학적 진단이 아니에요. 건강 이상이 의심되면 전문의를 찾아주세요.
        </p>
      </div>

      {!readOnly && (
        <div className={cls("border-t px-4 py-3 pb-safe flex gap-2 shrink-0",
          dark ? "border-[#262626] bg-black" : "border-[#dbdbdb] bg-white")}>
          <button onClick={onCancel} disabled={saving}
            className={cls("flex-1 py-3 rounded-xl text-[14px] font-bold active:opacity-60",
              dark ? "bg-[#262626] text-white" : "bg-[#efefef] text-black")}>
            취소
          </button>
          <button onClick={handleSave} disabled={saving}
            className={cls("flex-[2] py-3 rounded-xl text-[14px] font-bold transition active:scale-[0.98]",
              saving ? "bg-brand-500/50 text-white cursor-wait" : "bg-brand-500 text-white shadow-lg shadow-brand-500/30")}>
            {saving ? "저장 중..." : "인바디 기록에 저장"}
          </button>
        </div>
      )}
    </div>
  );
};

export default InbodyAnalysisResult;

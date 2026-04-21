import { useState } from "react";
import { ArrowLeft, Plus, Activity } from "lucide-react";
import { cls } from "../utils/ui.js";
import { useExit } from "../hooks.js";

// 인바디 측정 기록 추가/조회 + 체중 변화 SVG 선 그래프.
// 완전 props-only (App 상태 closure 없음).
export const InbodyScreen = ({ records, onAdd, onClose, dark }) => {
  const [exiting, close] = useExit(onClose);
  const [adding, setAdding] = useState(false);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [bmi, setBmi] = useState("");

  const handleAdd = () => {
    if (!weight) return;
    onAdd({
      id: Date.now(),
      date: new Date().toISOString(),
      weight: parseFloat(weight) || 0,
      bodyFat: parseFloat(bodyFat) || 0,
      muscle: parseFloat(muscle) || 0,
      bmi: parseFloat(bmi) || 0,
    });
    setWeight(""); setBodyFat(""); setMuscle(""); setBmi("");
    setAdding(false);
  };

  const sorted = [...(records || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = sorted[0];
  const prev = sorted[1];

  const delta = (cur, old) => {
    if (!cur || !old) return null;
    const d = cur - old;
    if (Math.abs(d) < 0.01) return null;
    return d;
  };

  const graphData = [...(records || [])].sort((a, b) => new Date(a.date) - new Date(b.date)).filter((r) => r.weight > 0);

  return (
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col pt-safe", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-black" : "bg-white")}>
      <header className={cls("flex items-center justify-between px-4 h-12 border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={22} className={dark ? "text-white" : "text-black"}/></button>
        <p className={cls("text-[16px] font-bold", dark ? "text-white" : "text-black")}>인바디 기록</p>
        <button onClick={() => setAdding(true)} aria-label="기록 추가" className={dark ? "text-white" : "text-black"}>
          <Plus size={22}/>
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {adding && (
          <div className={cls("p-4 rounded-xl space-y-3 border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
            <p className={cls("text-[14px] font-semibold", dark ? "text-white" : "text-black")}>새 기록 추가</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "체중 (kg)", val: weight, set: setWeight },
                { label: "체지방 (%)", val: bodyFat, set: setBodyFat },
                { label: "근육량 (kg)", val: muscle, set: setMuscle },
                { label: "BMI", val: bmi, set: setBmi },
              ].map((f) => (
                <div key={f.label}>
                  <label className={cls("text-[11px] font-semibold block mb-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{f.label}</label>
                  <input value={f.val} onChange={(e) => f.set(e.target.value)} type="number" inputMode="decimal" step="0.1"
                    className={cls("w-full min-h-tap px-4 py-3 rounded-btn text-[15px] font-semibold border outline-none focus:ring-2 focus:ring-brand-500/20",
                      dark ? "bg-ink-900 text-ink-50 border-ink-700 focus:border-brand-500"
                           : "bg-white text-ink-900 border-ink-200 focus:border-brand-500")}/>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className={cls("flex-1 py-2 rounded-lg text-[14px] font-semibold", dark ? "bg-[#262626] text-white" : "bg-[#efefef] text-black")}>취소</button>
              <button onClick={handleAdd} disabled={!weight}
                className={cls("flex-1 py-2 rounded-lg text-[14px] font-bold transition", weight ? "bg-brand-500 text-white active:opacity-80" : "bg-brand-500/30 text-white cursor-not-allowed")}>
                저장
              </button>
            </div>
          </div>
        )}

        {latest && (
          <div className={cls("p-4 rounded-xl border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
            <p className={cls("text-[12px] font-semibold uppercase tracking-wider mb-3", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>최근 기록 vs 이전</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "체중", val: latest.weight, unit: "kg", prev: prev?.weight },
                { label: "체지방", val: latest.bodyFat, unit: "%", prev: prev?.bodyFat, invert: true },
                { label: "근육량", val: latest.muscle, unit: "kg", prev: prev?.muscle },
                { label: "BMI", val: latest.bmi, unit: "", prev: prev?.bmi, invert: true },
              ].map((item) => {
                const d = delta(item.val, item.prev);
                const good = d ? (item.invert ? d < 0 : d > 0) : null;
                return (
                  <div key={item.label} className={cls("p-3 rounded-lg", dark ? "bg-black" : "bg-white")}>
                    <p className={cls("text-[11px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{item.label}</p>
                    <p className={cls("text-[20px] font-bold tabular-nums mt-1", dark ? "text-white" : "text-black")}>
                      {item.val || "-"}<span className="text-[11px] font-medium opacity-60 ml-0.5">{item.unit}</span>
                    </p>
                    {d !== null && (
                      <p className={cls("text-[11px] font-semibold tabular-nums mt-0.5", good ? "text-brand-500" : "text-red-500")}>
                        {d > 0 ? "+" : ""}{d.toFixed(1)}{item.unit}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {graphData.length >= 2 && (
          <div className={cls("p-4 rounded-xl border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
            <p className={cls("text-[12px] font-semibold uppercase tracking-wider mb-3", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>체중 변화</p>
            <svg viewBox="0 0 300 120" className="w-full h-28">
              {(() => {
                const vals = graphData.map((d) => d.weight);
                const min = Math.min(...vals) - 1;
                const max = Math.max(...vals) + 1;
                const range = max - min || 1;
                const pts = graphData.map((d, i) => ({
                  x: graphData.length === 1 ? 150 : 20 + (i / (graphData.length - 1)) * 260,
                  y: 10 + ((max - d.weight) / range) * 90,
                }));
                const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                return (
                  <>
                    <path d={line} fill="none" stroke={dark ? "#ffffff" : "#000000"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="3" fill={dark ? "#ffffff" : "#000000"}/>
                        <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[9px]" fill={dark ? "#a8a8a8" : "#737373"}>{vals[i]}</text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        )}

        <div className="space-y-2">
          <p className={cls("text-[12px] font-semibold uppercase tracking-wider px-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>기록 히스토리</p>
          {sorted.length === 0 && (
            <div className={cls("py-12 text-center rounded-xl border border-dashed", dark ? "border-[#262626] text-[#a8a8a8]" : "border-[#dbdbdb] text-[#737373]")}>
              <Activity size={28} className="mx-auto mb-2 opacity-50"/>
              <p className="text-[13px]">아직 기록이 없어요</p>
            </div>
          )}
          {sorted.map((r) => (
            <div key={r.id} className={cls("p-3 rounded-xl flex items-center gap-3 border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
              <div className={cls("w-10 h-10 rounded-full flex items-center justify-center", dark ? "bg-[#262626] text-white" : "bg-white text-black")}>
                <Activity size={16} strokeWidth={1.8}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cls("text-[11px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{new Date(r.date).toLocaleDateString("ko-KR")}</p>
                <p className={cls("text-[13px] font-semibold tabular-nums", dark ? "text-white" : "text-black")}>
                  {r.weight}kg · {r.bodyFat}% · {r.muscle}kg
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>인바디 기록</p>
        <button onClick={() => setAdding(true)} aria-label="기록 추가" className="text-emerald-500"><Plus size={22}/></button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {adding && (
          <div className={cls("p-4 rounded-2xl space-y-3", dark ? "bg-gray-800" : "bg-white")}>
            <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>새 기록 추가</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "체중 (kg)", val: weight, set: setWeight },
                { label: "체지방 (%)", val: bodyFat, set: setBodyFat },
                { label: "근육량 (kg)", val: muscle, set: setMuscle },
                { label: "BMI", val: bmi, set: setBmi },
              ].map((f) => (
                <div key={f.label}>
                  <label className={cls("text-xs font-bold block mb-1", dark ? "text-gray-400" : "text-gray-500")}>{f.label}</label>
                  <input value={f.val} onChange={(e) => f.set(e.target.value)} type="number" inputMode="decimal" step="0.1"
                    className={cls("w-full px-3 py-2 rounded-xl text-sm font-bold", dark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900")}/>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className={cls("flex-1 py-2.5 rounded-xl text-sm font-bold", dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600")}>취소</button>
              <button onClick={handleAdd} disabled={!weight}
                className={cls("flex-1 py-2.5 rounded-xl text-sm font-black", weight ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" : dark ? "bg-gray-700 text-gray-600" : "bg-gray-200 text-gray-400")}>
                저장
              </button>
            </div>
          </div>
        )}

        {latest && (
          <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
            <p className={cls("text-xs font-bold mb-3", dark ? "text-gray-400" : "text-gray-500")}>최근 기록 vs 이전</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "체중", val: latest.weight, unit: "kg", prev: prev?.weight },
                { label: "체지방", val: latest.bodyFat, unit: "%", prev: prev?.bodyFat, invert: true },
                { label: "근육량", val: latest.muscle, unit: "kg", prev: prev?.muscle },
                { label: "BMI", val: latest.bmi, unit: "", prev: prev?.bmi, invert: true },
              ].map((item) => {
                const d = delta(item.val, item.prev);
                const good = d ? (item.invert ? d < 0 : d > 0) : null;
                return (
                  <div key={item.label} className={cls("p-3 rounded-xl", dark ? "bg-gray-700" : "bg-gray-50")}>
                    <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>{item.label}</p>
                    <p className={cls("text-xl font-black mt-1", dark ? "text-white" : "text-gray-900")}>
                      {item.val || "-"}<span className="text-xs font-bold ml-0.5">{item.unit}</span>
                    </p>
                    {d !== null && (
                      <p className={cls("text-xs font-bold mt-0.5", good ? "text-emerald-500" : "text-rose-500")}>
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
          <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
            <p className={cls("text-xs font-bold mb-3", dark ? "text-gray-400" : "text-gray-500")}>체중 변화</p>
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
                    <path d={line} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="4" fill="#10b981"/>
                        <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[9px] font-bold" fill={dark ? "#9ca3af" : "#6b7280"}>{vals[i]}</text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        )}

        <div className="space-y-2">
          <p className={cls("text-xs font-bold px-1", dark ? "text-gray-400" : "text-gray-500")}>기록 히스토리</p>
          {sorted.length === 0 && (
            <div className={cls("py-8 text-center rounded-2xl border-2 border-dashed", dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400")}>
              <Activity size={28} className="mx-auto mb-2 opacity-50"/>
              <p className="text-xs font-medium">아직 기록이 없어요</p>
            </div>
          )}
          {sorted.map((r) => (
            <div key={r.id} className={cls("p-3 rounded-2xl flex items-center gap-3", dark ? "bg-gray-800" : "bg-white")}>
              <div className={cls("w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-emerald-400 to-teal-500")}>
                <Activity size={18}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>{new Date(r.date).toLocaleDateString("ko-KR")}</p>
                <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>
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

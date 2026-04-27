import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus, Activity, Sparkles, Loader2 } from "lucide-react";
import { cls } from "../utils/ui.js";
import { useExit } from "../hooks.js";
import { compressFileForOCR } from "../utils/imageResize.js";
import { InbodyAnalysisResult } from "../components/InbodyAnalysisResult.jsx";
import { InbodyFirstTimeHint } from "../components/InbodyFirstTimeHint.jsx";

const DAILY_CAP = 5;
const FIRST_HINT_KEY = "waylog:hint:inbody-first";

// 인바디 측정 기록 추가/조회 + 체중 변화 SVG 선 그래프.
// AI 분석 흐름: onAnalyzeImage / onCheckCap / onToast 가 주입되면 "사진으로 자동 입력" 버튼 노출.
export const InbodyScreen = ({ records, onAdd, onClose, dark, user, onAnalyzeImage, onCheckCap, onToast }) => {
  const [exiting, close] = useExit(onClose);
  const [adding, setAdding] = useState(false);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [bmi, setBmi] = useState("");

  const fileRef = useRef(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [detail, setDetail] = useState(null); // 저장된 기록 상세 (readOnly 다시 보기)
  const [todayCount, setTodayCount] = useState(0);
  const [firstHintOpen, setFirstHintOpen] = useState(false);

  const aiEnabled = !!(onAnalyzeImage && user?.id);
  const capReached = todayCount >= DAILY_CAP;
  const oneLeft = todayCount === DAILY_CAP - 1;

  // P1-6: mount 시 오늘 분석 횟수 fetch (사전 표시용)
  useEffect(() => {
    if (!aiEnabled || !onCheckCap) return;
    let cancelled = false;
    onCheckCap()
      .then((cap) => { if (!cancelled && cap) setTodayCount(cap.count || 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [aiEnabled, onCheckCap]);

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

  // 실제 사진 선택 다이얼로그 호출 — 첫 사용 안내 통과 후 또는 두 번째 사용부터 직접 호출
  const openFilePicker = () => {
    fileRef.current?.click();
  };

  // P1-7: 첫 사용 안내 모달 → 통과한 적 있으면 바로 사진 선택
  const handlePickAIPhoto = () => {
    if (!aiEnabled || analyzing || capReached) return;
    let seen = false;
    try { seen = !!localStorage.getItem(FIRST_HINT_KEY); } catch {}
    if (!seen) {
      setFirstHintOpen(true);
      return;
    }
    openFilePicker();
  };

  const handleFirstHintStart = () => {
    try { localStorage.setItem(FIRST_HINT_KEY, "1"); } catch {}
    setFirstHintOpen(false);
    openFilePicker();
  };

  const handleAIPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 재선택 가능하게
    if (!file) return; // P2-9: 사용자 취소·권한 거부 모두 silent (의도적)
    if (!file.type?.startsWith("image/")) {
      onToast?.("이미지 파일만 업로드할 수 있어요");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      onToast?.("사진이 너무 커요. 더 작은 사진으로 다시 시도해주세요");
      return;
    }
    setAnalyzing(true);
    try {
      // 일일 cap 체크 — 5회 도달 시 차단 (사전 fetch 외에 한 번 더 안전망)
      if (onCheckCap) {
        const cap = await onCheckCap();
        if (cap && cap.count >= DAILY_CAP) {
          setTodayCount(cap.count);
          onToast?.("오늘 AI 분석 한도(5회)에 도달했어요. 내일 다시 시도해주세요");
          return;
        }
      }
      // 압축 후 분석. dataURL 은 분석 직후 폐기 (Storage 저장 안 함).
      let dataUrl = await compressFileForOCR(file);
      const result = await onAnalyzeImage(dataUrl);
      dataUrl = null;
      setAnalysisResult(result);
    } catch (err) {
      const code = err?.message || "";
      if (code === "ai_unavailable") {
        onToast?.("AI 분석을 잠시 사용할 수 없어요. 수동으로 입력해주세요");
      } else if (code === "ai_parse_failed") {
        onToast?.("사진을 인식하지 못했어요. 다른 각도로 다시 찍어주세요");
      } else {
        onToast?.("분석에 실패했어요. 잠시 후 다시 시도해주세요");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAIResult = async ({ data, interpretation, weekly_lifestyle }) => {
    onAdd({
      id: Date.now(),
      date: new Date().toISOString(),
      weight: data.weight ?? 0,
      bodyFat: data.body_fat_percentage ?? 0,
      muscle: data.skeletal_muscle ?? 0,
      bmi: data.bmi ?? 0,
      // 신규 필드 — data jsonb 안에 그대로 저장됨
      body_fat_mass: data.body_fat_mass,
      body_fat_percentage: data.body_fat_percentage,
      skeletal_muscle: data.skeletal_muscle,
      analyzed_by_ai: true,
      ai_interpretation: interpretation,
      weekly_lifestyle,
      analyzed_at: new Date().toISOString(),
    });
    setAnalysisResult(null);
    setTodayCount((c) => c + 1); // P1-6: 저장 시점에만 카운트 증가 (분석만 하고 취소하면 미반영)
    onToast?.("인바디 기록에 저장됐어요");
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
        {aiEnabled && (
          <div className="space-y-1.5">
            <button onClick={handlePickAIPhoto} disabled={analyzing || capReached}
              className={cls("w-full py-3.5 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30 transition active:scale-[0.98]",
                analyzing
                  ? "bg-brand-500/60 text-white cursor-wait"
                  : capReached
                    ? (dark ? "bg-[#262626] text-[#737373] cursor-not-allowed" : "bg-[#ececec] text-[#a8a8a8] cursor-not-allowed")
                    : "bg-brand-500 text-white")}>
              {analyzing ? (
                <><Loader2 size={18} className="animate-spin"/> AI가 분석하고 있어요...</>
              ) : capReached ? (
                <><Sparkles size={18} className="opacity-50"/> 오늘 한도 도달 (내일 다시)</>
              ) : (
                <>
                  <Sparkles size={18}/> 사진으로 자동 입력 (AI)
                  <span className={cls("ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                    oneLeft ? "bg-amber-300 text-amber-900" : "bg-white/25 text-white")}>
                    {oneLeft ? `${todayCount}/${DAILY_CAP} · 1회 남음` : `${todayCount}/${DAILY_CAP}`}
                  </span>
                </>
              )}
            </button>
            {analyzing && (
              <p className={cls("text-[11px] text-center", dark ? "text-[#737373]" : "text-[#a8a8a8]")}>
                분석에 최대 20초 정도 걸려요
              </p>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAIPhotoChange}/>
          </div>
        )}

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
                        <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[11px]" fill={dark ? "#a8a8a8" : "#737373"}>{vals[i]}</text>
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
          {sorted.map((r) => {
            const aiAnalyzed = !!r.analyzed_by_ai && !!r.ai_interpretation;
            const RowTag = aiAnalyzed ? "button" : "div";
            return (
              <RowTag key={r.id}
                {...(aiAnalyzed ? { onClick: () => setDetail(r), type: "button" } : {})}
                className={cls("w-full p-3 rounded-xl flex items-center gap-3 border text-left transition",
                  dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]",
                  aiAnalyzed && "active:opacity-70")}>
                <div className={cls("w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  aiAnalyzed ? "bg-brand-500/15 text-brand-500" : (dark ? "bg-[#262626] text-white" : "bg-white text-black"))}>
                  {aiAnalyzed ? <Sparkles size={16} strokeWidth={1.8}/> : <Activity size={16} strokeWidth={1.8}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className={cls("text-[11px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{new Date(r.date).toLocaleDateString("ko-KR")}</p>
                    {aiAnalyzed && (
                      <span className={cls("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                        dark ? "bg-brand-900/40 text-brand-200" : "bg-brand-50 text-brand-700")}>
                        🤖 AI 분석
                      </span>
                    )}
                  </div>
                  <p className={cls("text-[13px] font-semibold tabular-nums mt-0.5", dark ? "text-white" : "text-black")}>
                    {r.weight}kg · {r.bodyFat}% · {r.muscle}kg
                  </p>
                </div>
              </RowTag>
            );
          })}
        </div>
      </div>

      {analysisResult && (
        <InbodyAnalysisResult
          result={analysisResult}
          onSave={handleSaveAIResult}
          onCancel={() => setAnalysisResult(null)}
          dark={dark}/>
      )}

      {detail && (
        <InbodyAnalysisResult
          readOnly
          result={{
            data: {
              weight: detail.weight,
              skeletal_muscle: detail.skeletal_muscle ?? detail.muscle,
              body_fat_mass: detail.body_fat_mass,
              bmi: detail.bmi,
              body_fat_percentage: detail.body_fat_percentage ?? detail.bodyFat,
            },
            interpretation: detail.ai_interpretation,
            weekly_lifestyle: detail.weekly_lifestyle,
          }}
          onCancel={() => setDetail(null)}
          dark={dark}/>
      )}

      {firstHintOpen && (
        <InbodyFirstTimeHint
          onStart={handleFirstHintStart}
          onClose={() => setFirstHintOpen(false)}
          dark={dark}/>
      )}
    </div>
  );
};

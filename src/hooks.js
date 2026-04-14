import { useState, useEffect, useRef } from "react";

// 입력값을 delay ms 지연시켜 반환. 검색/필터 재계산 빈도 제어용.
export const useDebouncedValue = (value, delay = 200) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

// window.storage 기반 영속 state. 로드 완료 여부(loaded)를 3번째 반환값으로 제공.
// unmount 후 setState 경고를 피하기 위해 mounted ref 로 async 경로를 가드.
// JSON.parse 실패 시에도 앱이 안전하게 기본값으로 fallback.
export const useStoredState = (key, initial) => {
  const [val, setVal] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(initial);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const r = await window.storage?.get(key);
        if (r?.value) {
          try {
            const parsed = JSON.parse(r.value);
            if (mountedRef.current) { setVal(parsed); ref.current = parsed; }
          } catch (parseErr) {
            console.warn(`[useStoredState] JSON parse 실패 — 기본값 사용 ("${key}")`, parseErr);
          }
        }
      } catch { /* storage 접근 실패 — 기본값 유지 */ }
      if (mountedRef.current) setLoaded(true);
    })();
    return () => { mountedRef.current = false; };
  }, [key]);
  const update = async (next) => {
    const v = typeof next === "function" ? next(ref.current) : next;
    ref.current = v;
    if (mountedRef.current) setVal(v);
    try { await window.storage?.set(key, JSON.stringify(v)); }
    catch (e) { if (e?.name === "QuotaExceededError" || e?.code === 22) console.warn(`[useStoredState] QuotaExceededError for key "${key}"`, e); }
  };
  return [val, update, loaded];
};

// 모달/상세 네비게이션 스택
export const useNavStack = () => {
  const [stack, setStack] = useState([]);
  const push = (s) => setStack((prev) => [...prev, s]);
  const pop = () => setStack((prev) => prev.slice(0, -1));
  const reset = () => setStack([]);
  return { stack, push, pop, reset, top: stack[stack.length - 1] };
};

// slide-down 종료 애니메이션 완료 후 실제 unmount
export const useExit = (onDone) => {
  const [exiting, setExiting] = useState(false);
  const close = () => { if (exiting) return; setExiting(true); setTimeout(onDone, 260); };
  return [exiting, close];
};

// 시간대별 그라디언트 (라이트/다크 각 6개 구간)
// 모듈 수준 single timer — 여러 컴포넌트가 같은 훅을 사용해도 interval 하나만.
let _sharedHour = new Date().getHours();
const _hourSubs = new Set();
let _hourTimer = null;
const _ensureHourTimer = () => {
  if (_hourTimer) return;
  _hourTimer = setInterval(() => {
    const h = new Date().getHours();
    if (h === _sharedHour) return;
    _sharedHour = h;
    _hourSubs.forEach((cb) => cb(h));
  }, 60000);
};

export const useTimeGradient = (dark = false) => {
  const [hour, setHour] = useState(_sharedHour);
  useEffect(() => {
    _hourSubs.add(setHour);
    _ensureHourTimer();
    // 마운트 직후 최신 시간 반영 (모듈 캐시가 오래됐을 수 있음)
    setHour(new Date().getHours());
    return () => {
      _hourSubs.delete(setHour);
      if (_hourSubs.size === 0 && _hourTimer) {
        clearInterval(_hourTimer);
        _hourTimer = null;
      }
    };
  }, []);

  const lightMap = [
    { range: [5, 8],   gradient: "from-sky-300 via-cyan-300 to-emerald-300",      solid: "from-cyan-500 to-emerald-500",    name: "새벽", text: "고요한 새벽이에요" },
    { range: [8, 12],  gradient: "from-emerald-400 via-teal-500 to-cyan-500",     solid: "from-emerald-500 to-teal-500",    name: "아침", text: "활기찬 아침이에요" },
    { range: [12, 17], gradient: "from-amber-300 via-emerald-400 to-teal-500",    solid: "from-emerald-500 to-amber-500",   name: "오후", text: "따스한 오후예요" },
    { range: [17, 20], gradient: "from-orange-300 via-pink-400 to-violet-500",    solid: "from-pink-500 to-violet-500",     name: "저녁", text: "노을이 물드는 시간" },
    { range: [20, 24], gradient: "from-indigo-500 via-violet-600 to-purple-700",  solid: "from-violet-500 to-purple-600",   name: "밤",   text: "차분한 밤이에요" },
    { range: [0, 5],   gradient: "from-slate-700 via-indigo-900 to-purple-900",   solid: "from-indigo-600 to-purple-700",   name: "심야", text: "고요한 심야예요" },
  ];
  const darkMap = [
    { range: [5, 8],   gradient: "from-sky-700 via-cyan-700 to-emerald-700",      solid: "from-cyan-300 to-emerald-300",    name: "새벽", text: "고요한 새벽이에요" },
    { range: [8, 12],  gradient: "from-emerald-600 via-teal-600 to-cyan-600",     solid: "from-emerald-300 to-teal-300",    name: "아침", text: "활기찬 아침이에요" },
    { range: [12, 17], gradient: "from-amber-600 via-emerald-600 to-teal-600",    solid: "from-emerald-300 to-amber-300",   name: "오후", text: "따스한 오후예요" },
    { range: [17, 20], gradient: "from-orange-600 via-pink-600 to-violet-700",    solid: "from-pink-300 to-violet-300",     name: "저녁", text: "노을이 물드는 시간" },
    { range: [20, 24], gradient: "from-indigo-600 via-violet-700 to-purple-800",  solid: "from-violet-300 to-purple-300",   name: "밤",   text: "차분한 밤이에요" },
    { range: [0, 5],   gradient: "from-slate-600 via-indigo-700 to-purple-800",   solid: "from-indigo-300 to-purple-300",   name: "심야", text: "고요한 심야예요" },
  ];
  const map = dark ? darkMap : lightMap;
  return map.find((m) => hour >= m.range[0] && hour < m.range[1]) || map[0];
};

// 공용 색상/그라디언트 토큰.
// 기존 코드의 인라인 Tailwind 클래스들을 한 곳에서 참조하도록 점진 이전.
// 다크모드 지원은 호출측에서 `dark` bool과 함께 조합.
//
// ===== 타이포 가이드 (신규 코드에 적용) =====
//   heading  : text-lg font-extrabold tracking-tight
//   subtitle : text-base font-bold
//   body     : text-sm font-medium leading-relaxed
//   caption  : text-xs font-semibold opacity-70
//   cta      : text-sm font-black
// 기존 코드의 font-black/font-bold/font-extrabold 혼용은 기능적 차이가 없으므로
// 신규 화면부터 위 토큰 준수. 리팩토링 대상(#18)은 점진 반영.

export const BRAND = {
  primary: "emerald-500",
  primaryDark: "emerald-400",
  primaryGradient: "from-emerald-500 to-teal-500",
  primarySolid: "bg-emerald-500",
  primaryText: "text-emerald-500",
  primaryTextDark: "text-emerald-400",
};

export const DANGER = {
  solid: "bg-rose-500",
  text: "text-rose-500",
  textDark: "text-rose-400",
  border: "border-rose-400",
  bg: "bg-rose-50",
  bgDark: "bg-rose-900/30",
};

export const WARN = {
  text: "text-amber-500",
  textDark: "text-amber-400",
  bg: "bg-amber-50",
  bgDark: "bg-amber-900/30",
};

// 카테고리 색상 — App.jsx의 CATEGORIES 상수로 이미 존재. 여기서는 재노출만.
// 실제 재구성은 #26 리팩토링에서 App.jsx의 CATEGORIES를 이 파일로 이전 예정.

// 시간대별 그라디언트 프리셋 — useTimeGradient 훅에서 사용
export const TIME_GRADIENTS = [
  { from: 6, solid: "from-amber-400 to-orange-400" },     // morning
  { from: 11, solid: "from-sky-400 to-blue-500" },        // midday
  { from: 16, solid: "from-orange-400 to-rose-400" },     // afternoon
  { from: 19, solid: "from-purple-500 to-pink-500" },     // evening
  { from: 22, solid: "from-indigo-600 to-purple-700" },   // night
  { from: 2, solid: "from-slate-600 to-slate-800" },      // deep night
];

// 공통 레이아웃 제약
export const LAYOUT = {
  appMaxW: "max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl",
};

// 공통 surface(배경) 조합 헬퍼
export const surface = (dark, { muted = false } = {}) => {
  if (muted) return dark ? "bg-gray-800" : "bg-gray-50";
  return dark ? "bg-gray-900" : "bg-white";
};

export const text = (dark, { muted = false } = {}) => {
  if (muted) return dark ? "text-gray-400" : "text-gray-500";
  return dark ? "text-white" : "text-gray-900";
};

export const border = (dark) => (dark ? "border-gray-700" : "border-gray-200");

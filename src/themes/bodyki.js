// ============================================================
// 바디키 8주 챌린지 디자인 토큰 (Withings Health Mate 풍)
// ============================================================
// 감성: 임상적 / 미니멀 / 데이터 중심
//   - 거의 순백 배경 + 한 가지 포인트 컬러 (emerald)
//   - 큰 tabular 숫자로 측정값 강조
//   - flat 카드 (그림자 최소, 얇은 1px border 로 구분)
//   - uppercase small label + 큰 숫자 의 대비
//   - 링 차트, 트렌드 라인, 스파크라인 중심
//
// 적용 범위: ChallengeMainScreen, ChallengeEntryCard (hero 모드),
//            DailyReportCard, InbodyScreen, ChallengeGraphScreen,
//            MealUploadModal, ExerciseModal, MissionEditModal
// (ChallengeStartScreen 은 Waylog 톤 유지 — 진입 전 단계라 브랜드 일관성)
//
// 사용:
//   import { B } from "../themes";
//   <div className={cls(B.bg(dark), "min-h-screen")}>
//     <div className={cls(B.card(dark), B.radius.lg, "p-5")}>
//       <p className={cls(B.type.label, B.text.label(dark))}>체중</p>
//       <p className={cls(B.type.metricLarge, B.text.metric(dark))}>62.4<span className="text-base ml-1 opacity-60">kg</span></p>
//     </div>
//   </div>

// ============================================================
// 토큰
// ============================================================

export const bodykiTokens = {
  // --- 컬러: 절제된 단일 악센트 ---
  brand: {
    solid: "bg-emerald-500",
    text: "text-emerald-500",
    textDark: "text-emerald-400",
    hex: "#00C9A7",
    // Withings 는 그라디언트 최소. 포인트 라인/링 차트에만 사용.
    ring: "stroke-emerald-500",
  },

  // 보조 데이터 컬러 (그래프/상태 표시)
  info: { text: "text-blue-600",   textDark: "text-blue-400",   ring: "stroke-blue-500" },
  warn: { text: "text-amber-600",  textDark: "text-amber-400",  ring: "stroke-amber-500" },
  bad:  { text: "text-rose-600",   textDark: "text-rose-400",   ring: "stroke-rose-500" },
  ok:   { text: "text-emerald-600",textDark: "text-emerald-400",ring: "stroke-emerald-500" },

  // --- 표면 ---
  // Withings: cool 화이트 + 얇은 border. 그림자 거의 없음.
  surface: {
    bg:         "bg-gray-50",      // cool, clinical
    bgDark:     "bg-zinc-950",
    card:       "bg-white",
    cardDark:   "bg-zinc-900",
    // flat 카드 구분선
    border:     "border border-gray-100",
    borderDark: "border border-zinc-800",
    chip:       "bg-gray-100",
    chipDark:   "bg-zinc-800",
    divider:    "border-t border-gray-100",
    dividerDark:"border-t border-zinc-800",
  },

  // --- 텍스트 ---
  text: {
    heading:      "text-gray-900",
    headingDark:  "text-white",
    body:         "text-gray-600",      // Withings 는 본문이 옅음
    bodyDark:     "text-zinc-400",
    muted:        "text-gray-400",
    mutedDark:    "text-zinc-500",
    // 측정값 (체중, 칼로리, D+일수 등) — 가장 강조
    metric:       "text-gray-900",
    metricDark:   "text-white",
    // 단위 (kg, kcal 등) — 측정값 옆 옅은 보조
    unit:         "text-gray-400",
    unitDark:     "text-zinc-500",
    // 라벨 — uppercase small caps
    label:        "text-gray-500",
    labelDark:    "text-zinc-500",
  },

  // --- Radius ---
  // Withings 는 subtle — rounded-2xl/20px. 너무 둥글지 않음.
  radius: {
    sm:   "rounded-lg",         // 8px
    md:   "rounded-2xl",        // 16px
    lg:   "rounded-[20px]",     // 20px — 메인 카드
    pill: "rounded-full",
  },

  // --- Shadow ---
  // Withings: 그림자 거의 없음. border 가 구분선 역할.
  shadow: {
    none:    "",
    subtle:  "shadow-[0_1px_2px_0_rgb(0,0,0,0.04)]",
    card:    "shadow-sm",
  },

  // --- Typography ---
  // 측정값은 크고 tabular. 라벨은 작고 uppercase.
  type: {
    // 측정값 — Withings 시그니처 (큰 tabular 숫자)
    metricDisplay: "text-5xl font-black tabular-nums tracking-tight leading-none",
    metricLarge:   "text-3xl font-black tabular-nums tracking-tight leading-none",
    metricMedium:  "text-2xl font-extrabold tabular-nums leading-none",
    metricSmall:   "text-lg font-bold tabular-nums",
    // 라벨 — UPPERCASE SMALL CAPS
    label:         "text-xs font-semibold uppercase tracking-[0.08em]",
    // 제목 — 절제된 heading
    heading:       "text-lg font-extrabold tracking-tight",
    subheading:    "text-sm font-bold",
    // 본문
    body:          "text-sm font-medium leading-relaxed",
    bodySm:        "text-xs font-medium leading-relaxed",
    // 단위
    unit:          "text-sm font-medium",
    // 날짜/보조
    caption:       "text-xs font-medium",
  },

  // --- 간격 ---
  // Withings 는 카드 간격이 정확히 규칙적 (일관된 16px)
  spacing: {
    pageX:   "px-4",
    pageY:   "pt-4 pb-6",
    cardP:   "p-5",           // 약간 넓음 (측정값 breathing)
    listGap: "gap-3",
    stackGap:"space-y-4",
  },
};

// ============================================================
// 헬퍼
// ============================================================

export const B = {
  bg:      (dark) => dark ? bodykiTokens.surface.bgDark : bodykiTokens.surface.bg,
  // card() 는 배경 + border 를 한 번에 적용 (Withings 특유의 flat card)
  card:    (dark) => `${dark ? bodykiTokens.surface.cardDark : bodykiTokens.surface.card} ${dark ? bodykiTokens.surface.borderDark : bodykiTokens.surface.border}`,
  surface: (dark) => dark ? bodykiTokens.surface.cardDark : bodykiTokens.surface.card,
  chip:    (dark) => dark ? bodykiTokens.surface.chipDark : bodykiTokens.surface.chip,
  divider: (dark) => dark ? bodykiTokens.surface.dividerDark : bodykiTokens.surface.divider,

  text: {
    heading: (dark) => dark ? bodykiTokens.text.headingDark : bodykiTokens.text.heading,
    body:    (dark) => dark ? bodykiTokens.text.bodyDark : bodykiTokens.text.body,
    muted:   (dark) => dark ? bodykiTokens.text.mutedDark : bodykiTokens.text.muted,
    metric:  (dark) => dark ? bodykiTokens.text.metricDark : bodykiTokens.text.metric,
    label:   (dark) => dark ? bodykiTokens.text.labelDark : bodykiTokens.text.label,
    unit:    (dark) => dark ? bodykiTokens.text.unitDark : bodykiTokens.text.unit,
    brand:   (dark) => dark ? bodykiTokens.brand.textDark : bodykiTokens.brand.text,
  },

  radius: bodykiTokens.radius,
  shadow: bodykiTokens.shadow,
  type:   bodykiTokens.type,
  brand:  bodykiTokens.brand,
  spacing: bodykiTokens.spacing,
};

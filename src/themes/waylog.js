// ============================================================
// Waylog 디자인 토큰 — Pinterest + 라이프스타일 매거진
// ============================================================
// 원칙:
//   • 순백 / 순흑 — light `#ffffff`, dark `#000000` (IG 에서 계승)
//   • hairline divider (#dbdbdb / #262626) — 카드 박스 아님 (IG 에서 계승)
//   • 민트 primary — 브랜드 #00C9A7 이 링크/CTA/액션 전면에
//   • Pretendard + 폰트 위계 (IG 에서 계승)
//   • 둥글기: avatar full, 이미지 rounded-xl (매소너리 카드), 버튼 rounded-lg
//   • 아이콘 lucide 24px/28px

export const waylogTokens = {
  brand: {
    // 브랜드 민트 — primary CTA / 링크 / 액션
    solid:     "bg-mint-500",
    solidDark: "bg-mint-500",
    text:      "text-mint-700",      // 라이트 모드 텍스트 대비 (5.4:1 AA)
    textDark:  "text-mint-400",
    hex:       "#00C9A7",
    heart:     "text-mint-500",      // 좋아요 민트 하트 (브랜드 일체감)
    heartFill: "fill-mint-500 text-mint-500",
  },

  // --- Surface ---
  surface: {
    canvas:     "bg-white",          // 순백 IG light
    canvasDark: "bg-black",          // 순흑 IG dark
    card:       "bg-white",
    cardDark:   "bg-black",
    elevated:     "bg-white",
    elevatedDark: "bg-zinc-900",     // modal/sheet 만 살짝 올림
    muted:      "bg-[#fafafa]",      // 매우 옅은 회색 (섹션 구분)
    mutedDark:  "bg-[#121212]",
    overlay:    "bg-black/50",
  },

  // --- Text ---
  text: {
    heading:      "text-black",
    headingDark:  "text-white",
    body:         "text-black",
    bodyDark:     "text-white",
    muted:        "text-[#737373]",
    mutedDark:    "text-[#a8a8a8]",
    faint:        "text-[#c7c7c7]",
    faintDark:    "text-[#737373]",
    link:         "text-mint-700",    // 라이트 모드 링크 (민트)
    linkDark:     "text-mint-400",    // 다크 모드 링크
    action:       "text-mint-600",    // primary 액션 텍스트
  },

  // --- Hairline divider (IG signature) ---
  hairline:     "border-[#dbdbdb]",
  hairlineDark: "border-[#262626]",

  // --- Radius ---
  radius: {
    none: "rounded-none",
    sm:   "rounded",           // 4px
    md:   "rounded-lg",        // 8px — 버튼
    lg:   "rounded-xl",        // 12px — 매소너리 카드 이미지
    xl:   "rounded-2xl",       // 16px — modal
    full: "rounded-full",
  },

  shadow: {
    none: "",
    subtle: "shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]",
  },

  // --- Typography (Pretendard + IG 위계) ---
  type: {
    display:     "font-sans font-black text-2xl leading-tight tracking-tight",
    headline:    "font-sans font-bold text-xl leading-tight",
    heading:     "font-sans font-extrabold text-[16px] tracking-tight",
    username:    "font-sans font-bold text-[14px]",        // IG username weight
    body:        "font-sans text-[14px] leading-[1.4]",    // IG post text
    bodyLead:    "font-sans font-medium text-[14px] leading-[1.4]",
    cta:         "font-sans font-bold text-[14px]",
    caption:     "font-sans text-[12px]",
    meta:        "font-sans text-[12px] text-[#737373]",   // timestamp
    tagLabel:    "font-sans font-semibold text-[12px]",
    count:       "font-sans font-semibold text-[14px]",
    // 프로필 stats
    statNum:     "font-sans font-bold text-[16px] tabular-nums",
    statLabel:   "font-sans text-[14px]",
  },

  spacing: {
    pageX:   "px-4",
    postP:   "px-0",              // IG post 는 edge-to-edge
    actionP: "px-3 py-2.5",       // action bar
    sectionGap: "mt-0",
  },
};

// ============================================================
// 헬퍼
// ============================================================

export const W = {
  bg:      (dark) => dark ? waylogTokens.surface.canvasDark : waylogTokens.surface.canvas,
  surface: (dark) => dark ? waylogTokens.surface.cardDark : waylogTokens.surface.card,
  paper:   (dark) => dark ? waylogTokens.surface.cardDark : waylogTokens.surface.card,
  elevated:(dark) => dark ? waylogTokens.surface.elevatedDark : waylogTokens.surface.elevated,
  muted:   (dark) => dark ? waylogTokens.surface.mutedDark : waylogTokens.surface.muted,
  chip:    (dark) => dark ? waylogTokens.surface.mutedDark : waylogTokens.surface.muted,
  divider: (dark) => dark ? waylogTokens.hairlineDark : waylogTokens.hairline,
  dividerClass: (dark) => dark ? "border-[#262626]" : "border-[#dbdbdb]",

  text: {
    heading: (dark) => dark ? waylogTokens.text.headingDark : waylogTokens.text.heading,
    body:    (dark) => dark ? waylogTokens.text.bodyDark : waylogTokens.text.body,
    muted:   (dark) => dark ? waylogTokens.text.mutedDark : waylogTokens.text.muted,
    faint:   (dark) => dark ? waylogTokens.text.faintDark : waylogTokens.text.faint,
    brand:   (dark) => dark ? waylogTokens.brand.textDark : waylogTokens.brand.text,
    accent:  (dark) => dark ? waylogTokens.brand.textDark : waylogTokens.brand.text,
    link:    (dark) => dark ? waylogTokens.text.linkDark : waylogTokens.text.link,
    action:  () => waylogTokens.text.action,
  },

  radius: waylogTokens.radius,
  shadow: waylogTokens.shadow,
  type:   waylogTokens.type,
  brand:  waylogTokens.brand,
  spacing: waylogTokens.spacing,
  hairline: waylogTokens.hairline,
};

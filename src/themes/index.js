// ============================================================
// 웨이로그 디자인 시스템 — 2 테마 공존 진입점
// ============================================================
// 한 앱에 두 가지 완전히 다른 감성을 운영:
//   • W (Waylog 메인) — Pinterest + Instagram + Shop
//   • B (Bodyki 챌린지) — Withings Health Mate
//
// 공통: Pretendard 폰트, emerald-500 primary.
// 전환: 챌린지 진입 시 slide-up 애니 + 배경 톤 변화가 시각적 신호.
//
// 기존 `src/theme.js` (BRAND/DANGER/WARN/LAYOUT) 는 병행 유지 — 비파괴적 마이그레이션.
// 신규 화면/리디자인에서는 W / B 를 우선 사용.

export { waylogTokens, W } from "./waylog.js";
export { bodykiTokens, B } from "./bodyki.js";

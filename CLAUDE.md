# CLAUDE.md · Waylog

## 프로젝트 개요
- **이름**: 웨이로그 (Waylog / 웨이로그)
- **종류**: 한국어 라이프스타일 리뷰·커뮤니티 앱 (건강·뷰티·홈리빙)
- **스택**: React 18.3 + Vite + Supabase + Capacitor 7 (Android) + Firebase Cloud Messaging
- **배포**:
  - 웹: Vercel (`vercel.json`) — push 시 자동 배포
  - Android: GitHub Actions 의 `Android Release AAB` 워크플로로 AAB 빌드 → Play Console 수동 업로드 (sandbox 빌드 불가)
  - DB: Supabase Postgres (마이그레이션은 Dashboard SQL Editor 또는 `supabase db push` 로 적용)
  - Edge Function: `supabase functions deploy <name>` (4개 함수: claude / send-push / send-challenge-reminders / moderation)
- **구조**:
  - 메인: `src/App.jsx` (~7,900줄, 앱 셸/라우팅/상태 중심)
  - 분리됨: `src/components/` (16개), `src/screens/` (8개 + AuthScreen.test), `src/contexts/`, `src/hooks.js`, `src/utils/`
  - 상수/카탈로그: `src/constants.js`, `src/catalog.js`, `src/data/products.json`
  - 테마/토큰: `src/theme.js`, `tailwind.config.js`
  - Supabase 클라이언트/쿼리: `src/supabase.js`
  - Firebase 클라이언트: `src/firebase.js` (FCM 토큰 발급)
  - 타입(일부): `src/types.ts` (JS 중심, 전면 TS 전환 아님)

## 프로젝트 규칙 (절대 준수)
- **`App.jsx`는 추가 분리 금지** — 명시적 분리 요청 전까지 현재 구조 유지 (새 화면/위젯은 `screens/` 또는 `components/`에 추가)
- **브랜드 컬러**: 블루 `#0071CE` (`brand-500`). 팔레트는 `tailwind.config.js` `colors.brand.*` 참조. chip 표준 조합: `bg-brand-50 text-brand-700` (라이트) / `bg-brand-900/40 text-brand-200` (다크). 다크모드 링크·포인트는 `brand-300 이상` 사용 (L≥0.376)
- **카테고리 6종** (`src/constants.js` `CATEGORIES`):
  - 뉴트리션 (`food`), 웰니스 (`wellness`), 뷰티 (`beauty`), 퍼스널케어 (`kitchen`), 홈리빙 (`home`), 원포원 (`one4one`)
- **언어**: 모든 UI 텍스트 한국어
- **폰트**: Pretendard (CDN, `src/index.css`)

## 보호 영역 (변경 시 반드시 사용자 확인)
회귀 위험 큰 영역들 — 1.0.0~1.4.0 사이 검증 완료. 수정 전 명시적 승인:
- **Auth / Supabase 세션 처리**: `src/supabase.js` 의 `migrateLocalStorage()` / `migrationReady` / GoTrueClient 통합 — `AUTH_CHANGES.md` v3→v4 기록 참조. 별도 저장소 토큰 복사 금지, `setSession` 병렬 호출 금지.
- **Router 흐름**: `App.jsx` 의 `Routes` 블록과 `AppContext` lazy 로딩 패턴
- **브랜드 블루 토큰**: `tailwind.config.js` `colors.brand.*` — a11y 패스(L≥0.376) 적용 완료
- **Auth-related 마이그레이션**: 새 Supabase migration 추가 시 `supabase/migrations/README.md` 명명 규칙 준수
- **captureInput / 미디어 업로드 경로**: `src/App.jsx` `uploadMedia` + ComposeScreen — 1.4.0 P1-30 에서 반환 형태 변경

## 작업 규칙

### 1. 추측 금지
- 파일 구조/컴포넌트 위치 모르면 먼저 `src/components`, `src/screens` 읽기
- 기존 Tailwind 클래스 패턴(`src/theme.js`의 `BRAND`/`LAYOUT` 등) 확인 후 동일하게
- 모르는 건 "모르겠다"고 말하기

### 2. 수정 후 필수 검증
```
1) npm run build 성공 확인
2) npm run dev 띄워서 콘솔 에러 없음 확인 (headless 환경이면 사용자에게 수동 확인 요청)
3) 수정한 기능 실제로 동작하는지 확인
```
보조 명령: `npm run typecheck`, `npm run test`, `npm run lint`

**검증 실패 시**: 구체적 에러 메시지와 함께 보고. "완료했습니다" 금지.
**Headless 환경**: 브라우저/UI 시각 확인 불가한 경우 그 사실을 명시하고 사용자에게 캡처/확인 요청.

### 3. 요청 범위만
- 사용자가 말한 것만 수정
- 관련 개선 아이디어는 **코드 수정 전에 먼저 제안**
- 리팩토링은 승인 후에만

### 4. 금지 사항
- `console.log` 방치 (디버그 끝나면 제거)
- 새 npm 패키지 승인 없이 추가
- `.env` 하드코딩 (Supabase 키 등은 환경변수로)
- Git 자동 push/commit (사용자 명시적 요청 시에만)
- Anthropic API key 를 클라이언트 번들·`.env.example`에 노출 — Supabase Edge Function secret 으로만

## 우선순위 정의
audit·작업 분류 시 사용:
- **P0**: 기능 깨짐·보안 결함·데이터 손실 위험 — 즉시 수정
- **P1**: UX 결함·silent failure·외부 노출 시 사용자 혼란 — Production 출시 전 수정
- **P2**: 디자인 일관성·minor a11y·문서 정리 — 출시 후 점진 정리
- **마일스톤**: AI 카피 활성화, Play Store Production 트랙 승격 등 일회성 큰 작업

## 보고 포맷
작업 후 아래 형식으로 보고:
- **수정한 파일**: 목록 (`경로:라인`)
- **검증 결과**: 빌드 ✅ / 런타임 ✅ / 기능 ✅ (headless면 ⏳ 표기 + 사용자 확인 요청)
- **사용자 결정 필요**: (있다면 명확히)
- **주의사항**: 사용자가 확인해야 할 부분

## 환경/인프라 메모
- **Supabase**: `reviews ↔ profiles` 직접 FK 없음 (PostgREST embed 우회 필요), Storage RLS 정책 적용됨, `avatars`/`review-media` 버킷 public. 마이그레이션 12개 (`supabase/migrations/README.md` 참조)
- **Edge Functions** (4개): claude(verify_jwt + 일일 50회 쿼터) / send-push(FCM v1, sender 가드) / send-challenge-reminders(KST 19:00 cron) / moderation(admin-only). secret 등록은 `supabase/functions/README.md`
- **Firebase Cloud Messaging**: 1.2.0 푸시 알림. 웹은 VAPID(`VITE_FIREBASE_VAPID_KEY`), Android 는 `google-services.json` + FCM 토큰
- **GitHub Actions**:
  - `android-release.yml`: Android AAB 빌드 (수동/`v*` 태그 트리거). Repo Secrets 6개 등록 완료 (VITE_SUPABASE_*, ANDROID_KEYSTORE_*)
  - `challenge-reminder.yml`: 매일 KST 19:00 cron → send-challenge-reminders Edge Function 호출. CRON_SECRET 매칭
- **Android**: Sandbox 빌드 불가 → GitHub Actions 에서만 빌드. 패키지명 `com.waylog.app`
- **Play Store**: `PLAY_STORE_LISTING.md` 가 단일 소스. 카테고리 라이프스타일(잠정), 개인정보처리방침/약관 URL 채워짐. 스크린샷·피처 그래픽은 사용자 작업 펜딩
- **Vercel**: 운영 도메인 `https://waylog1.vercel.app`. 환경변수에 `VITE_SUPABASE_*` + `VITE_FIREBASE_*` 7개 + (선택) `VITE_SHARE_ORIGIN`

## 정적 데이터 (DB 미동기화)
다음 데이터는 의도적으로 코드에 정적 정의 — 변경 시 코드 수정 + 배포 필요:
- **`CHALLENGE_MISSIONS`** (`src/constants.js`): 8주 챌린지 일일 미션 목록. 변경 빈도 낮아 DB 분리 보류 (audit P1-19 결정).
- **`CATEGORIES` / `MOODS` / `EXERCISE_TYPES` / `AI_COACH_TONES`** (`src/constants.js`): UI 토큰성 상수
- **`POPULAR_TAGS`** (`src/constants.js`): 검색 화면 인기 태그 칩
- **`PRODUCTS`** (`src/constants.js`) + 카탈로그 (`src/data/products.json`): 518개 제품 정적 카탈로그

DB 이전이 필요해진 시점은 1.5.0+ 검토.

## 1.4.0 사이클 변경 요약 (2026-04)
- **P0**: 인증 키 정리 (v3→v4 마이그레이션), claude Edge Function verify_jwt 강제 + 사용자별 일일 쿼터 (`user_ai_quota`), send-push sender 가드, admin role 보존
- **P1**: 시드 사용자/리뷰 제거, FavScreen 가짜 savedProducts 제거, CommunityScreen 로딩 skeleton, friendlyError 매핑, 사진 업로드 실패 6s action toast, AI 분석 30s timeout, useOptimisticToggle hook 도입(likePost), analytics 9개 이벤트 호출, 문서·인프라 정합 (.env.example / README / EDGE_FUNCTIONS / migrations / PLAY_STORE_LISTING / CLAUDE.md / ANDROID.md GitHub Actions)
- **상세 audit**: `docs/audit-2026-04-28.md`

## 현재 진행 중 마일스톤
- Play Store Production 트랙 승격 (디바이스/전화 인증 2개 펜딩)
- 스크린샷·피처 그래픽 캡처 (`PLAY_STORE_LISTING.md` 가이드 참조)
- 1.5.0+: useOptimisticToggle 나머지 4곳 마이그레이션 (toggleFav/toggleFollow/toggleCommentLike/toggleCommunityCommentLike), 디자인 토큰 정리, generateWithClaude AI 카피 활성화

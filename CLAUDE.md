# CLAUDE.md · Waylog

## 프로젝트 개요
- **이름**: 웨이로그 (Waylog / 웨이로그)
- **종류**: 한국어 라이프스타일 리뷰·커뮤니티 앱 (건강·뷰티·홈리빙)
- **스택**: React 18.3 + Vite + Supabase + Capacitor 7 (Android)
- **배포**:
  - 웹: Vercel (`vercel.json`)
  - Android: Capacitor + GitHub Actions에서 AAB 빌드 (sandbox 빌드 불가)
- **구조**:
  - 메인: `src/App.jsx` (~5,300줄, 앱 셸/라우팅/상태 중심)
  - 분리됨: `src/components/` (14개), `src/screens/` (9개), `src/contexts/`, `src/hooks.js`, `src/utils/`
  - 상수/카탈로그: `src/constants.js`, `src/catalog.js`
  - 테마/토큰: `src/theme.js`
  - Supabase 클라이언트/쿼리: `src/supabase.js`
  - 타입(일부): `src/types.ts` (JS 중심, 전면 TS 전환 아님)

## 프로젝트 규칙 (절대 준수)
- **`App.jsx`는 추가 분리 금지** — 명시적 분리 요청 전까지 현재 구조 유지 (새 화면/위젯은 `screens/` 또는 `components/`에 추가)
- **브랜드 컬러**: 민트 `#00C9A7` (의도된 브랜드). 단, 현재 구현은 일부 자산이 `emerald-500 → cyan-600` 그라디언트 사용 — 자산별 색상 수정 시 확인 필요
- **카테고리 6종** (`src/constants.js` `CATEGORIES`):
  - 뉴트리션 (`food`), 웰니스 (`wellness`), 뷰티 (`beauty`), 퍼스널케어 (`kitchen`), 홈리빙 (`home`), 원포원 (`one4one`)
- **언어**: 모든 UI 텍스트 한국어
- **폰트**: Pretendard (CDN, `src/index.css`)

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
- Git 자동 push/commit

## 보고 포맷
작업 후 아래 형식으로 보고:
- **수정한 파일**: 목록 (`경로:라인`)
- **검증 결과**: 빌드 ✅ / 런타임 ✅ / 기능 ✅ (headless면 ⏳ 표기 + 사용자 확인 요청)
- **주의사항**: 사용자가 확인해야 할 부분

## 환경/인프라 메모
- **Supabase**: `reviews ↔ profiles` 직접 FK 없음 (PostgREST embed 우회 필요), Storage RLS 정책 적용됨, `avatars`/`review-media` 버킷 public
- **Android**: Sandbox 빌드 불가 → GitHub Actions에서 빌드, keystore/Secret 6개 등록 완료
- **Play Store**: 앱 아이콘 `resources/icon-background.svg` (`#10b981 → #0891b2` 그라디언트). 브랜드 민트(`#00C9A7`)와 불일치 있음 — 필요 시 정리

## 현재 진행 중 TODO
- **P0**: 테스트 데이터 제거, magic wand placeholder 교체
- **P1**: 조건부 렌더링 정리, zero-like 처리, FAB 위치, 탭 아이콘, 시간 포맷
- **P2**: hero card 통합, empty state, 카테고리 색상, skeleton, signature preview
- **마일스톤**: `generateWithClaude` AI 카피 활성화, Play Store 제출 완료 (계정 인증 2개 펜딩)

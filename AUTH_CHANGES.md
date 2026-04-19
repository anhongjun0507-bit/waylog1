# Auth 중복 저장 버그 수정 기록 (2026-04-19)

## 배경

앱에서 `localStorage.clear()` 후 재로그인 시에만 쿼리가 정상 실행되고, 재방문/새로고침 시에는 Network 탭에 Supabase REST 요청이 0개 뜨는 silent fail 이 재현됨. 콘솔 에러 없음.

### 원인 두 갈래

1. **`waylog:user` 자동 복원 → Supabase 세션 없이 로그인된 UI**
   `App.jsx` 의 초기 인증 훅이 `supabase.auth.getSession()` 을 3초 타임아웃 걸어 경쟁시키고, 실패 시 `localStorage.getItem("waylog:user")` 의 stale JSON 으로 user state 복원.
   UI 는 "로그인됨" 상태로 뜨지만 실제 Supabase 세션은 없어 이후 쿼리는 토큰을 못 구하고 조용히 실패.

2. **커스텀 `storageKey: 'waylog-auth-v2'` + 수동 파싱 → GoTrueClient 내부 lock 경쟁**
   Supabase GoTrueClient 가 자기 소유 저장소인 `waylog-auth-v2` 를 읽고 쓰는 중에 앱 코드 `getAccessToken()` 4단 폴백 체인이 같은 키를 `JSON.parse` 로 직접 탈취 시도.
   `directSignIn` 성공 직후 `setSession` 을 병렬 호출해 lock 을 추가로 잡음.

## 제거된 우회 경로

### `src/supabase.js`

| 삭제 항목 | 이유 |
|---|---|
| 상단 `waylog:auth-ver` 기반 `sb-*`/`supabase*` 일괄 삭제 블록 | `storageKey` 가 커스텀(`waylog-auth-v2`) 이라 실제 세션은 안 지우는 데드 코드 |
| `AUTH_STORAGE_KEY = 'waylog-auth-v2'` 상수 + createClient 의 `storageKey` 옵션 | Supabase 기본 키(`sb-<ref>-auth-token`) 로 복귀 — 중복 저장소 원인 제거 |
| 전역 `_accessToken`, `export setDirectToken`, `export getAccessToken` 4단 폴백 | 세션 읽기 경로 통일: `supabase.auth.getSession()` 만 사용 |
| `directRest()` 15초 타임아웃 수동 REST 래퍼 | 인증 헤더 수동 조립 → 만료 토큰 리프레시 안 됨. 표준 `supabase.from(...)` 로 복귀 |
| `directSignIn()` / `directSignUp()` | GoTrueClient 우회 REST 로그인 — `setSession` 병렬 호출로 lock 경쟁 유발 |
| `auth.signUp/signIn` 의 2초 Promise.race + directSign* 폴백 | 실패 시 명시적 에러 메시지 반환으로 대체 |
| `auth.signOut` 의 2초 race + `waylog-direct-token` 정리 로직 | 우회 키 없으므로 정리 대상 자체가 사라짐 |
| `reviews.create/update` · `communityApi.create` 의 2초 race + `directRest` 폴백 | 표준 경로 + 명시적 에러 반환 |
| `storage.uploadMedia` 5초 race + 30초 수동 fetch 폴백 | 표준 `supabase.storage.upload` 만 사용 |
| 네이티브 전용 localStorage→Preferences 구버전 마이그레이션 IIFE (`waylog:auth-migrated-to-prefs` 플래그) | 새 `migrationReady` 로 대체 |

### `src/App.jsx`

| 삭제 항목 | 이유 |
|---|---|
| `setUser` 래퍼의 `localStorage.setItem("waylog:user", ...)` · `removeItem` | 세션과 user state 가 따로 돌아가 발생한 stale UI 원인 제거 |
| `loadLocal()` + 호출 3곳 (`!supabase` · `session 없음` · `catch`) | Supabase 세션 없을 때 stale user 복원 금지 |
| `safeGetSession()` 3초 경쟁 로직 | 표준 `await supabase.auth.getSession()` 으로 복귀 |

### `index.html`

| 삭제 항목 | 이유 |
|---|---|
| 인라인 `waylog:auth-ver` 리셋 스크립트 | supabase.js 의 `migrateLocalStorage()` 가 담당. 중복 제거 |

### `src/screens/AuthScreen.jsx`

| 변경 | 이유 |
|---|---|
| "초기화하기" 버튼의 `waylog:*` 접두사 전삭 → auth 키 allowlist 기반 선별 삭제 | `waylog:dark` · `waylog:taste` · `waylog:community-clean-ver` 등 비-auth 키 보존 |

## 유지된 코드

- `src/supabase.js` 의 Capacitor Preferences storage adapter — 네이티브 자동 로그인 필수
- `src/App.jsx` 의 `onAuthStateChange` 구독, `buildUserFromSession`, `resetUserState`, `logout`
- `reviews.fetchAll/fetchPage/fetchMine/delete` 등 단순 쿼리 전부
- `src/main.jsx` 의 `waylog:community-clean-ver` 1회성 샘플 정리 (auth 무관)
- `AuthScreen.jsx` 의 "초기화하기" 탈출 버튼 — 문제 생긴 사용자용

## 추가된 마이그레이션 로직 (`src/supabase.js`)

기존 배포 사용자 브라우저에는 `waylog-auth-v2` 에 유효한 세션이 남아있어서, 키 체계 변경 시 전 사용자가 강제 재로그인 걸릴 위험. 방지용 1회성 마이그레이션:

### 웹 (동기)

`createClient` **전에** `migrateLocalStorage()` 가 실행:

1. `waylog:migrated-auth-v3` 플래그 확인 — 이미 있으면 skip
2. `localStorage['waylog-auth-v2']` 를 읽어 JSON 파싱 시도
3. 파싱 성공 + 신키(`sb-<ref>-auth-token`) 미설정 → 신키로 복사
4. 구키 `waylog-auth-v2` 삭제
5. `waylog:user` · `waylog-direct-token` · `waylog:auth-ver` 일괄 삭제
6. `waylog:migrated-auth-v3 = '1'` 설정

### 네이티브 (비동기, `migrationReady` Promise)

createClient 이후 실행:

1. Capacitor Preferences 에서 `MIGRATION_FLAG` 확인 — 있으면 skip
2. Preferences 의 `waylog-auth-v2` 값을 읽고 삭제
3. 구마이그레이션 플래그(`waylog:auth-migrated-to-prefs`) 같이 정리
4. `MIGRATION_FLAG` 설정
5. 값이 파싱 가능한 `{ access_token, refresh_token }` 이면 `supabase.auth.setSession()` 으로 복원 — GoTrueClient 가 신키로 자동 저장

`App.jsx` 초기 훅은 `await migrationReady` 후 `getSession()` 을 호출해 네이티브 복원 플래시 방지.

### 프로젝트 ref 추출

```js
const host = new URL(supabaseUrl).hostname  // abcdefgh.supabase.co
const ref = host.split('.')[0]              // abcdefgh
const NEW_STORAGE_KEY = `sb-${ref}-auth-token`
```

Supabase JS v2 의 기본 `storageKey` 포맷과 동일 — 키 충돌 없이 공존.

## 향후 "GoTrue 느림" 재발 시 대응 방향

이번에 제거한 2초 race + directRest 폴백들은 과거에 "GoTrue 가 응답 안 한다" 는 증상에 대응하려 들어왔던 것. 원인이 **중복 저장소 경쟁으로 인한 lock** 이었다면 이번 정리로 자연 해결됨. 다른 원인(네트워크 자체 지연, RLS 오설정, 토큰 만료 처리 등) 이면 재발 가능.

재발 시 절대 하지 말 것:

- 별도 저장소에 토큰 복사 (`waylog-direct-token` 재도입 금지)
- 앱 코드가 Supabase 저장소 키를 직접 `JSON.parse` 금지
- `setSession` 을 fire-and-forget 병렬 호출 금지 (lock 경쟁 재발)

권장 대응:

- `supabase.auth.onAuthStateChange` 에서 세션 상태 관찰 + UI 스켈레톤/스피너 처리
- 네트워크 에러는 try/catch 후 사용자에게 "다시 시도" 버튼
- 토큰 리프레시 실패가 지속되면 `supabase.auth.signOut()` 후 재로그인 유도
- RLS 정책 점검 (Supabase Dashboard → Auth logs)
- 필요 시 `fetch` 옵션(`keepalive`, timeout via AbortController) 로 네트워크 레이어에서 방어 — **Supabase 세션 저장소는 건드리지 말 것**

## 검증 체크리스트

수정 후 확인 (지영님 로컬 dev 에서):

1. [ ] 앱 열기 → DevTools Application → Local Storage 확인
   - `sb-<ref>-auth-token` 존재
   - `waylog-auth-v2` · `waylog:user` · `waylog-direct-token` · `waylog:auth-ver` 전부 없음
   - `waylog:migrated-auth-v4 = '1'` 있음
2. [ ] Network 탭에 `/rest/v1/reviews` 등 Supabase REST 요청 뜸
3. [ ] 피드 · 커뮤니티 · Today's Pick · 프로필 전부 정상 로드
4. [ ] 로그아웃 → `sb-*-auth-token` 삭제 확인, 로그인 화면 전환
5. [ ] 앱 완전 종료 후 재시작 → 자동 로그인 유지
6. [ ] 새 계정 가입 → 피드 즉시 표시

---

# 추가 기록 (2026-04-19 재수정) — 마이그레이션 v3 → v4 강화

## v3 배포 후 관찰된 재발 증상

2026-04-19 1차 배포(커밋 `8d8570e`) 후 로컬 일반 탭에서 로그인 시 "응답이 지연되고 있어요" 에러 재현.

- **시크릿 탭**: 정상
- **`localStorage.clear()` 후**: 정상
- **일반 탭 (v3 마이그레이션 돈 후)**: 증상 있음

원인: v3 는 `waylog-auth-v2` 의 유효 JSON 을 신키 `sb-<ref>-auth-token` 으로 **복사**해서 재로그인을 회피하려 했으나, **옛 세션 잔재(토큰 만료 · refresh_token 소실 등) 가 Supabase GoTrueClient 내부 lock 과 경쟁**하면서 초기 `getSession()` 이 계속 응답 못 받는 상황. 선별 삭제로는 동일 증상 재현 가능.

## v4 변경점

### `src/supabase.js`

**`migrateLocalStorage()` — 웹 (동기)**
- 옛 세션 복구 시도 **완전 제거** (신키 복사 로직 삭제)
- localStorage 전체 순회 + 패턴 매칭 배치 삭제:
  - 명시적 키: `waylog-auth-v2`, `waylog:user`, `waylog-direct-token`, `waylog:auth-ver`, `waylog:migrated-auth-v3` (v3 플래그도 유지보수 정리 차원에서 삭제)
  - 접두사 `sb-` 매칭: 현재 세션 포함 모든 Supabase 세션 키
  - 접두사 `supabase.` 매칭: Supabase 내부 관리 키
- 보존 (접두사 매칭 안됨): `waylog:dark`, `waylog:taste`, `waylog:community-clean-ver`, `waylog:draft:*`, `waylog:notifs:*`, 새 플래그 `waylog:migrated-auth-v4`, 배너 상태 `waylog:update-banner-v1-dismissed`
- 완료 플래그: `waylog:migrated-auth-v4 = '1'`

**`migrationReady` — 네이티브 (비동기)**
- `setSession()` 으로 옛 세션 복원 시도 **완전 제거**
- 명시적 키 6개 삭제: 위 웹 목록 + `waylog:auth-migrated-to-prefs` (이전 버전 localStorage→Preferences 플래그)
- `Preferences.keys()` 로 나열해 `sb-*`/`supabase.*` 접두사 일괄 삭제
- 완료 플래그: Preferences 에 `waylog:migrated-auth-v4 = '1'`

**제거된 코드**
- `getDefaultStorageKey()` 헬퍼
- `NEW_STORAGE_KEY` 상수 (v3 의 복사 대상 키 계산용)

### 영향

- **기존 사용자 전원 1회 강제 재로그인** — 의도된 선택
- lock 경쟁 유발 가능한 모든 잔재 제거 → "응답 지연" 증상 **재현 불가**
- `MIGRATION_FLAG === '1'` 검사로 반복 실행 비용 0

### 재발 시 대응 (v5 가 필요해지면)

- **플래그 키만 올린다** (`v4` → `v5`) 로 전 사용자 동일 흐름 1회 재실행
- 삭제 범위 넓혀도 OK — `waylog:` 접두사 전체도 가능 (단 `waylog:community-clean-ver` 등 의도 보존 키는 allowlist 로 제외)
- 다만 자주 올리면 사용자 피로도 상승 → 진짜 필요한 경우에만

---

# 업데이트 안내 배너 v1 추가 (2026-04-19)

## 목적

v4 마이그레이션이 전 사용자 1회 재로그인을 요구하므로, AuthScreen 에서 **이유를 40~50대도 읽기 쉬운 문구로 사전 안내**.

## 구현 위치

`src/screens/AuthScreen.jsx`
- 로고·서브문구 블록 직후, signup Avatar 또는 login 폼 직전
- 모든 mode (signup / login / forgot-password) 에 공통 노출

## 노출 조건 (`shouldShowUpdateBanner`)

다음 전부 만족 시 표시:
1. `localStorage['waylog:update-banner-v1-dismissed'] !== '1'` (사용자가 × 누르지 않음)
2. `Date.now() <= BANNER_EXPIRES_AT`

`BANNER_EXPIRES_AT = new Date('2026-05-10T00:00:00+09:00').getTime()` — v4 배포일(2026-04-19) 기준 약 3주. 
기한 지난 후에는 코드 존재해도 렌더 안됨 (반영구 배너 금지).

## 닫기 동작

× 클릭 시:
- `localStorage.setItem('waylog:update-banner-v1-dismissed', '1')`
- React state `showBanner = false`

## 디자인 토큰

- 배경/테두리: `bg-brand-50` / `border-brand-200` (라이트), `bg-brand-900/30` / `border-brand-700` (다크)
- 텍스트: `text-brand-800` (라이트), `text-brand-100` (다크)
- `rounded-card` (12px), `p-4`, 마진 `mb-6`
- 본문 14px `leading-1.7`, 부연 13px
- 좌측 `Info` 아이콘 (lucide-react), 우측 `×` 닫기
- `role="status"` (스크린리더 접근성)

## 문구

```
📢 업데이트 안내
앱이 새 버전으로 업데이트되었어요.
처음 한 번만 다시 로그인해주세요.
다음부터는 자동으로 로그인돼요.

로그인이 잘 안 되면 아래
[로그인 문제가 있나요? 초기화하기] 버튼을 눌러주세요.
```

## 만료 후 처리

`BANNER_EXPIRES_AT` 지난 시점에서 지영님이 선택:
- **그냥 두기**: `shouldShowUpdateBanner` 가 false 반환 → 안 뜸. 코드 청소는 5단계 DS 레거시 정리 때 같이
- **코드 제거**: AuthScreen 의 배너 import/JSX/상수 블록 삭제. `BANNER_DISMISSED_KEY` localStorage 잔재는 다음 마이그레이션 때 정리하거나 무시 (용량 미미)

---

# v4 검증 체크리스트 (v3 체크리스트 대체)

1. [ ] **신규 사용자 시뮬레이션**: `localStorage.clear()` → 새로고침
   - 배너 보임 ✓
   - 회원가입 후 `sb-<ref>-auth-token` + `waylog:migrated-auth-v4='1'` 존재
   - "응답 지연" 에러 없음
2. [ ] **기존 사용자 시뮬레이션**:
   ```js
   localStorage.clear()
   localStorage.setItem('waylog-auth-v2', '{"access_token":"x","refresh_token":"y"}')
   localStorage.setItem('waylog:user', '{"id":"old"}')
   localStorage.setItem('sb-fake-auth-token', 'stale')
   localStorage.setItem('waylog:dark', 'true')  // 보존 검증
   localStorage.setItem('waylog:community-clean-ver', '1')  // 보존 검증
   location.reload()
   ```
   - 새로고침 후: 위 auth 키 4개 **삭제됨**, `waylog:dark`/`community-clean-ver` **보존**
   - `waylog:migrated-auth-v4='1'` 생성
   - 배너 보임 + 로그인 화면
   - 로그인 → 정상 동작
3. [ ] **자동 로그인**: 한 번 로그인 후 탭 닫기 → 재진입 시 세션 유지
4. [ ] **배너 닫기**: × 클릭 → 새로고침해도 다시 안 뜸
5. [ ] **AuthScreen "초기화하기" 버튼**: 클릭 → localStorage 전체 auth 관련 삭제 + `waylog:migrated-auth-v4` 도 삭제 (다음 로드에서 v4 다시 돔)
6. [ ] **피드/커뮤니티/좋아요/시그니처 카드/챌린지** 전부 정상 동작

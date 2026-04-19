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
   - `waylog:migrated-auth-v3 = '1'` 있음
2. [ ] Network 탭에 `/rest/v1/reviews` 등 Supabase REST 요청 뜸
3. [ ] 피드 · 커뮤니티 · Today's Pick · 프로필 전부 정상 로드
4. [ ] 로그아웃 → `sb-*-auth-token` 삭제 확인, 로그인 화면 전환
5. [ ] 앱 완전 종료 후 재시작 → 자동 로그인 유지
6. [ ] 새 계정 가입 → 피드 즉시 표시

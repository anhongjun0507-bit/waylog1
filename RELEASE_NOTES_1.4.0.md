# 1.4.0 Release Notes

**버전**: 1.4.0 (versionCode 17)
**사이클**: 2026-04-28 audit → 2026-04-29 wrap-up
**범위**: 8 Phase (보안 + 데이터 정합성 + UX + 접근성 + 코드 품질 + 문서·인프라)

---

## Production 사용자용 (Play Console "변경사항")

```
🆕 1.4.0 안정성·보안 강화

🔒 보안 강화
  · AI 분석 사용자별 보호 (서버 인증)
  · 푸시 알림 발송자 검증
  · 관리 기능 권한 강화

📊 정확한 데이터
  · 새벽 시간 미션 완료가 정확히 반영
  · 첫 인바디 기록이 그래프에 즉시 표시
  · 본인 글이 정확히 본인 글로 표시

🔔 푸시 알림 개선
  · 알림 탭 시 해당 글로 바로 이동
  · 알림 권한 요청 타이밍 개선
  · 알림 종류별 설정 통합

♿ 접근성
  · 작은 버튼 터치 영역 확대 (최소 44px)
  · 폰트 가독성 향상 (12px 이상)
  · 다크모드 텍스트 대비 개선

🐛 다수의 버그 수정 및 안정화
```

문자수 가이드: Play Console "이번 버전의 새로운 기능" 칸은 500자 한도. 위 본문은 약 250자.

---

## 개발자/내부용 상세

### Phase 요약 (1-1 ~ 1-7)

| Phase | 영역 | 주요 변경 |
|---|---|---|
| 1-1 | 보안 P0 (4건) | claude verify_jwt + 일일 50회 쿼터, send-push sender 가드, NewsBroadcast admin role 게이트, IP rate limit 제거 |
| 1-2 | 빠른 P0 (4건) | onAuth 시 app_metadata 보존, community 마이그레이션 파일명 순서 정정, firebase-messaging-sw 보존, deleteComment 본인 가드 + rollback |
| 1-3 | 푸시 알림 P1 (5건) | foreground 메시지 토스트, 네이티브 deep link 라우팅, PushPermissionBanner denied fallback, notif_prefs 단일 소스, 권한 자동요청을 onboarding 종료로 지연 |
| 1-4 | 데이터 정합성 P1 (6건) | 챌린지 day_key KST 통일, 첫 인바디 record 서버 동기화, hydration ref 순서 (실패 시 재시도 가능), enrichWithProfiles + authorId-first isMine, ComposeScreen draft userId 스코프, FollowListModal fetch catch |
| 1-5 | 접근성 P1 (4건) | 작은 아이콘 44px 터치, dark muted text 대비, brand-300+ rule 다크 텍스트, text-[10px/11px] → text-xs |
| 1-6 | 코드 품질 P1 (8건) | SEED_USERS/REVIEWS/COMMENTS 제거, FavScreen 가짜 savedProducts 제거, CommunityScreen 로딩 skeleton, friendlyError 매핑, 사진 업로드 6s action toast + retry, AI 분석 30s timeout, useOptimisticToggle hook (likePost), analytics 9개 이벤트 wired |
| 1-7 | 문서·인프라 P1 (8건) | .env.example VITE_SHARE_ORIGIN, PLAY_STORE_LISTING placeholder 채움, supabase/migrations + functions README 신설, ANDROID GitHub Actions 빌드 안내, README/CLAUDE.md 갱신, audit 추적 |
| 1-8 | 마무리 | package.json + android/build.gradle 버전 승격, npx cap sync, release notes, 통합 검증 |

### 통계

- **총 변경**: P0 8건 + P1 35건 = **43건**
- **수정 파일**: 약 15개 (App.jsx, supabase.js, hooks.js, AuthScreen, InbodyScreen, components 다수)
- **신규 파일**: 4개 (`docs/audit-2026-04-28.md`, `supabase/migrations/README.md`, `supabase/functions/README.md`, `RELEASE_NOTES_1.4.0.md`)
- **삭제 파일**: 2개 (`src/mocks/seed.js`, `src/mocks/seed.test.js`)
- **커밋**: 35개 (origin/main 기준 ahead)
- **테스트**: 80 → 77 (seed.test.js 3건 제거, 신규 테스트 0건)

### Phase 간 사이드 이펙트 검증

| 조합 | 검증 |
|---|---|
| P0-1 (user_ai_quota) ↔ P1-33 (AI 30s timeout) | timeout 시 throw → 서버 quota 차감 안 됨 (서버 성공 후만 차감). client 도 quota 추적 안 함. ✅ 충돌 없음 |
| P0-4 (app_metadata 보존) ↔ P0-3 (NewsBroadcast admin) | onAuth 가 `app_metadata.role` 을 user 객체에 그대로 보존 → admin 화면 노출 + send-push 의 admin 가드가 같은 데이터 사용. ✅ 일관 |
| P1-25 (notif_prefs 단일 소스) ↔ P1-26 (권한 타이밍 onboarding) | onboarding 종료 시점에만 권한 요청, 이후 prefs UI 가 서버값을 master 로 표시. ✅ 일관 |
| P1-23 (draft userId scope) ↔ P1-30 (upload retry) | draft 키가 userId 별이고 retry 는 loadReviewsRef 가 userIdRef 로 사용자 교체 감지. ✅ 격리 유지 |
| P1-36 (SEED 제거) ↔ P1-32 (Community loading) | community fetch 실패 시 hydratedRef false 유지 + loading false → empty state. SEED fallback 없음. ✅ 일관 |

### 회귀 위험 영역 (실기기/dogfooding 권장)

1. **Auth 마이그레이션 v4** (1.3.0 → 1.4.0 사이의 기존 사용자)
   - 자동 강제 재로그인 1회. AuthScreen 상단에 "업데이트 안내" 배너로 사전 고지
   - 검증: 1.3.0 기존 사용자 디바이스에서 자동 재로그인 → 데이터 보존 확인

2. **푸시 알림 통합 흐름** (Phase 1-3 5건)
   - foreground 토스트 / native deep link / banner / prefs / 권한 타이밍
   - 검증: 실 Android 기기에서 좋아요·댓글 알림 받기 → 탭 → 해당 리뷰 열림

3. **사진 업로드 실패 처리** (P1-30)
   - 의도적으로 네트워크 끊고 사진 첨부 게시 → 6s 토스트 + "다시 시도" 버튼
   - 텍스트는 보존, 사진만 빠진 상태로 발행됨

4. **AI 30s timeout** (P1-33)
   - 인바디 사진 분석 호출 → 네트워크 의도적 지연 → 30s 후 "분석 시간 초과" 메시지

5. **a11y 변화** (Phase 1-5)
   - 시각 변화: 작은 칩/타임스탬프가 12px 로 커짐, 다크모드 텍스트 대비 ↑
   - 검증: 실기기에서 1.3.0 vs 1.4.0 비교 캡처 권장

6. **likePost optimistic toggle** (P1-39)
   - 빠른 더블탭 / 네트워크 실패 → rollback 동작 확인
   - 다른 4곳 (toggleFav 등)은 미마이그레이션 — 1.5.0 후보

---

## 사용자 후속 작업 (Production 배포 순서)

### 1. Supabase 마이그레이션 적용 (필수, 1회)
```
Dashboard → SQL Editor → supabase/migrations/20260428_user_ai_quota.sql 내용 복사 → Run
```

### 2. Edge Function 재배포 (필수)
```bash
cd ~/waylog
export SUPABASE_ACCESS_TOKEN=sbp_...

# claude: verify_jwt + 쿼터 정책 적용
npx supabase functions deploy claude

# send-push: sender 가드 + admin role 게이트 적용
npx supabase functions deploy send-push
```

⚠️ 1.3.0 까지 `--no-verify-jwt` 였던 함수는 이번 배포로 verify_jwt 가 다시 켜진다. 클라이언트 최신 버전 배포 전에 함수만 먼저 배포하면 1.3.0 클라이언트의 AI 호출이 401 거부될 수 있음 → **Vercel 배포와 거의 동시에**.

### 3. Vercel 배포 (자동)
```bash
git push origin main
```
Vercel 이 자동 빌드·배포 (~1분). 환경변수 변경 없음.

### 4. (선택) 운영 도메인 스모크 테스트
- `https://waylog1.vercel.app` 접속 → 자동 재로그인 (v4 마이그레이션 1회)
- 로그인 / 글 작성 / 좋아요 / 댓글 / 챌린지 미션 / 인바디 사진 분석 핵심 경로 점검

### 5. Android AAB 빌드 (Play Store)
**옵션 A: 태그 push (권장)**
```bash
git tag v1.4.0 && git push origin v1.4.0
```
GitHub Actions `Android Release AAB` 자동 실행 → Artifacts 탭에서 `app-release.aab` 다운로드.

**옵션 B: 수동 트리거**
GitHub repo → Actions 탭 → "Android Release AAB" → "Run workflow"

### 6. Play Console 업로드
1. Play Console → 웨이로그 앱 → Production (또는 Closed Testing)
2. "새 버전 만들기" → AAB 업로드 (versionCode 17)
3. 변경사항: 위 "Production 사용자용" 본문 복사
4. 검토 → 출시

### 7. 2~3일 dogfooding
- 본인 디바이스에서 1.4.0 사용
- 핵심 경로 + 신규 변경 영역 (특히 푸시·a11y·업로드 실패 시나리오)
- 회귀 발견 시 1.4.1 빠른 패치

---

## 1.5.0 후보 (확정 아님)

- useOptimisticToggle 나머지 4곳 마이그레이션 (toggleFav / toggleFollow / toggleCommentLike / toggleCommunityCommentLike)
- moderation Edge Function 단독 README
- CHALLENGE_MISSIONS DB 분리 (변경 빈도 데이터 수집 후)
- generateWithClaude AI 카피 활성화
- 디자인 토큰 정리 (`src/theme.js`)
- Production 사용자 분석 데이터(P1-40 events) 기반 1.5.0 우선순위 조정

---

## 검증

- `npm run build` ✅
- `npm run typecheck` ✅
- `npm test` 77/77 ✅
- `npm run lint` 0 errors / 43 warnings (사전 존재)
- `npx cap sync android` ✅

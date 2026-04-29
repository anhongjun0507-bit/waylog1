# 웨이로그 (Waylog)

개인 사용자를 위한 **라이프스타일 제품 리뷰 기록 앱** (비공식 독립 앱).

> ⚠️ **비공식 앱 공지**
> 웨이로그는 Amway Corp. / 암웨이 코리아와 관련이 없으며, 어떤 공식 지위나 후원도 받지 않습니다.
> 사용자가 자신이 사용한 제품의 후기를 개인적으로 기록할 수 있도록 돕는 비영리 도구입니다.
> 제품명, 상표, 이미지는 모두 해당 소유자의 것이며, 지명적 공정 사용(nominative fair use) 목적으로만 참조됩니다.
> 제품 구매는 반드시 [공식 사이트 amway.co.kr](https://www.amway.co.kr) 를 이용해주세요.

## 기술 스택

- React 18 + Vite 6
- Tailwind CSS
- Supabase (Auth, Database, Storage, Edge Functions)
- Firebase Cloud Messaging (1.2.0+ 푸시 알림)
- Capacitor 7 (Android 패키징)
- lucide-react (아이콘)

## 주요 기능

- 카테고리별 리뷰 (뉴트리션/웰니스/뷰티/퍼스널케어/홈리빙/원포원)
- 좋아요 + 무드 시스템
- 시그니처 카드 (주간 활동 요약)
- 커뮤니티 탭
- Today's Pick 캐러셀
- 제품 카탈로그 (518개 암웨이 제품)
- 8주 라이프스타일 챌린지 (인바디 사진 AI 분석, 일일 미션, AI 코칭)
- 푸시 알림 (좋아요·댓글·팔로우·챌린지 리마인더)
- 다크 모드 / PWA / 오프라인 동작

## 빠른 시작

```bash
npm install
cp .env.example .env       # Supabase / Firebase 키 입력
npm run dev                # http://localhost:5173
```

## 환경변수

`.env.example` 를 복사해 `.env` 로 만든 뒤 값을 채우세요. **클라이언트(브라우저)에 노출되는 값**입니다.

| 키 | 필수 | 설명 |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon (public) 키 |
| `VITE_FIREBASE_API_KEY` | 푸시 알림 사용 시 | Firebase Console → 프로젝트 설정 → 일반 → 웹 앱 SDK 설정 |
| `VITE_FIREBASE_AUTH_DOMAIN` | ↑ | 동일 SDK 설정 |
| `VITE_FIREBASE_PROJECT_ID` | ↑ | 동일 SDK 설정 |
| `VITE_FIREBASE_STORAGE_BUCKET` | ↑ | 동일 SDK 설정 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ↑ | 동일 SDK 설정 |
| `VITE_FIREBASE_APP_ID` | ↑ | 동일 SDK 설정 |
| `VITE_FIREBASE_VAPID_KEY` | ↑ | Cloud Messaging → 웹 푸시 인증서 (VAPID public key) |
| `VITE_MEDIA_BASE` | 선택 | 레거시 상대경로 이미지 CDN 접두 (현재 미사용) |
| `VITE_SHARE_ORIGIN` | 선택 | 시그니처 카드의 공유 URL origin override (Capacitor WebView 대응) |

> **서버 전용 secret 은 `.env` 에 두지 마세요** (브라우저 번들에 박힙니다).
> Anthropic API key, Firebase Service Account JSON, CRON_SECRET 등은 Supabase Edge Function secret 으로만 등록.
> 자세한 내용은 [`supabase/functions/README.md`](supabase/functions/README.md) 참조.

## 빌드 & 검증

```bash
npm run build          # Vite 프로덕션 빌드 (dist/)
npm run typecheck      # TypeScript --noEmit
npm test               # Vitest 단위 테스트
npm run lint           # ESLint
npm run dev            # 개발 서버 (HMR)
```

CI/PR 전에는 `npm run build && npm test && npm run lint` 모두 통과 확인.

## 배포 흐름

### 웹 (Vercel) — 자동
- `main` 브랜치에 push 하면 자동 배포
- Vercel 프로젝트 환경변수에 위 표의 모든 `VITE_*` 키 등록 필요
- 운영 도메인: `https://waylog1.vercel.app`
- `public/privacy.html`, `public/terms.html` 같이 호스팅됨

### Android (GitHub Actions) — 수동/태그 트리거
1. `.github/workflows/android-release.yml` — "Run workflow" 버튼 또는 `git tag v1.4.0 && git push origin v1.4.0`
2. 워크플로 종료 후 Artifacts 탭에서 `app-release-aab` 다운로드
3. `app-release.aab` 파일을 Play Console 에 업로드
4. 자세한 단계 + 필요한 GitHub Secrets 6개: [`ANDROID.md`](ANDROID.md)

> ⚠️ Sandbox/IDX 환경에서는 Android SDK 부재로 로컬 빌드 불가. GitHub Actions 사용.

### Supabase Edge Functions
4개 함수 (`claude`, `send-push`, `send-challenge-reminders`, `moderation`) 가 서버측 로직 담당.

```bash
# 1회 셋업
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>

# secret 등록 (1회 또는 키 로테이션 시)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat path/to/service-account.json)"
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)

# 코드 변경 후 배포 (개별 또는 전체)
supabase functions deploy claude
supabase functions deploy send-push
supabase functions deploy send-challenge-reminders
supabase functions deploy moderation
```

자세한 secret 의존성·트러블슈팅: [`supabase/functions/README.md`](supabase/functions/README.md)

### Supabase 마이그레이션 (DB 스키마)
새 마이그레이션 추가 시 **수동 적용**:

```bash
# 옵션 A: Supabase Dashboard SQL Editor 에 .sql 파일 내용 복사 → Run
# 옵션 B: supabase db push  (Free 플랜에서 일부 명령 실패 가능)
```

자세한 명명 규칙·기존 마이그레이션 목록: [`supabase/migrations/README.md`](supabase/migrations/README.md)

### GitHub Actions Cron (챌린지 리마인더)
`.github/workflows/challenge-reminder.yml` 가 매일 KST 19:00 (UTC 10:00) 에 `send-challenge-reminders` 함수 호출.
필요한 Repo Secrets: `SUPABASE_URL`, `CRON_SECRET` (Supabase secret 과 동일값).

## 코드 변경 → 운영 반영 단계

1. **로컬**: 코드 수정 → `npm run build && npm test && npm run lint` 통과
2. **DB 변경**: 새 마이그레이션이면 SQL Editor 또는 `supabase db push` 적용
3. **Edge Function 변경**: `supabase functions deploy <name>`
4. **클라이언트 코드**: `git push` → Vercel 자동 배포 (~1분)
5. **Android 변경**: GitHub Actions "Android Release AAB" 수동 실행 → AAB 다운로드 → Play Console 업로드

## 키 로테이션 (과거에 커밋/노출된 경우)

1. [Anthropic Console](https://console.anthropic.com/settings/keys) 에서 기존 키 revoke
2. 새 키 발급 후 `supabase secrets set ANTHROPIC_API_KEY=...` 로만 등록
3. Supabase anon 키도 과거 저장소에 노출됐다면 Dashboard → Project Settings → API 에서 재발급
4. Vercel + GitHub Repo Secrets + (있다면) Android keystore 의 동일 키 재등록

## 트러블슈팅

| 증상 | 원인 / 대응 |
|---|---|
| 로그인 후 피드 안 뜸 | DevTools Application → Local Storage → `sb-<ref>-auth-token` 존재 확인. 없으면 [`AUTH_CHANGES.md`](AUTH_CHANGES.md) v4 마이그레이션 참조 |
| Vercel 배포 후 401 | 환경변수 누락 — Vercel 프로젝트 Settings → Environment Variables 에 `VITE_*` 전체 등록 |
| Edge Function 401 `unauthorized` | 호출 측 Authorization 헤더 누락. supabase-js 가 자동 첨부하므로 보통 인증 세션 만료 |
| `relation "..." does not exist` | 마이그레이션 미적용 — `supabase/migrations/README.md` |
| Android 빌드 SDK location 에러 | Sandbox 환경 — GitHub Actions 사용 |
| 푸시 알림 미수신 | `notif_prefs` 테이블 + Firebase 토큰 등록 + 브라우저/디바이스 권한 확인 |

## 문서 인덱스

- [`ANDROID.md`](ANDROID.md) — Capacitor 셋업, Play Console 제출 가이드, GitHub Actions 빌드
- [`PLAY_STORE_LISTING.md`](PLAY_STORE_LISTING.md) — Play Console 입력란별 텍스트 + 사용자 결정 펜딩 항목
- [`AUTH_CHANGES.md`](AUTH_CHANGES.md) — 인증 키 마이그레이션 v3→v4 기록 (재발 시 참조)
- [`CLAUDE.md`](CLAUDE.md) — AI 협업 가이드 (보호 영역, 작업 규칙)
- [`docs/audit-2026-04-28.md`](docs/audit-2026-04-28.md) — 1.4.0 audit
- [`supabase/functions/README.md`](supabase/functions/README.md) — Edge Function 통합 배포 가이드
- [`supabase/migrations/README.md`](supabase/migrations/README.md) — 마이그레이션 적용 가이드
- 함수별 상세: [`supabase/functions/claude/README.md`](supabase/functions/claude/README.md), [`supabase/functions/send-push/README.md`](supabase/functions/send-push/README.md), [`supabase/functions/send-challenge-reminders/README.md`](supabase/functions/send-challenge-reminders/README.md)

## 패키지 정보

- 패키지명: `com.waylog.app`
- 앱 이름: "웨이로그" (`capacitor.config.json`)
- 운영 도메인: `https://waylog1.vercel.app`

# supabase/functions — Edge Function 배포 가이드

Waylog 의 서버측 로직 (Anthropic 키 격리, FCM 발송, 챌린지 cron, 모더레이션) 은
모두 Supabase Edge Function 으로 운영됩니다. 클라이언트 번들에 비밀이 들어가지 않습니다.

## 함수 목록

| 함수 | 용도 | verify_jwt | 의존 secret | 자세히 |
|---|---|---|---|---|
| `claude` | Anthropic API 프록시 (사용자별 일일 쿼터) | ✅ | `ANTHROPIC_API_KEY` | [claude/README.md](claude/README.md) |
| `send-push` | FCM HTTP v1 푸시 발송 | ✅ | `FIREBASE_SERVICE_ACCOUNT` | [send-push/README.md](send-push/README.md) |
| `send-challenge-reminders` | KST 19:00 챌린지 리마인더 (GitHub Actions cron) | ❌ (CRON_SECRET 헤더 자체검증, constant-time) | `CRON_SECRET` | [send-challenge-reminders/README.md](send-challenge-reminders/README.md) |
| `moderation` | 신고 큐 조회·해결 (admin 전용) | ✅ (admin role 체크) | — (자동주입 secret 만 사용) | (README 미작성, `index.ts` 주석 참조) |

> Supabase 가 자동 주입하는 secret: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. 따로 등록할 필요 없음.

## 사전 준비 (1회)

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인 + 프로젝트 링크
supabase login
supabase link --project-ref <your-project-ref>
```

## Secret 등록

각 secret 은 Supabase 프로젝트당 **한 번만** 등록하면 모든 함수에서 공유됩니다.
값 노출 위험 — 셸 히스토리에 남지 않도록 환경변수에서 읽거나 즉시 unset 권장.

```bash
# Anthropic API key (claude 함수 전용)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxx

# Firebase Service Account JSON (send-push 함수 전용) — JSON 통째로
supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat path/to/service-account.json)"

# Cron secret (send-challenge-reminders 함수 + GitHub Actions secret 동일값)
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)

# 등록 상태 확인
supabase secrets list
```

⚠️ `CRON_SECRET` 은 **반드시** GitHub Repo Secrets 의 `CRON_SECRET` 과 같은 값. 다르면 401.

## 전체 배포

```bash
# 개별 배포
supabase functions deploy claude
supabase functions deploy send-push
supabase functions deploy send-challenge-reminders   # ⚠️ verify_jwt=false (config.toml 설정 자동 반영)
supabase functions deploy moderation

# 또는 한 줄로 전부
for fn in claude send-push send-challenge-reminders moderation; do
  supabase functions deploy "$fn"
done
```

기본적으로 verify_jwt 가 켜집니다 (Authorization 헤더 필수).
**예외**: `send-challenge-reminders` 는 `supabase/config.toml` 의 `[functions.send-challenge-reminders]` 블록에서 `verify_jwt = false` 로 설정. cron 호출자가 사용자 JWT 없이 CRON_SECRET 헤더만 보내므로 platform 검증을 끄고 함수 본체에서 자체 인증.
구버전 CLI 가 config.toml 함수 블록을 무시한다면 `--no-verify-jwt` 옵션을 명시:
```bash
supabase functions deploy send-challenge-reminders --no-verify-jwt
```

## 배포 전 체크리스트

신규 환경에 처음 올릴 때:

- [ ] Supabase 프로젝트 생성 + ref 확인
- [ ] `supabase login` + `supabase link` 완료
- [ ] `ANTHROPIC_API_KEY` 등록 — Anthropic Console 에서 발급
- [ ] `FIREBASE_SERVICE_ACCOUNT` 등록 — Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키
- [ ] `CRON_SECRET` 등록 — `openssl rand -hex 32` 출력값
- [ ] GitHub Repo Secrets 에 동일 `CRON_SECRET` + `SUPABASE_URL` 등록
- [ ] `supabase/migrations/` 의 모든 SQL 적용 ([README](../migrations/README.md))
- [ ] 4개 함수 모두 `supabase functions deploy` 완료
- [ ] (선택) admin 계정 만들기: `auth.users.app_metadata.role = "admin"` 직접 update

## 신규 함수 추가 절차

1. `supabase/functions/<name>/index.ts` 작성 (Deno 런타임)
2. `<name>/README.md` 에 호출 방식·secret 의존성·트러블슈팅 정리
3. 이 README 의 "함수 목록" 표에 한 줄 추가
4. 필요한 secret 을 `supabase secrets set` 으로 등록
5. `supabase functions deploy <name>` 으로 배포
6. 클라이언트 호출 코드 작성 (`supabase.functions.invoke('<name>', ...)`)

## 트러블슈팅

| 증상 | 원인 / 대응 |
|---|---|
| 401 `unauthorized` | Authorization 헤더 누락 또는 토큰 만료 |
| 403 `forbidden` | admin 함수에 일반 user 접근 (moderation), 또는 self-push 차단 |
| 400 `cron_secret_not_configured` | Supabase secret 미등록 — `supabase secrets set CRON_SECRET=...` |
| 500 `internal` (claude) | `ANTHROPIC_API_KEY` 미등록 또는 만료 |
| 500 `internal` (send-push) | `FIREBASE_SERVICE_ACCOUNT` 형식 오류 — JSON 통째로 등록했는지 확인 |
| Function 배포 후 변경 미반영 | Edge Function 콜드스타트 — 1~2분 대기 또는 `supabase functions deploy <name>` 재실행 |

## 모니터링

Supabase Dashboard → Edge Functions → 함수 선택 → Logs 탭에서 실시간 로그.
운영 중 에러 패턴 모니터링은 여기서. 클라이언트는 `data.error` 분기로 사용자 안내.

# send-challenge-reminders Edge Function

Waylog 1.2.0 챌린지 일일 리마인더 — **GitHub Actions cron** 으로 매일 KST 19:00 (UTC 10:00) 트리거.

## 호출 흐름

```
GitHub Actions cron (UTC 10:00 = KST 19:00 매일)
  └ .github/workflows/challenge-reminder.yml
  └→ POST /functions/v1/send-challenge-reminders   (이 Edge Function)
     └ CRON_SECRET 검증
     └ 활성 사용자 중 오늘 미기록 사용자 추출
     └ 각자에게 send-push 호출 (병렬)
```

## 왜 GitHub Actions cron?

Vercel Hobby (Free) 플랜은 cron 일일 1회 + UTC 00:00 고정 → 한국 19:00 (UTC 10:00) 발송 불가.
GitHub Actions cron 은 무료 + 임의 시간 가능 (단, best-effort 라 5~15분 지연 가능).

## 활성 사용자 정의

- 최근 7일 내 `challenge_logs` 에 row 가 있는 user_id (= 챌린지 진행 중)
- AND 오늘 (KST `day_key`) row 가 없음 (= 아직 기록 안 함)

## 환경변수 등록 (사용자 작업)

### GitHub Repo Secrets
**Repo → Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `CRON_SECRET` | 랜덤 32자+ 문자열 |

### Supabase secrets
```bash
export SUPABASE_ACCESS_TOKEN=<your-token>
cd /home/user/waylog
npx supabase secrets set CRON_SECRET=<위와 동일한 값>
```

⚠️ GitHub Secrets 의 `CRON_SECRET` 과 Supabase secret 의 `CRON_SECRET` 은 **반드시 동일한 값**.

## 배포

```bash
npx supabase functions deploy send-challenge-reminders
```

(verify_jwt 기본 true. 함수 내부에서 CRON_SECRET 헤더로 자체 인증.)

## 수동 테스트

### A. GitHub Actions 수동 트리거 (가장 쉬움)
GitHub repo → Actions 탭 → "Challenge Reminder" → "Run workflow" 버튼.
실행 결과는 같은 페이지의 logs 에서 응답 body 확인 가능.

### B. curl 로 Edge Function 직접
```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$SUPABASE_URL/functions/v1/send-challenge-reminders"
```

기대 응답:
```json
{ "ok": true, "active": 3, "target": 1, "sent": 1, "failed": 0 }
```
- `active`: 최근 7일 내 챌린지 기록 있는 사용자 수
- `target`: 그 중 오늘 미기록 (= 리마인더 대상)
- `sent`: send-push 성공 호출 수
- `failed`: send-push 실패 호출 수

## Cron 표현식 변경

`.github/workflows/challenge-reminder.yml` 의 `schedule.cron` 만 수정:
```yaml
- cron: '0 10 * * *'   # 매일 KST 19:00 (현재)
- cron: '0 11 * * *'   # 매일 KST 20:00
- cron: '0 22 * * *'   # 매일 KST 07:00
```

GitHub Actions cron 은 UTC 기준. KST = UTC + 9.

## 트러블슈팅

| 응답 | 원인 |
|---|---|
| `cron_secret_not_configured` | Supabase secret 미등록 |
| `unauthorized` | GitHub Secrets 의 CRON_SECRET 과 Supabase 의 CRON_SECRET 불일치 |
| `supabase_not_configured` | SUPABASE_URL/SERVICE_ROLE_KEY 자동 주입 실패 (정상이면 자동) |
| `active_fetch_failed` | challenge_logs 테이블 접근 실패 (RLS/스키마) |
| GitHub Actions 워크플로 실패 | logs 확인 — 보통 secret 미설정 |

## 보안 메모

- `CRON_SECRET` 이 일치하지 않는 호출은 401 반환 (Edge Function 측 검증)
- Edge Function 내부에서 `send-push` 는 `SUPABASE_SERVICE_ROLE_KEY` 로 호출 (verify_jwt 우회)
- 100명 이하 활성 사용자 가정 — Promise.allSettled 병렬 발송. 더 많아지면 chunk 처리 권장

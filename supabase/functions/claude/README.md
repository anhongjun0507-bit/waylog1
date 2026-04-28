# Claude Edge Function

브라우저에 `ANTHROPIC_API_KEY` 가 노출되지 않도록 Supabase Edge Function 이 프록시 역할.

## 1.4.0 보안 변경

- **verify_jwt 강제** — 익명 호출 차단. 1.3.0 까지 `--no-verify-jwt` 였으나 abuse 위험 (P0-1).
- **사용자별 일일 쿼터** — `user_ai_quota` 테이블 + `DAILY_CAP = 50/day` (vision + text 합산).
- **IP rate limit 제거** — in-process Map 이라 콜드스타트마다 초기화·`x-forwarded-for` 신뢰 → 무력했음.

## 최초 배포

```bash
# 1) Supabase CLI 로그인 + 프로젝트 링크 (이미 됐으면 생략)
supabase login
supabase link --project-ref <your-project-ref>

# 2) 비밀키 등록 (서버 전용, VITE_ 접두어 없음)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxx

# 3) 마이그레이션 적용 — user_ai_quota 테이블 필요
#    Supabase Dashboard → SQL Editor 또는 supabase db push
#    → supabase/migrations/20260428_user_ai_quota.sql

# 4) 함수 배포 (verify_jwt 기본 true — 익명 차단)
supabase functions deploy claude
```

⚠️ 1.3.0 까지 `--no-verify-jwt` 였다면 그 플래그 제거하고 다시 배포해야 한다.
   기존 배포 위에 그냥 `supabase functions deploy claude` 만 하면 verify_jwt 가 다시 켜진다.

## 호출 방식

클라이언트:
```js
await supabase.functions.invoke('claude', { body: { prompt, max_tokens } })
// supabase-js 가 user JWT 를 Authorization 헤더에 자동 첨부
```

응답:
```json
{ "ok": true, "text": "...", "raw": { ...anthropic raw... } }
```

## 쿼터 초과

```json
{ "error": "quota_exceeded", "message": "오늘 AI 호출 한도(50회) 를 초과했어요...", "cap": 50, "used": 50 }
```
- HTTP 429.
- 클라이언트는 `data?.error === "quota_exceeded"` 로 분기해 사용자 안내.
- 카운트는 UTC 자정 기준으로 새 row → 한국 사용자 체감상 09:00 KST 리셋.

## 인증 실패

| 상태 | 의미 |
|---|---|
| 401 `unauthorized` | Authorization 헤더 없음 또는 형식 오류 |
| 401 `invalid_token` | JWT decode 실패 또는 만료 |

## 쿼터 변경

`DAILY_CAP` 상수 (index.ts) 와 마이그레이션 주석 둘 다 갱신.
운영 모니터링: `select date, count from user_ai_quota where user_id = ? order by date desc limit 30;`

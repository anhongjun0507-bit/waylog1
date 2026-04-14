# Claude Edge Function

브라우저에 `ANTHROPIC_API_KEY`가 노출되지 않도록 Supabase Edge Function이 프록시 역할을 한다.

## 최초 배포

```bash
# 1) Supabase CLI 로그인
supabase login

# 2) 프로젝트 링크 (이미 연결되어 있으면 생략)
supabase link --project-ref <your-project-ref>

# 3) 비밀키 등록 (VITE_ 접두어 없음 — 서버 전용)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxx

# 4) 함수 배포
supabase functions deploy claude --no-verify-jwt
```

## 호출 방식

클라이언트는 `supabase.functions.invoke('claude', { body: { prompt, max_tokens } })` 로 호출한다.
응답은 `{ ok: boolean, text: string, raw: {...} }` 형태.

## 레이트리밋

IP 단위 60초당 20회. 필요 시 `RATE_MAX` / `RATE_WINDOW_MS` 상수 조정.

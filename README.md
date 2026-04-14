# 웨이로그 (Waylog)

암웨이 ABO 커뮤니티를 위한 라이프스타일 리뷰 앱

## 기술 스택

- React 18 + Vite
- Tailwind CSS
- Supabase (Auth, Database, Storage)
- lucide-react
- Firebase Studio로 개발

## 주요 기능

- 카테고리별 리뷰 (뉴트리션/웰니스/뷰티/퍼스널케어/홈리빙/원포원)
- 좋아요 + 무드 시스템
- 시그니처 카드 (주간 활동 요약)
- 커뮤니티 탭
- Today's Pick 캐러셀
- 제품 카탈로그 (518개 암웨이 제품)
- 다크 모드
- PWA 지원

## 개발

```bash
npm install
npm run dev
```

## 환경변수

`.env.example` 를 복사해 `.env` 로 만든 뒤 값을 채우세요:

```bash
cp .env.example .env
```

필요한 값:

- `VITE_SUPABASE_URL` — Supabase 프로젝트 URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon (public) 키

> **Anthropic API 키는 `.env`에 두지 마세요.**
> 브라우저에 번들되면 유출 위험이 있습니다. 대신 Supabase Edge Function 비밀로 등록합니다:
>
> ```bash
> supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
> supabase functions deploy claude --no-verify-jwt
> ```
>
> 자세한 배포 절차: [`supabase/functions/claude/README.md`](supabase/functions/claude/README.md)

### 키 로테이션 (과거에 커밋/노출된 경우)

1. [Anthropic Console](https://console.anthropic.com/settings/keys) 에서 기존 키 revoke
2. 새 키 발급 후 `supabase secrets set ANTHROPIC_API_KEY=...` 로만 등록
3. Supabase anon 키도 과거 저장소에 노출됐다면 Dashboard → Project Settings → API 에서 재발급

## 배포

Vercel로 자동 배포됩니다. Vercel 프로젝트 환경변수에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 를 설정해야 합니다 (Anthropic 키는 설정하지 않습니다).

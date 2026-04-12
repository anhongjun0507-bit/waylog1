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

`.env` 파일을 생성하고 다음 변수를 설정하세요:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 배포

Vercel로 자동 배포됩니다.

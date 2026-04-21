export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Threads/오늘의집 — 산세리프 하나로 깔끔하게
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'Segoe UI', 'sans-serif'],
        // 히어로·시그니처·페이지 타이틀 한정 (29CM 감각). 본문/버튼에는 사용 금지.
        serif: ['"Noto Serif KR"', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        // ===== 브랜드 (2026-04-21) — Blue =====
        // CTA/링크/포커스/활성 탭 등 기본 강조. H≈208° 고정, L 단조 감소 10단계.
        // chip 표준 조합: bg-brand-50/text-brand-700 (라이트), bg-brand-900/40 + text-brand-200 (다크).
        brand: {
          50:  '#EBF4FB',
          100: '#CEE4F4',
          200: '#9ECAEA',
          300: '#66ACDF',
          400: '#338FD6',
          500: '#0071CE', // 브랜드 기준
          600: '#005BA5', // hover / pressed
          700: '#00447C', // 라이트모드 텍스트 강조·chip 텍스트
          800: '#002E53',
          900: '#001829',
          DEFAULT: '#0071CE',
        },
        // 포인트 액센트 — 좋아요 하트·시그니처 포인트 등 제한적 사용.
        accent: {
          50:  '#FBF1ED',
          100: '#F5DCD1',
          200: '#EFC4B2',
          300: '#EDA890',
          400: '#E68E71',
          500: '#E07856', // 기본
          600: '#C25E3E',
          700: '#A4513A',
          800: '#6B3524',
          900: '#391C13',
          DEFAULT: '#E07856',
        },
        // 중성 그레이스케일 — 살짝 웜톤(H≈40°). 순백/순흑 회피.
        ink: {
          50:  '#FAFAF9',
          100: '#F4F3F1',
          200: '#E7E5E0',
          300: '#D3D0C9', // divider
          400: '#A8A49B', // placeholder
          500: '#7A766C', // secondary text
          600: '#595650', // body text (light mode)
          700: '#3D3B36',
          800: '#26241F', // heading
          900: '#1A1815', // 순검정 대체
        },
        // Semantic — 채도 낮게, 배경/텍스트 쌍으로 제공.
        success: { DEFAULT: '#5A8A6B', bg: '#EDF3EF', text: '#3B6A4C' },
        warning: { DEFAULT: '#C78F3A', bg: '#FAF2E3', text: '#8A621F' },
        error:   { DEFAULT: '#B04A3E', bg: '#F9EAE7', text: '#7F3127' },
        info:    { DEFAULT: '#4A6B85', bg: '#EDF2F6', text: '#2F495F' },
        // 카테고리 — 6종 단색(그라디언트 금지). constants.js 리팩토링은 3단계.
        cat: {
          food:     '#C68B3E',
          wellness: '#7D6A9E',
          beauty:   '#B86B7A',
          kitchen:  '#9A7B8C',
          home:     '#6B8AA8',
          one4one:  '#6F8E6A',
        },

        // ===== 레거시 (2단계에서 참조 이전 후 제거 예정) =====
        canvas: {
          light: '#ffffff',
          dark:  '#000000',
        },
        surface: {
          light: '#ffffff',
          dark:  '#000000',
          muted: '#fafafa',
          mutedDark: '#121212',
          elevated: '#ffffff',
          elevatedDark: '#18181b',
        },
        carbon: {
          DEFAULT: '#000000',
          muted:   '#737373',
          faint:   '#c7c7c7',
          darkDefault: '#ffffff',
          darkMuted:   '#a8a8a8',
          darkFaint:   '#737373',
        },
        hairline: {
          DEFAULT: '#dbdbdb',
          dark:    '#262626',
        },
        // 레거시 민트 — 2단계 완료 후 제거.
        mint: {
          50:  '#e6faf6',
          100: '#ccf5ed',
          200: '#99ebdb',
          300: '#66e0c9',
          400: '#33d6b7',
          500: '#00C9A7',
          600: '#00a088',
          700: '#007866',
          800: '#005044',
          900: '#002822',
        },
      },
      fontSize: {
        // ===== DS 리뉴얼 타이포 계단 (mobile 기준) =====
        // 본문 15px (접근성 하한), 제목 계단 32/26/21/17.
        display:    ['2rem',      { lineHeight: '1.25', fontWeight: '400', letterSpacing: '-0.02em' }],  // 32px (serif)
        h1:         ['1.625rem',  { lineHeight: '1.3',  fontWeight: '700', letterSpacing: '-0.02em' }],  // 26px
        h2:         ['1.3125rem', { lineHeight: '1.35', fontWeight: '700', letterSpacing: '-0.015em' }], // 21px
        h3:         ['1.0625rem', { lineHeight: '1.4',  fontWeight: '600', letterSpacing: '-0.01em' }],  // 17px
        body:       ['0.9375rem', { lineHeight: '1.6',  fontWeight: '400' }],                            // 15px
        bodyStrong: ['0.9375rem', { lineHeight: '1.6',  fontWeight: '600' }],                            // 15px
        caption:    ['0.8125rem', { lineHeight: '1.5',  fontWeight: '500' }],                            // 13px
        micro:      ['0.6875rem', { lineHeight: '1.4',  fontWeight: '500' }],                            // 11px
        // 레거시 — 실사용 없음 확인. 2단계에서 삭제.
        heading:  ['1.125rem', { lineHeight: '1.3', fontWeight: '800', letterSpacing: '-0.02em' }],
        subtitle: ['1rem',     { lineHeight: '1.4', fontWeight: '700', letterSpacing: '-0.01em' }],
        cta:      ['0.875rem', { lineHeight: '1',   fontWeight: '900' }],
      },
      borderRadius: {
        card: '12px',
        btn:  '8px',
      },
      minHeight: {
        tap: '48px', // 최소 터치 타겟 (Material)
      },
      minWidth: {
        tap: '48px',
      },
      spacing: {
        screen: '20px', // 화면 좌우 패딩 표준
      },
    },
  },
  plugins: [],
}

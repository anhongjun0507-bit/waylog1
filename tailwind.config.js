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
      },
      colors: {
        // Canvas — IG 순백/순흑
        canvas: {
          light: '#ffffff',
          dark:  '#000000',
        },
        // Surface (modal/sheet/chip)
        surface: {
          light: '#ffffff',
          dark:  '#000000',
          muted: '#fafafa',
          mutedDark: '#121212',
          elevated: '#ffffff',
          elevatedDark: '#18181b',
        },
        // Text
        carbon: {
          DEFAULT: '#000000',
          muted:   '#737373',
          faint:   '#c7c7c7',
          darkDefault: '#ffffff',
          darkMuted:   '#a8a8a8',
          darkFaint:   '#737373',
        },
        hairline: {
          DEFAULT: '#dbdbdb',   // IG 정확한 divider
          dark:    '#262626',
        },
        // 브랜드 민트 — 주요 CTA, 링크, 액션 (#00C9A7 기준 팔레트)
        // 텍스트 용도는 mint-700 (5.4:1 대비, WCAG AA 통과), 버튼 배경은 mint-500
        mint: {
          50:  '#e6faf6',
          100: '#ccf5ed',
          200: '#99ebdb',
          300: '#66e0c9',
          400: '#33d6b7',
          500: '#00C9A7',   // 브랜드 — 버튼 배경, 아이콘
          600: '#00a088',   // hover, 진한 액센트
          700: '#007866',   // 라이트모드 텍스트
          800: '#005044',
          900: '#002822',
        },
      },
      fontSize: {
        heading: ['1.125rem', { lineHeight: '1.3', fontWeight: '800', letterSpacing: '-0.02em' }],
        subtitle: ['1rem', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '-0.01em' }],
        body: ['0.875rem', { lineHeight: '1.6', fontWeight: '500' }],
        caption: ['0.75rem', { lineHeight: '1.5', fontWeight: '600' }],
        cta: ['0.875rem', { lineHeight: '1', fontWeight: '900' }],
      },
    },
  },
  plugins: [],
}

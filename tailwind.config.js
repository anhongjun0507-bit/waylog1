export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'Segoe UI', 'sans-serif']
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

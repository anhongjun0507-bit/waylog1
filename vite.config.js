import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE: 이전 버전은 /api/claude 를 Anthropic으로 직접 프록시하며
// VITE_ANTHROPIC_API_KEY 를 dev 서버 헤더에 주입했다. 그 키는 dev 서버가
// host: true 로 외부에 열려 있을 때 유출 위험이 있으므로 제거됐다.
// Claude 호출은 supabase/functions/claude (Edge Function)을 통해 이뤄진다.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // 메인 번들이 커서 (600KB+) 초기 파싱이 지연됨.
    // 자주 변하지 않는 라이브러리들을 별도 청크로 분리하면
    // 앱 코드 수정 시에도 vendor 청크는 브라우저 캐시가 유지된다.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('html-to-image')) return 'html-to-image';
          if (id.includes('react-dom')) return 'react-dom';
          if (id.includes('/react/') || id.endsWith('/react')) return 'react';
          // firebase 는 1.2.0 푸시 전용 — 사용자가 푸시 켜는 시점에만 로드되도록 분리
          if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
          return 'vendor';
        },
      },
    },
    // 500KB 경고 완화 — main 은 이미 분리됨
    chunkSizeWarningLimit: 700,
  },
})

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './supabase.js'
import './storage-shim.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Service Worker 등록 (프로덕션 빌드에서만)
// 새 버전(waiting SW)이 발견되면 window 에 커스텀 이벤트를 발생시켜
// 앱 UI(예: 토스트)에서 사용자에게 리로드를 안내할 수 있다.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')

      const notify = () => window.dispatchEvent(new CustomEvent('waylog:sw-update', { detail: { reg } }))

      // 이미 대기 중인 SW 가 있으면 즉시 알림
      if (reg.waiting) notify()

      // 업데이트 발견 → 설치 완료까지 감시
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing
        if (!newSW) return
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            notify()
          }
        })
      })

      // 활성화된 SW 가 교체되면 페이지 리로드 (한 번만)
      let reloading = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return
        reloading = true
        window.location.reload()
      })
    } catch (err) {
      console.warn('SW 등록 실패:', err)
    }
  })
}

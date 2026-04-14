import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './supabase.js'
import './storage-shim.js'
import { isNative, initNativeChrome, initDeepLinkHandler } from './utils/platform.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// 네이티브(Capacitor) 초기화 — 웹에서는 no-op
if (isNative()) {
  // 초기 다크모드 상태는 localStorage 에서 가져와 상태바 톤 맞춤
  let dark = false
  try { dark = JSON.parse(localStorage.getItem('waylog:dark') || 'false') } catch {}
  initNativeChrome(dark)
  initDeepLinkHandler()
}

// Service Worker 등록 — 웹 프로덕션에서만. 네이티브에서는 Capacitor 가 HTTP 캐시 제공.
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative()) {
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

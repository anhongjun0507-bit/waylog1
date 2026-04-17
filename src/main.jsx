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
  // 구버전 캐시 즉시 정리 — SW activate 전에도 클라이언트에서 선제 삭제
  if ('caches' in window) {
    caches.keys().then((names) =>
      names.filter((n) => !n.startsWith('waylog-v3')).forEach((n) => caches.delete(n))
    ).catch(() => {})
  }

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')

      // 대기 중인 새 SW가 있으면 즉시 활성화 요청
      if (reg.waiting) {
        reg.waiting.postMessage('SKIP_WAITING')
      }

      const notify = () => window.dispatchEvent(new CustomEvent('waylog:sw-update', { detail: { reg } }))

      // 업데이트 발견 → 설치 완료까지 감시
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing
        if (!newSW) return
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // 새 SW 설치됨 → 즉시 활성화 요청
            newSW.postMessage('SKIP_WAITING')
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

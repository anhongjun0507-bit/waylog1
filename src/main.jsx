import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import './supabase.js'
import './storage-shim.js'
import { isNative, initNativeChrome, initDeepLinkHandler } from './utils/platform.js'

// 커뮤니티 샘플 데이터 1회성 정리 — 기존 사용자 브라우저에 저장된 기본 4개 포스트 제거.
// 버전 키로 한 번만 실행. 새 버전으로 올리면 다시 실행.
try {
  const VER = 1
  const cur = +(localStorage.getItem('waylog:community-clean-ver') || 0)
  if (cur < VER) {
    ;(async () => {
      try {
        await window.storage?.delete?.('waylog:community')
        await window.storage?.delete?.('waylog:communityComments')
        localStorage.setItem('waylog:community-clean-ver', String(VER))
      } catch {}
    })()
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
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

// SW 정리 — 기존 SW가 남아있으면 해제하고 캐시 삭제.
// 새 sw.js(자폭형)가 알아서 처리하지만, 이중 안전장치.
if ('serviceWorker' in navigator && !isNative()) {
  navigator.serviceWorker.getRegistrations().then((regs) =>
    regs.forEach((r) => r.unregister())
  ).catch(() => {})
  if ('caches' in window) {
    caches.keys().then((names) =>
      Promise.all(names.map((n) => caches.delete(n)))
    ).catch(() => {})
  }
}

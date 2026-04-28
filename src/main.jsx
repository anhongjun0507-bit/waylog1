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
    // ASI 방어용 leading semicolon — eslint 기본룰과 충돌하나 안전 패턴 유지.
    // eslint-disable-next-line no-extra-semi
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

// SW 정리 — 1.0.x 잘못 등록된 SW 정리 (index.html 자폭 스크립트의 이중 안전장치).
// 주의: firebase-messaging-sw.js 는 보존해야 웹 백그라운드 푸시 가능 (audit P0-6).
if ('serviceWorker' in navigator && !isNative()) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => {
      const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || ''
      if (url.includes('firebase-messaging-sw')) return
      r.unregister()
    })
  }).catch(() => {})
  // caches 는 그대로 — firebase-messaging-sw 는 cache 미사용.
  if ('caches' in window) {
    caches.keys().then((names) =>
      Promise.all(names.map((n) => caches.delete(n)))
    ).catch(() => {})
  }
}

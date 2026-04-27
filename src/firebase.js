// Firebase Web SDK 초기화 — 푸시 알림(FCM Web) 전용.
// 인증/Firestore 등 다른 서비스는 사용하지 않음 (Supabase 가 메인 백엔드).
//
// 환경변수 (Vercel 측에 등록):
//   VITE_FIREBASE_API_KEY
//   VITE_FIREBASE_AUTH_DOMAIN
//   VITE_FIREBASE_PROJECT_ID
//   VITE_FIREBASE_STORAGE_BUCKET
//   VITE_FIREBASE_MESSAGING_SENDER_ID
//   VITE_FIREBASE_APP_ID
//   VITE_FIREBASE_VAPID_KEY  ← FCM Web Push VAPID public key
//
// 모든 키 미설정 시 안전하게 비활성화 (앱은 정상 동작, 푸시만 disabled).

import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let _app = null;
export function getFirebaseApp() {
  if (!isConfigured) return null;
  if (_app) return _app;
  _app = getApps()[0] || initializeApp(firebaseConfig);
  return _app;
}

// FCM messaging 인스턴스. 환경(브라우저 지원, 설정) 미충족 시 null.
let _messaging = null;
let _supportChecked = false;
export async function getFirebaseMessaging() {
  if (typeof window === "undefined") return null;
  if (!isConfigured) return null;
  if (!_supportChecked) {
    _supportChecked = true;
    try {
      const supported = await isSupported();
      if (!supported) return null;
    } catch { return null; }
  }
  if (_messaging) return _messaging;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    _messaging = getMessaging(app);
    return _messaging;
  } catch (e) {
    console.warn("Firebase messaging init failed:", e);
    return null;
  }
}

// 등록된 firebase-messaging-sw.js 의 ServiceWorkerRegistration 을 반환.
// SW 가 firebaseConfig 를 알아야 onBackgroundMessage 가 동작하므로,
// register 시 query string 으로 config 를 전달한다 (빌드 단계 치환 불요).
export async function registerFirebaseSW() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  if (!isConfigured) return null;
  try {
    const params = new URLSearchParams({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });
    return await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${params.toString()}`,
      { scope: "/" }
    );
  } catch (e) {
    console.warn("firebase-messaging-sw 등록 실패:", e);
    return null;
  }
}

export { getToken, onMessage };

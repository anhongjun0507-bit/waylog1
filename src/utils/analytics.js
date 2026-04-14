// 경량 분석 계측 — 로컬 세션ID + Supabase analytics_events 테이블 적재.
// 외부(PostHog/Amplitude) 로 확장하고 싶으면 `track()` 에서 추가 dispatch.
//
// 사용법:
//   import { track, identify } from "./utils/analytics.js";
//   track("review_opened", { reviewId, category });
//   identify(user.id, { nickname: user.nickname });

import { analytics as supabaseAnalytics } from "../supabase.js";

const SESSION_KEY = "waylog:analytics:sid";
let _sessionId = null;
let _userId = null;

function getSessionId() {
  if (_sessionId) return _sessionId;
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, s);
    }
    _sessionId = s;
  } catch {
    _sessionId = `fallback-${Date.now()}`;
  }
  return _sessionId;
}

export function identify(userId, _traits = {}) {
  _userId = userId || null;
}

// 이벤트 송출은 best-effort — 실패해도 앱 흐름을 막지 않는다.
const _queue = [];
let _flushing = false;

export function track(event, properties = {}) {
  if (!event) return;
  _queue.push({
    event,
    properties,
    userId: _userId,
    sessionId: getSessionId(),
    ts: Date.now(),
  });
  if (!_flushing) scheduleFlush();
}

function scheduleFlush() {
  _flushing = true;
  // 작은 배치로 전송. 실패한 이벤트는 큐에 되돌려 다음 시도 때 재송신.
  // 지수 백오프: 연속 실패 시 최대 30초까지 지연.
  setTimeout(async () => {
    const batch = _queue.splice(0, 20);
    const failed = [];
    for (const e of batch) {
      try {
        const { error } = await supabaseAnalytics.track(e.event, e.properties, e.userId, e.sessionId) || {};
        if (error) failed.push(e);
      } catch {
        failed.push(e);
      }
    }
    if (failed.length) {
      _queue.unshift(...failed);
      _failCount = Math.min((_failCount || 0) + 1, 6);
    } else {
      _failCount = 0;
    }
    _flushing = false;
    if (_queue.length) scheduleFlush();
  }, nextDelay());
}

let _failCount = 0;
function nextDelay() {
  if (!_failCount) return 500;
  // 500 → 1s → 2s → 4s → 8s → 16s → 30s 상한
  return Math.min(500 * Math.pow(2, _failCount), 30_000);
}

// 편의 API
const APP_OPEN_SESSION_KEY = "waylog:analytics:opened";
export const events = {
  // StrictMode / HMR / 다중 탭에서도 세션당 1회만 fire
  appOpen: () => {
    try {
      if (sessionStorage.getItem(APP_OPEN_SESSION_KEY)) return;
      sessionStorage.setItem(APP_OPEN_SESSION_KEY, "1");
    } catch { /* sessionStorage 미사용 환경이면 매번 track */ }
    track("app_open");
  },
  reviewOpened: (reviewId, category) => track("review_opened", { reviewId, category }),
  reviewCreated: (category) => track("review_created", { category }),
  commentAdded: (reviewId) => track("comment_added", { reviewId }),
  favToggled: (reviewId, added) => track("fav_toggled", { reviewId, added }),
  challengeStarted: () => track("challenge_started"),
  missionCompleted: (missionId) => track("mission_completed", { missionId }),
  search: (query, resultCount) => track("search", { query: query?.slice(0, 40), resultCount }),
  authSignup: () => track("auth_signup"),
  authLogin: () => track("auth_login"),
  authLogout: () => track("auth_logout"),
};

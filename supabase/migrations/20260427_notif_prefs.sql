-- Waylog 1.2.0 — 알림 종류별 토글 (notif_prefs) + 알림 발송 일원화
--
-- 목적
--   1) profiles 에 notif_prefs jsonb 추가. send-push Edge Function 이 발송 전 체크.
--   2) 1.0.6 의 follows/reviews DB 트리거(인앱 알림만 생성) 를 비활성화.
--      1.2.0 부터 모든 알림(인앱 + 푸시) 은 send-push Edge Function 이 일원화.
--      DB 트리거를 유지하면 인앱 알림이 중복 생성됨.
--      함수는 보존 (다른 곳에서 참조 가능, 향후 재활성화 옵션).

-- ============================================================================
-- 1. profiles.notif_prefs jsonb
-- ============================================================================
alter table public.profiles
  add column if not exists notif_prefs jsonb not null default '{
    "likes": true,
    "comments": true,
    "follows": true,
    "challenge": true,
    "news": true
  }'::jsonb;

comment on column public.profiles.notif_prefs is
  '1.2.0 alarm preferences: likes, comments, follows, challenge, news (boolean each)';

-- ============================================================================
-- 2. 기존 DB 트리거 제거 (인앱 알림은 send-push Edge Function 으로 통일)
-- ============================================================================
drop trigger if exists trg_notify_on_follow on public.follows;
drop trigger if exists trg_notify_followers_on_new_review on public.reviews;
-- 함수 자체는 보존: notify_on_follow, notify_followers_on_new_review

-- Waylog — #41 푸시 구독 + #42 신고/모더레이션 큐

-- ============================================================================
-- push_subscriptions — 사용자 기기별 Web Push 엔드포인트
-- ============================================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_sub rw own" on public.push_subscriptions;
create policy "push_sub rw own"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- reports — 사용자 신고(리뷰/댓글/사용자). 관리자가 status 로 처리.
-- ============================================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete set null,
  target_type text not null,                -- 'review' | 'comment' | 'user'
  target_id text not null,                  -- 대상 UUID 또는 숫자 ID
  reason text not null,                     -- 'spam' | 'abuse' | 'inappropriate' | ...
  detail text,
  status text not null default 'pending',   -- 'pending' | 'reviewing' | 'resolved' | 'rejected'
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_target_idx on public.reports (target_type, target_id);

alter table public.reports enable row level security;

-- 사용자는 자기 신고 조회 + 생성만 가능
drop policy if exists "reports insert own" on public.reports;
create policy "reports insert own"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "reports select own" on public.reports;
create policy "reports select own"
  on public.reports for select
  using (auth.uid() = reporter_id);

-- 관리자 권한은 app_metadata.role = 'admin' 으로 가정.
-- 관리자 전체 조회/업데이트는 service_role 키로 Edge Function 에서 처리 권장.

-- ============================================================================
-- analytics_events — 제품 분석 이벤트 적재 (#43)
-- 클라이언트에서 insert, 관리자 대시보드에서 aggregate.
-- ============================================================================
create table if not exists public.analytics_events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  properties jsonb not null default '{}'::jsonb,
  session_id text,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_event_idx on public.analytics_events (event, created_at desc);
create index if not exists analytics_events_user_idx on public.analytics_events (user_id, created_at desc);

alter table public.analytics_events enable row level security;

-- 사용자는 insert만 가능 (자기 자신 또는 anon)
drop policy if exists "analytics insert any" on public.analytics_events;
create policy "analytics insert any"
  on public.analytics_events for insert
  with check (user_id is null or auth.uid() = user_id);

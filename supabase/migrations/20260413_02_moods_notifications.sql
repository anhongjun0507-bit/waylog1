-- Waylog — 사용자 mood 반응 + 알림 서버 저장

-- ============================================================================
-- user_moods — 리뷰별 사용자 반응 (love/wow/try/meh...)
-- ============================================================================
create table if not exists public.user_moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id text not null,          -- 로컬 시드 ID 호환을 위해 text
  mood text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, review_id)
);
create index if not exists user_moods_user_idx on public.user_moods (user_id);

alter table public.user_moods enable row level security;

drop policy if exists "user_moods rw own" on public.user_moods;
create policy "user_moods rw own"
  on public.user_moods for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- notifications — 사용자 알림 로그
-- ============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications select own" on public.notifications;
create policy "notifications select own"
  on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "notifications insert own" on public.notifications;
create policy "notifications insert own"
  on public.notifications for insert with check (auth.uid() = user_id);

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own"
  on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications delete own" on public.notifications;
create policy "notifications delete own"
  on public.notifications for delete using (auth.uid() = user_id);

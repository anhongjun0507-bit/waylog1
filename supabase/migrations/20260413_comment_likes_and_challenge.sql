-- Waylog — 댓글 좋아요 + 챌린지 데이터 동기화 스키마
-- 배포: supabase db push  (또는 SQL Editor에서 실행)

-- ============================================================================
-- 1. comment_likes — 댓글별 좋아요 (user×comment unique)
-- ============================================================================
create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, comment_id)
);

create index if not exists comment_likes_comment_id_idx
  on public.comment_likes (comment_id);

alter table public.comment_likes enable row level security;

drop policy if exists "comment_likes read all" on public.comment_likes;
create policy "comment_likes read all"
  on public.comment_likes for select
  using (true);

drop policy if exists "comment_likes insert own" on public.comment_likes;
create policy "comment_likes insert own"
  on public.comment_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "comment_likes delete own" on public.comment_likes;
create policy "comment_likes delete own"
  on public.comment_likes for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- 2. challenges — 사용자당 1개 활성 챌린지 (상태/시작일/프로필)
-- ============================================================================
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',  -- active | completed | abandoned
  start_date date not null,
  completed_at timestamptz,
  profile jsonb not null default '{}'::jsonb, -- {weight, height, age, gender, goal, bmr, targetCalories, coachTone, anonId, ...}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists challenges_user_id_idx on public.challenges (user_id);

alter table public.challenges enable row level security;

drop policy if exists "challenges select own" on public.challenges;
create policy "challenges select own"
  on public.challenges for select
  using (auth.uid() = user_id);

drop policy if exists "challenges insert own" on public.challenges;
create policy "challenges insert own"
  on public.challenges for insert
  with check (auth.uid() = user_id);

drop policy if exists "challenges update own" on public.challenges;
create policy "challenges update own"
  on public.challenges for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "challenges delete own" on public.challenges;
create policy "challenges delete own"
  on public.challenges for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- 3. challenge_logs — 일자별 체크리스트/식단/운동 기록
-- ============================================================================
create table if not exists public.challenge_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  day_key text not null,  -- YYYY-MM-DD
  data jsonb not null default '{}'::jsonb, -- {missions:[], meals:[], workouts:[], ...}
  updated_at timestamptz not null default now(),
  unique (user_id, challenge_id, day_key)
);

create index if not exists challenge_logs_user_challenge_idx
  on public.challenge_logs (user_id, challenge_id);

alter table public.challenge_logs enable row level security;

drop policy if exists "challenge_logs select own" on public.challenge_logs;
create policy "challenge_logs select own"
  on public.challenge_logs for select using (auth.uid() = user_id);

drop policy if exists "challenge_logs upsert own" on public.challenge_logs;
create policy "challenge_logs upsert own"
  on public.challenge_logs for insert with check (auth.uid() = user_id);

drop policy if exists "challenge_logs update own" on public.challenge_logs;
create policy "challenge_logs update own"
  on public.challenge_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "challenge_logs delete own" on public.challenge_logs;
create policy "challenge_logs delete own"
  on public.challenge_logs for delete using (auth.uid() = user_id);

-- ============================================================================
-- 4. inbody_records — 인바디 측정 기록 (여러 시점)
-- ============================================================================
create table if not exists public.inbody_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid references public.challenges(id) on delete set null,
  measured_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb, -- {weight, muscle, fat, bodyFat, ...}
  created_at timestamptz not null default now()
);

create index if not exists inbody_records_user_idx
  on public.inbody_records (user_id, measured_at desc);

alter table public.inbody_records enable row level security;

drop policy if exists "inbody select own" on public.inbody_records;
create policy "inbody select own"
  on public.inbody_records for select using (auth.uid() = user_id);

drop policy if exists "inbody insert own" on public.inbody_records;
create policy "inbody insert own"
  on public.inbody_records for insert with check (auth.uid() = user_id);

drop policy if exists "inbody delete own" on public.inbody_records;
create policy "inbody delete own"
  on public.inbody_records for delete using (auth.uid() = user_id);

-- ============================================================================
-- 5. challenge_anon_posts — 익명 챌린지 커뮤니티 글
-- ============================================================================
create table if not exists public.challenge_anon_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  anon_id text not null,
  content text not null,
  day_num int,
  created_at timestamptz not null default now()
);

create index if not exists challenge_anon_posts_created_idx
  on public.challenge_anon_posts (created_at desc);

alter table public.challenge_anon_posts enable row level security;

drop policy if exists "anon_posts read all" on public.challenge_anon_posts;
create policy "anon_posts read all"
  on public.challenge_anon_posts for select using (true);

drop policy if exists "anon_posts insert own" on public.challenge_anon_posts;
create policy "anon_posts insert own"
  on public.challenge_anon_posts for insert with check (auth.uid() = user_id);

drop policy if exists "anon_posts delete own" on public.challenge_anon_posts;
create policy "anon_posts delete own"
  on public.challenge_anon_posts for delete using (auth.uid() = user_id);

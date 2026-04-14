-- Waylog — 기본 스키마 (profiles / reviews / comments / favorites)
-- 이후 추가 마이그레이션은 이 테이블들에 의존하므로 파일명 날짜를 가장 빠르게 둔다.

-- ============================================================================
-- profiles — auth.users 와 1:1 매핑 (nickname / avatar)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles read all" on public.profiles;
create policy "profiles read all" on public.profiles for select using (true);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert
  with check (auth.uid() = id);

-- 회원가입 시 자동으로 profile 생성 트리거
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- reviews — 사용자 리뷰/웨이로그
-- ============================================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text,
  category text,
  tags text[] default '{}',
  product_name text,
  media jsonb default '[]'::jsonb,
  likes_count int default 0,
  views_count int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reviews_user_id_idx on public.reviews (user_id);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);

alter table public.reviews enable row level security;

drop policy if exists "reviews read all" on public.reviews;
create policy "reviews read all" on public.reviews for select using (true);

drop policy if exists "reviews insert own" on public.reviews;
create policy "reviews insert own" on public.reviews for insert
  with check (auth.uid() = user_id);

drop policy if exists "reviews update own" on public.reviews;
create policy "reviews update own" on public.reviews for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reviews delete own" on public.reviews;
create policy "reviews delete own" on public.reviews for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- comments — 리뷰 댓글 (스레드 지원: parent_id, mention_to)
-- ============================================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  mention_to text,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_review_id_idx on public.comments (review_id, created_at);
create index if not exists comments_parent_id_idx on public.comments (parent_id);

alter table public.comments enable row level security;

drop policy if exists "comments read all" on public.comments;
create policy "comments read all" on public.comments for select using (true);

drop policy if exists "comments insert own" on public.comments;
create policy "comments insert own" on public.comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "comments delete own" on public.comments;
create policy "comments delete own" on public.comments for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- favorites — 리뷰 즐겨찾기
-- ============================================================================
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, review_id)
);
create index if not exists favorites_user_id_idx on public.favorites (user_id);

alter table public.favorites enable row level security;

drop policy if exists "favorites rw own" on public.favorites;
create policy "favorites rw own" on public.favorites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

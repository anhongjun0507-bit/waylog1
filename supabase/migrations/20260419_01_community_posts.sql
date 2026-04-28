-- Waylog — 커뮤니티 게시물 서버 저장 테이블
-- 이전까지는 클라이언트 localStorage 에만 저장되어 다른 사용자에게 보이지 않았음.
-- reviews 패턴을 따라 누구나 read, 본인만 write.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  product jsonb,                  -- {id, name, brand, imageUrl} optional
  image_url text,                 -- optional 첨부 이미지 URL
  likes_count int default 0,
  created_at timestamptz not null default now()
);

create index if not exists community_posts_created_idx
  on public.community_posts (created_at desc);
create index if not exists community_posts_user_idx
  on public.community_posts (user_id);

alter table public.community_posts enable row level security;

drop policy if exists "community_posts read all" on public.community_posts;
create policy "community_posts read all"
  on public.community_posts for select
  using (true);

drop policy if exists "community_posts insert own" on public.community_posts;
create policy "community_posts insert own"
  on public.community_posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "community_posts update own" on public.community_posts;
create policy "community_posts update own"
  on public.community_posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "community_posts delete own" on public.community_posts;
create policy "community_posts delete own"
  on public.community_posts for delete
  using (auth.uid() = user_id);

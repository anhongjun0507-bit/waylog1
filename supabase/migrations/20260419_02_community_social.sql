-- Waylog — 커뮤니티 댓글 + 게시물/댓글 좋아요 서버 저장
-- review 쪽 comments / comment_likes 패턴과 동일하게 구성.

-- ============================================================================
-- community_comments — 커뮤니티 게시물의 댓글 (1단계 답글 지원)
-- ============================================================================
create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  parent_id uuid references public.community_comments(id) on delete cascade,
  mention_to text,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists community_comments_post_idx
  on public.community_comments (post_id, created_at);
create index if not exists community_comments_parent_idx
  on public.community_comments (parent_id);

alter table public.community_comments enable row level security;

drop policy if exists "community_comments read all" on public.community_comments;
create policy "community_comments read all"
  on public.community_comments for select
  using (true);

drop policy if exists "community_comments insert own" on public.community_comments;
create policy "community_comments insert own"
  on public.community_comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "community_comments delete own" on public.community_comments;
create policy "community_comments delete own"
  on public.community_comments for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- community_post_likes — 커뮤니티 게시물 좋아요 (user × post unique)
-- ============================================================================
create table if not exists public.community_post_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);
create index if not exists community_post_likes_post_idx
  on public.community_post_likes (post_id);

alter table public.community_post_likes enable row level security;

drop policy if exists "community_post_likes read all" on public.community_post_likes;
create policy "community_post_likes read all"
  on public.community_post_likes for select
  using (true);

drop policy if exists "community_post_likes insert own" on public.community_post_likes;
create policy "community_post_likes insert own"
  on public.community_post_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "community_post_likes delete own" on public.community_post_likes;
create policy "community_post_likes delete own"
  on public.community_post_likes for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- community_comment_likes — 커뮤니티 댓글 좋아요
-- ============================================================================
create table if not exists public.community_comment_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, comment_id)
);
create index if not exists community_comment_likes_comment_idx
  on public.community_comment_likes (comment_id);

alter table public.community_comment_likes enable row level security;

drop policy if exists "community_comment_likes read all" on public.community_comment_likes;
create policy "community_comment_likes read all"
  on public.community_comment_likes for select
  using (true);

drop policy if exists "community_comment_likes insert own" on public.community_comment_likes;
create policy "community_comment_likes insert own"
  on public.community_comment_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "community_comment_likes delete own" on public.community_comment_likes;
create policy "community_comment_likes delete own"
  on public.community_comment_likes for delete
  using (auth.uid() = user_id);

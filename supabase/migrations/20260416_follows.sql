-- Waylog — 팔로우 시스템
-- follows(follower_id, followee_id) + 알림 트리거 2종.
--
-- 1) 팔로우 받음 알림: 누가 팔로우하면 followee 의 notifications 에 row.
-- 2) 새 글 알림 fanout: 사용자가 review 를 insert 하면 followers 전원에게 알림.
--
-- 트리거 함수는 security definer 로 실행해야 다른 사용자의 notifications 에
-- insert 할 권한이 생긴다. notifications 의 RLS 는 본인 user_id 로만 insert
-- 가능하기 때문.

-- ============================================================================
-- 1. follows 테이블
-- ============================================================================
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists follows_follower_idx on public.follows (follower_id);
create index if not exists follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;

drop policy if exists "follows read all" on public.follows;
create policy "follows read all"
  on public.follows for select using (true);

drop policy if exists "follows insert own" on public.follows;
create policy "follows insert own"
  on public.follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "follows delete own" on public.follows;
create policy "follows delete own"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ============================================================================
-- 2. 트리거: 팔로우 받았을 때 followee 에게 알림
-- ============================================================================
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  follower_nick text;
begin
  select coalesce(nickname, '누군가') into follower_nick
  from public.profiles
  where id = NEW.follower_id;

  insert into public.notifications (user_id, text, data)
  values (
    NEW.followee_id,
    follower_nick || '님이 팔로우했어요',
    jsonb_build_object(
      'type', 'follow',
      'follower_id', NEW.follower_id,
      'follower_nickname', follower_nick
    )
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_follow on public.follows;
create trigger trg_notify_on_follow
  after insert on public.follows
  for each row execute function public.notify_on_follow();

-- ============================================================================
-- 3. 트리거: 새 review insert 시 followers 전원에게 알림 fanout
-- ============================================================================
create or replace function public.notify_followers_on_new_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_nick text;
begin
  select coalesce(nickname, '작성자') into author_nick
  from public.profiles
  where id = NEW.user_id;

  insert into public.notifications (user_id, text, data)
  select
    f.follower_id,
    author_nick || '님이 새 글을 올렸어요: ' || left(NEW.title, 30),
    jsonb_build_object(
      'type', 'new_review',
      'review_id', NEW.id::text,
      'author_id', NEW.user_id,
      'author_nickname', author_nick
    )
  from public.follows f
  where f.followee_id = NEW.user_id;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_followers_on_new_review on public.reviews;
create trigger trg_notify_followers_on_new_review
  after insert on public.reviews
  for each row execute function public.notify_followers_on_new_review();

-- Waylog — 챌린지 익명 커뮤니티를 일반 커뮤니티로 통합.
-- 기존 challenge_anon_posts 행을 community_posts 로 복사하고,
-- community_posts 에 익명/챌린지 메타 컬럼을 추가한다.
-- challenge_anon_posts 테이블 자체는 안전 버퍼로 당분간 유지(별도 migration 에서 drop).

-- 1) 컬럼 추가 — 기존 행은 DEFAULT 로 안전하게 채워짐.
alter table public.community_posts
  add column if not exists is_anonymous boolean not null default false;

alter table public.community_posts
  add column if not exists challenge_id uuid references public.challenges(id) on delete set null;

alter table public.community_posts
  add column if not exists day_num int;

-- 2) 익명 필터 인덱스 — 익명 글은 소수라 부분 인덱스로 경량화.
create index if not exists community_posts_is_anon_idx
  on public.community_posts (is_anonymous) where is_anonymous = true;

-- 3) challenge_anon_posts → community_posts 이관.
--    id 를 그대로 보존해 재실행 시 중복 insert 방지(멱등).
--    challenge_id 는 기존 테이블에 없어 NULL 로 둔다.
insert into public.community_posts
  (id, user_id, content, is_anonymous, day_num, created_at)
select
  cap.id, cap.user_id, cap.content, true, cap.day_num, cap.created_at
from public.challenge_anon_posts cap
where not exists (
  select 1 from public.community_posts cp where cp.id = cap.id
);

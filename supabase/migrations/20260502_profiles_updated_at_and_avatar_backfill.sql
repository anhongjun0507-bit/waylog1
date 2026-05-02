-- 1.4.5 회귀 5b 후속 — profiles.updated_at 누락 + 아바타 backfill
--
-- 원인:
-- 1) 20260412 의 profiles 테이블 선언은 `updated_at timestamptz not null default now()` 이지만
--    prod 의 실제 테이블에는 updated_at 컬럼이 누락된 상태였음 (수동 dashboard 생성 시 drift).
-- 2) 20260430 의 update_my_profile RPC 가 `SET updated_at = NOW()` 를 호출 → 매 호출마다
--    42703 "column updated_at does not exist" 에러로 실패. profiles.avatar_url 이 영영 갱신 X.
-- 3) 1.4.4 PostgREST upsert 경로도 동일 결과 — body 에 updated_at 포함되어 silent drop.
--
-- 결과: storage 에는 사진이 정상 업로드됐지만 profiles.avatar_url 은 NULL 인 사용자 발생.
-- user_metadata.avatar_url 에는 새 URL 이 저장되어 있어 본인 세션 in-memory 동안엔 보이지만
-- 새로고침/다른 화면 가서 profiles 를 읽는 경로 (자기 후기 카드 등) 에선 기본 프로필로 표시.
--
-- 이 마이그레이션은 두 가지를 동시에 정리:
-- 1) updated_at 컬럼 보강 (idempotent — 이미 존재하면 skip)
-- 2) profiles.avatar_url 이 비어있고 user_metadata 에는 있는 사용자에 대해 메타값 backfill

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

update public.profiles p
set avatar_url = u.raw_user_meta_data->>'avatar_url',
    updated_at = now()
from auth.users u
where p.id = u.id
  and (p.avatar_url is null or p.avatar_url = '')
  and (u.raw_user_meta_data->>'avatar_url') is not null
  and (u.raw_user_meta_data->>'avatar_url') <> '';

-- Waylog 1.4.0 — claude Edge Function 사용자별 일일 AI 쿼터
--
-- 배경
--   1.3.0 에서 인바디 AI 분석 클라이언트 일일 cap 5회 제거 (사용자 피드백: 무제한).
--   동시에 claude Edge Function 은 `--no-verify-jwt` 로 배포돼 누구나 호출 가능하고
--   IP 기반 in-process Map rate limit 만 있어 콜드스타트마다 초기화됐다.
--   결과: 익명 abuse 시 Anthropic 키 비용 폭주 위험 (audit-2026-04-28.md P0-1, P1-7).
--
-- 1.4.0 보안 강화 방향
--   1) claude Edge Function `verify_jwt` 켬 (익명 호출 차단).
--   2) 함수 안에서 user JWT decode → user_id 추출.
--   3) 본 테이블 (user_ai_quota) 로 사용자별 일일 호출 횟수 추적·차단.
--      cap 50회/일 (vision + text 합산). 무제한 UX 는 유지하되 abuse 방지선.
--   4) IP rate limit 폐기 (in-process 라 무의미).
--
-- 동작
--   - PRIMARY KEY (user_id, date) — 사용자×날짜 1행.
--   - count: 0 부터 시작, claude 호출 직후 +1.
--   - DAILY_CAP (코드 상수) 도달 시 함수가 429 반환.
--   - 다음 KST 자정 (실용상 UTC 자정 기준 새 row) 에 새 row 자동 생성.
--
-- 정리 정책
--   30일 지난 행은 별도 정리 작업(또는 GitHub Actions cron) 에서 prune.
--   현재는 누적 허용 — 사용자×date 조합이라 폭증 가능성 낮음.

create table if not exists public.user_ai_quota (
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null default current_date,
  count      integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, date),
  constraint user_ai_quota_count_nonneg check (count >= 0)
);

comment on table public.user_ai_quota is
  '1.4.0 — claude Edge Function 사용자별 일일 호출 카운터. cap 50/day.';

-- 사용자×날짜 lookup 은 PK 가 prefix 인덱스로 충분.
-- 추가 인덱스: 운영자가 "오늘 최다 호출 사용자" 쿼리 시 (date, count desc).
create index if not exists user_ai_quota_date_count_idx
  on public.user_ai_quota (date, count desc);

-- ============================================================================
-- RLS — 본인은 자기 카운트 조회만 가능. 쓰기는 service_role 만 (Edge Function).
-- ============================================================================
alter table public.user_ai_quota enable row level security;

drop policy if exists "user_ai_quota select own" on public.user_ai_quota;
create policy "user_ai_quota select own"
  on public.user_ai_quota for select
  using (auth.uid() = user_id);

-- INSERT / UPDATE / DELETE 정책은 일부러 만들지 않는다.
-- service_role 키는 RLS 를 우회하므로 Edge Function 이 자유롭게 쓸 수 있고,
-- 일반 사용자가 PostgREST 로 직접 카운트를 조작·리셋하는 길을 차단한다.

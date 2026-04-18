-- ============================================================================
-- Waylog — 모든 게시물/상호작용 데이터 전체 삭제 (WIPE)
-- ============================================================================
-- ⚠️ 실행 전 확인:
--   1. 모든 사용자의 리뷰·댓글·좋아요·무드·알림·익명 챌린지 글이 사라집니다
--   2. 삭제된 데이터는 복구 불가
--   3. 프로필(profiles), 팔로우(follows), 챌린지 기록(challenges·challenge_logs·inbody_records) 은 유지
--
-- 실행 방법:
--   Supabase 대시보드 → SQL Editor → New query → 아래 내용 붙여넣기 → Run
-- ============================================================================

begin;

-- 1) 댓글 좋아요 (comments 참조) — FK cascade 있어도 명시 삭제로 명확화
delete from public.comment_likes;

-- 2) 댓글 (reviews 참조)
delete from public.comments;

-- 3) 저장됨 (reviews 참조)
delete from public.favorites;

-- 4) 무드 기록 (reviews 참조)
delete from public.user_moods;

-- 5) 알림 (reviews·comments 등 참조 — 삭제된 대상 가리키는 알림 정리)
delete from public.notifications;

-- 6) 신고 기록 — 게시물/댓글 대상이므로 함께 정리
delete from public.reports;

-- 7) 리뷰 본체 — 가장 마지막. FK 종속 정리 후 지워야 깔끔
delete from public.reviews;

-- 8) 챌린지 익명 커뮤니티 게시물
delete from public.challenge_anon_posts;

commit;

-- ============================================================================
-- 추가: Storage 버킷 (review-media) 파일 정리 — SQL 로는 불가, 대시보드에서 수동
-- ============================================================================
-- Supabase 대시보드 → Storage → review-media → 모든 폴더 삭제
-- (또는 Storage API 로 일괄 삭제 스크립트 작성 필요)
--
-- avatars 버킷은 프로필 이미지라 유지 권장.

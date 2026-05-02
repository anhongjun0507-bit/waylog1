# supabase/migrations — 적용 가이드

Waylog 의 Postgres 스키마는 이 디렉터리의 SQL 파일들로 정의됩니다.
신규 환경에 처음 올릴 때, 그리고 **새 마이그레이션이 추가될 때마다** 적용해야 합니다.

## 적용 방법 — 옵션 A. Supabase Dashboard SQL Editor (수동, 권장)

> Supabase Free 플랜에서 안전하게 적용할 수 있는 방식. 1.0.0~1.4.0 동안 사용한 표준.

1. Supabase Dashboard → 좌측 SQL Editor → New query
2. 적용할 마이그레이션 `.sql` 파일 내용을 통째로 복사 → 붙여넣기
3. Run (⌘+Enter / Ctrl+Enter)
4. 결과 확인 — 에러 없으면 다음 파일 진행

**순서 준수**: 파일명 앞 날짜 순서대로 (오래된 것부터). 의존성이 있어 역순/뒤섞이면 깨짐.

## 적용 방법 — 옵션 B. Supabase CLI (자동)

```bash
# 1) CLI 설치 + 로그인 (1회)
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>

# 2) 모든 미적용 마이그레이션 push
supabase db push
```

⚠️ Free 플랜에서 `supabase db push` 가 일부 권한 명령(예: `alter publication`)에 실패할 수 있음 — 그때는 옵션 A 로 fallback.

## 명명 규칙

`YYYYMMDD[_NN]_short_description.sql`

- `YYYYMMDD` 필수 — 같은 날 여러 개면 `_01`, `_02` 접미사로 순서 명시
- 예: `20260413_02_moods_notifications.sql`
- 의존성 있는 마이그레이션은 **날짜 또는 NN 으로 반드시 뒤에** 위치
- 같은 날 두 개 있으면 prefix `_NN` 없이 쓰지 말 것 (정렬 모호)

## 기존 마이그레이션 목록 (적용 순서)

| 파일 | 버전 | 핵심 |
|---|---|---|
| `20260412_reviews_profiles_comments.sql` | 1.0.0 | 기본 스키마 (profiles · reviews · comments · favorites) |
| `20260413_02_moods_notifications.sql` | 1.0.x | 무드 반응 + 알림 서버 저장 |
| `20260413_comment_likes_and_challenge.sql` | 1.0.x | 댓글 좋아요 + 챌린지 데이터 동기화 |
| `20260414_push_reports_moderation.sql` | 1.0.x | 푸시 구독 + 신고·모더레이션 큐 |
| `20260414_storage_policies.sql` | 1.0.x | avatars / review-media 버킷 RLS |
| `20260416_follows.sql` | 1.1.0 | 팔로우 시스템 + 알림 트리거 |
| `20260418_wipe_all_posts.sql` | 1.1.x | 게시물 전체 삭제 (운영 정리, idempotent) |
| `20260419_01_community_posts.sql` | 1.1.x | 커뮤니티 게시물 서버 저장 (localStorage 이탈) |
| `20260419_02_community_social.sql` | 1.1.x | 커뮤니티 댓글/좋아요 |
| `20260421_community_anon_merge.sql` | 1.1.x | 챌린지 익명 커뮤니티 통합 |
| `20260427_notif_prefs.sql` | 1.2.0 | 알림 종류별 토글 + 발송 일원화 |
| `20260428_user_ai_quota.sql` | 1.4.0 | claude Edge Function 사용자별 일일 AI 쿼터 |
| `20260430_update_my_profile_rpc.sql` | 1.4.5 | profiles 저장 SECURITY DEFINER RPC (PostgREST upsert silent fail 우회) |
| `20260502_profiles_updated_at_and_avatar_backfill.sql` | 1.4.5 hotfix | profiles.updated_at 컬럼 보강 + 누락된 avatar_url backfill |

## 새 마이그레이션 추가 절차

1. `YYYYMMDD_short_description.sql` 로 파일 생성 (오늘 날짜)
   - 같은 날 이미 파일이 있으면 `_NN` 접미사 사용
2. SQL 작성 — `IF NOT EXISTS` / `IF EXISTS` 로 idempotent 하게 (재실행 안전)
3. RLS 정책은 항상 명시 — 새 테이블이면 `ENABLE ROW LEVEL SECURITY` + 권한별 policy
4. 영향 받는 Edge Function / 클라이언트 코드 같은 PR 에 포함
5. 이 README 의 "기존 마이그레이션 목록" 표에 한 줄 추가
6. PR 본문에 "Supabase Dashboard 에서 적용 필요" 명시 (자동 적용 X)
7. Merge 후 즉시 운영 환경에 적용 — 적용 누락 시 새 코드가 깨짐

## 트러블슈팅

| 증상 | 원인 / 대응 |
|---|---|
| `relation "..." does not exist` | 의존 마이그레이션 미적용 — 파일명 순서 확인 후 빠진 것부터 적용 |
| `permission denied for table ...` | RLS 정책 누락 — 해당 마이그레이션의 policy 블록 재실행 |
| `column "..." already exists` | 이미 적용된 마이그레이션 — 정상, skip |
| `policy "..." already exists` | `DROP POLICY IF EXISTS` 추가 후 재실행 (또는 그냥 skip) |
| Free 플랜에서 `alter publication` 실패 | Dashboard SQL Editor 로 같은 SQL 수동 실행 |

## 참고

- Edge Function 별 secret 등록은 `supabase/functions/README.md` 참조
- DB 스키마 변경은 코드 배포보다 **먼저** 적용 — 클라이언트가 새 컬럼/테이블을 호출하기 전에 존재해야 함

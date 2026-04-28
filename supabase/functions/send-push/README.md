# send-push Edge Function

Waylog 1.2.0 푸시 알림 발송 (FCM HTTP v1).

## 최초 배포

```bash
# 1) Supabase CLI 로그인 + 프로젝트 링크 (이미 됐으면 생략)
supabase login
supabase link --project-ref <your-project-ref>

# 2) 비밀키 등록 — Service Account JSON 통째로
#    Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 → JSON 다운로드
supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat path/to/service-account.json)"

# 3) 함수 배포 (verify_jwt 기본 true — 익명 차단)
supabase functions deploy send-push
```

이미 1.1.0 시점에 secret 등록한 경우 set 만 다시 하지 않아도 됨.
SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 Supabase 가 자동 주입.

## 호출 방식

### 클라이언트 (인증된 사용자)
```js
await supabase.functions.invoke('send-push', {
  body: {
    userId: 'uuid-of-receiver',
    type: 'like',
    title: '새 좋아요',
    body: '지영님이 회원님 글을 좋아해요',
    data: { url: '/review/xxxx' }
  }
})
```

### 서버측 (Vercel Cron 등)
```bash
curl -X POST \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"userId":"...","type":"challenge","title":"...","body":"..."}' \
  "${SUPABASE_URL}/functions/v1/send-push"
```

## 응답

```json
{
  "ok": true,
  "sent": 2,        // FCM 정상 발송 endpoint 수
  "invalid": 1,     // UNREGISTERED 등 — 자동으로 push_subscriptions 에서 삭제됨
  "error": 0,       // 일시 에러 (네트워크 등) — 행 유지
  "skipped_legacy": 0,  // 1.2.0 미지원 raw URL — 사용자가 재등록 시 FCM 으로 마이그레이션
  "total": 3
}
```

또는 `notif_prefs` 에서 해당 type 이 비활성화돼 있으면:
```json
{ "ok": true, "skipped": "pref_disabled" }
```

## 알림 종류 (`type`) ↔ `notif_prefs` 매핑

| type | notif_prefs key |
|---|---|
| `like` | `likes` |
| `comment` | `comments` |
| `follow` | `follows` |
| `challenge` | `challenge` |
| `news` | `news` |

## 보안 (1.4.0 강화)

호출 모드 3 가지로 분기 (audit-2026-04-28.md P0-2, P0-3 대응):

| 모드 | Authorization | 허용 type |
|---|---|---|
| service_role (cron 등) | `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` | 모든 type |
| admin user | user JWT + `app_metadata.role === "admin"` | 모든 type (NewsBroadcast 포함) |
| 일반 user | user JWT | `like` / `comment` / `follow` 만 — 본인이 본인에게 발송은 차단 (`self_push_not_allowed`) |

`news` / `challenge` 를 일반 user 가 보내려 하면 `403 admin_only`.
`like` / `comment` / `follow` 에서 `senderId === userId` 면 `403 self_push_not_allowed`.

⚠️ 1.3.0 까지는 인증된 user 라면 임의 userId 로 임의 type/title/body 발송 가능했음.
   1.4.0 부터 위 가드 적용.

추가 정합성 (sender 가 실제로 해당 review 좋아요 했는지 등) 은 호출 빈도·DB 부하·UX 지연 trade-off 로 미적용.
1.5.0 에서 type 별 review_id/comment_id/follow target 검증 검토.

verify_jwt 는 활성 (Authorization 헤더 필수). 익명 호출은 게이트웨이에서 차단.

## Web Push (legacy)

1.0.x 시기에 VAPID PushManager 로 raw URL 을 push_subscriptions 에 저장한
사용자는 1.2.0 깔면 push.js 가 FCM 토큰으로 재등록한다. 그 사이 send-push 는
legacy 행을 `skipped_legacy` 로 카운트만 하고 무시. 30일 stale cutoff 후
push.js 가 자동 삭제.

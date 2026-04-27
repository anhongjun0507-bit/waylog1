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

## 보안 메모

1.2.0 첫 도입 단계라 발송자(sender) 신원 검증은 함수 측에서 안 함.
요청자가 임의 `userId` 로 발송 가능 — 악용 모니터링 후 1.3.0 에서
`type` 별 검증(review 작성자 일치 여부 등) 추가 권장.

verify_jwt 는 활성 (Authorization 헤더 필수). 익명 호출은 차단.

## Web Push (legacy)

1.0.x 시기에 VAPID PushManager 로 raw URL 을 push_subscriptions 에 저장한
사용자는 1.2.0 깔면 push.js 가 FCM 토큰으로 재등록한다. 그 사이 send-push 는
legacy 행을 `skipped_legacy` 로 카운트만 하고 무시. 30일 stale cutoff 후
push.js 가 자동 삭제.

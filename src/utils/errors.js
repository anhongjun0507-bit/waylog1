// Supabase / fetch / Claude 에러 객체를 사용자 친화적인 한국어 문구로 매핑.
// 원문을 그대로 노출하면 기술적 내용이 드러나 신뢰를 떨어뜨리고 종종 영어라 UX가 나빠짐.

const PATTERNS = [
  // 네트워크
  { match: /failed to fetch|network|NetworkError|ERR_NETWORK/i, message: "네트워크 연결을 확인해주세요" },
  { match: /timeout|timed? ?out/i, message: "응답이 지연되고 있어요. 잠시 후 다시 시도해주세요" },

  // 인증
  { match: /invalid login|invalid.+credential/i, message: "이메일 또는 비밀번호가 틀렸어요" },
  { match: /email not confirmed|not confirmed/i, message: "이메일 인증이 필요해요. 받은 메일을 확인해주세요" },
  { match: /already registered|user already|duplicate key.+email/i, message: "이미 가입된 이메일이에요" },
  { match: /weak.password|password.+short/i, message: "비밀번호가 너무 짧거나 약해요" },
  { match: /rate ?limit|too many requests|429/i, message: "요청이 너무 많아요. 잠시 후 다시 시도해주세요" },

  // 권한/RLS
  { match: /row.+security|rls|permission denied|forbidden|403/i, message: "접근 권한이 없어요" },
  { match: /jwt|token.+expired|not authenticated|401/i, message: "로그인이 만료됐어요. 다시 로그인해주세요" },

  // 업로드
  { match: /payload.+too large|file.+too large|413/i, message: "파일이 너무 커요" },
  { match: /storage.+quota|insufficient/i, message: "저장 공간이 부족해요" },

  // 기타
  { match: /not found|404/i, message: "요청한 항목을 찾을 수 없어요" },
  { match: /conflict|409/i, message: "이미 존재하는 항목이에요" },
  { match: /server error|internal|500|502|503|504/i, message: "서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요" },
];

/**
 * 에러 객체/문자열에서 사용자에게 보여줄 한국어 메시지를 뽑는다.
 * @param {unknown} err
 * @param {string} fallback 매칭 실패 시 기본 메시지
 */
export function friendlyError(err, fallback = "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요") {
  if (!err) return fallback;
  const msg = typeof err === "string" ? err : (err?.message || err?.error_description || err?.hint || "");
  if (!msg) return fallback;
  for (const { match, message } of PATTERNS) {
    if (match.test(msg)) return message;
  }
  // 한국어로 된 에러는 그대로 노출 (우리가 쓴 문구인 경우)
  if (/[가-힣]/.test(msg) && msg.length < 100) return msg;
  return fallback;
}

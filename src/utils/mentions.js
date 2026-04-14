// 댓글/본문 텍스트의 @멘션을 파싱·렌더.
// 한글/영문/숫자/언더스코어를 허용, 공백/구두점에서 종료.

const MENTION_RE = /@([가-힣A-Za-z0-9_]{1,16})/g;

/**
 * 텍스트에서 멘션된 닉네임들을 배열로 반환.
 */
export function extractMentions(text) {
  if (typeof text !== "string" || !text) return [];
  const out = new Set();
  let m;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text)) !== null) out.add(m[1]);
  return [...out];
}

/**
 * 텍스트를 토큰 배열로 분해.
 * 반환: [{ type:"text", text } | { type:"mention", name }]
 * React 렌더에서 map 으로 하이라이트된 <button> 으로 변환.
 */
export function tokenizeMentions(text) {
  if (typeof text !== "string" || !text) return [];
  const parts = [];
  let last = 0;
  let m;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", text: text.slice(last, m.index) });
    parts.push({ type: "mention", name: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}

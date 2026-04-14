// 사용자 입력/외부 데이터가 URL, 이미지 src, href 로 흘러들어갈 때
// 적용하는 경량 sanitize 유틸. 코드 전역에서 dangerouslySetInnerHTML을
// 쓰지 않기 때문에 텍스트는 React가 이미 이스케이프한다.
// 따라서 여기서는 (1) URL 프로토콜 화이트리스트 (2) 텍스트 제어문자 제거 에만 집중.

const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * 외부 URL(리뷰 미디어, 제품 공식 링크, 아바타 등)을 렌더 직전 검증.
 * javascript:, data: (이미지 제외), vbscript: 등을 차단.
 * @param {unknown} url
 * @param {{ allowDataImage?: boolean }} opts
 * @returns {string} 안전하면 원본, 아니면 빈 문자열
 */
export function sanitizeUrl(url, opts = {}) {
  if (typeof url !== "string" || !url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // 상대 경로는 허용 (우리 자산)
  if (trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith("./")) {
    return trimmed;
  }

  // data:image/... 는 옵션으로만 허용 (아바타 프리뷰 등)
  if (trimmed.toLowerCase().startsWith("data:image/") && opts.allowDataImage) {
    return trimmed;
  }

  try {
    const u = new URL(trimmed);
    if (SAFE_URL_PROTOCOLS.has(u.protocol)) return u.toString();
    return "";
  } catch {
    return "";
  }
}

/**
 * 이미지 src 전용. http/https + (옵션으로) data:image/* 만 허용.
 * URL constructor 가 query string 을 그대로 보존하므로 CDN signed URL
 * (?token=..., ?expires=...) 도 손상 없이 통과한다. 토큰 만료 시 <img>
 * 의 onError 가 발생해 SmartImg/ProductImage 의 fallback 경로로 이동.
 */
export function sanitizeImageUrl(url, { allowDataImage = true } = {}) {
  return sanitizeUrl(url, { allowDataImage });
}

/**
 * 사용자 텍스트에서 제어문자/제로폭 문자 제거 + 길이 제한.
 * JSX 자체는 이스케이프하므로 HTML escape는 하지 않는다.
 */
export function sanitizeText(text, { maxLength = 5000 } = {}) {
  if (typeof text !== "string") return "";
  // 제어문자(\u0000-\u001F 제외 \t\n\r) + 제로폭 + 방향 오버라이드
  const cleaned = text.replace(
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,
    ""
  );
  return cleaned.slice(0, maxLength);
}

/**
 * 닉네임/제목같이 한 줄 텍스트용. 개행까지 제거.
 */
export function sanitizeInline(text, { maxLength = 200 } = {}) {
  return sanitizeText(text, { maxLength }).replace(/[\r\n\t]+/g, " ").trim();
}

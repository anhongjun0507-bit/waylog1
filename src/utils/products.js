// 리뷰에 저장된 product 문자열을 개별 제품명 배열로 파싱.
// - 현재(신규): " | " 구분자 사용
// - 과거(레거시): ", " 구분자. 단, 제품명 자체에 콤마가 포함되어 단순 split 시 오분절됨.
//   catalog 가 주어지면 greedy 매칭으로 복원 시도.
export function parseProductNames(joined, catalog) {
  if (!joined || typeof joined !== "string") return [];
  const s = joined.trim();
  if (!s) return [];
  if (s.includes("|")) {
    return s.split("|").map((x) => x.trim()).filter(Boolean);
  }
  const names = Array.isArray(catalog) ? catalog.map((p) => p?.name).filter(Boolean) : [];
  if (names.length === 0) {
    return [s];
  }
  // 긴 이름 우선 매칭 (짧은 이름이 다른 제품의 접두사가 될 가능성 제거).
  const sorted = [...names].sort((a, b) => b.length - a.length);
  let remaining = s;
  const out = [];
  let safety = 10;
  while (remaining && safety-- > 0) {
    remaining = remaining.replace(/^[,\s]+/, "");
    if (!remaining) break;
    const hit = sorted.find((n) => remaining.startsWith(n));
    if (hit) {
      out.push(hit);
      remaining = remaining.slice(hit.length);
    } else {
      // 매칭 실패 — 전체를 단일 이름으로 간주하고 종료
      if (out.length === 0) return [s];
      out.push(remaining.replace(/^[,\s]+/, "").trim());
      break;
    }
  }
  return out.length > 0 ? out : [s];
}

// r.products 배열(있으면) 우선, 없으면 r.product 문자열 파싱.
export function getReviewProductNames(r, catalog) {
  if (Array.isArray(r?.products) && r.products.length > 0) {
    return r.products.map((p) => p?.name).filter(Boolean);
  }
  return parseProductNames(r?.product || "", catalog);
}

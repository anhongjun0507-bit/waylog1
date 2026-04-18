// Pending review/edit IndexedDB 헬퍼 — 사용자별 키 격리, TTL 기반 stale 정리,
// 구버전 글로벌 키 안전 삭제 (공용 디바이스 크로스 사용자 오염 방지).
//
// 저장 구조:
//   waylog:pendingReviews:{uid|anon} -> [ { id: Date.now(), title, body, ... } ]
//   waylog:pendingEdits:{uid|anon}   -> { [reviewId]: { ...payload, savedAt } }

export const PENDING_REVIEW_TTL_MS = 30 * 24 * 3600 * 1000; // 30일

export const pendingReviewsKey = (uid) => `waylog:pendingReviews:${uid || "anon"}`;
export const pendingEditsKey = (uid) => `waylog:pendingEdits:${uid || "anon"}`;

// 구버전 전역 키 — 사용자별 분리 이전에 쓰이던 공용 키. 공용 디바이스에서
// 다른 사용자의 데이터가 섞일 수 있어 마이그레이션 대신 삭제만 수행.
export const LEGACY_PENDING_KEY = "waylog:pendingReviews";

const getStorage = () => (typeof window !== "undefined" ? window.storage : null);

export const clearLegacyPendingKey = async (storage = getStorage()) => {
  try { await storage?.delete(LEGACY_PENDING_KEY); } catch {}
};

// pending 리뷰는 id(Date.now() ms 타임스탬프) 를 생성 시점으로 간주.
// TTL 초과하면 낙오된 것으로 보고 제거 (다른 기기로 옮겼거나 버림).
export const filterStalePending = (pending, now = Date.now(), ttl = PENDING_REVIEW_TTL_MS) => {
  if (!Array.isArray(pending)) return [];
  return pending.filter((r) => {
    if (typeof r?.id !== "number" || r.id <= 0) return false;
    return (now - r.id) < ttl;
  });
};

export const filterStaleEdits = (edits, now = Date.now(), ttl = PENDING_REVIEW_TTL_MS) => {
  if (!edits || typeof edits !== "object" || Array.isArray(edits)) return {};
  const out = {};
  for (const [k, v] of Object.entries(edits)) {
    const ts = typeof v?.savedAt === "number" ? v.savedAt : 0;
    if (ts > 0 && (now - ts) < ttl) out[k] = v;
  }
  return out;
};

export const savePendingEdit = async (uid, reviewId, payload, storage = getStorage()) => {
  try {
    const key = pendingEditsKey(uid);
    const stored = await storage?.get(key);
    const edits = stored?.value ? JSON.parse(stored.value) : {};
    edits[reviewId] = { ...payload, savedAt: Date.now() };
    await storage?.set(key, JSON.stringify(edits));
  } catch {}
};

export const removePendingEdit = async (uid, reviewId, storage = getStorage()) => {
  try {
    const key = pendingEditsKey(uid);
    const stored = await storage?.get(key);
    if (!stored?.value) return;
    const edits = JSON.parse(stored.value);
    if (!(reviewId in edits)) return;
    delete edits[reviewId];
    if (Object.keys(edits).length === 0) {
      await storage?.delete(key);
    } else {
      await storage?.set(key, JSON.stringify(edits));
    }
  } catch {}
};

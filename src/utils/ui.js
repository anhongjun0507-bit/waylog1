// 소형 UI 유틸리티. 여러 컴포넌트에서 공용으로 쓰인다.

/** className 조합 — falsy 값 제거 후 space-join */
export const cls = (...a) => a.filter(Boolean).join(" ");

/**
 * createdAt(ms 또는 ISO) 을 한국어 상대시간으로 포맷.
 * 24시간 이상이면 "N일 전", 7일 이상이면 "N주 전", 30일 이상이면 m/d 로.
 */
export const formatRelativeTime = (createdAt, fallback = "방금") => {
  if (!createdAt) return fallback;
  const now = Date.now();
  const t = typeof createdAt === "number" ? createdAt : new Date(createdAt).getTime();
  const diff = Math.floor((now - t) / 1000);
  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400 / 7)}주 전`;
  return new Date(t).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
};

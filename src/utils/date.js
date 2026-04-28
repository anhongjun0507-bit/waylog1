// 1.4.0 — 일자 그룹핑 / day_key 헬퍼 (audit P1-11).
//
// 1.3.0 부터 today feed 그룹핑은 KST 로 보정됐지만 챌린지 미션·streak·daily logs 가
// `new Date().toISOString().slice(0, 10)` (UTC) 를 사용해 cron(KST)과 어긋났음.
// KST 0~9 시 미션 완료 시 클라이언트 키 = "어제(UTC)", cron 검사 키 = "오늘(KST)"
// → 분명히 기록했는데도 19 시 리마인더 발송.
//
// 모든 day_key 생성은 이 헬퍼를 통해 KST 로 통일.
// 추후 timezone 다양화 시 두 번째 인자 추가 (현재는 한국 사용자만 가정).

/**
 * 입력 Date(또는 timestamp) 의 KST 자정 기준 YYYY-MM-DD 반환.
 * 입력이 invalid 면 빈 문자열 반환 (호출측이 매핑 누락 처리하기 쉬움).
 * @param {Date|number|string} [input] — 생략 시 now.
 * @returns {string} "YYYY-MM-DD" 또는 ""
 */
export function kstDayKey(input) {
  const d = input == null ? new Date() : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  // UTC 시각에 9 시간 더한 뒤 toISOString → KST 자정 기준 날짜.
  // ※ 한국은 DST 없음. DST 적용 국가용으로 확장 시 Intl.DateTimeFormat({ timeZone }) 사용.
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 오늘 KST day_key — kstDayKey() 의 단축형. */
export const todayKstKey = () => kstDayKey();

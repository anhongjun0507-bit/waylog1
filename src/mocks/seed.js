// 데모/온보딩용 시드 데이터. 실제 서비스 데이터와 구분하기 위해 src/mocks/ 에 격리.
// 프로덕션에서는 서버 데이터가 비었을 때만 fallback으로 사용.
//
// ID 충돌 방지: 사용자가 생성한 리뷰는 양의 Date.now() 또는 서버 UUID.
// 시드는 음수 ID 로 normalize 해서 교차 충돌 가능성 제거.

// 시드 리뷰 비활성화 — 사용자 요청으로 깨끗한 상태에서 시작.
// 필요하면 이 배열에 다시 항목 추가하면 empty state 대신 fallback 으로 표시됨.
const _RAW_SEED_REVIEWS = [];

// 원본 → 음수 ID 로 변환. 호출측에서는 항상 SEED_REVIEWS 만 사용.
const _seedIdOffset = (id) => -Math.abs(id);
export const SEED_REVIEWS = _RAW_SEED_REVIEWS.map((r) => ({ ...r, id: _seedIdOffset(r.id) }));

// 시드 리뷰 ID 인지 판별 (모든 시드 id 는 음수)
export const isSeedReviewId = (id) => typeof id === "number" && id < 0;

// 시드 리뷰 비어있으므로 시드 코멘트도 비활성화.
const _RAW_SEED_COMMENTS = {};

// SEED_COMMENTS 도 SEED_REVIEWS 의 음수 ID 에 맞춰 키 재매핑
export const SEED_COMMENTS = Object.fromEntries(
  Object.entries(_RAW_SEED_COMMENTS).map(([rid, arr]) => [_seedIdOffset(Number(rid)), arr])
);

// 인기 태그 (시드). 프로덕션에서는 서버 집계로 대체.
export const POPULAR_TAGS = ["다이어트","푸로틴","비타민","더마아키텍트","바디워시","샴푸","원포원","나눔","힐링","무수분요리","명상","면역"];

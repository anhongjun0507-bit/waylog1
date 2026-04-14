// 데모/온보딩용 시드 데이터. 실제 서비스 데이터와 구분하기 위해 src/mocks/ 에 격리.
// 프로덕션에서는 서버 데이터가 비었을 때만 fallback으로 사용.
//
// ID 충돌 방지: 사용자가 생성한 리뷰는 양의 Date.now() 또는 서버 UUID.
// 시드는 음수 ID 로 normalize 해서 교차 충돌 가능성 제거.

const _RAW_SEED_REVIEWS = [
  { id: 142, img: "/media/reviews/1000020640.jpg", title: "미역국 만들기 쉽죠잉~~^^", tags: ["초사리미역","미역국","양조간장"], product: "정기품 완도 진상각 미역", category: "food", views: 12, likes: 32, date: "2026-02-09", body: "초사리미역으로 끓이니 진하고 깊은 국물맛이 나와요. 양조간장 한 스푼만 넣어도 감칠맛 폭발!" },
  { id: 150, img: "/media/reviews/beauty_1770561672807.jpeg", title: "헉-!! 3개월만에 변화된 내 피부-!!!😱😍", tags: ["아티스트리","더마아키텍트"], product: "아티스트리 더마아키텍트", category: "beauty", views: 28, likes: 87, date: "2026-02-09", body: "3개월간 꾸준히 사용한 결과 피부결이 확실히 달라졌어요. 모공도 줄고 탄력도 올라온 느낌." },
  { id: 147, img: "/media/reviews/20260208_165932.jpg", title: "씽잉볼과 함께 ❤️", tags: ["하이요가","씽잉볼","라벤더오일"], product: "아티스트리 오가닉 라벤더 에센셜 오일", category: "wellness", views: 9, likes: 21, date: "2026-02-08", body: "요가 명상 시간에 라벤더 디퓨징하면 마음이 한결 차분해져요." },
  { id: 152, img: "/media/reviews/20260209_082112.jpg", title: "음양탕♡", tags: ["음양탕","소금","미네랄"], product: "정기품 설홍소금", category: "food", views: 6, likes: 14, date: "2026-02-09", body: "아침 공복에 따뜻한 물 + 차가운 물 + 설홍소금 한꼬집. 속이 편안해져요." },
  { id: 252, img: "/media/reviews/17754348627272594263686092021618.jpg", title: "그냥 뜨거운 물만 부으세요~☕️", tags: ["아메리카노","COE"], product: "까페드다몬 아메리카노 블랙", category: "food", views: 4, likes: 11, date: "2026-04-06", body: "스틱 하나에 물만 부어도 카페 퀄리티. 출장이나 여행에 강력 추천." },
  { id: 253, img: "/media/reviews/20260406_094348.jpg", title: "다요트 시작은 단백질로부터", tags: ["바디키","다이어트","단백질"], product: "바디키 식사대용 쉐이크 그레인", category: "wellness", views: 4, likes: 17, date: "2026-04-06", body: "한 포로 한 끼 든든하게 해결. 그레인 식감이 의외로 포만감 좋아요." },
  { id: 254, img: "/media/reviews/1000055119.jpg", title: "작두콩차", tags: ["작두콩","현미녹차"], product: "라임트리 유기농 현미녹차", category: "food", views: 4, likes: 8, date: "2026-04-06", body: "고소하고 부드러워서 카페인에 약한 분도 부담 없이." },
  { id: 255, img: "/media/reviews/20260405_131341.jpg", title: "퀸사용 첫경험", tags: ["퀸쿡","무수분요리"], product: "암웨이 퀸 Ti 크라운 세트", category: "home", views: 1, likes: 5, date: "2026-04-06", body: "무수분 요리에 진심이 되었습니다. 식재료 본연의 맛이 살아나요." },
  { id: 303, img: "/media/reviews/GridArt_20260318_163212999.jpg", title: "고추잡채과 꽃빵/오징어무침", tags: ["무수분요리","집들이요리"], product: "암웨이 퀸 Ti 웍", category: "home", views: 7, likes: 19, date: "2026-03-18", body: "웍 하나로 집들이 요리 완성. 손님들 반응 최고였어요." },
  { id: 304, img: "/media/reviews/1000021466.jpg", title: "흑임자 찹쌀케익", tags: ["퀸","흑임자"], product: "정기품 명인 삼색통깨 세트", category: "food", views: 11, likes: 26, date: "2026-03-02", body: "명절 선물용으로 만들었는데 호평 폭주!" },
  { id: 306, img: "/media/reviews/IMG_7044.jpeg", title: "소화 어려울때 한포면 끝", tags: ["엔자임","소화"], product: "엔자임 바이옴 (30포)", category: "wellness", views: 8, likes: 22, date: "2026-02-27", body: "과식한 날 한 포 먹으면 속이 한결 편해져요." },
  { id: 309, img: "/media/reviews/1000020929.jpg", title: "발사믹소스 추천", tags: ["발사믹식초","다이어트","샐러드"], product: "벨레이 모데나 발사믹식초", category: "food", views: 9, likes: 24, date: "2026-02-22", body: "샐러드, 스테이크, 카프레제까지 만능 소스." },
  { id: 311, img: "/media/reviews/20260213_181425.jpg", title: "곱창김 2번째 품절😭", tags: ["곱창김","선물용"], product: "정기품 초사리 곱창 돌김", category: "food", views: 13, likes: 31, date: "2026-02-13", body: "한 번 먹어보면 다른 김 못 먹어요." },
  { id: 305, img: "/media/reviews/IMG_9788.jpeg", title: "더마아키텍트로 얼굴 재건축🤩", tags: ["더마아키텍트","아티스트리"], product: "아티스트리 더마아키텍트", category: "beauty", views: 22, likes: 55, date: "2026-02-27", body: "사용 첫 주부터 광채가 달라요." },
  { id: 307, img: "/media/reviews/BandPhoto_2026_02_27_12_16_19.jpg", title: "나쁜거 씻어내고 맛나게🍅", tags: ["과일야채세정제"], product: "디쉬 드랍스 과일 채소 세정제", category: "home", views: 6, likes: 13, date: "2026-02-27", body: "농약과 중금속 걱정 없이 안심하고 먹을 수 있어요." },
  { id: 401, img: "", title: "G&H 바디워시 부드러운 향기", tags: ["바디워시","보습","향기"], product: "G&H 오리지널 바디워시", category: "kitchen", views: 5, likes: 18, date: "2026-04-01", body: "자극 없이 순하고 향이 은은해요. 샤워 후에도 피부가 촉촉하게 유지돼요. 가족 모두 함께 쓸 수 있어요." },
  { id: 402, img: "", title: "샴푸 바꾸고 두피 가려움 해결", tags: ["샴푸","두피케어","탈모"], product: "사티니크 모이스처 샴푸", category: "kitchen", views: 7, likes: 24, date: "2026-03-28", body: "두피가 예민해서 여러 제품 써봤는데 이게 제일 나아요. 2주 쓰니 가려움이 많이 줄었어요." },
  { id: 403, img: "", title: "아침 세안 이거 하나면 끝", tags: ["폼클렌저","세안","민감성"], product: "아티스트리 하이드라매틱스 클렌저", category: "kitchen", views: 4, likes: 12, date: "2026-04-03", body: "거품이 풍성하고 당김 없이 깔끔해요. 민감한 피부도 문제없이 사용 중." },
  { id: 404, img: "", title: "퍼스널 위생 루틴의 시작", tags: ["치약","구강케어","미백"], product: "글리스터 멀티액션 치약", category: "kitchen", views: 3, likes: 9, date: "2026-03-25", body: "진하지 않은데 상쾌함이 오래가요. 미백 효과는 한 달 정도 쓰니 조금씩 보여요." },
  { id: 501, img: "", title: "원포원 참여 후기 - 아이들에게 희망을", tags: ["원포원","나눔","기부"], product: "뉴트리라이트 원포원 프로그램", category: "one4one", views: 15, likes: 42, date: "2026-04-02", body: "내가 산 뉴트리라이트 제품 하나로 결식 아동에게 영양 공급이 간다니 뜻깊어요. 매달 자동 참여 중입니다." },
  { id: 502, img: "", title: "원포원 굿즈 에코백 득템", tags: ["원포원","에코백","친환경"], product: "원포원 한정판 에코백", category: "one4one", views: 8, likes: 19, date: "2026-03-20", body: "수익금 전액 기부되는 한정판 에코백. 디자인도 예쁘고 의미도 있어서 가족 선물로도 딱." },
  { id: 503, img: "", title: "나눔의 힘, 한 번 더 구매 결심", tags: ["원포원","정기구매","나눔"], product: "뉴트리라이트 키즈 츄어블", category: "one4one", views: 11, likes: 28, date: "2026-03-15", body: "아이 먹이면서 동시에 다른 아이도 돕는 셈이라 마음이 든든해요. 꾸준히 정기구매하고 있어요." },
];

// 원본 → 음수 ID 로 변환. 호출측에서는 항상 SEED_REVIEWS 만 사용.
const _seedIdOffset = (id) => -Math.abs(id);
export const SEED_REVIEWS = _RAW_SEED_REVIEWS.map((r) => ({ ...r, id: _seedIdOffset(r.id) }));

// 시드 리뷰 ID 인지 판별 (모든 시드 id 는 음수)
export const isSeedReviewId = (id) => typeof id === "number" && id < 0;

const _RAW_SEED_COMMENTS = {
  142: [
    { id: 1, author: "요리초보", createdAt: Date.now() - 2 * 60 * 60 * 1000, text: "오 양조간장 비율 어떻게 되나요?", likedBy: [] },
    { id: 2, author: "건강한엄마", createdAt: Date.now() - 60 * 60 * 1000, text: "저도 이거 사야겠어요 🙏", likedBy: [] },
  ],
  150: [{ id: 1, author: "피부고민중", createdAt: Date.now() - 26 * 60 * 60 * 1000, text: "사용 순서가 어떻게 되세요??", likedBy: [] }],
};

// SEED_COMMENTS 도 SEED_REVIEWS 의 음수 ID 에 맞춰 키 재매핑
export const SEED_COMMENTS = Object.fromEntries(
  Object.entries(_RAW_SEED_COMMENTS).map(([rid, arr]) => [_seedIdOffset(Number(rid)), arr])
);

// 인기 태그 (시드). 프로덕션에서는 서버 집계로 대체.
export const POPULAR_TAGS = ["다이어트","푸로틴","비타민","더마아키텍트","바디워시","샴푸","원포원","나눔","힐링","무수분요리","명상","면역"];

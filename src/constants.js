// 앱 전역 상수 — 화면/컴포넌트 전반에서 재사용.
// React/JSX 미사용(순수 데이터). lucide-react 아이콘 참조.
import {
  Star, Smile, Lightbulb, Bookmark,
  Flower2, Coffee, Leaf, Heart, Moon, Sparkles, Flame, Music, Palette, Feather, Cat,
  Droplets, Camera, Wind, Apple, Clock, Activity, Dumbbell, BarChart3, BookOpen, Gift, Users,
  Zap, Utensils, Plus, User, Eye, PenLine, Target, Trophy, Home,
  Wand2,
} from "lucide-react";

// 레거시 상대경로 이미지 CDN 접두 (빈 문자열이면 상대경로 그대로 사용)
export const BASE = import.meta.env.VITE_MEDIA_BASE || "";

// 챌린지 기간
export const CHALLENGE_WEEKS = 8;
export const CHALLENGE_DAYS = CHALLENGE_WEEKS * 7;

// AI 응답 캐시
export const AI_CACHE_MAX = 50;
export const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// 제품 샘플 (실제 카탈로그는 src/data/products.json, src/catalog.js 로 lazy load)
export const PRODUCTS = [
  { id: 2305, name: "암웨이 퀸 Ti 대형 프라이팬", count: 6, category: "home", img: "/media/products/%EC%95%94%EC%9B%A8%EC%9D%B4%ED%80%B8Ti%EB%8C%80%ED%98%95%ED%94%84%EB%9D%BC%EC%9D%B4%ED%8C%AC%EC%A0%84%EA%B3%A8%EB%83%84%EB%B9%84_sQVMIWV.jpg" },
  { id: 2461, name: "벨레이 모데나 발사믹식초", count: 5, category: "food", img: "/media/products/%EB%B2%A8%EB%A0%88%EC%9D%B4%EB%AA%A8%EB%8D%B0%EB%82%98%EB%B0%9C%EC%82%AC%EB%AF%B9%EC%8B%9D%EC%B4%88%EC%9D%B8%EB%B2%A0%ED%82%A4%EC%95%84%ED%86%A0.jpg" },
  { id: 2310, name: "암웨이 퀸 Ti 중형 프라이팬", count: 4, category: "home", img: "/media/products/%EC%95%94%EC%9B%A8%EC%9D%B4%ED%80%B8Ti%EC%A4%91%ED%98%95%ED%94%84%EB%9D%BC%EC%9D%B4%ED%8C%AC_Ar9EJdc.jpg" },
  { id: 2727, name: "L.O.C 다목적 세정제", count: 4, category: "home", img: "/media/products/LOC%EB%B0%94%EC%9D%B4%EC%98%A4%ED%80%98%EC%8A%A4%ED%8A%B8%EC%A3%BC%ED%83%9D%EC%9A%A9%EB%8B%A4%EB%AA%A9%EC%A0%81%EC%84%B8%EC%A0%95%EC%A0%9C.jpg" },
  { id: 2298, name: "암웨이 퀸 Ti 웍", count: 3, category: "home", img: "/media/products/%EC%95%94%EC%9B%A8%EC%9D%B4%ED%80%B8Ti%EC%9B%8D_YOrtEPL.jpg" },
  { id: 2392, name: "뉴트리 파이토 푸로틴", count: 3, category: "food", img: "/media/products/%EB%89%B4%ED%8A%B8%EB%A6%AC%ED%8C%8C%EC%9D%B4%ED%86%A0%ED%91%B8%EB%A1%9C%ED%8B%B4%EC%8A%A4%EB%A7%88%ED%8A%B8%EC%98%A4%EB%8D%94%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A890.jpg" },
  { id: 2429, name: "화이버 비츠 플러스", count: 3, category: "food", img: "/media/products/%ED%99%94%EC%9D%B4%EB%B2%84%EB%B9%84%EC%B8%A0%ED%94%8C%EB%9F%AC%EC%8A%A4408g.jpg" },
  { id: 2506, name: "엔자임 바이옴 (30포)", count: 3, category: "wellness", img: "/media/products/%EC%97%94%EC%9E%90%EC%9E%84%EB%B0%94%EC%9D%B4%EC%98%B430%ED%8F%AC.jpg" },
  { id: 3001, name: "아티스트리 더마아키텍트", count: 8, category: "beauty", img: "" },
  { id: 3002, name: "아티스트리 스튜디오 립스틱", count: 5, category: "beauty", img: "" },
  { id: 3003, name: "아티스트리 하이드라매틱스 크림", count: 4, category: "beauty", img: "" },
  { id: 4001, name: "G&H 오리지널 바디워시", count: 6, category: "kitchen", img: "" },
  { id: 4002, name: "사티니크 모이스처 샴푸", count: 5, category: "kitchen", img: "" },
  { id: 4003, name: "아티스트리 하이드라매틱스 클렌저", count: 4, category: "kitchen", img: "" },
  { id: 4004, name: "글리스터 멀티액션 치약", count: 3, category: "kitchen", img: "" },
  { id: 5001, name: "뉴트리라이트 더블엑스", count: 7, category: "wellness", img: "" },
  { id: 5002, name: "바디키 식사대용 쉐이크", count: 4, category: "wellness", img: "" },
  { id: 5003, name: "아티스트리 오가닉 라벤더 에센셜 오일", count: 3, category: "wellness", img: "" },
  { id: 6001, name: "뉴트리라이트 원포원 프로그램", count: 12, category: "one4one", img: "" },
  { id: 6002, name: "원포원 한정판 에코백", count: 5, category: "one4one", img: "" },
  { id: 6003, name: "뉴트리라이트 키즈 츄어블", count: 4, category: "one4one", img: "" },
];

// 무드 (리뷰에 대한 사용자 반응)
export const MOODS = [
  { key: "love", Icon: Star,      label: "최고",     strong: true,  color: "text-amber-500" },
  { key: "good", Icon: Smile,     label: "좋아요",   strong: false, color: "text-emerald-500" },
  { key: "save", Icon: Bookmark,  label: "기억할것", strong: false, color: "text-sky-500" },
  { key: "wow",  Icon: Lightbulb, label: "영감",     strong: true,  color: "text-violet-500" },
];

// 카테고리 정의 — DS 리뉴얼(2026-04) 이후 단색 톤다운 팔레트(cat-* 토큰).
// `color`(그라디언트)는 레거시 호환용으로 유지 — 3단계에서 실사용처 훑은 뒤 정리.
export const CATEGORIES = {
  food:    { label: "뉴트리션",   color: "from-amber-400 to-orange-500",   chip: "bg-cat-food/10 text-cat-food",         dchip: "bg-cat-food/20 text-cat-food" },
  wellness:{ label: "웰니스",     color: "from-violet-400 to-purple-500",  chip: "bg-cat-wellness/10 text-cat-wellness", dchip: "bg-cat-wellness/20 text-cat-wellness" },
  beauty:  { label: "뷰티",       color: "from-rose-400 to-rose-600",      chip: "bg-cat-beauty/10 text-cat-beauty",     dchip: "bg-cat-beauty/20 text-cat-beauty" },
  kitchen: { label: "퍼스널케어", color: "from-pink-400 to-fuchsia-500",   chip: "bg-cat-kitchen/10 text-cat-kitchen",   dchip: "bg-cat-kitchen/20 text-cat-kitchen" },
  home:    { label: "홈리빙",     color: "from-sky-400 to-blue-500",       chip: "bg-cat-home/10 text-cat-home",         dchip: "bg-cat-home/20 text-cat-home" },
  one4one: { label: "원포원",     color: "from-lime-400 to-green-500",     chip: "bg-cat-one4one/10 text-cat-one4one",   dchip: "bg-cat-one4one/20 text-cat-one4one" },
};

// tailwind.config.js `colors.cat.*` 와 동기화 필수.
export const CAT_SOLID = {
  food: "#C68B3E", wellness: "#7D6A9E", beauty: "#B86B7A", kitchen: "#9A7B8C", home: "#6B8AA8", one4one: "#6F8E6A",
};
export const CAT_ICON = { food: Apple, wellness: Leaf, beauty: Wand2, kitchen: Droplets, home: Home, one4one: Gift };

// 아바타 옵션
export const AVATAR_OPTIONS = [
  { id: "flower",   Icon: Flower2,  color: "from-pink-400 to-rose-500" },
  { id: "coffee",   Icon: Coffee,   color: "from-amber-600 to-orange-700" },
  { id: "leaf",     Icon: Leaf,     color: "from-emerald-400 to-green-500" },
  { id: "heart",    Icon: Heart,    color: "from-rose-400 to-pink-500" },
  { id: "star",     Icon: Star,     color: "from-amber-400 to-yellow-500" },
  { id: "moon",     Icon: Moon,     color: "from-violet-500 to-purple-600" },
  { id: "sparkles", Icon: Sparkles, color: "from-cyan-400 to-blue-500" },
  { id: "flame",    Icon: Flame,    color: "from-rose-500 to-orange-500" },
  { id: "music",    Icon: Music,    color: "from-pink-500 to-fuchsia-500" },
  { id: "palette",  Icon: Palette,  color: "from-purple-400 to-pink-500" },
  { id: "feather",  Icon: Feather,  color: "from-sky-400 to-indigo-500" },
  { id: "cat",      Icon: Cat,      color: "from-amber-500 to-orange-600" },
];

// 챌린지 미션 아이콘 매핑
export const MISSION_ICONS = {
  water: Droplets, shake: Coffee, photo: Camera, walk: Wind, stretch: Leaf,
  protein: Apple, snack: Leaf, clock: Clock, fiber: Leaf,
  cardio: Activity, core: Dumbbell, calorie: BarChart3, sleep: Moon,
  inbody: Activity, review: BookOpen, strength: Dumbbell, cheat: Gift, community: Users,
  hiit: Zap, carb: Utensils, tea: Coffee, pill: Plus, scale: Activity,
  meat: Utensils, camera: Camera, fire: Flame, vitamin: Plus, selfie: User,
  compare: Eye, write: PenLine, plan: Target, trophy: Trophy,
  run: Activity, yoga: Leaf, home: Home, free: Star,
};

// 주차별 챌린지 미션 (8주 x 5개 = 40 미션)
export const CHALLENGE_MISSIONS = [
  { week: 1, title: "습관 형성 주간", missions: [
    { id: "w1m1", label: "아침 공복에 물 500ml 마시기", icon: "water" },
    { id: "w1m2", label: "바디키 쉐이크로 한 끼 대체하기", icon: "shake" },
    { id: "w1m3", label: "식단 사진 3끼 기록하기", icon: "photo" },
    { id: "w1m4", label: "30분 이상 걷기", icon: "walk" },
    { id: "w1m5", label: "취침 전 스트레칭 10분", icon: "stretch" },
  ]},
  { week: 2, title: "식단 조절 주간", missions: [
    { id: "w2m1", label: "단백질 위주 아침 식사하기", icon: "protein" },
    { id: "w2m2", label: "간식을 과일/견과류로 바꾸기", icon: "snack" },
    { id: "w2m3", label: "물 2L 이상 마시기", icon: "water" },
    { id: "w2m4", label: "저녁 8시 이후 금식", icon: "clock" },
    { id: "w2m5", label: "화이버 비츠 섭취하기", icon: "fiber" },
  ]},
  { week: 3, title: "운동 강화 주간", missions: [
    { id: "w3m1", label: "유산소 운동 40분", icon: "cardio" },
    { id: "w3m2", label: "코어 운동 15분", icon: "core" },
    { id: "w3m3", label: "식단 기록 + 칼로리 체크", icon: "calorie" },
    { id: "w3m4", label: "푸로틴 쉐이크 마시기", icon: "shake" },
    { id: "w3m5", label: "수면 7시간 이상 확보", icon: "sleep" },
  ]},
  { week: 4, title: "중간 점검 주간", missions: [
    { id: "w4m1", label: "인바디 측정하기", icon: "inbody" },
    { id: "w4m2", label: "1~3주 식단 돌아보기", icon: "review" },
    { id: "w4m3", label: "근력 운동 30분", icon: "strength" },
    { id: "w4m4", label: "보상 치팅 데이 (1끼)", icon: "cheat" },
    { id: "w4m5", label: "커뮤니티에 중간 후기 공유", icon: "community" },
  ]},
  { week: 5, title: "체지방 공략 주간", missions: [
    { id: "w5m1", label: "HIIT 운동 20분", icon: "hiit" },
    { id: "w5m2", label: "탄수화물 줄이기 (밥 반 공기)", icon: "carb" },
    { id: "w5m3", label: "녹차/블랙커피 마시기", icon: "tea" },
    { id: "w5m4", label: "엔자임 바이옴 섭취", icon: "pill" },
    { id: "w5m5", label: "체중 기록하기", icon: "scale" },
  ]},
  { week: 6, title: "근육량 UP 주간", missions: [
    { id: "w6m1", label: "단백질 체중 x 1.5g 섭취", icon: "meat" },
    { id: "w6m2", label: "근력 운동 45분", icon: "strength" },
    { id: "w6m3", label: "바디키 쉐이크 + 푸로틴 콤보", icon: "shake" },
    { id: "w6m4", label: "충분한 수분 섭취 (2.5L)", icon: "water" },
    { id: "w6m5", label: "운동 인증 사진 촬영", icon: "camera" },
  ]},
  { week: 7, title: "마무리 스퍼트 주간", missions: [
    { id: "w7m1", label: "유산소 + 근력 복합 운동 50분", icon: "fire" },
    { id: "w7m2", label: "식단 완벽 기록 (3끼+간식)", icon: "photo" },
    { id: "w7m3", label: "인바디 측정 (중간 비교)", icon: "inbody" },
    { id: "w7m4", label: "더블엑스 비타민 섭취", icon: "vitamin" },
    { id: "w7m5", label: "내 변화 셀피 찍기", icon: "selfie" },
  ]},
  { week: 8, title: "완주 주간", missions: [
    { id: "w8m1", label: "최종 인바디 측정", icon: "inbody" },
    { id: "w8m2", label: "8주 전후 비교 사진 촬영", icon: "compare" },
    { id: "w8m3", label: "완주 후기 작성하기", icon: "write" },
    { id: "w8m4", label: "유지 식단 플랜 세우기", icon: "plan" },
    { id: "w8m5", label: "커뮤니티에 완주 인증", icon: "trophy" },
  ]},
];

// 운동 유형 (강도별 분당 칼로리)
export const EXERCISE_TYPES = [
  { key: "walking", label: "걷기", Icon: Wind, calPerMin: { low: 3, mid: 4.5, high: 6.5 } },
  { key: "running", label: "달리기", Icon: Activity, calPerMin: { low: 7, mid: 10, high: 14 } },
  { key: "yoga", label: "요가", Icon: Leaf, calPerMin: { low: 2.5, mid: 4, high: 6 } },
  { key: "strength", label: "근력", Icon: Dumbbell, calPerMin: { low: 4, mid: 6.5, high: 9 } },
  { key: "home", label: "홈트", Icon: Home, calPerMin: { low: 3.5, mid: 5.5, high: 8 } },
  { key: "free", label: "자유", Icon: Star, calPerMin: { low: 3, mid: 5, high: 7 } },
];

// AI 코치 톤
export const AI_COACH_TONES = [
  { key: "cheerful", label: "열정 코치", Icon: Flame, color: "from-rose-400 to-orange-500", desc: "에너지 넘치는 응원 스타일", example: "오늘도 최고! 한 걸음 더 가보자!" },
  { key: "gentle", label: "따뜻한 멘토", Icon: Heart, color: "from-emerald-400 to-teal-500", desc: "부드럽고 공감하는 스타일", example: "잘하고 있어요. 당신의 속도가 맞아요." },
  { key: "strict", label: "엄격한 트레이너", Icon: Dumbbell, color: "from-sky-400 to-blue-500", desc: "냉철하고 정확한 스타일", example: "목표까지 남은 칼로리 200kcal. 마무리 운동 하세요." },
  { key: "funny", label: "유머 친구", Icon: Sparkles, color: "from-amber-400 to-yellow-500", desc: "재미있게 동기부여하는 스타일", example: "야식 먹으면 내일의 너가 울어~ 참아봐!" },
];

// 신고 사유
export const REPORT_REASONS = [
  { key: "spam", label: "스팸/광고" },
  { key: "abuse", label: "괴롭힘/욕설" },
  { key: "inappropriate", label: "부적절한 콘텐츠" },
  { key: "misinfo", label: "허위/오해 소지" },
  { key: "etc", label: "기타" },
];

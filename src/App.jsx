import { useState, useEffect, useMemo, useRef, Component } from "react";
import {
  Home, Utensils, Heart, Users, User, Bell, Search, ArrowLeft, Plus,
  Eye, Moon, Sun, Sparkles, MessageCircle, Share2, Bookmark, X,
  Calendar, Camera, Check, Flame, TrendingUp, ExternalLink, ChevronRight,
  Leaf, ChefHat, Star, Smile, Lightbulb, Coffee, Cat, Music, Palette, Feather, Layers, RefreshCw,
  BookOpen, PenLine, Target, Gift, Inbox, Flower2, Wand2, Apple, Wind, Droplets, ShoppingBag,
  Trophy, Dumbbell, Activity, Clock, ChevronDown, ChevronUp, Minus, Edit3,
  BarChart3, Timer, Zap, Award, Lock, Unlock, Image, Download, Send, Hash, CircleUser,
  Package, Tag, Grid3X3, List
} from "lucide-react";

import CATALOG from "./data/products.json";
import { supabase, auth as supabaseAuth, reviews as supabaseReviews, favorites as supabaseFavorites, comments as supabaseComments } from "./supabase.js";

const BASE = "http://158.247.241.36";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("Waylog error:", error, info);
  }
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen max-w-md mx-auto flex flex-col items-center justify-center p-8 bg-gray-50 text-center"
          style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-xl mb-6">
            <X size={36} className="text-white"/>
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">문제가 발생했어요</h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
            일시적인 오류로 화면을 표시할 수 없어요.
            <br/>
            작성 중이던 내용은 자동 저장돼 있어요.
          </p>
          <div className="flex gap-2 mt-6 w-full max-w-xs">
            <button onClick={this.handleReset}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-2xl font-bold text-sm active:scale-95 transition">
              다시 시도
            </button>
            <button onClick={() => window.location.reload()}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-sm active:scale-95 transition">
              새로고침
            </button>
          </div>
          {this.state.error && (
            <details className="mt-6 text-xs text-gray-400 max-w-xs">
              <summary className="cursor-pointer">오류 세부정보</summary>
              <p className="mt-2 text-left break-all opacity-70">{String(this.state.error?.message || this.state.error)}</p>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------- SEED DATA ----------
const SEED_REVIEWS = [
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

const PRODUCTS = [
  { id: 2305, name: "암웨이 퀸 Ti 대형 프라이팬", count: 6, category: "home", img: "/media/products/%EC%95%94%EC%9B%A8%EC%9D%B4%ED%80%B8Ti%EB%8C%80%ED%98%95%ED%94%84%EB%9D%BC%EC%9D%B4%ED%8C%AC%EC%A0%84%EA%B3%A8%EB%83%84%EB%B9%84_sQVMIWV.jpg" },
  { id: 2461, name: "벨레이 모데나 발사믹식초", count: 5, category: "food", img: "/media/products/%EB%B2%A8%EB%A0%88%EC%9D%B4%EB%AA%A8%EB%8D%B0%EB%82%98%EB%B0%9C%EC%82%AC%EB%AF%B9%EC%8B%9D%EC%B4%88%EC%9D%B8%EB%B2%A0%ED%82%A4%EC%95%84%ED%86%A0.jpg" },
  { id: 2310, name: "암웨이 퀸 Ti 중형 프라이팬", count: 4, category: "home", img: "/media/products/%EC%95%94%EC%9B%A8%EC%9D%B4%ED%80%B8Ti%EC%A4%91%ED%98%95%ED%94%84%EB%9D%BC%EC%9D%B4%ED%8C%AC_Ar9EJdc.jpg" },
  { id: 2727, name: "L.O.C 다목적 세정제", count: 4, category: "home", img: "/media/products/LOC%EB%B0%94%EC%9D%B4%EC%98%A4%ED%80%98%EC%8A%A4%ED%8A%B8%EC%A3%BC%ED%83%9D%EC%9A%A9%EB%8B%A4%EB%AA%A9%EC%A0%81%EC%84%B8%EC%A0%95%EC%A0%9C.jpg" },
  { id: 2298, name: "암웨이 퀸 Ti 웍", count: 3, category: "home", img: "/media/products/%EC%95%94%EC%9B%A8%EC%9D%B4%ED%80%B8Ti%EC%9B%8D_YOrtEPL.jpg" },
  { id: 2392, name: "뉴트리 파이토 푸로틴", count: 3, category: "food", img: "/media/products/%EB%89%B4%ED%8A%B8%EB%A6%AC%ED%8C%8C%EC%9D%B4%ED%86%A0%ED%91%B8%EB%A1%9C%ED%8B%B4%EC%8A%A4%EB%A7%88%ED%8A%B8%EC%98%A4%EB%8D%94%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A890.jpg" },
  { id: 2429, name: "화이버 비츠 플러스", count: 3, category: "food", img: "/media/products/%ED%99%94%EC%9D%B4%EB%B2%84%EB%B9%84%EC%B8%A0%ED%94%8C%EB%9F%AC%EC%8A%A4408g.jpg" },
  { id: 2506, name: "엔자임 바이옴 (30포)", count: 3, category: "wellness", img: "/media/products/%EC%97%94%EC%9E%90%EC%9E%84%EB%B0%94%EC%9D%B4%EC%98%B430%ED%8F%AC.jpg" },
  // 뷰티
  { id: 3001, name: "아티스트리 더마아키텍트", count: 8, category: "beauty", img: "" },
  { id: 3002, name: "아티스트리 스튜디오 립스틱", count: 5, category: "beauty", img: "" },
  { id: 3003, name: "아티스트리 하이드라매틱스 크림", count: 4, category: "beauty", img: "" },
  // 퍼스널케어
  { id: 4001, name: "G&H 오리지널 바디워시", count: 6, category: "kitchen", img: "" },
  { id: 4002, name: "사티니크 모이스처 샴푸", count: 5, category: "kitchen", img: "" },
  { id: 4003, name: "아티스트리 하이드라매틱스 클렌저", count: 4, category: "kitchen", img: "" },
  { id: 4004, name: "글리스터 멀티액션 치약", count: 3, category: "kitchen", img: "" },
  // 웰니스
  { id: 5001, name: "뉴트리라이트 더블엑스", count: 7, category: "wellness", img: "" },
  { id: 5002, name: "바디키 식사대용 쉐이크", count: 4, category: "wellness", img: "" },
  { id: 5003, name: "아티스트리 오가닉 라벤더 에센셜 오일", count: 3, category: "wellness", img: "" },
  // 원포원
  { id: 6001, name: "뉴트리라이트 원포원 프로그램", count: 12, category: "one4one", img: "" },
  { id: 6002, name: "원포원 한정판 에코백", count: 5, category: "one4one", img: "" },
  { id: 6003, name: "뉴트리라이트 키즈 츄어블", count: 4, category: "one4one", img: "" },
];

const POPULAR_TAGS = ["다이어트","푸로틴","비타민","더마아키텍트","바디워시","샴푸","원포원","나눔","힐링","무수분요리","명상","면역"];

const MOODS = [
  { key: "love", Icon: Star,      label: "최고",     strong: true,  color: "text-amber-500" },
  { key: "good", Icon: Smile,     label: "좋아요",   strong: false, color: "text-emerald-500" },
  { key: "save", Icon: Bookmark,  label: "기억할것", strong: false, color: "text-sky-500" },
  { key: "wow",  Icon: Lightbulb, label: "영감",     strong: true,  color: "text-violet-500" },
];

const CATEGORIES = {
  food:    { label: "뉴트리션",   color: "from-amber-400 to-orange-500",   chip: "bg-amber-50 text-amber-700",     dchip: "bg-amber-900/40 text-amber-300" },
  wellness:{ label: "웰니스",     color: "from-violet-400 to-purple-500",  chip: "bg-violet-50 text-violet-700",   dchip: "bg-violet-900/40 text-violet-300" },
  beauty:  { label: "뷰티",       color: "from-pink-400 to-rose-500",      chip: "bg-pink-50 text-pink-700",       dchip: "bg-pink-900/40 text-pink-300" },
  kitchen: { label: "퍼스널케어", color: "from-cyan-400 to-teal-500",      chip: "bg-cyan-50 text-cyan-700",       dchip: "bg-cyan-900/40 text-cyan-300" },
  home:    { label: "홈리빙",     color: "from-sky-400 to-blue-500",       chip: "bg-sky-50 text-sky-700",         dchip: "bg-sky-900/40 text-sky-300" },
  one4one: { label: "원포원",     color: "from-lime-400 to-green-500",     chip: "bg-lime-50 text-green-700",      dchip: "bg-green-900/40 text-green-300" },
};

const CAT_SOLID = {
  food: "#f59e0b", wellness: "#8b5cf6", beauty: "#ec4899", kitchen: "#06b6d4", home: "#0ea5e9", one4one: "#22c55e",
};
const CAT_ICON = { food: Apple, wellness: Leaf, beauty: Wand2, kitchen: Droplets, home: Home, one4one: Gift };

const SIGNATURES = {
  food: "영양으로 건강을 챙기는",
  wellness: "마음의 균형을 찾는",
  beauty: "아름다움을 큐레이션하는",
  kitchen: "나를 정성껏 가꾸는",
  home: "일상을 정성껏 가꾸는",
  one4one: "나눔으로 세상을 바꾸는",
};

const AVATAR_OPTIONS = [
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

const getAvatarOpt = (id) => AVATAR_OPTIONS.find((a) => a.id === id) || AVATAR_OPTIONS[0];

const Avatar = ({ id, size = 24, className = "", rounded = "rounded-full" }) => {
  const isImage = id && typeof id === "string" && id.startsWith("data:");
  if (isImage) {
    return (
      <div className={cls("overflow-hidden bg-gray-200", rounded, className)}>
        <img src={id} alt="" className="w-full h-full object-cover"/>
      </div>
    );
  }
  return (
    <div className={cls("bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-end justify-center text-gray-400 dark:text-gray-500 shrink-0 overflow-hidden", rounded, className)}>
      <User size={Math.floor(size * 1.1)} strokeWidth={2} className="translate-y-[8%]" fill="currentColor"/>
    </div>
  );
};

const SEED_COMMENTS = {
  142: [
    { id: 1, author: "요리초보", createdAt: Date.now() - 2 * 60 * 60 * 1000, text: "오 양조간장 비율 어떻게 되나요?", likedBy: [] },
    { id: 2, author: "건강한엄마", createdAt: Date.now() - 60 * 60 * 1000, text: "저도 이거 사야겠어요 🙏", likedBy: [] },
  ],
  150: [{ id: 1, author: "피부고민중", createdAt: Date.now() - 26 * 60 * 60 * 1000, text: "사용 순서가 어떻게 되세요??", likedBy: [] }],
};

// ---------- CHALLENGE CONSTANTS ----------
const CHALLENGE_WEEKS = 8;
const CHALLENGE_DAYS = CHALLENGE_WEEKS * 7;

const MISSION_ICONS = {
  water: Droplets, shake: Coffee, photo: Camera, walk: Wind, stretch: Leaf,
  protein: Apple, snack: Leaf, clock: Clock, fiber: Leaf,
  cardio: Activity, core: Dumbbell, calorie: BarChart3, sleep: Moon,
  inbody: Activity, review: BookOpen, strength: Dumbbell, cheat: Gift, community: Users,
  hiit: Zap, carb: Utensils, tea: Coffee, pill: Plus, scale: Activity,
  meat: Utensils, camera: Camera, fire: Flame, vitamin: Plus, selfie: User,
  compare: Eye, write: PenLine, plan: Target, trophy: Trophy,
  run: Activity, yoga: Leaf, home: Home, free: Star,
};

const CHALLENGE_MISSIONS = [
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

const MissionIcon = ({ iconKey, size = 14, className }) => {
  const Icon = MISSION_ICONS[iconKey] || Target;
  return <Icon size={size} className={className}/>;
};

const EXERCISE_TYPES = [
  { key: "walking", label: "걷기", Icon: Wind, calPerMin: { low: 3, mid: 4.5, high: 6.5 } },
  { key: "running", label: "달리기", Icon: Activity, calPerMin: { low: 7, mid: 10, high: 14 } },
  { key: "yoga", label: "요가", Icon: Leaf, calPerMin: { low: 2.5, mid: 4, high: 6 } },
  { key: "strength", label: "근력", Icon: Dumbbell, calPerMin: { low: 4, mid: 6.5, high: 9 } },
  { key: "home", label: "홈트", Icon: Home, calPerMin: { low: 3.5, mid: 5.5, high: 8 } },
  { key: "free", label: "자유", Icon: Star, calPerMin: { low: 3, mid: 5, high: 7 } },
];

const AI_COACH_TONES = [
  { key: "cheerful", label: "열정 코치", Icon: Flame, color: "from-rose-400 to-orange-500", desc: "에너지 넘치는 응원 스타일", example: "오늘도 최고! 한 걸음 더 가보자!" },
  { key: "gentle", label: "따뜻한 멘토", Icon: Heart, color: "from-emerald-400 to-teal-500", desc: "부드럽고 공감하는 스타일", example: "잘하고 있어요. 당신의 속도가 맞아요." },
  { key: "strict", label: "엄격한 트레이너", Icon: Dumbbell, color: "from-sky-400 to-blue-500", desc: "냉철하고 정확한 스타일", example: "목표까지 남은 칼로리 200kcal. 마무리 운동 하세요." },
  { key: "funny", label: "유머 친구", Icon: Sparkles, color: "from-amber-400 to-yellow-500", desc: "재미있게 동기부여하는 스타일", example: "야식 먹으면 내일의 너가 울어~ 참아봐!" },
];

// ---------- CLAUDE AI API ----------
// 프록시 경로: /api/claude → https://api.anthropic.com (vite.config.js에서 설정)
// 프로덕션 배포 시 Firebase Cloud Functions로 마이그레이션 필요
const callClaude = async (prompt, maxTokens = 500) => {
  try {
    const res = await fetch("/api/claude/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text || "";
  } catch (e) {
    console.warn("Claude API 호출 실패, 폴백 사용:", e.message);
    return null;
  }
};

const fallbackMeals = {
  breakfast: [
    { name: "계란 스크램블 + 통밀빵", cal: 380, protein: 22, carb: 35, fat: 16 },
    { name: "그릭요거트 + 그래놀라", cal: 310, protein: 18, carb: 42, fat: 8 },
    { name: "바나나 + 아몬드 버터 토스트", cal: 340, protein: 12, carb: 45, fat: 14 },
  ],
  lunch: [
    { name: "닭가슴살 샐러드", cal: 420, protein: 35, carb: 28, fat: 18 },
    { name: "연어 포케볼", cal: 510, protein: 30, carb: 52, fat: 16 },
    { name: "제육볶음 정식", cal: 620, protein: 28, carb: 68, fat: 24 },
  ],
  dinner: [
    { name: "두부 스테이크 + 야채", cal: 350, protein: 24, carb: 22, fat: 18 },
    { name: "현미밥 + 된장찌개", cal: 440, protein: 20, carb: 58, fat: 12 },
    { name: "고등어구이 + 나물", cal: 480, protein: 32, carb: 38, fat: 20 },
  ],
};

const aiMealAnalysis = async (mealType) => {
  const mealLabel = { breakfast: "아침", lunch: "점심", dinner: "저녁" }[mealType] || "식사";
  const text = await callClaude(
    `한국인의 일반적인 ${mealLabel} 식사 메뉴를 하나 추정해주세요. JSON만 응답: {"name":"음식 이름","cal":칼로리숫자,"protein":단백질g,"carb":탄수화물g,"fat":지방g}`,
    200
  );
  if (text) {
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {}
  }
  const options = fallbackMeals[mealType] || fallbackMeals.lunch;
  return options[Math.floor(Math.random() * options.length)];
};

const aiCoachMessage = async (tone, dayNum, completedMissions, totalMissions) => {
  const rate = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;
  const toneDesc = { cheerful: "열정적이고 에너지 넘치는", gentle: "따뜻하고 공감하는", strict: "냉철하고 엄격한", funny: "유머러스하고 재미있는" }[tone] || "친근한";
  const text = await callClaude(
    `당신은 ${toneDesc} 피트니스 코치입니다. 사용자의 챌린지 Day ${dayNum}/56, 오늘 미션 달성률 ${rate}%입니다. 한국어로 1-2문장 짧은 코칭 멘트를 해주세요. 이모지 1개 포함. 텍스트만 응답하세요.`,
    150
  );
  if (text) return text.trim();
  // 폴백
  const msgs = {
    cheerful: rate >= 80 ? "완벽한 하루! 이 기세 그대로 내일도 불태우자!" : rate >= 50 ? "좋아요! 절반 이상 해냈어요. 마저 해볼까요?" : "오늘도 시작한 것만으로 대단해요!",
    gentle: rate >= 80 ? "오늘도 잘 마무리했네요. 자랑스러워요." : rate >= 50 ? "꾸준함이 가장 큰 힘이에요. 잘하고 있어요." : "쉬어가는 것도 실력이에요.",
    strict: rate >= 80 ? "목표 달성. 내일은 강도를 올리세요." : rate >= 50 ? `미션 ${totalMissions - completedMissions}개 미완. 마무리하세요.` : "진행률이 낮습니다. 행동이 필요합니다.",
    funny: rate >= 80 ? "올 클리어?! 너 진짜 인간이야?" : rate >= 50 ? "반 이상 했으면 대충 다 한 거지... 아닙니다." : "핸드폰 들어올리기는 운동이 아닙니다.",
  };
  return msgs[tone] || msgs.cheerful;
};

const aiDailyReport = async (totalCal, totalBurned, completedMissions, totalMissions, targetCal) => {
  const rate = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;
  const text = await callClaude(
    `피트니스 일일 리포트 코멘트를 한국어 1-2문장으로 작성해주세요. 오늘 섭취 ${totalCal}kcal (목표 ${targetCal}kcal), 소비 ${totalBurned}kcal, 미션 달성률 ${rate}%. 격려와 구체적 조언을 포함. 텍스트만 응답.`,
    150
  );
  if (text) return text.trim();
  return rate >= 80 ? "오늘 하루 정말 잘 보냈어요! 내일도 이 기세로!" : rate >= 50 ? "절반 이상 달성! 조금만 더 힘내봐요." : "내일은 더 좋은 하루가 될 거예요. 화이팅!"
};

const calcBMR = (weight, height, age, gender) => {
  if (gender === "male") return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
};

const calcTargetCalories = (bmr, goal) => {
  if (goal === "lose") return Math.round(bmr * 1.3 - 500);
  if (goal === "muscle") return Math.round(bmr * 1.5 + 200);
  return Math.round(bmr * 1.4);
};

const getChallengeDay = (startDate) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  return Math.max(1, Math.min(CHALLENGE_DAYS, Math.floor((now - start) / 86400000) + 1));
};

const getChallengeWeek = (dayNum) => Math.min(CHALLENGE_WEEKS, Math.ceil(dayNum / 7));

// ---------- HOOKS ----------
const useStoredState = (key, initial) => {
  const [val, setVal] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage?.get(key);
        if (r?.value) setVal(JSON.parse(r.value));
      } catch {}
      setLoaded(true);
    })();
  }, [key]);
  const update = async (next) => {
    const v = typeof next === "function" ? next(val) : next;
    setVal(v);
    try { await window.storage?.set(key, JSON.stringify(v)); } catch {}
  };
  return [val, update, loaded];
};

const useNavStack = () => {
  const [stack, setStack] = useState([]); // each: { type, payload }
  const push = (s) => setStack((prev) => [...prev, s]);
  const pop = () => setStack((prev) => prev.slice(0, -1));
  const reset = () => setStack([]);
  return { stack, push, pop, reset, top: stack[stack.length - 1] };
};

const useExit = (onDone) => {
  const [exiting, setExiting] = useState(false);
  const close = () => { if (exiting) return; setExiting(true); setTimeout(onDone, 260); };
  return [exiting, close];
};

const useTimeGradient = (dark = false) => {
  const [hour, setHour] = useState(new Date().getHours());
  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60000);
    return () => clearInterval(t);
  }, []);

  const lightMap = [
    { range: [5, 8],   gradient: "from-sky-300 via-cyan-300 to-emerald-300",      solid: "from-cyan-500 to-emerald-500",    name: "새벽", text: "고요한 새벽이에요" },
    { range: [8, 12],  gradient: "from-emerald-400 via-teal-500 to-cyan-500",     solid: "from-emerald-500 to-teal-500",    name: "아침", text: "활기찬 아침이에요" },
    { range: [12, 17], gradient: "from-amber-300 via-emerald-400 to-teal-500",    solid: "from-emerald-500 to-amber-500",   name: "오후", text: "따스한 오후예요" },
    { range: [17, 20], gradient: "from-orange-300 via-pink-400 to-violet-500",    solid: "from-pink-500 to-violet-500",     name: "저녁", text: "노을이 물드는 시간" },
    { range: [20, 24], gradient: "from-indigo-500 via-violet-600 to-purple-700",  solid: "from-violet-500 to-purple-600",   name: "밤",   text: "차분한 밤이에요" },
    { range: [0, 5],   gradient: "from-slate-700 via-indigo-900 to-purple-900",   solid: "from-indigo-600 to-purple-700",   name: "심야", text: "고요한 심야예요" },
  ];
  const darkMap = [
    { range: [5, 8],   gradient: "from-sky-700 via-cyan-700 to-emerald-700",      solid: "from-cyan-300 to-emerald-300",    name: "새벽", text: "고요한 새벽이에요" },
    { range: [8, 12],  gradient: "from-emerald-600 via-teal-600 to-cyan-600",     solid: "from-emerald-300 to-teal-300",    name: "아침", text: "활기찬 아침이에요" },
    { range: [12, 17], gradient: "from-amber-600 via-emerald-600 to-teal-600",    solid: "from-emerald-300 to-amber-300",   name: "오후", text: "따스한 오후예요" },
    { range: [17, 20], gradient: "from-orange-600 via-pink-600 to-violet-700",    solid: "from-pink-300 to-violet-300",     name: "저녁", text: "노을이 물드는 시간" },
    { range: [20, 24], gradient: "from-indigo-600 via-violet-700 to-purple-800",  solid: "from-violet-300 to-purple-300",   name: "밤",   text: "차분한 밤이에요" },
    { range: [0, 5],   gradient: "from-slate-600 via-indigo-700 to-purple-800",   solid: "from-indigo-300 to-purple-300",   name: "심야", text: "고요한 심야예요" },
  ];
  const map = dark ? darkMap : lightMap;
  return map.find((m) => hour >= m.range[0] && hour < m.range[1]) || map[0];
};

// ---------- TINY UI HELPERS ----------
const cls = (...a) => a.filter(Boolean).join(" ");
const formatRelativeTime = (createdAt, fallback = "방금") => {
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

const CategoryIcon = ({ cat, size = 22, strokeWidth = 2, className }) => {
  const Icon = CAT_ICON[cat] || Sparkles;
  return <Icon size={size} strokeWidth={strokeWidth} className={className}/>;
};

const CategoryChip = ({ cat, dark }) => {
  const c = CATEGORIES[cat] || CATEGORIES.food;
  return <span className={cls("text-xs px-2 py-0.5 rounded-full font-bold ring-1 shadow-sm", dark ? cls(c.dchip, "ring-white/20") : cls(c.chip, "ring-white/90"))}>{c.label}</span>;
};

const HeartBtn = ({ on, onClick, dark, size = 14 }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    aria-label={on ? "좋아요 취소" : "좋아요"}
    aria-pressed={on}
    className={cls("p-1.5 rounded-full backdrop-blur transition-transform active:scale-90",
      on ? "bg-rose-500/95" : dark ? "bg-black/50" : "bg-white/85")}
  >
    <Heart size={size} className={on ? "text-white fill-white" : dark ? "text-white" : "text-gray-700"} />
  </button>
);

const ProductImage = ({ src, alt, className, iconSize = 32 }) => {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={cls("flex items-center justify-center text-gray-300", className)}>
        <ShoppingBag size={iconSize}/>
      </div>
    );
  }
  return (
    <img src={src} alt={alt || ""} className={className} loading="lazy" onError={() => setError(true)}/>
  );
};

const FallbackImg = ({ r, className }) => {
  const c = CATEGORIES[r.category] || CATEGORIES.food;
  return (
    <div className={cls("flex items-center justify-center bg-gradient-to-br text-white", c.color, className)}>
      <CategoryIcon cat={r.category} size={42} strokeWidth={1.8}/>
    </div>
  );
};

const findCatalogImage = (review) => {
  if (!review) return null;
  const productName = (review.product || "").toLowerCase();
  if (!productName) return null;
  const match = (CATALOG || []).find((p) => productName.includes((p.name || "").toLowerCase()) || (p.name || "").toLowerCase().includes(productName));
  return match?.imageUrl || null;
};

const CAT_PICK_BG = {
  food:     { light: "bg-amber-50",   dark: "bg-amber-950",   text: "text-amber-900",   textDark: "text-amber-100",   sub: "text-amber-700",   subDark: "text-amber-300",   chip: "bg-amber-200/60 text-amber-800", chipDark: "bg-amber-800/40 text-amber-200", accent: "#f59e0b" },
  wellness: { light: "bg-violet-50",  dark: "bg-violet-950",  text: "text-violet-900",  textDark: "text-violet-100",  sub: "text-violet-600",  subDark: "text-violet-300",  chip: "bg-violet-200/60 text-violet-800", chipDark: "bg-violet-800/40 text-violet-200", accent: "#8b5cf6" },
  beauty:   { light: "bg-pink-50",    dark: "bg-pink-950",    text: "text-pink-900",    textDark: "text-pink-100",    sub: "text-pink-600",    subDark: "text-pink-300",    chip: "bg-pink-200/60 text-pink-800", chipDark: "bg-pink-800/40 text-pink-200", accent: "#ec4899" },
  kitchen:  { light: "bg-cyan-50",    dark: "bg-cyan-950",    text: "text-cyan-900",    textDark: "text-cyan-100",    sub: "text-cyan-600",    subDark: "text-cyan-300",    chip: "bg-cyan-200/60 text-cyan-800", chipDark: "bg-cyan-800/40 text-cyan-200", accent: "#06b6d4" },
  home:     { light: "bg-sky-50",     dark: "bg-sky-950",     text: "text-sky-900",     textDark: "text-sky-100",     sub: "text-sky-600",     subDark: "text-sky-300",     chip: "bg-sky-200/60 text-sky-800", chipDark: "bg-sky-800/40 text-sky-200", accent: "#0ea5e9" },
  one4one:  { light: "bg-green-50",   dark: "bg-green-950",   text: "text-green-900",   textDark: "text-green-100",   sub: "text-green-600",   subDark: "text-green-300",   chip: "bg-green-200/60 text-green-800", chipDark: "bg-green-800/40 text-green-200", accent: "#22c55e" },
};

const SmartImg = ({ r, className }) => {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!r.img || errored) return <FallbackImg r={r} className={className}/>;
  const src = r.img.startsWith("data:") || r.img.startsWith("http") ? r.img : `${BASE}${r.img}`;
  return (
    <div className={cls("relative overflow-hidden", className)}>
      {!loaded && <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer"/>}
      <img src={src} alt=""
        className={cls("w-full h-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        onLoad={() => setLoaded(true)} onError={() => setErrored(true)}/>
    </div>
  );
};

const Card = ({ r, onOpen, favs, toggleFav, dark }) => (
  <button onClick={() => onOpen(r)} className={cls("text-left rounded-2xl shadow-sm overflow-hidden w-full transition active:scale-[0.98]", dark ? "bg-gray-800" : "bg-white")}>
    <div className="relative">
      <SmartImg r={r} className="w-full h-44 object-cover"/>
      <div className="absolute top-2 left-2"><CategoryChip cat={r.category} dark={dark} /></div>
      <div className="absolute top-2 right-2"><HeartBtn on={favs.has(r.id)} onClick={() => toggleFav(r.id)} dark={dark} /></div>
      {r.media && r.media.length > 0 && (() => {
        const hasVideo = r.media.some((m) => m.type === "video");
        const showBadge = r.media.length > 1 || hasVideo;
        if (!showBadge) return null;
        return (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-black tabular-nums shadow-lg ring-1 ring-white/30 inline-flex items-center gap-1">
            {hasVideo ? (
              <div className="w-0 h-0 border-l-[5px] border-l-white border-y-[3px] border-y-transparent ml-0.5"/>
            ) : (
              <Layers size={10} strokeWidth={2.5}/>
            )}
            {r.media.length > 1 && <span>{r.media.length}</span>}
          </div>
        );
      })()}
    </div>
    <div className="p-3">
      <p className={cls("text-sm font-bold leading-snug line-clamp-2", dark ? "text-white" : "text-gray-900")}>{r.title}</p>
      {r.product && <p className={cls("text-xs font-medium mt-1.5 line-clamp-1 opacity-90", dark ? "text-gray-300" : "text-gray-600")}>{r.product}</p>}
      <div className={cls("flex items-center gap-2.5 mt-2 text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>
        <span className="flex items-center gap-1"><Heart size={11}/> {r.likes}</span>
        <span className="flex items-center gap-1"><Eye size={11}/> {r.views}</span>
      </div>
    </div>
  </button>
);

const SectionTitle = ({ title, sub, dark, tier = 1 }) => {
  if (tier === 3) {
    return (
      <div className="px-4 mt-10 mb-3">
        <h2 className={cls("text-xs font-bold uppercase tracking-widest", dark ? "text-gray-500" : "text-gray-500")}>{title}</h2>
        {sub && <p className={cls("text-xs mt-1", dark ? "text-gray-500" : "text-gray-500")}>{sub}</p>}
      </div>
    );
  }
  if (tier === 2) {
    return (
      <div className="px-4 mt-8 mb-3">
        <h2 className={cls("text-base font-bold tracking-tight", dark ? "text-gray-200" : "text-gray-800")}>{title}</h2>
        {sub && <p className={cls("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>{sub}</p>}
      </div>
    );
  }
  return (
    <div className="px-4 mt-7 mb-3">
      <h2 className={cls("text-lg font-extrabold tracking-tight", dark ? "text-white" : "text-gray-900")}>{title}</h2>
      {sub && <p className={cls("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>{sub}</p>}
    </div>
  );
};

// ---------- SIGNATURE: SWIPE PICK ----------
const SwipePick = ({ reviews, onLike, onPass, dark }) => {
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(0);
  const [exitDir, setExitDir] = useState(0); // -1 / 0 / 1
  const startX = useRef(null);

  const top = reviews[idx];
  const next = reviews[idx + 1];
  if (!top) {
    return (
      <div className={cls("mx-4 mt-3 h-72 rounded-3xl flex flex-col items-center justify-center", dark ? "bg-gray-800" : "bg-white")}>
        <Check size={32} className="text-emerald-500 mb-2"/>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>오늘의 픽 완료!</p>
        <p className={cls("text-xs mt-1 mb-4", dark ? "text-gray-400" : "text-gray-500")}>내일 새로운 추천이 기다려요</p>
        <button onClick={() => setIdx(0)} className="px-4 py-2 rounded-full bg-emerald-500 text-white text-xs font-bold active:scale-95 transition">다시 시작</button>
      </div>
    );
  }

  const fly = (dir) => {
    setExitDir(dir);
    if (dir > 0) onLike(top); else onPass(top);
    setTimeout(() => { setIdx((i) => i + 1); setDrag(0); setExitDir(0); }, 280);
  };

  const onStart = (e) => { if (exitDir) return; startX.current = (e.touches?.[0]?.clientX ?? e.clientX); };
  const onMove = (e) => {
    if (startX.current == null || exitDir) return;
    setDrag((e.touches?.[0]?.clientX ?? e.clientX) - startX.current);
  };
  const onEnd = () => {
    if (exitDir) return;
    if (Math.abs(drag) > 80) fly(drag > 0 ? 1 : -1);
    else setDrag(0);
    startX.current = null;
  };

  const offset = exitDir ? exitDir * 500 : drag;
  const rot = offset / 15;
  const opacity = exitDir ? 0 : 1 - Math.min(Math.abs(drag) / 300, 0.5);

  return (
    <div className="mx-4 mt-3 mb-4 relative select-none" style={{ height: "20rem" }}>
      {next && (
        <div className={cls("absolute inset-x-3 top-2 bottom-2 rounded-3xl shadow overflow-hidden", dark ? "bg-gray-800" : "bg-white")}
             style={{ transform: exitDir ? "scale(1)" : "scale(0.95)", transition: "transform 0.28s ease-out" }}>
          <SmartImg r={next} className="w-full h-full object-cover opacity-60"/>
        </div>
      )}
      <div
        className={cls("absolute inset-0 rounded-3xl shadow-xl overflow-hidden cursor-grab active:cursor-grabbing", dark ? "bg-gray-800" : "bg-white")}
        style={{ transform: `translateX(${offset}px) rotate(${rot}deg)`, opacity, transition: (startX.current && !exitDir) ? "none" : "all 0.28s ease-out" }}
        onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
      >
        <SmartImg r={top} className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"/>
        <div className="absolute top-3 left-3"><CategoryChip cat={top.category} dark={false}/></div>
        {drag > 30 && <div className="absolute top-6 right-6 px-3 py-1.5 rounded-lg border-4 border-rose-500 text-rose-500 font-extrabold text-xl rotate-12">LIKE</div>}
        {drag < -30 && <div className="absolute top-6 left-6 px-3 py-1.5 rounded-lg border-4 border-gray-400 text-gray-400 font-extrabold text-xl -rotate-12">PASS</div>}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <p className="text-lg font-extrabold drop-shadow">{top.title}</p>
          <p className="text-xs opacity-90 mt-1 line-clamp-1">{top.product}</p>
        </div>
      </div>
    </div>
  );
};

// ---------- SCREENS ----------
const TodaysPickCard = ({ picks, dark, onOpen }) => {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!picks || picks.length === 0 || paused) return;
    const t = setInterval(() => {
      setCurrent((c) => (c + 1) % picks.length);
    }, 5000);
    return () => clearInterval(t);
  }, [picks, paused]);

  if (!picks || picks.length === 0) return null;

  const pick = picks[current];
  const review = pick.review;

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setPaused(true);
  };
  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = () => {
    if (touchStart !== null && touchEnd !== null) {
      const distance = touchStart - touchEnd;
      if (distance > 40) setCurrent((c) => (c + 1) % picks.length);
      else if (distance < -40) setCurrent((c) => (c - 1 + picks.length) % picks.length);
    }
    setTimeout(() => setPaused(false), 3000);
  };

  return (
    <div className="px-4 pt-4">
      <h2 className={cls("text-xl font-black tracking-tight mb-3", dark ? "text-white" : "text-gray-900")}>
        Today's Pick
      </h2>
      {(() => {
        const catKey = review?.category || "food";
        const theme = CAT_PICK_BG[catKey] || CAT_PICK_BG.food;
        const catalogImg = findCatalogImage(review);
        const catGrad = CATEGORIES[catKey]?.color || "from-gray-300 to-gray-400";

        return (
        <button
          onClick={(e) => {
            if (Math.abs((touchEnd || 0) - (touchStart || 0)) > 10) return;
            review && onOpen(review);
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-label={`Today's Pick ${current + 1}/${picks.length}: ${pick.headline}`}
          className={cls(
            "relative w-full h-52 rounded-3xl overflow-hidden active:scale-[0.99] transition-all text-left block",
            dark ? "bg-gray-800" : "bg-white"
          )}
          style={{ boxShadow: `0 2px 20px -4px ${theme.accent}30` }}
        >
          {/* 카테고리 그라데이션 테두리 — 왼쪽 액센트 바 */}
          <div className={cls("absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b", catGrad)}/>

          {/* 제품 이미지 or 이모지 — 오른쪽 */}
          {catalogImg ? (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-[38%] flex items-center justify-center">
              <img src={catalogImg} alt="" className="max-w-full max-h-[150px] object-contain"
                onError={(e) => { e.target.style.display = "none"; }}/>
            </div>
          ) : (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.06] select-none pointer-events-none">
              <CategoryIcon cat={catKey} size={96} strokeWidth={1.2} className={dark ? "text-white" : "text-gray-900"}/>
            </div>
          )}

          {/* 콘텐츠 — 왼쪽 */}
          <div className="relative p-5 pl-6 flex flex-col justify-between h-full" style={{ maxWidth: catalogImg ? "58%" : "70%" }}>
            <div>
              <span className={cls("inline-block text-[10px] font-black tracking-widest uppercase mb-2 px-2 py-0.5 rounded-full", dark ? theme.chipDark : theme.chip)}>
                {CATEGORIES[catKey]?.label || "추천"}
              </span>
              <p className={cls("text-xl font-black leading-tight", dark ? "text-white" : "text-gray-900")}>
                {pick.headline}
              </p>
              <p className={cls("text-xs font-medium mt-1.5 leading-relaxed", dark ? "text-gray-400" : "text-gray-500")}>
                {pick.subline}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Heart size={11} style={{ color: theme.accent }} fill="currentColor"/>
                <span className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>{review?.likes || 0}</span>
              </div>
              <span className={cls("text-[10px] font-black tabular-nums px-2 py-0.5 rounded-full", dark ? "bg-white/10 text-white/50" : "bg-gray-100 text-gray-400")}>
                {current + 1}/{picks.length}
              </span>
            </div>
          </div>

          {/* 슬라이드 진행 바 */}
          <div className={cls("absolute bottom-0 left-0 right-0 h-0.5", dark ? "bg-gray-700" : "bg-gray-100")}>
            <div key={current} className="h-full" style={{ backgroundColor: theme.accent, width: "100%", animation: paused ? "none" : "slideProgress 5s linear" }}/>
          </div>
        </button>
        );
      })()}

      {/* 페이지 도트 */}
      <div className="flex justify-center gap-1.5 mt-3">
        {picks.map((_, i) => {
          const dotTheme = CAT_PICK_BG[picks[i]?.review?.category] || CAT_PICK_BG.food;
          return (
          <button key={i}
            onClick={() => { setCurrent(i); setPaused(true); setTimeout(() => setPaused(false), 3000); }}
            aria-label={`${i + 1}번째 Pick`}
            className={cls("h-1.5 rounded-full transition-all", i === current ? "w-6" : "w-1.5", i === current ? "" : dark ? "bg-gray-700" : "bg-gray-200")}
            style={i === current ? { backgroundColor: dotTheme.accent } : undefined}
          />);
        })}
      </div>
    </div>
  );
};

const HomeScreen = ({ reviews, onOpen, favs, toggleFav, dark, taste, moods, user, onPrimary, onSignature, tg, refreshKey = 0, todaysPick, challenge, dailyLogs, onChallengeStart, onChallengeOpen, onChallengeResult }) => {
  const [hotMode, setHotMode] = useState("trending");
  const [sigPulse, setSigPulse] = useState(false);
  const trending = useMemo(() => {
    const top = [...reviews].sort((a,b) => b.likes - a.likes).slice(0, 8);
    if (refreshKey > 0) return [...top].sort(() => Math.random() - 0.5).slice(0, 6);
    return top.slice(0, 6);
  }, [reviews, refreshKey]);
  const fresh = useMemo(() => {
    const recent = [...reviews].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 8);
    if (refreshKey > 0) return [...recent].sort(() => Math.random() - 0.5).slice(0, 4);
    return recent.slice(0, 4);
  }, [reviews, refreshKey]);

  const totalCats = Object.values(taste.cats).reduce((a,b) => a+b, 0);
  const topCat = Object.entries(taste.cats).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1])[0];
  const hasTaste = favs.size >= 2 && topCat;

  const moodCounts = useMemo(() => {
    const c = {};
    Object.values(moods || {}).forEach((m) => { if (m) c[m] = (c[m] || 0) + 1; });
    return c;
  }, [moods]);
  const topMood = Object.entries(moodCounts).sort((a,b) => b[1]-a[1])[0];
  const topMoodObj = topMood && MOODS.find((m) => m.key === topMood[0]);

  const personalized = useMemo(() => {
    if (!hasTaste) return [];
    const score = (r) => (taste.cats[r.category] || 0) * 2 + r.tags.reduce((s,t) => s + (taste.tags[t] || 0), 0);
    return [...reviews].filter((r) => !favs.has(r.id)).map((r) => ({ r, s: score(r) })).filter((x) => x.s > 0).sort((a,b) => b.s - a.s).slice(0, 6).map((x) => x.r);
  }, [reviews, taste, favs, hasTaste]);

  return (
    <div>
      <TodaysPickCard picks={todaysPick} dark={dark} onOpen={onOpen}/>

      <ChallengeEntryCard
          challenge={challenge}
          dailyLogs={dailyLogs}
          dark={dark}
          onStart={onChallengeStart}
          onOpen={onChallengeOpen}
          onResult={onChallengeResult}
        />

      <div className={cls("mx-4 mt-6 rounded-3xl p-6 bg-gradient-to-br text-white relative overflow-hidden shadow-xl tg-trans", tg.gradient)}>
        <Sparkles className="absolute right-4 top-4 opacity-25" size={64} />
        <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10"/>
        <p className="text-xs opacity-80 font-bold tracking-wider uppercase relative">{user ? `${user.nickname}님` : "WELCOME"}</p>
        <h2 className="text-3xl font-black mt-1 leading-[1.1] relative">{tg.text}</h2>
        <p className="text-sm font-medium mt-2 opacity-90 relative">{user ? "오늘은 어떤 걸 기록해볼까요?" : "나만의 라이프스타일을 기록하세요"}</p>
        <button onClick={onPrimary}
          className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-full font-black text-base shadow-2xl shadow-black/20 active:scale-95 transition hover:scale-105 relative">
          {user ? "새 웨이로그 작성" : "가입하고 시작하기"}
          <span className="text-lg">→</span>
        </button>
      </div>

      {hasTaste && topCat ? (
        <div className={cls("mx-4 mt-3 p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
          <div className="flex items-center gap-3">
            <div className={cls("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shrink-0", CATEGORIES[topCat[0]].color)}>
              <CategoryIcon cat={topCat[0]} size={22}/>
            </div>
            <div className="flex-1 min-w-0">
              <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>당신의 취향 분석</p>
              <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>
                <span className="text-emerald-500">{CATEGORIES[topCat[0]].label}</span> 카테고리를 가장 좋아해요
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <p className={cls("text-xs", dark ? "text-gray-500" : "text-gray-500")}>
                  좋아요 {favs.size}개 · 무드 {Object.values(moods||{}).filter(Boolean).length}개
                </p>
                {topMoodObj && (
                  <span className={cls("text-xs px-1.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1", dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")}>
                    <topMoodObj.Icon size={10}/> {topMoodObj.label}
                  </span>
                )}
              </div>
            </div>
            <TrendingUp size={18} className="text-emerald-500"/>
          </div>
          {/* 카테고리 비율 바 */}
          <div className="mt-3 flex h-2 rounded-full overflow-hidden">
            {Object.entries(taste.cats).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([k,v]) => {
              const pct = (v / totalCats) * 100;
              return <div key={k} className={cls("bg-gradient-to-r", CATEGORIES[k].color)} style={{ width: `${pct}%` }}/>;
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(taste.cats).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([k,v]) => (
              <div key={k} className="flex items-center gap-1">
                <div className={cls("w-2 h-2 rounded-full bg-gradient-to-br", CATEGORIES[k].color)}/>
                <span className={cls("text-xs font-semibold", dark ? "text-gray-400" : "text-gray-500")}>
                  {CATEGORIES[k].label} {Math.round((v/totalCats)*100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={cls("mx-4 mt-4 p-4 rounded-2xl flex items-center gap-3 border-2 border-dashed", dark ? "bg-gray-800/50 border-gray-700" : "bg-white border-emerald-200")}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0">
            <Sparkles size={22} className="text-emerald-500"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>취향을 학습 중이에요</p>
            <p className={cls("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>
              카드를 좋아할수록 추천이 정교해져요. {favs.size}/2
            </p>
          </div>
        </div>
      )}

      {user && (() => {
        const totalActivity = favs.size + Object.values(moods || {}).filter(Boolean).length;
        const isActive = totalActivity >= 3;
        const progress = Math.min(totalActivity, 3);
        const now = new Date();
        const onejan = new Date(now.getFullYear(), 0, 1);
        const weekNum = Math.ceil(((now - onejan) / 86400000 + onejan.getDay() + 1) / 7);
        return (
          <button
            onClick={() => {
              if (!isActive) return;
              setSigPulse(true);
              setTimeout(() => { setSigPulse(false); onSignature(); }, 150);
            }}
            disabled={!isActive}
            className={cls("mx-4 mt-4 w-[calc(100%-2rem)] p-4 rounded-3xl flex items-center gap-3 relative overflow-hidden transition-all duration-700",
              isActive
                ? "bg-gradient-to-br from-emerald-500 via-teal-600 to-violet-600 text-white shadow-xl shadow-violet-500/30 border-2 border-transparent"
                : cls("border-2 border-dashed cursor-default", dark ? "bg-gray-800/50 border-gray-700" : "bg-gradient-to-br from-gray-50 to-emerald-50/40 border-emerald-200"),
              isActive && sigPulse && "scale-95 brightness-110",
              isActive && !sigPulse && "active:scale-[0.98]")}>
            <Sparkles className={cls("absolute right-2 top-2 transition-opacity duration-700", isActive ? "opacity-30 text-white" : dark ? "opacity-20 text-gray-600" : "opacity-20 text-emerald-300")} size={48}/>
            {isActive && <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10"/>}
            <div className={cls("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative transition-all duration-700",
              isActive ? "bg-white/20 backdrop-blur" : dark ? "bg-gray-900/60" : "bg-white/80")}>
              <Sparkles size={isActive ? 26 : 24} className={isActive ? "text-white" : dark ? "text-gray-500" : "text-emerald-400"} strokeWidth={2.2}/>
            </div>
            <div key={isActive ? "active" : "inactive"} className="flex-1 min-w-0 text-left relative animate-fade-in">
              {isActive ? (
                <>
                  <p className="text-xs font-bold opacity-90 uppercase tracking-widest">WEEK {weekNum} · 새 카드</p>
                  <p className="text-sm font-black mt-0.5">시그니처 카드가 도착했어요</p>
                  <p className="text-xs opacity-90 mt-0.5">내 취향을 한 장으로 보고 공유하기</p>
                </>
              ) : (
                <>
                  <p className={cls("text-xs font-bold uppercase tracking-widest", dark ? "text-gray-500" : "text-emerald-600")}>곧 도착해요</p>
                  <p className={cls("text-sm font-black mt-0.5", dark ? "text-gray-300" : "text-gray-800")}>나만의 시그니처 카드</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className={cls("flex-1 h-1.5 rounded-full overflow-hidden", dark ? "bg-gray-700" : "bg-emerald-100")}>
                      <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-violet-500 transition-all duration-500"
                        style={{ width: `${(progress / 3) * 100}%` }}/>
                    </div>
                    <span className={cls("text-xs font-black tabular-nums inline-flex items-center gap-1", dark ? "text-gray-400" : "text-emerald-700")}>
                      {progress}/3
                      <Heart size={9} className={dark ? "text-rose-400" : "text-rose-500"} fill="currentColor"/>
                      <Star size={9} className={dark ? "text-amber-400" : "text-amber-500"} fill="currentColor"/>
                    </span>
                  </div>
                </>
              )}
            </div>
            {isActive && <ChevronRight size={20} className="relative opacity-90"/>}
          </button>
        );
      })()}

      <SectionTitle dark={dark} title="오늘의 픽" sub="좌우로 스와이프해 취향을 알려주세요" />
      <SwipePick reviews={trending} onLike={(r) => toggleFav(r.id)} onPass={() => {}} dark={dark}/>

      {personalized.length > 0 && (
        <>
          <SectionTitle dark={dark} tier={2} title="당신을 위한 추천" sub="스와이프와 좋아요로 학습된 결과예요" />
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x" style={{ scrollbarWidth: "none" }}>
            {personalized.map((r) => (
              <div key={r.id} className="snap-start shrink-0 w-44">
                <Card r={r} onOpen={onOpen} favs={favs} toggleFav={toggleFav} dark={dark} />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="px-4 mt-8 mb-3 flex items-center justify-between">
        <h2 className={cls("text-base font-bold tracking-tight", dark ? "text-gray-200" : "text-gray-800")}>
          {hotMode === "trending" ? "요즘 뜨는 웨이로그" : "따끈따끈한 새 글"}
        </h2>
        <div className={cls("flex gap-1 text-xs rounded-full p-1", dark ? "bg-gray-800" : "bg-gray-100")}>
          <button onClick={() => setHotMode("trending")}
            className={cls("px-3 py-1 rounded-full font-bold transition", hotMode === "trending" ? "bg-white text-emerald-600 shadow" : dark ? "text-gray-400" : "text-gray-500")}>
            인기
          </button>
          <button onClick={() => setHotMode("fresh")}
            className={cls("px-3 py-1 rounded-full font-bold transition", hotMode === "fresh" ? "bg-white text-emerald-600 shadow" : dark ? "text-gray-400" : "text-gray-500")}>
            최신
          </button>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto px-5 pb-2 snap-x" style={{ scrollbarWidth: "none" }}>
        {(hotMode === "trending" ? trending : fresh).map((r, i) => (
          <div key={`${hotMode}-${r.id}`} className="snap-start shrink-0 w-44 animate-card-enter" style={{ animationDelay: `${i * 60}ms` }}>
            <Card r={r} onOpen={onOpen} favs={favs} toggleFav={toggleFav} dark={dark} />
          </div>
        ))}
      </div>

      <SectionTitle dark={dark} tier={3} title="탐색하기" />
      <div className="flex gap-3 overflow-x-auto px-4 pb-4 snap-x" style={{ scrollbarWidth: "none" }}>
        {(CATALOG || []).slice(0, 10).map((p, i) => (
          <a key={p.id} href={p.officialUrl || "#"} target="_blank" rel="noopener noreferrer"
            className={cls("snap-start shrink-0 w-32 rounded-2xl overflow-hidden block active:scale-[0.97] transition animate-card-enter", dark ? "bg-gray-800" : "bg-white shadow-sm")}
            style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
            <div className={cls("h-32 flex items-center justify-center p-3", dark ? "bg-gray-900" : "bg-gray-50")}>
              <ProductImage src={p.imageUrl} alt={p.name} className="max-w-full max-h-full object-contain" iconSize={24}/>
            </div>
            <div className="p-2">
              <p className={cls("text-[10px] font-bold", dark ? "text-emerald-400" : "text-emerald-600")}>{p.brand || ""}</p>
              <p className={cls("text-[11px] font-bold line-clamp-2 leading-tight mt-0.5", dark ? "text-white" : "text-gray-900")}>{p.name}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

const FeedScreen = ({ reviews, onOpen, favs, toggleFav, dark, onCompose, following, user }) => {
  const [activeCat, setActiveCat] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [sort, setSort] = useState("latest");
  const [feedMode, setFeedMode] = useState("all");
  const filtered = useMemo(() => {
    let list = [...reviews];
    if (feedMode === "following" && following) list = list.filter((r) => following.has(r.author));
    if (activeCat) list = list.filter((r) => r.category === activeCat);
    if (activeTag) list = list.filter((r) => (r.tags || []).includes(activeTag));
    list.sort((a,b) => sort === "likes" ? (b.likes || 0) - (a.likes || 0) : (b.date || "").localeCompare(a.date || ""));
    return list;
  }, [reviews, activeCat, activeTag, sort, feedMode, following]);

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        {user && (
          <div className={cls("flex p-1 rounded-full mb-3", dark ? "bg-gray-800" : "bg-gray-100")}>
            <button onClick={() => setFeedMode("all")}
              className={cls("flex-1 py-2 rounded-full text-xs font-black transition",
                feedMode === "all" ? dark ? "bg-gray-900 text-white shadow" : "bg-white text-gray-900 shadow" : dark ? "text-gray-400" : "text-gray-500")}>
              전체
            </button>
            <button onClick={() => setFeedMode("following")}
              className={cls("flex-1 py-2 rounded-full text-xs font-black transition inline-flex items-center justify-center gap-1.5",
                feedMode === "following" ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow" : dark ? "text-gray-400" : "text-gray-500")}>
              팔로잉 {following && following.size > 0 && <span className="opacity-90">{following.size}</span>}
            </button>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          <button onClick={() => setActiveCat(null)}
            className={cls("text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-bold",
              !activeCat ? "bg-gray-900 text-white" : dark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600")}>
            전체
          </button>
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <button key={k} onClick={() => setActiveCat(k === activeCat ? null : k)}
              className={cls("text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-bold",
                activeCat === k ? `bg-gradient-to-r ${c.color} text-white` : dark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600")}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {POPULAR_TAGS.map((t) => (
            <button key={t} onClick={() => setActiveTag(t === activeTag ? null : t)}
              className={cls("text-xs px-2.5 py-1 rounded-full whitespace-nowrap",
                activeTag === t ? "bg-emerald-500 text-white" : dark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500")}>
              #{t}
            </button>
          ))}
        </div>
      </div>
      <div className={cls("px-4 mt-1 flex justify-between items-center text-xs", dark ? "text-gray-400" : "text-gray-500")}>
        <span>{filtered.length}개의 리뷰</span>
        <div className="flex gap-3">
          <button onClick={() => setSort("likes")} className={sort === "likes" ? "font-bold text-emerald-500" : ""}>인기순</button>
          <button onClick={() => setSort("latest")} className={sort === "latest" ? "font-bold text-emerald-500" : ""}>최신순</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 pt-3 pb-4">
        {filtered.map((r, i) => (
          <div key={r.id} className="animate-card-enter" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
            <Card r={r} onOpen={onOpen} favs={favs} toggleFav={toggleFav} dark={dark} />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className={cls("col-span-2 text-center py-16", dark ? "text-gray-500" : "text-gray-500")}>
            <Inbox size={56} strokeWidth={1.5} className={cls("mx-auto mb-3 opacity-30", dark ? "text-gray-600" : "text-gray-300")}/>
            {feedMode === "following" ? (
              <>
                <p className={cls("text-sm font-bold", dark ? "text-gray-300" : "text-gray-700")}>팔로우한 사용자의 글이 없어요</p>
                <p className="text-xs mt-1">관심있는 사용자를 팔로우해보세요</p>
              </>
            ) : (
              <>
                <p className={cls("text-sm font-bold", dark ? "text-gray-300" : "text-gray-700")}>해당 조건의 리뷰가 없어요</p>
                <p className="text-xs mt-1">필터를 바꿔서 다시 시도해보세요</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ProductDetailModal = ({ product, onClose, reviews, dark, onOpenReview, onCompose }) => {
  const [exiting, close] = useExit(onClose);

  const related = useMemo(() => {
    if (!product || !product.name) return [];
    return (reviews || []).filter((r) => {
      if (!r) return false;
      const nameMatch = (r.product || "").includes(product.name);
      const idMatch = (r.products || []).some((p) => p && p.id === product.id);
      return nameMatch || idMatch;
    }).slice(0, 6);
  }, [product, reviews]);

  if (!product) return null;

  const cat = CATEGORIES[product.category];
  const priceStr = product.price ? product.price.toLocaleString("ko-KR") + "원" : null;

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-end", exiting ? "" : "animate-fade-in")}>
      <div className={cls("absolute inset-0 bg-black/50", exiting ? "animate-fade-out" : "")} onClick={close}/>
      <div className={cls("relative w-full rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto", dark ? "bg-gray-900" : "bg-white", exiting ? "animate-slide-down" : "animate-slide-up")}>
        <div className={cls("w-12 h-1 rounded-full mx-auto mt-3 mb-2", dark ? "bg-gray-700" : "bg-gray-300")}/>

        {/* 이미지 */}
        <div className={cls("w-full h-56 flex items-center justify-center p-6", dark ? "bg-gray-800" : "bg-gradient-to-b from-gray-50 to-white")}>
          <ProductImage src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain drop-shadow-lg" iconSize={56}/>
        </div>

        <div className="p-5 space-y-4">
          {/* 카테고리 + 브랜드 */}
          <div className="flex items-center gap-2">
            {cat && (
              <span className={cls("text-[10px] font-black px-2 py-0.5 rounded-full", dark ? cat.dchip : cat.chip)}>
                {cat.label}
              </span>
            )}
            {product.brand && (
              <span className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>{product.brand}</span>
            )}
          </div>

          {/* 제품명 + 가격 */}
          <div>
            <h3 className={cls("text-lg font-black leading-tight", dark ? "text-white" : "text-gray-900")}>{product.name}</h3>
            {priceStr && (
              <p className={cls("text-base font-black mt-1", dark ? "text-emerald-400" : "text-emerald-600")}>{priceStr}</p>
            )}
          </div>

          {/* 태그 */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((t) => (
                <span key={t} className={cls("text-xs px-2 py-1 rounded-full font-medium", dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600")}>
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* 버튼들 */}
          <div className="flex gap-2">
            {product.officialUrl && (
              <button onClick={() => window.open(product.officialUrl, "_blank")}
                className={cls("flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-[0.98]",
                  dark ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}>
                <ExternalLink size={15}/> 공식 페이지
              </button>
            )}
            <button onClick={() => { onCompose && onCompose(); }}
              className="flex-1 py-3 rounded-2xl text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition">
              <PenLine size={15}/> 리뷰 쓰기
            </button>
          </div>

          {/* 관련 리뷰 */}
          {related.length > 0 && (
            <div>
              <p className={cls("text-xs font-bold uppercase tracking-wider mb-3", dark ? "text-gray-500" : "text-gray-500")}>관련 웨이로그 {related.length}개</p>
              <div className="space-y-2">
                {related.map((r) => (
                  <button key={r.id} onClick={() => onOpenReview && onOpenReview(r)}
                    className={cls("w-full flex items-center gap-3 p-3 rounded-2xl text-left transition active:scale-[0.98]", dark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-50 hover:bg-gray-100")}>
                    <SmartImg r={r} className="w-12 h-12 rounded-xl object-cover shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className={cls("text-sm font-bold line-clamp-1", dark ? "text-white" : "text-gray-900")}>{r.title}</p>
                      <p className={cls("text-xs line-clamp-1 mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>{r.author} · {r.likes} likes</p>
                    </div>
                    <ChevronRight size={16} className={dark ? "text-gray-600" : "text-gray-400"}/>
                  </button>
                ))}
              </div>
            </div>
          )}

          {related.length === 0 && (
            <div className={cls("py-6 text-center rounded-2xl border-2 border-dashed", dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400")}>
              <PenLine size={24} className="mx-auto mb-2 opacity-40"/>
              <p className="text-xs font-medium">아직 리뷰가 없어요</p>
              <p className="text-xs mt-0.5 opacity-70">첫 번째 리뷰를 작성해보세요!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FavScreen = ({ reviews, onOpen, favs, toggleFav, dark, moods, setMoods, onBrowse, onProductClick }) => {
  const [mainTab, setMainTab] = useState("favs"); // "favs" | "catalog"
  const [view, setView] = useState("grid");
  const [moodPickerFor, setMoodPickerFor] = useState(null);
  const [catalogQ, setCatalogQ] = useState("");
  const [catalogCat, setCatalogCat] = useState("all");
  const list = reviews.filter((r) => favs.has(r.id));
  const byMonth = useMemo(() => {
    const m = {};
    list.forEach((r) => { const k = r.date.slice(0, 7); (m[k] ||= []).push(r); });
    return Object.entries(m).sort((a,b) => b[0].localeCompare(a[0]));
  }, [list]);

  const filteredCatalog = useMemo(() => {
    let items = CATALOG || [];
    if (catalogCat !== "all") {
      items = items.filter((p) => p && p.category === catalogCat);
    }
    const q = (catalogQ || "").trim().toLowerCase();
    if (q) {
      items = items.filter((p) => {
        if (!p) return false;
        const name = (p.name || "").toLowerCase();
        const brand = (p.brand || "").toLowerCase();
        const tags = (p.tags || []).map((t) => (t || "").toLowerCase());
        return name.includes(q) || brand.includes(q) || tags.some((t) => t.includes(q));
      });
    }
    return items;
  }, [catalogCat, catalogQ]);

  const setMood = (rid, key) => {
    setMoods((prev) => ({ ...prev, [rid]: prev[rid] === key ? null : key }));
    setMoodPickerFor(null);
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <h2 className={cls("text-2xl font-black tracking-tight", dark ? "text-white" : "text-gray-900")}>마이웨이템</h2>

      {/* 메인 탭 토글: 찜 목록 / 카탈로그 */}
      <div className={cls("flex gap-1 mt-3 mb-4 p-1 rounded-2xl", dark ? "bg-gray-800" : "bg-gray-100")}>
        <button onClick={() => setMainTab("favs")}
          className={cls("flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition",
            mainTab === "favs" ? dark ? "bg-gray-700 text-white shadow" : "bg-white text-gray-900 shadow" : dark ? "text-gray-400" : "text-gray-500")}>
          <Heart size={13} className={mainTab === "favs" ? "text-rose-500" : ""}/> 찜 목록 <span className={cls("tabular-nums", mainTab === "favs" ? "text-rose-500" : "")}>{list.length}</span>
        </button>
        <button onClick={() => setMainTab("catalog")}
          className={cls("flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition",
            mainTab === "catalog" ? dark ? "bg-gray-700 text-white shadow" : "bg-white text-gray-900 shadow" : dark ? "text-gray-400" : "text-gray-500")}>
          <Package size={13} className={mainTab === "catalog" ? "text-emerald-500" : ""}/> 제품 카탈로그 <span className={cls("tabular-nums", mainTab === "catalog" ? "text-emerald-500" : "")}>{CATALOG.length}</span>
        </button>
      </div>

      {mainTab === "catalog" ? (
        <div>
          {/* 검색 */}
          <div className={cls("flex items-center gap-2 px-3 py-2.5 rounded-2xl mb-3", dark ? "bg-gray-800" : "bg-gray-100")}>
            <Search size={16} className={dark ? "text-gray-400" : "text-gray-500"}/>
            <input value={catalogQ} onChange={(e) => setCatalogQ(e.target.value)}
              placeholder="제품명, 브랜드, 태그 검색"
              className={cls("flex-1 bg-transparent outline-none text-sm", dark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400")}/>
            {catalogQ && <button onClick={() => setCatalogQ("")}><X size={16} className={dark ? "text-gray-400" : "text-gray-500"}/></button>}
          </div>

          {/* 카테고리 칩 */}
          <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
            {[
              { key: "all", label: "전체" },
              { key: "food", label: "뉴트리션" },
              { key: "wellness", label: "웰니스" },
              { key: "beauty", label: "뷰티" },
              { key: "kitchen", label: "퍼스널케어" },
              { key: "home", label: "홈리빙" },
              { key: "one4one", label: "원포원" },
            ].map((c) => (
              <button key={c.key} onClick={() => setCatalogCat(c.key)}
                className={cls(
                  "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition",
                  catalogCat === c.key
                    ? c.key !== "all" && CATEGORIES[c.key] ? `bg-gradient-to-r ${CATEGORIES[c.key].color} text-white shadow-sm` : "bg-emerald-500 text-white"
                    : dark ? "bg-gray-800 text-gray-400" : "bg-white text-gray-600"
                )}>
                {c.label}
              </button>
            ))}
          </div>

          <p className={cls("text-xs font-bold mb-3", dark ? "text-gray-500" : "text-gray-400")}>{filteredCatalog.length}개 제품</p>

          {filteredCatalog.length === 0 ? (
            <div className={cls("py-12 text-center rounded-2xl border-2 border-dashed", dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400")}>
              <Search size={28} className="mx-auto mb-2 opacity-40"/>
              <p className="text-sm font-bold">검색 결과가 없어요</p>
              <p className="text-xs mt-1 opacity-70">다른 키워드로 검색해보세요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCatalog.slice(0, 30).map((p, i) => {
                const pCat = CATEGORIES[p?.category];
                return (
                  <button key={p.id} onClick={() => onProductClick && onProductClick(p)}
                    className={cls("w-full flex items-center gap-3 p-3 rounded-2xl text-left active:scale-[0.98] transition animate-card-enter", dark ? "bg-gray-800" : "bg-white shadow-sm")}
                    style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                    <div className={cls("w-16 h-16 rounded-xl shrink-0 flex items-center justify-center overflow-hidden", dark ? "bg-gray-900" : "bg-gray-50")}>
                      <ProductImage src={p.imageUrl} alt={p.name} className="max-w-full max-h-full object-contain p-1" iconSize={22}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      {pCat && <span className={cls("text-[9px] font-black px-1.5 py-0.5 rounded-full", dark ? pCat.dchip : pCat.chip)}>{pCat.label}</span>}
                      <p className={cls("text-sm font-bold line-clamp-1 mt-0.5", dark ? "text-white" : "text-gray-900")}>{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.brand && <p className={cls("text-[10px]", dark ? "text-gray-500" : "text-gray-400")}>{p.brand}</p>}
                        {p.price > 0 && <p className={cls("text-xs font-bold", dark ? "text-emerald-400" : "text-emerald-600")}>{p.price.toLocaleString()}원</p>}
                      </div>
                    </div>
                    <ChevronRight size={16} className={dark ? "text-gray-600" : "text-gray-300"}/>
                  </button>
                );
              })}
            </div>
          )}

          {filteredCatalog.length > 30 && (
            <p className={cls("text-center text-xs font-bold mt-4 py-3", dark ? "text-gray-500" : "text-gray-400")}>
              상위 30개 표시 중 · 검색으로 더 찾아보세요
            </p>
          )}
        </div>
      ) : (
        <>
          <p className={cls("text-xs mb-3", dark ? "text-gray-400" : "text-gray-500")}>내가 찜한 {list.length}개의 아이템</p>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setView("grid")}
              className={cls("text-xs px-3 py-1.5 rounded-full font-bold",
                view === "grid" ? "bg-emerald-500 text-white" : dark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600")}>
              격자보기
            </button>
            <button onClick={() => setView("timeline")}
              className={cls("text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1",
                view === "timeline" ? "bg-emerald-500 text-white" : dark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600")}>
              <Calendar size={12}/> 다이어리
            </button>
          </div>

      {list.length === 0 ? (
        <div className="text-center py-12 px-6">
          <div className={cls("w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-5", dark ? "bg-gray-800" : "bg-gradient-to-br from-rose-50 to-pink-100")}>
            <Heart size={36} strokeWidth={1.8} className="text-rose-400"/>
          </div>
          <p className={cls("text-base font-black", dark ? "text-white" : "text-gray-900")}>나만의 웨이템을 모아보세요</p>
          <p className={cls("text-xs mt-2 max-w-xs mx-auto", dark ? "text-gray-400" : "text-gray-500")}>마음에 드는 카드의 하트를 누르면 여기 모여요</p>
          <div className={cls("mt-6 rounded-2xl p-4 max-w-xs mx-auto text-left", dark ? "bg-gray-800/50" : "bg-white border border-gray-100")}>
            {[
              { Icon: Heart, color: "text-rose-500", text: "카드의 하트 버튼을 눌러 찜하기" },
              { Icon: Star, color: "text-amber-500", text: "무드를 부여해 취향 강조하기" },
              { Icon: Sparkles, color: "text-emerald-500", text: "3개 모으면 시그니처 카드 생성" },
            ].map((tip, i) => (
              <div key={i} className={cls("flex items-center gap-3", i > 0 && "mt-3")}>
                <div className={cls("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", dark ? "bg-gray-900" : "bg-gray-50")}>
                  <tip.Icon size={14} className={tip.color} fill="currentColor"/>
                </div>
                <p className={cls("text-xs font-medium", dark ? "text-gray-300" : "text-gray-700")}>{tip.text}</p>
              </div>
            ))}
          </div>
          <button onClick={onBrowse}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-black rounded-full shadow-xl shadow-emerald-500/30 active:scale-95 transition inline-flex items-center gap-2">
            둘러보러 가기 <ChevronRight size={16}/>
          </button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3">
          {list.map((r, i) => (
            <div key={r.id} className="animate-card-enter" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
              <Card r={r} onOpen={onOpen} favs={favs} toggleFav={toggleFav} dark={dark} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className={cls("px-3 py-2 rounded-xl text-xs flex items-center gap-1.5", dark ? "bg-gray-800 text-gray-400" : "bg-white text-gray-500")}>
            <span className="text-amber-500">⭐</span>
            <span>표시된 무드는 추천에 더 강하게 반영돼요</span>
          </div>
          {byMonth.map(([month, items]) => (
            <div key={month}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500"/>
                <h3 className={cls("text-sm font-extrabold", dark ? "text-white" : "text-gray-900")}>{month.split("-")[0]}년 {parseInt(month.split("-")[1])}월</h3>
                <div className={cls("flex-1 h-px", dark ? "bg-gray-700" : "bg-gray-200")}/>
              </div>
              <div className="space-y-3 pl-4 border-l-2 border-emerald-200 ml-1">
                {items.map((r) => {
                  const mood = MOODS.find((m) => m.key === moods[r.id]);
                  return (
                  <div key={r.id} className={cls("rounded-2xl overflow-hidden -ml-1", dark ? "bg-gray-800" : "bg-white")}>
                    <button onClick={() => onOpen(r)} className="flex gap-3 w-full text-left">
                      <SmartImg r={r} className="w-16 h-16 object-cover shrink-0"/>
                      <div className="flex-1 py-2 pr-2 min-w-0">
                        <p className={cls("text-xs font-normal opacity-70", dark ? "text-gray-400" : "text-gray-600")}>{formatRelativeTime(r.date)}</p>
                        <p className={cls("text-sm font-bold line-clamp-1", dark ? "text-white" : "text-gray-900")}>{r.title}</p>
                        <p className={cls("text-xs line-clamp-1", dark ? "text-gray-400" : "text-gray-500")}>{r.product}</p>
                      </div>
                    </button>
                    <div className={cls("flex items-center gap-1.5 px-3 pb-2.5 pt-1 border-t flex-wrap", dark ? "border-gray-700" : "border-gray-100")}>
                      {moodPickerFor === r.id ? (
                        <>
                          {MOODS.map((m) => (
                            <button key={m.key} onClick={() => setMood(r.id, m.key)}
                              className={cls("text-xs px-2 py-1 rounded-full flex items-center gap-1 transition", dark ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}>
                              <m.Icon size={11} className={m.color}/>
                              <span className="text-xs font-semibold">{m.label}</span>
                              {m.strong && <Star size={8} className="text-amber-400 fill-amber-400"/>}
                            </button>
                          ))}
                          <button onClick={() => setMoodPickerFor(null)}
                            className={cls("ml-auto w-6 h-6 rounded-full flex items-center justify-center border", dark ? "bg-gray-900 border-gray-600 text-gray-300" : "bg-white border-gray-300 text-gray-500")}>
                            <X size={12}/>
                          </button>
                        </>
                      ) : mood ? (
                        <button onClick={() => setMoodPickerFor(r.id)}
                          className={cls("text-xs px-2 py-1 rounded-full flex items-center gap-1", dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")}>
                          <mood.Icon size={11}/>
                          <span className="text-xs font-bold">{mood.label}</span>
                          {mood.strong && <Star size={8} className="text-amber-400 fill-amber-400"/>}
                        </button>
                      ) : (
                        <button onClick={() => setMoodPickerFor(r.id)}
                          className={cls("text-xs px-2 py-1 rounded-full font-semibold", dark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500")}>
                          + 무드 추가
                        </button>
                      )}
                    </div>
                  </div>
                );})}
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
};

const CommunityScreen = ({ dark, posts, onLike, onShare, onUserClick, onAddPost, user, onRequireAuth }) => {
  const [draft, setDraft] = useState("");
  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    if (!user) { onRequireAuth && onRequireAuth(); return; }
    onAddPost && onAddPost(text);
    setDraft("");
  };
  return (
  <div className="px-4 pt-4 pb-4 space-y-3">
    <h2 className={cls("text-2xl font-black tracking-tight", dark ? "text-white" : "text-gray-900")}>커뮤니티</h2>
    <p className={cls("text-xs mb-2", dark ? "text-gray-400" : "text-gray-500")}>웨이로거들과 이야기 나눠보세요</p>

    {/* 빠른 작성 */}
    <div className={cls("rounded-2xl p-3 shadow-sm", dark ? "bg-gray-800" : "bg-white")}>
      <div className="flex gap-2.5 items-start">
        <Avatar id={user?.avatar || ""} size={14} className="w-9 h-9 shrink-0"/>
        <textarea value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
          }}
          placeholder={user ? "지금 어떤 생각이 드세요?" : "로그인 후 커뮤니티에 참여해보세요"}
          rows={2}
          className={cls("flex-1 text-sm bg-transparent outline-none resize-none overflow-hidden", dark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400")}/>
      </div>
      {(draft || user) && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className={cls("text-xs", draft.length > 280 ? "text-rose-500 font-bold" : dark ? "text-gray-500" : "text-gray-400")}>
            {draft.length}/300
          </span>
          <button onClick={submit} disabled={!draft.trim() || draft.length > 300}
            className={cls("px-4 py-1.5 rounded-full text-xs font-black transition",
              draft.trim() && draft.length <= 300
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md active:scale-95"
                : dark ? "bg-gray-700 text-gray-500" : "bg-gray-200 text-gray-400")}>
            게시
          </button>
        </div>
      )}
    </div>

    {posts.map((p) => (
      <div key={p.id} className={cls("rounded-2xl p-4 shadow-sm", dark ? "bg-gray-800" : "bg-white")}>
        <button onClick={() => onUserClick({ author: p.author, avatar: p.avatar })}
          className="flex items-center gap-2.5 mb-3 active:scale-[0.98] transition">
          <Avatar id={p.avatar} size={18} className="w-10 h-10"/>
          <div className="text-left">
            <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>{p.author}</p>
            <p className={cls("text-xs font-normal opacity-70", dark ? "text-gray-400" : "text-gray-600")}>{p.time}</p>
          </div>
        </button>
        <p className={cls("text-sm leading-relaxed whitespace-pre-wrap", dark ? "text-gray-200" : "text-gray-700")}>{p.content}</p>
        <div className={cls("flex gap-4 mt-3 pt-3 border-t text-xs", dark ? "border-gray-700 text-gray-400" : "border-gray-100 text-gray-500")}>
          <button onClick={() => onLike(p.id)} className={cls("flex items-center gap-1 transition active:scale-90", p.liked && "text-rose-500")}>
            <Heart size={14} className={p.liked ? "fill-rose-500" : ""}/> {p.likes}
          </button>
          <button className="flex items-center gap-1"><MessageCircle size={14}/> {p.comments}</button>
          <button onClick={() => onShare(p)} className="ml-auto active:scale-90 transition"><Share2 size={14}/></button>
        </div>
      </div>
    ))}
  </div>
  );
};

const SearchScreen = ({ reviews, onOpen, favs, toggleFav, dark, onClose, recents, addRecent, removeRecent, clearRecents, q, setQ, onProductClick }) => {
  const [exiting, close] = useExit(onClose);
  const [filterCat, setFilterCat] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const results = useMemo(() => {
    if (!(q || "").trim()) return [];
    const s = (q || "").toLowerCase();
    let list = (reviews || []).filter((r) => {
      if (!r) return false;
      const title = (r.title || "").toLowerCase();
      const product = (r.product || "").toLowerCase();
      const author = (r.author || "").toLowerCase();
      const tags = (r.tags || []);
      return title.includes(s) || product.includes(s) || author.includes(s) || tags.some((t) => (t || "").toLowerCase().includes(s));
    });
    if (filterCat !== "all") list = list.filter((r) => r.category === filterCat);
    if (sortBy === "popular") list = [...list].sort((a, b) => b.likes - a.likes);
    else if (sortBy === "recent") list = [...list].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return list;
  }, [q, reviews, filterCat, sortBy]);

  const productResults = useMemo(() => {
    if (!(q || "").trim()) return [];
    const s = (q || "").toLowerCase();
    return (CATALOG || []).filter((p) => {
      if (!p) return false;
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const tags = (p.tags || []);
      return name.includes(s) || brand.includes(s) || tags.some((t) => (t || "").toLowerCase().includes(s));
    }).slice(0, 10);
  }, [q]);

  const submit = (term) => { setQ(term); addRecent(term); };

  return (
    <div className={cls("fixed inset-0 z-30 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <div className={cls("flex items-center gap-2 p-3 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={20} className={dark ? "text-white" : "text-gray-700"}/></button>
        <div className={cls("flex-1 flex items-center gap-2 px-3 py-2 rounded-full", dark ? "bg-gray-700" : "bg-gray-100")}>
          <Search size={16} className={dark ? "text-gray-400" : "text-gray-500"}/>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => q && addRecent(q)}
            placeholder="리뷰, 상품, 태그 검색"
            className={cls("flex-1 bg-transparent outline-none text-sm", dark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400")}/>
          {q && <button onClick={() => setQ("")}><X size={16} className={dark ? "text-gray-400" : "text-gray-500"}/></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!q && (
          <div className="space-y-5">
            {recents.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>최근 검색어</p>
                  <button onClick={() => clearRecents && clearRecents()}
                    className={cls("text-xs font-bold active:opacity-60", dark ? "text-gray-500" : "text-gray-400")}>
                    전체 삭제
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recents.map((t) => (
                    <div key={t} className={cls("inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full", dark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600")}>
                      <button onClick={() => submit(t)} className="text-xs active:opacity-60">{t}</button>
                      <button onClick={() => removeRecent && removeRecent(t)}
                        aria-label={`${t} 삭제`}
                        className={cls("w-4 h-4 rounded-full flex items-center justify-center active:scale-90", dark ? "bg-gray-700 text-gray-500" : "bg-gray-100 text-gray-400")}>
                        <X size={9}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className={cls("text-xs font-bold mb-2", dark ? "text-gray-400" : "text-gray-500")}>인기 태그</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.map((t) => (
                  <button key={t} onClick={() => submit(t)} className={cls("text-xs px-3 py-1.5 rounded-full", dark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600")}>#{t}</button>
                ))}
              </div>
            </div>
          </div>
        )}
        {q && (
          <div>
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                <button onClick={() => setFilterCat("all")}
                  className={cls("text-xs px-3 py-1.5 rounded-full font-bold shrink-0 transition",
                    filterCat === "all" ? "bg-emerald-500 text-white" : dark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600")}>
                  전체
                </button>
                {Object.entries(CATEGORIES).map(([k, c]) => (
                  <button key={k} onClick={() => setFilterCat(k)}
                    className={cls("text-xs px-3 py-1.5 rounded-full font-bold shrink-0 transition",
                      filterCat === k ? `bg-gradient-to-r ${c.color} text-white shadow-sm` : dark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600")}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 shrink-0">
                {[
                  { k: "relevance", label: "관련순" },
                  { k: "popular", label: "인기순" },
                  { k: "recent", label: "최신순" },
                ].map((s) => (
                  <button key={s.k} onClick={() => setSortBy(s.k)}
                    className={cls("text-xs px-2.5 py-1.5 rounded-full font-bold transition",
                      sortBy === s.k ? "bg-gray-900 text-white" : dark ? "bg-gray-800 text-gray-400" : "bg-white text-gray-500")}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {/* 제품 카탈로그 결과 */}
            {productResults.length > 0 && (
              <div className="mb-5">
                <p className={cls("text-xs font-bold mb-2 px-1", dark ? "text-gray-400" : "text-gray-500")}>
                  제품 {productResults.length}개
                </p>
                <div className="space-y-1.5">
                  {productResults.map((p) => {
                    const pCat = CATEGORIES[p?.category];
                    return (
                      <button key={p.id} onClick={() => { onProductClick && onProductClick(p); }}
                        className={cls("w-full flex items-center gap-3 p-2.5 rounded-xl text-left active:scale-[0.98] transition", dark ? "bg-gray-800" : "bg-white")}>
                        <div className={cls("w-11 h-11 rounded-lg shrink-0 flex items-center justify-center overflow-hidden", dark ? "bg-gray-900" : "bg-gray-50")}>
                          <ProductImage src={p.imageUrl} alt={p.name} className="max-w-full max-h-full object-contain p-0.5" iconSize={18}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cls("text-sm font-bold line-clamp-1", dark ? "text-white" : "text-gray-900")}>{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {pCat && <span className={cls("text-[9px] font-bold px-1.5 py-0.5 rounded-full", dark ? pCat.dchip : pCat.chip)}>{pCat.label}</span>}
                            {p.price > 0 && <span className={cls("text-[10px] font-bold", dark ? "text-emerald-400" : "text-emerald-600")}>{p.price.toLocaleString()}원</span>}
                          </div>
                        </div>
                        <ChevronRight size={14} className={dark ? "text-gray-600" : "text-gray-300"}/>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 리뷰 결과 */}
            <p className={cls("text-xs font-bold mb-3 px-1", dark ? "text-gray-400" : "text-gray-500")}>
              웨이로그 {results.length}개
            </p>
            <div className="grid grid-cols-2 gap-3">
              {results.map((r, i) => (
                <div key={r.id} className="animate-card-enter" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                  <Card r={r} onOpen={(x) => { onOpen(x); close(); }} favs={favs} toggleFav={toggleFav} dark={dark} />
                </div>
              ))}
              {results.length === 0 && productResults.length === 0 && (
                <div className={cls("col-span-2 text-center py-16", dark ? "text-gray-500" : "text-gray-500")}>
                  <Search size={56} strokeWidth={1.5} className={cls("mx-auto mb-3 opacity-30", dark ? "text-gray-600" : "text-gray-300")}/>
                  <p className={cls("text-sm font-bold", dark ? "text-gray-300" : "text-gray-700")}>"{q}"에 대한 결과가 없어요</p>
                  <p className="text-xs mt-1">다른 키워드로 검색해보세요</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DetailScreen = ({ r, onBack, onOpen, favs, toggleFav, dark, comments, addComment, deleteComment, toggleCommentLike, user, onEdit, onDelete, onReport, onUserClick, onHashtagClick }) => {
  const [exiting, close] = useExit(onBack);
  const related = SEED_REVIEWS.filter((x) => x.id !== r.id && (x.tags || []).some((t) => (r.tags || []).includes(t))).slice(0,4);
  const cat = CATEGORIES[r.category] || CATEGORIES.food;
  const [comment, setComment] = useStoredState(`waylog:draft:comment:${r.id}`, "");
  const [replyTo, setReplyTo] = useState(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [zoomedImg, setZoomedImg] = useState(null);
  const isMine = user && r.author === user.nickname;
  const galleryRef = useRef(null);

  const handleGalleryScroll = () => {
    if (!galleryRef.current) return;
    const idx = Math.round(galleryRef.current.scrollLeft / galleryRef.current.offsetWidth);
    setGalleryIdx(idx);
  };

  useEffect(() => {
    if (!r.media || r.media.length <= 1) return;
    const handler = (e) => {
      if (!galleryRef.current) return;
      const w = galleryRef.current.offsetWidth;
      if (e.key === "ArrowLeft" && galleryIdx > 0) {
        galleryRef.current.scrollTo({ left: (galleryIdx - 1) * w, behavior: "smooth" });
      } else if (e.key === "ArrowRight" && galleryIdx < r.media.length - 1) {
        galleryRef.current.scrollTo({ left: (galleryIdx + 1) * w, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [galleryIdx, r.media]);

  return (
    <div className={cls("fixed inset-0 z-30 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto overflow-y-auto", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <div className="relative">
        {r.media && r.media.length > 0 ? (
          <div className="relative">
            <div ref={galleryRef} onScroll={handleGalleryScroll} className="flex overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
              {r.media.map((m) => (
                <div key={m.id} className="snap-start shrink-0 w-full h-80 bg-gray-200 dark:bg-gray-800">
                  {m.type === "image" ? (
                    <img src={m.url} alt="" onClick={() => setZoomedImg(m.url)} className="w-full h-full object-cover cursor-zoom-in"/>
                  ) : (
                    <video src={m.url} className="w-full h-full object-cover" controls playsInline/>
                  )}
                </div>
              ))}
            </div>
            {r.media.length > 1 && (
              <>
                <div className="absolute top-4 right-16 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs font-bold tabular-nums">
                  {galleryIdx + 1} / {r.media.length}
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 items-center">
                  {r.media.map((_, i) => (
                    <div key={i} className={cls("rounded-full transition-all duration-300",
                      i === galleryIdx ? "w-2 h-2 bg-white shadow" : "w-1.5 h-1.5 bg-white/50")}/>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div onClick={() => setZoomedImg(r.img)} className="cursor-zoom-in">
            <SmartImg r={r} className="w-full h-80 object-cover"/>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none"/>
        <button onClick={close} aria-label="뒤로" className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
          <ArrowLeft size={18} className="text-white"/>
        </button>
        <button onClick={() => toggleFav(r.id)} aria-label="좋아요" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
          <Heart size={18} className={favs.has(r.id) ? "text-rose-500 fill-rose-500" : "text-white"}/>
        </button>
        {isMine && (
          <>
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label="옵션 메뉴"
              className="absolute top-4 right-16 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
              <span className="text-white text-lg font-black leading-none -mt-1">⋯</span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)}/>
                <div className={cls("absolute top-16 right-16 z-20 rounded-2xl shadow-2xl overflow-hidden min-w-[140px] animate-fade-in", dark ? "bg-gray-800" : "bg-white")}>
                  <button onClick={() => { setMenuOpen(false); onEdit && onEdit(r); }}
                    className={cls("w-full px-4 py-3 text-sm font-bold text-left flex items-center gap-2.5 transition", dark ? "text-gray-200 active:bg-gray-700" : "text-gray-700 active:bg-gray-50")}>
                    <PenLine size={14}/> 수정하기
                  </button>
                  <div className={cls("h-px", dark ? "bg-gray-700" : "bg-gray-100")}/>
                  <button onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                    className="w-full px-4 py-3 text-sm font-bold text-left flex items-center gap-2.5 text-rose-500 transition active:bg-rose-50 dark:active:bg-rose-900/20">
                    <X size={14}/> 삭제하기
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
      <div className="p-5">
        <CategoryChip cat={r.category} dark={dark}/>
        <h1 className={cls("text-2xl font-black tracking-tight mt-2 leading-tight", dark ? "text-white" : "text-gray-900")}>{r.title}</h1>
        <div className={cls("flex items-center gap-3 mt-2 text-xs", dark ? "text-gray-400" : "text-gray-500")}>
          <span className="flex items-center gap-1"><Heart size={12}/> {r.likes}</span>
          <span className="flex items-center gap-1"><Eye size={12}/> {r.views}</span>
          <span>{formatRelativeTime(r.date)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {r.tags.map((t) => (
            <span key={t} className={cls("text-xs px-2.5 py-1 rounded-full", dark ? cat.dchip : cat.chip)}>#{t}</span>
          ))}
        </div>
        <p className={cls("mt-4 text-[15px] leading-relaxed whitespace-pre-wrap", dark ? "text-gray-200" : "text-gray-700")}>
          {r.body.split(/(#[^\s#]+)/g).map((part, i) => {
            if (part.startsWith("#") && part.length > 1) {
              return (
                <button key={i} onClick={() => onHashtagClick && onHashtagClick(part.slice(1))}
                  className={cls("font-bold active:opacity-60", dark ? "text-emerald-400" : "text-emerald-600")}>
                  {part}
                </button>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </p>

        <div className={cls("mt-5 p-3 rounded-2xl flex items-center gap-3", dark ? "bg-gray-800" : "bg-white")}>
          <div className={cls("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white", cat.color)}>
            <ShoppingBag size={20} strokeWidth={2.2}/>
          </div>
          <div className="flex-1 min-w-0">
            <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>관련 상품</p>
            <p className={cls("text-sm font-bold line-clamp-1", dark ? "text-white" : "text-gray-900")}>{r.product}</p>
          </div>
        </div>

        {/* Comments */}
        <div className="mt-6">
          <h3 className={cls("text-sm font-extrabold mb-3", dark ? "text-white" : "text-gray-900")}>댓글 {comments.length}</h3>
          <div className="space-y-3">
            {comments.filter((c) => !c.parentId).map((c) => {
              const replies = comments.filter((x) => x.parentId === c.id);
              return (
                <div key={c.id}>
                  <div className="flex gap-2.5 group">
                    <button onClick={() => onUserClick({ author: c.author, avatar: c.avatar })} className="active:scale-90 transition shrink-0">
                      <Avatar id={c.avatar} size={14} className="w-8 h-8"/>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <button onClick={() => onUserClick({ author: c.author, avatar: c.avatar })} className={cls("text-xs font-bold active:opacity-60", dark ? "text-white" : "text-gray-900")}>{c.author}</button>
                        <p className={cls("text-xs font-normal opacity-70", dark ? "text-gray-400" : "text-gray-600")}>{formatRelativeTime(c.createdAt, c.time)}</p>
                      </div>
                      <p className={cls("text-xs mt-0.5", dark ? "text-gray-300" : "text-gray-700")}>{c.text}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <button onClick={() => setReplyTo({ id: c.id, author: c.author, isReply: false })}
                          className={cls("text-xs font-bold active:opacity-60", dark ? "text-gray-500" : "text-gray-400")}>
                          답글
                        </button>
                        <button onClick={() => toggleCommentLike && toggleCommentLike(r.id, c.id)}
                          className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", (c.likedBy || []).includes(user?.nickname) ? "text-rose-500" : dark ? "text-gray-500" : "text-gray-400")}>
                          <Heart size={11} className={(c.likedBy || []).includes(user?.nickname) ? "fill-rose-500" : ""}/>
                          {(c.likedBy || []).length > 0 && <span>{(c.likedBy || []).length}</span>}
                        </button>
                        {user && c.author !== user.nickname && (
                          <button onClick={() => onReport && onReport()}
                            className={cls("text-xs font-bold active:opacity-60", dark ? "text-gray-600" : "text-gray-400")}>
                            신고
                          </button>
                        )}
                      </div>
                    </div>
                    {user && c.author === user.nickname && (
                      <button onClick={() => deleteComment && deleteComment(r.id, c.id)} aria-label="댓글 삭제"
                        className={cls("w-6 h-6 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition", dark ? "bg-gray-800 text-gray-500 hover:text-rose-400" : "bg-gray-100 text-gray-400 hover:text-rose-500")}>
                        <X size={12}/>
                      </button>
                    )}
                  </div>
                  {replies.length > 0 && (
                    <div className={cls("mt-2 ml-5 pl-5 space-y-2 border-l-2", dark ? "border-gray-700" : "border-gray-200")}>
                      {replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2 group">
                          <button onClick={() => onUserClick({ author: reply.author, avatar: reply.avatar })} className="active:scale-90 transition shrink-0">
                            <Avatar id={reply.avatar} size={12} className="w-6 h-6"/>
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <button onClick={() => onUserClick({ author: reply.author, avatar: reply.avatar })} className={cls("text-xs font-bold active:opacity-60", dark ? "text-white" : "text-gray-900")}>{reply.author}</button>
                              <p className={cls("text-xs font-normal opacity-70", dark ? "text-gray-400" : "text-gray-600")}>{formatRelativeTime(reply.createdAt, reply.time)}</p>
                            </div>
                            <p className={cls("text-xs mt-0.5", dark ? "text-gray-300" : "text-gray-700")}>
                              {reply.mentionTo && (
                                <span className={cls("font-bold mr-1", dark ? "text-emerald-400" : "text-emerald-600")}>@{reply.mentionTo}</span>
                              )}
                              {reply.text}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <button onClick={() => setReplyTo({ id: c.id, author: reply.author, isReply: true })}
                                className={cls("text-xs font-bold active:opacity-60", dark ? "text-gray-500" : "text-gray-400")}>
                                답글
                              </button>
                              <button onClick={() => toggleCommentLike && toggleCommentLike(r.id, reply.id)}
                                className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", (reply.likedBy || []).includes(user?.nickname) ? "text-rose-500" : dark ? "text-gray-500" : "text-gray-400")}>
                                <Heart size={10} className={(reply.likedBy || []).includes(user?.nickname) ? "fill-rose-500" : ""}/>
                                {(reply.likedBy || []).length > 0 && <span>{(reply.likedBy || []).length}</span>}
                              </button>
                              {user && reply.author !== user.nickname && (
                                <button onClick={() => onReport && onReport()}
                                  className={cls("text-xs font-bold active:opacity-60", dark ? "text-gray-600" : "text-gray-400")}>
                                  신고
                                </button>
                              )}
                            </div>
                          </div>
                          {user && reply.author === user.nickname && (
                            <button onClick={() => deleteComment && deleteComment(r.id, reply.id)} aria-label="답글 삭제"
                              className={cls("w-5 h-5 rounded-full flex items-center justify-center shrink-0 active:scale-90", dark ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400")}>
                              <X size={10}/>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {replyTo && (
            <div className={cls("mt-3 px-3 py-2 rounded-xl flex items-center justify-between text-xs", dark ? "bg-emerald-900/20 text-emerald-300" : "bg-emerald-50 text-emerald-700")}>
              <span><span className="font-black">@{replyTo.author}</span>에게 답글 작성 중</span>
              <button onClick={() => setReplyTo(null)} aria-label="답글 취소" className="active:scale-90"><X size={12}/></button>
            </div>
          )}
          <div className={cls("mt-3 flex gap-2 p-2 rounded-full", dark ? "bg-gray-800" : "bg-white")}>
            <input value={comment} onChange={(e) => setComment(e.target.value)}
              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
              placeholder={replyTo ? `@${replyTo.author}에게 답글` : "댓글을 남겨보세요"}
              className={cls("flex-1 bg-transparent outline-none text-xs px-2", dark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400")}/>
            <button onClick={() => {
              if (comment.trim()) {
                const ok = addComment(r.id, comment, replyTo?.id || null, replyTo?.isReply ? replyTo.author : null);
                if (ok) { setComment(""); setReplyTo(null); window.storage?.delete(`waylog:draft:comment:${r.id}`); }
              }
            }}
              className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-full">등록</button>
          </div>
        </div>

        {related.length > 0 && (
          <>
            <h3 className={cls("mt-7 mb-3 text-sm font-extrabold", dark ? "text-white" : "text-gray-900")}>비슷한 웨이로그</h3>
            <div className="grid grid-cols-2 gap-3 pb-8">
              {related.map((x) => (
                <button key={x.id} onClick={() => onOpen(x)} className={cls("text-left rounded-2xl overflow-hidden", dark ? "bg-gray-800" : "bg-white")}>
                  <SmartImg r={x} className="w-full h-28 object-cover"/>
                  <p className={cls("text-xs font-semibold p-2 line-clamp-1", dark ? "text-white" : "text-gray-900")}>{x.title}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {zoomedImg && (
        <div className="fixed inset-0 z-[60] max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto bg-black animate-fade-in overflow-auto"
          onClick={() => setZoomedImg(null)}
          style={{ touchAction: "pinch-zoom" }}>
          <div className="min-h-full flex items-center justify-center p-2">
            <img src={zoomedImg} alt="" className="max-w-none w-full h-auto" style={{ touchAction: "pinch-zoom" }} onClick={(e) => e.stopPropagation()}/>
          </div>
          <button onClick={() => setZoomedImg(null)} aria-label="이미지 닫기" className="fixed top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/70 backdrop-blur flex items-center justify-center">
            <X size={18} className="text-white"/>
          </button>
          <p className="fixed bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/80 font-bold pointer-events-none bg-black/50 px-3 py-1.5 rounded-full">두 손가락으로 확대 · 탭해서 닫기</p>
        </div>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDelete(false)}/>
          <div className={cls("relative w-full rounded-3xl p-6 shadow-2xl animate-slide-up", dark ? "bg-gray-900" : "bg-white")}>
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
              <X size={26} className="text-rose-500"/>
            </div>
            <p className={cls("text-base font-black text-center", dark ? "text-white" : "text-gray-900")}>이 웨이로그를 삭제할까요?</p>
            <p className={cls("text-xs text-center mt-2 opacity-70", dark ? "text-gray-400" : "text-gray-600")}>댓글, 좋아요, 무드 정보가 모두 삭제돼요. 되돌릴 수 없어요.</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirmDelete(false)}
                className={cls("flex-1 py-3 rounded-2xl font-bold text-sm border", dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600")}>취소</button>
              <button onClick={() => { setConfirmDelete(false); onDelete && onDelete(r); }}
                className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ComposeScreen = ({ onClose, onSubmit, dark, editing }) => {
  const [exiting, close] = useExit(onClose);
  const [title, setTitle] = useStoredState("waylog:draft:compose:title", "");
  const [body, setBody] = useStoredState("waylog:draft:compose:body", "");
  const [tags, setTags] = useStoredState("waylog:draft:compose:tags", "");
  const [category, setCategory] = useStoredState("waylog:draft:compose:category", "");
  const [mediaItems, setMediaItems] = useStoredState("waylog:draft:compose:media", []);
  const [selectedProducts, setSelectedProducts] = useStoredState("waylog:draft:compose:products", []);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [error, setError] = useState("");
  const [confirmClearDraft, setConfirmClearDraft] = useState(false);

  // 수정 모드 prefill (한 번만)
  useEffect(() => {
    if (editing) {
      setTitle(editing.title || "");
      setBody(editing.body || "");
      setTags((editing.tags || []).join(" "));
      setCategory(editing.category || "food");
      setMediaItems(editing.media || []);
      setSelectedProducts(editing.products || []);
    }
  }, [editing?.id]);

  const isEditMode = !!editing;
  const valid = title.trim() && body.trim() && category;

  const clearDraft = async () => {
    setTitle(""); setBody(""); setTags(""); setCategory("");
    setMediaItems([]); setSelectedProducts([]);
    try {
      await window.storage?.delete("waylog:draft:compose:title");
      await window.storage?.delete("waylog:draft:compose:body");
      await window.storage?.delete("waylog:draft:compose:tags");
      await window.storage?.delete("waylog:draft:compose:category");
      await window.storage?.delete("waylog:draft:compose:media");
      await window.storage?.delete("waylog:draft:compose:products");
    } catch {}
  };

  const resizeImage = (file, maxSize = 1600, quality = 0.85) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
          else { width = Math.round((width * maxSize) / height); height = maxSize; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError("");
    const remaining = 10 - mediaItems.length;
    if (files.length > remaining) {
      setError(`최대 10개까지 업로드 가능해요 (${remaining}개 남음)`);
      return;
    }
    const newItems = [];
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      if (isVideo) {
        if (file.size > 30 * 1024 * 1024) { setError(`${file.name}: 동영상은 30MB 이하만 가능해요`); continue; }
        const duration = await new Promise((resolve) => {
          const v = document.createElement("video");
          v.preload = "metadata";
          v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
          v.onerror = () => resolve(999);
          v.src = URL.createObjectURL(file);
        });
        if (duration > 60) { setError(`동영상은 1분 이하만 가능해요 (${Math.round(duration)}초)`); continue; }
        const url = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        newItems.push({ id: Date.now() + Math.random(), type: "video", url, duration: Math.round(duration) });
      } else if (file.type.startsWith("image/")) {
        const url = await resizeImage(file, 1600, 0.85);
        if (!url) continue;
        newItems.push({ id: Date.now() + Math.random(), type: "image", url });
      }
    }
    setMediaItems((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const removeMedia = (id) => setMediaItems((prev) => prev.filter((m) => m.id !== id));

  const toggleProduct = (p) => {
    setSelectedProducts((prev) => {
      const has = prev.find((x) => x.id === p.id);
      if (has) return prev.filter((x) => x.id !== p.id);
      if (prev.length >= 3) { setError("제품은 최대 3개까지 선택할 수 있어요"); return prev; }
      setError("");
      return [...prev, p];
    });
  };

  const filteredProducts = useMemo(() => {
    let list = category ? PRODUCTS.filter((p) => p.category === category) : PRODUCTS;
    if (!productQuery.trim()) return list;
    return list.filter((p) => (p.name || "").toLowerCase().includes((productQuery || "").toLowerCase()));
  }, [productQuery, category]);

  return (
    <div className={cls("fixed inset-0 z-40 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <div className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close} aria-label="닫기"><X size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <div className="flex flex-col items-center">
          <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>{isEditMode ? "웨이로그 수정" : "새 웨이로그"}</p>
          {!isEditMode && (title || body || tags || mediaItems.length > 0 || selectedProducts.length > 0) && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cls("text-xs font-bold inline-flex items-center gap-1", dark ? "text-emerald-400" : "text-emerald-600")}>
                <Check size={10}/> 임시 저장됨
              </span>
              <button onClick={() => setConfirmClearDraft(true)}
                className={cls("text-xs font-bold active:opacity-60", dark ? "text-rose-400" : "text-rose-500")}>
                초기화
              </button>
            </div>
          )}
        </div>
        <button disabled={!valid}
          onClick={async () => {
            const firstImg = mediaItems.find((m) => m.type === "image");
            const ok = await onSubmit({
              id: editing?.id,
              title,
              body,
              product: selectedProducts.map((p) => p.name).join(", "),
              products: selectedProducts,
              tags: tags.split(/[,#\s]+/).filter(Boolean),
              category,
              img: firstImg?.url || (editing?.img || ""),
              media: mediaItems,
            });
            if (ok !== false) {
              if (!isEditMode) clearDraft();
              close();
            }
          }}
          className={cls("text-sm font-bold", valid ? "text-emerald-500" : dark ? "text-gray-600" : "text-gray-300")}>
          {isEditMode ? "수정 완료" : "등록"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 카테고리 */}
        <div>
          <p className={cls("text-xs font-bold mb-2", dark ? "text-gray-300" : "text-gray-700")}>
            카테고리 <span className="text-rose-500">*</span>
            {!category && <span className={cls("ml-2 font-normal", dark ? "text-rose-400" : "text-rose-500")}>선택해주세요</span>}
          </p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(CATEGORIES).map(([k, c]) => (
              <button key={k} onClick={() => {
                const mismatched = selectedProducts.filter((p) => p.category && p.category !== k);
                if (mismatched.length > 0) {
                  setSelectedProducts((prev) => prev.filter((p) => !p.category || p.category === k));
                  setError(`${mismatched.length}개의 제품이 카테고리와 맞지 않아 제거됐어요`);
                  setTimeout(() => setError(""), 3000);
                }
                setCategory(k);
              }}
                className={cls("text-xs px-3 py-1.5 rounded-full font-bold transition active:scale-95",
                  category === k ? `bg-gradient-to-r ${c.color} text-white shadow-md` : dark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600",
                  !category && "ring-1 ring-rose-300")}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 미디어 업로드 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className={cls("text-xs font-bold", dark ? "text-gray-300" : "text-gray-700")}>사진 · 동영상</p>
            <span className={cls("text-xs font-bold tabular-nums", dark ? "text-gray-500" : "text-gray-400")}>{mediaItems.length}/10</span>
          </div>
          <div className="grid grid-cols-4 lg:grid-cols-6 gap-2">
            {mediaItems.map((m) => (
              <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-200 group">
                {m.type === "image" ? (
                  <img src={m.url} alt="" className="w-full h-full object-cover"/>
                ) : (
                  <>
                    <video src={m.url} className="w-full h-full object-cover" muted/>
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                        <div className="w-0 h-0 border-l-[8px] border-l-gray-900 border-y-[6px] border-y-transparent ml-0.5"/>
                      </div>
                    </div>
                    <span className="absolute bottom-1 right-1 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">{m.duration}s</span>
                  </>
                )}
                <button onClick={() => removeMedia(m.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center active:scale-90 transition">
                  <X size={11} className="text-white"/>
                </button>
              </div>
            ))}
            {mediaItems.length < 10 && (
              <label className={cls("aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition active:scale-95",
                dark ? "border-gray-700 bg-gray-800/50 hover:bg-gray-800" : "border-gray-300 bg-white hover:bg-gray-50")}>
                <Camera size={20} className={dark ? "text-gray-500" : "text-gray-400"}/>
                <span className={cls("text-[10px] font-bold mt-1", dark ? "text-gray-500" : "text-gray-400")}>추가</span>
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaUpload}/>
              </label>
            )}
          </div>
          <p className={cls("text-xs mt-2 opacity-70", dark ? "text-gray-500" : "text-gray-500")}>
            사진/동영상 최대 10개 · 동영상은 1분 이하 · 파일당 5MB
          </p>
        </div>

        {/* 제품 선택 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className={cls("text-xs font-bold", dark ? "text-gray-300" : "text-gray-700")}>
              제품 <span className={cls("font-normal opacity-70", dark ? "text-gray-500" : "text-gray-400")}>(선택)</span>
            </p>
            <span className={cls("text-xs font-bold tabular-nums", dark ? "text-gray-500" : "text-gray-400")}>{selectedProducts.length}/3</span>
          </div>
          {selectedProducts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedProducts.map((p) => (
                <div key={p.id} className={cls("inline-flex items-center gap-2 pl-2 pr-1 py-1 rounded-full", dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")}>
                  <span className="text-xs font-bold max-w-[140px] truncate">{p.name}</span>
                  <button onClick={() => toggleProduct(p)} className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center active:scale-90">
                    <X size={10}/>
                  </button>
                </div>
              ))}
            </div>
          )}
          {selectedProducts.length < 3 && (
            <button onClick={() => {
              if (!category) { setError("먼저 카테고리를 선택해주세요"); return; }
              setProductPickerOpen(true);
            }}
              className={cls("w-full py-3 rounded-xl border-2 border-dashed text-xs font-bold flex items-center justify-center gap-2 transition active:scale-[0.98]",
                !category ? dark ? "border-gray-700 bg-gray-800/30 text-gray-600" : "border-gray-200 bg-gray-50 text-gray-400" : dark ? "border-gray-700 bg-gray-800/50 text-gray-400" : "border-emerald-200 bg-emerald-50/40 text-emerald-700")}>
              <Plus size={14}/>
              {!category ? "카테고리 선택 후 제품 추가" : "제품 추가하기"}
            </button>
          )}
        </div>

        {/* 텍스트 필드 */}
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목 *"
          className={cls("w-full text-lg font-bold bg-transparent outline-none border-b pb-2",
            dark ? "text-white placeholder-gray-600 border-gray-700" : "text-gray-900 placeholder-gray-300 border-gray-200")}/>
        <textarea value={body}
          onChange={(e) => {
            setBody(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 500) + "px";
          }}
          placeholder="내용을 자유롭게 적어보세요 *" rows={6}
          className={cls("w-full text-sm bg-transparent outline-none border-b pb-2 resize-none overflow-hidden",
            dark ? "text-white placeholder-gray-600 border-gray-700" : "text-gray-900 placeholder-gray-300 border-gray-200")}/>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="예: 다이어트 홈트 비건 (공백으로 구분)"
          className={cls("w-full text-sm bg-transparent outline-none border-b pb-2",
            dark ? "text-white placeholder-gray-600 border-gray-700" : "text-gray-900 placeholder-gray-300 border-gray-200")}/>

        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
      </div>

      {/* 제품 선택 모달 */}
      {confirmClearDraft && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmClearDraft(false)}/>
          <div className={cls("relative w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-slide-up", dark ? "bg-gray-900" : "bg-white")}>
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
              <X size={26} className="text-rose-500"/>
            </div>
            <p className={cls("text-base font-black text-center", dark ? "text-white" : "text-gray-900")}>작성 중인 내용을 모두 지울까요?</p>
            <p className={cls("text-xs text-center mt-2 opacity-70", dark ? "text-gray-400" : "text-gray-600")}>제목, 본문, 태그, 사진, 제품이 모두 삭제돼요. 되돌릴 수 없어요.</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirmClearDraft(false)}
                className={cls("flex-1 py-3 rounded-2xl font-bold text-sm border", dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600")}>취소</button>
              <button onClick={() => { clearDraft(); setConfirmClearDraft(false); }}
                className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm">초기화</button>
            </div>
          </div>
        </div>
      )}

      {productPickerOpen && (
        <div className="absolute inset-0 z-50 flex items-end animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setProductPickerOpen(false)}/>
          <div className={cls("relative w-full rounded-t-3xl p-5 max-h-[80%] flex flex-col animate-slide-up", dark ? "bg-gray-900" : "bg-white")}>
            <div className={cls("w-12 h-1 rounded-full mx-auto mb-4", dark ? "bg-gray-700" : "bg-gray-300")}/>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={cls("text-base font-black", dark ? "text-white" : "text-gray-900")}>제품 선택</p>
                {category && (
                  <p className={cls("text-xs font-bold mt-0.5", dark ? "text-emerald-400" : "text-emerald-600")}>
                    {CATEGORIES[category]?.label} 카테고리 제품만 표시
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>최대 3개 ({selectedProducts.length}/3)</span>
                <button onClick={() => setProductPickerOpen(false)}
                  className={cls("w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition", dark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200")}>
                  <X size={14} className={dark ? "text-gray-400" : "text-gray-600"}/>
                </button>
              </div>
            </div>
            <div className={cls("flex items-center gap-2 px-3 py-2 rounded-full mb-3", dark ? "bg-gray-800" : "bg-gray-100")}>
              <Search size={14} className={dark ? "text-gray-500" : "text-gray-400"}/>
              <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="제품명 검색"
                className={cls("flex-1 text-sm bg-transparent outline-none", dark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400")}/>
            </div>
            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              {filteredProducts.length === 0 ? (
                <div className={cls("text-center py-10", dark ? "text-gray-500" : "text-gray-400")}>
                  <Search size={32} strokeWidth={1.5} className="mx-auto mb-2 opacity-40"/>
                  <p className="text-xs">검색 결과가 없어요</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((p) => {
                    const selected = selectedProducts.find((x) => x.id === p.id);
                    return (
                      <button key={p.id} onClick={() => toggleProduct(p)}
                        className={cls("w-full flex items-center gap-3 p-2 rounded-2xl transition active:scale-[0.98]",
                          selected ? dark ? "bg-emerald-900/40 ring-2 ring-emerald-500" : "bg-emerald-50 ring-2 ring-emerald-500" : dark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-50 hover:bg-gray-100")}>
                        {p.img ? (
                          <img src={`${BASE}${p.img}`} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0"/>
                        ) : (
                          <div className={cls("w-14 h-14 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br", CATEGORIES[p.category]?.color || "from-gray-300 to-gray-400")}>
                            <ShoppingBag size={22} className="text-white"/>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className={cls("text-xs font-bold line-clamp-2", dark ? "text-white" : "text-gray-900")}>{p.name}</p>
                          <p className={cls("text-xs mt-0.5 opacity-70", dark ? "text-gray-400" : "text-gray-500")}>후기 {p.count}개</p>
                        </div>
                        {selected ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                            <Check size={14} className="text-white"/>
                          </div>
                        ) : (
                          <div className={cls("w-6 h-6 rounded-full border-2 shrink-0", dark ? "border-gray-600" : "border-gray-300")}/>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button onClick={() => setProductPickerOpen(false)}
              className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-sm shadow-lg active:scale-[0.98] transition">
              선택 완료
            </button>
            {productQuery.trim() && filteredProducts.length === 0 && (
              <button onClick={() => {
                if (selectedProducts.length >= 3) { setError("제품은 최대 3개까지 선택할 수 있어요"); return; }
                const customId = `custom-${Date.now()}`;
                setSelectedProducts((prev) => [...prev, { id: customId, name: productQuery.trim(), img: "", count: 0, custom: true }]);
                setProductQuery("");
                setError("");
                setProductPickerOpen(false);
              }}
                className={cls("w-full mt-2 py-3 rounded-2xl font-bold text-sm border-2 border-dashed flex items-center justify-center gap-2 active:scale-[0.98] transition",
                  dark ? "border-emerald-700 text-emerald-400" : "border-emerald-300 text-emerald-600")}>
                <Plus size={14}/>
                "{productQuery.trim()}" 직접 추가하기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AuthScreen = ({ onClose, onAuth, dark }) => {
  const [exiting, close] = useExit(onClose);
  const [mode, setMode] = useState("signup"); // signup | login | forgot-password | forgot-email
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoverInput, setRecoverInput] = useState("");
  const [avatar, setAvatar] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("이미지는 2MB 이하만 가능해요"); return; }
    const reader = new FileReader();
    reader.onload = () => { setAvatar(reader.result); setError(""); };
    reader.readAsDataURL(file);
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(""); setInfo("");
    if (mode === "signup") {
      if (!nickname.trim() || !email.trim() || !password.trim()) { setError("모든 항목을 입력해주세요"); return; }
      if (nickname.trim().length < 2) { setError("닉네임은 2자 이상이어야 해요"); return; }
      if (nickname.trim().length > 12) { setError("닉네임은 12자 이하여야 해요"); return; }
      if (!emailRegex.test(email.trim())) { setError("올바른 이메일 형식이 아니에요 (예: name@email.com)"); return; }
      if (password.length < 8) { setError("비밀번호는 8자 이상이어야 해요"); return; }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) { setError("비밀번호는 영문과 숫자를 모두 포함해야 해요"); return; }
      setLoading(true);
      const { data, error: signUpError } = await supabaseAuth.signUp(email.trim(), password, nickname.trim());
      setLoading(false);
      if (signUpError) {
        // Supabase 연결 실패 시 로컬 모드 폴백
        if (signUpError.message === "Failed to fetch" || signUpError.message?.includes("fetch")) {
          onAuth({ id: Date.now(), nickname: nickname.trim(), email: email.trim(), avatar, joinedAt: new Date().toISOString() });
          close();
          return;
        }
        if (signUpError.message.includes("already registered")) setError("이미 가입된 이메일이에요");
        else setError(signUpError.message);
        return;
      }
      if (data?.user && !data.user.identities?.length) {
        setError("이미 가입된 이메일이에요");
        return;
      }
      if (data?.session) {
        onAuth({ id: data.user.id, nickname: nickname.trim(), email: email.trim(), avatar, joinedAt: new Date().toISOString() });
        close();
      } else {
        // 이메일 확인 필요 또는 세션 없음 — 로컬 폴백
        onAuth({ id: data?.user?.id || Date.now(), nickname: nickname.trim(), email: email.trim(), avatar, joinedAt: new Date().toISOString() });
        close();
      }
    } else if (mode === "login") {
      if (!email.trim() || !password.trim()) { setError("이메일과 비밀번호를 입력해주세요"); return; }
      if (!emailRegex.test(email.trim())) { setError("올바른 이메일 형식이 아니에요"); return; }
      setLoading(true);
      const { data, error: signInError } = await supabaseAuth.signIn(email.trim(), password);
      setLoading(false);
      if (signInError) {
        if (signInError.message === "Failed to fetch" || signInError.message?.includes("fetch")) {
          onAuth({ id: Date.now(), nickname: email.split("@")[0], email: email.trim(), avatar: "", joinedAt: new Date().toISOString() });
          close();
          return;
        }
        if (signInError.message.includes("Invalid")) setError("이메일 또는 비밀번호가 틀렸어요");
        else if (signInError.message.includes("confirmed")) setError("이메일 인증이 필요해요. 받은 메일을 확인해주세요.");
        else setError(signInError.message);
        return;
      }
      const profile = data?.user?.user_metadata;
      onAuth({ id: data.user.id, nickname: profile?.nickname || email.split("@")[0], email: email.trim(), avatar: "", joinedAt: data.user.created_at });
      close();
    } else if (mode === "forgot-password") {
      if (!emailRegex.test(recoverInput.trim())) { setError("올바른 이메일을 입력해주세요"); return; }
      setLoading(true);
      if (supabase) await supabase.auth.resetPasswordForEmail(recoverInput.trim());
      setLoading(false);
      setInfo(`${recoverInput.trim()} 으로 비밀번호 재설정 링크를 보냈어요`);
      setTimeout(() => { setMode("login"); setRecoverInput(""); setInfo(""); }, 2200);
    } else if (mode === "forgot-email") {
      if (!recoverInput.trim()) { setError("이름 또는 전화번호를 입력해주세요"); return; }
      setInfo("해당 기능은 준비 중이에요");
      setTimeout(() => { setMode("login"); setRecoverInput(""); setInfo(""); }, 2800);
    }
  };

  const handleSocial = (provider, label) => {
    onAuth({
      id: Date.now(),
      nickname: `${label}유저`,
      email: `${provider}_${Date.now()}@waylog.demo`,
      avatar: "",
      joinedAt: new Date().toISOString(),
      provider,
    });
    close();
  };

  const inputCls = cls("w-full text-sm bg-transparent outline-none border-b-2 pb-2 mt-4", dark ? "text-white placeholder-gray-600 border-gray-700 focus:border-emerald-500" : "text-gray-900 placeholder-gray-400 border-gray-200 focus:border-emerald-500");

  const isRecover = mode === "forgot-password" || mode === "forgot-email";
  const headerTitle = {
    signup: "회원가입",
    login: "로그인",
    "forgot-password": "비밀번호 찾기",
    "forgot-email": "이메일 찾기",
  }[mode];

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        {isRecover ? (
          <button onClick={() => { setMode("login"); setError(""); setInfo(""); setRecoverInput(""); }}>
            <ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/>
          </button>
        ) : (
          <button onClick={close} aria-label="닫기"><X size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        )}
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>{headerTitle}</p>
        <div className="w-6"/>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <Sparkles size={40} className="text-white" strokeWidth={2}/>
          </div>
          <h1 className={cls("text-2xl font-black mt-4 tracking-tight", dark ? "text-white" : "text-gray-900")}>
            {mode === "signup" && <>웨이로그에 오신 걸<br/>환영해요</>}
            {mode === "login" && <>다시 만나서<br/>반가워요</>}
            {mode === "forgot-password" && <>비밀번호를<br/>잊으셨나요?</>}
            {mode === "forgot-email" && <>이메일을<br/>잊으셨나요?</>}
          </h1>
          <p className={cls("text-xs mt-2", dark ? "text-gray-400" : "text-gray-500")}>
            {mode === "signup" && "나만의 라이프스타일을 기록하세요"}
            {mode === "login" && "이메일로 로그인하거나 소셜 계정을 사용하세요"}
            {mode === "forgot-password" && "가입한 이메일로 재설정 링크를 보내드려요"}
            {mode === "forgot-email" && "가입 시 입력한 이름이나 전화번호를 입력하세요"}
          </p>
        </div>

        {mode === "signup" && (
          <div className={cls("rounded-2xl p-4 mb-6", dark ? "bg-gray-800" : "bg-white border border-gray-100")}>
            <p className={cls("text-xs font-bold uppercase tracking-wider mb-3", dark ? "text-gray-400" : "text-gray-500")}>가입하면 이런 게 가능해요</p>
            <div className="space-y-2.5">
              {[
                { Icon: Target,  title: "취향 학습 추천",     desc: "내 취향에 맞는 리뷰가 자동으로" },
                { Icon: BookOpen,title: "무드 다이어리",      desc: "내가 좋아한 것들을 시간순으로" },
                { Icon: PenLine, title: "나만의 웨이로그 작성", desc: "리뷰와 댓글을 자유롭게" },
              ].map((b) => (
                <div key={b.title} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0">
                    <b.Icon size={16} className="text-emerald-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cls("text-xs font-bold", dark ? "text-white" : "text-gray-900")}>{b.title}</p>
                    <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "signup" && (
          <div className="mb-4 flex flex-col items-center">
            <div className="relative">
              <Avatar id={avatar} size={48} className="w-24 h-24 shadow-lg" rounded="rounded-full"/>
              <label className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-90 transition border-2 border-white">
                <Camera size={15} className="text-white"/>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
              </label>
            </div>
            <p className={cls("text-xs mt-3 font-medium", dark ? "text-gray-400" : "text-gray-500")}>
              {avatar ? "사진을 변경하려면 카메라 아이콘을 누르세요" : "프로필 사진 추가 (선택)"}
            </p>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" className={inputCls}/>
          </div>
        )}

        {(mode === "signup" || mode === "login") && (
          <>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" type="email" className={inputCls}/>
            {mode === "signup" && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
              <p className="text-xs text-rose-500 -mt-2 font-medium">올바른 이메일 형식이 아니에요</p>
            )}
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" type="password" className={inputCls}/>
            {mode === "signup" && password && (
              <div className="-mt-2 flex flex-col gap-0.5">
                <p className={cls("text-xs font-medium inline-flex items-center gap-1", password.length >= 8 ? dark ? "text-emerald-400" : "text-emerald-600" : "text-rose-500")}>
                  <Check size={10}/> 8자 이상
                </p>
                <p className={cls("text-xs font-medium inline-flex items-center gap-1", /[a-zA-Z]/.test(password) && /[0-9]/.test(password) ? dark ? "text-emerald-400" : "text-emerald-600" : "text-rose-500")}>
                  <Check size={10}/> 영문 + 숫자 포함
                </p>
              </div>
            )}
          </>
        )}

        {mode === "forgot-password" && (
          <input value={recoverInput} onChange={(e) => setRecoverInput(e.target.value)} placeholder="가입한 이메일" type="email" className={inputCls}/>
        )}

        {mode === "forgot-email" && (
          <input value={recoverInput} onChange={(e) => setRecoverInput(e.target.value)} placeholder="이름 또는 전화번호" className={inputCls}/>
        )}

        {error && <p className="text-xs text-rose-500 mt-3 font-medium">{error}</p>}
        {info && (
          <div className={cls("text-xs mt-3 p-3 rounded-xl flex items-start gap-2 font-medium", dark ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-50 text-emerald-700")}>
            <Check size={14} className="mt-0.5 shrink-0"/>
            <span>{info}</span>
          </div>
        )}

        <button onClick={submit}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold mt-6 active:scale-[0.98] transition shadow-lg shadow-emerald-500/20">
          {mode === "signup" && "회원가입 완료"}
          {mode === "login" && "로그인"}
          {mode === "forgot-password" && "재설정 링크 보내기"}
          {mode === "forgot-email" && "이메일 찾기"}
        </button>

        {mode === "login" && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => { setMode("forgot-email"); setError(""); setInfo(""); setRecoverInput(""); }}
              className={cls("text-xs font-medium", dark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700")}>
              이메일 찾기
            </button>
            <span className={cls("text-xs", dark ? "text-gray-700" : "text-gray-300")}>·</span>
            <button onClick={() => { setMode("forgot-password"); setError(""); setInfo(""); setRecoverInput(""); }}
              className={cls("text-xs font-medium", dark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700")}>
              비밀번호 찾기
            </button>
          </div>
        )}

        {(mode === "signup" || mode === "login") && (
          <>
            <div className="flex items-center gap-3 my-6">
              <div className={cls("flex-1 h-px", dark ? "bg-gray-700" : "bg-gray-200")}/>
              <span className={cls("text-xs font-medium", dark ? "text-gray-500" : "text-gray-400")}>또는</span>
              <div className={cls("flex-1 h-px", dark ? "bg-gray-700" : "bg-gray-200")}/>
            </div>
            <div className="space-y-2.5">
              <button onClick={() => handleSocial("kakao", "카카오")}
                className="relative w-full py-3.5 bg-[#FEE500] text-gray-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md">
                <MessageCircle size={18} fill="currentColor" strokeWidth={0}/>
                카카오로 계속하기
                <span className="absolute top-1.5 right-2.5 text-[9px] font-black bg-black/15 px-1.5 py-0.5 rounded text-gray-800 tracking-wider">DEMO</span>
              </button>
              <button onClick={() => handleSocial("naver", "네이버")}
                className="relative w-full py-3.5 bg-[#03C75A] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md">
                <span className="font-black text-base tracking-tight">N</span>
                네이버로 계속하기
                <span className="absolute top-1.5 right-2.5 text-[9px] font-black bg-white/20 px-1.5 py-0.5 rounded text-white tracking-wider">DEMO</span>
              </button>
              <button onClick={() => handleSocial("google", "구글")}
                className={cls("relative w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md border", dark ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200")}>
                <span className="font-black text-base" style={{ background: "linear-gradient(45deg,#4285F4 0%,#EA4335 30%,#FBBC05 65%,#34A853 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>G</span>
                Google로 계속하기
                <span className={cls("absolute top-1.5 right-2.5 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider", dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-500")}>DEMO</span>
              </button>
            </div>
          </>
        )}

        {!isRecover && (
          <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setInfo(""); }}
            className={cls("w-full mt-5 text-xs", dark ? "text-gray-400" : "text-gray-500")}>
            {mode === "signup" ? "이미 계정이 있으신가요? " : "처음이신가요? "}
            <span className="text-emerald-500 font-bold">{mode === "signup" ? "로그인" : "회원가입"}</span>
          </button>
        )}
      </div>
    </div>
  );
};

const ProfileScreen = ({ user, onClose, onLogout, onUpdateProfile, onOpenSettings, dark, favs, moods, userReviews, taste }) => {
  const [exiting, close] = useExit(onClose);
  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState(user.nickname);
  const [avatar, setAvatar] = useState(user.avatar);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const moodCount = Object.values(moods).filter(Boolean).length;
  const totalCats = Object.values(taste.cats).reduce((a,b) => a+b, 0);

  const save = () => {
    onUpdateProfile({ ...user, nickname: nick.trim() || user.nickname, avatar });
    setEditing(false);
  };

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto overflow-y-auto", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("sticky top-0 z-10 flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={20} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>프로필</p>
        <button onClick={() => editing ? save() : setEditing(true)} className="text-emerald-500 text-sm font-bold">
          {editing ? "저장" : "편집"}
        </button>
      </header>

      <div className="p-6">
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar id={avatar} size={48} className="w-24 h-24 shadow-lg shadow-emerald-500/20" rounded="rounded-full"/>
            {editing && (
              <label className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-90 transition border-2 border-white">
                <Camera size={15} className="text-white"/>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
              </label>
            )}
          </div>
          {editing ? (
            <input value={nick} onChange={(e) => setNick(e.target.value)}
              className={cls("mt-4 text-xl font-black text-center bg-transparent outline-none border-b-2", dark ? "text-white border-gray-700" : "text-gray-900 border-gray-200")}/>
          ) : (
            <h2 className={cls("mt-4 text-xl font-black", dark ? "text-white" : "text-gray-900")}>{user.nickname}</h2>
          )}
          <p className={cls("text-xs mt-1", dark ? "text-gray-400" : "text-gray-500")}>{user.email}</p>
          <p className={cls("text-xs font-normal opacity-70 mt-1", dark ? "text-gray-400" : "text-gray-600")}>
            가입 {new Date(user.joinedAt).toLocaleDateString("ko-KR")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className={cls("rounded-2xl p-4 text-center", dark ? "bg-gray-800" : "bg-white")}>
            <p className="text-2xl font-black text-rose-500">{favs.size}</p>
            <p className={cls("text-xs mt-1 font-semibold", dark ? "text-gray-400" : "text-gray-500")}>찜</p>
          </div>
          <div className={cls("rounded-2xl p-4 text-center", dark ? "bg-gray-800" : "bg-white")}>
            <p className="text-2xl font-black text-amber-500">{moodCount}</p>
            <p className={cls("text-xs mt-1 font-semibold", dark ? "text-gray-400" : "text-gray-500")}>무드</p>
          </div>
          <div className={cls("rounded-2xl p-4 text-center", dark ? "bg-gray-800" : "bg-white")}>
            <p className="text-2xl font-black text-emerald-500">{userReviews.length}</p>
            <p className={cls("text-xs mt-1 font-semibold", dark ? "text-gray-400" : "text-gray-500")}>작성</p>
          </div>
        </div>

        {totalCats > 0 && (
          <div className={cls("mt-4 p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
            <p className={cls("text-xs font-bold mb-3", dark ? "text-gray-300" : "text-gray-700")}>카테고리 비율</p>
            <div className="flex h-2 rounded-full overflow-hidden">
              {Object.entries(taste.cats).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([k,v]) => (
                <div key={k} className={cls("bg-gradient-to-r", CATEGORIES[k].color)} style={{ width: `${(v/totalCats)*100}%` }}/>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(taste.cats).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([k,v]) => (
                <div key={k} className="flex items-center gap-1">
                  <div className={cls("w-2 h-2 rounded-full bg-gradient-to-br", CATEGORIES[k].color)}/>
                  <span className={cls("text-xs font-semibold", dark ? "text-gray-400" : "text-gray-500")}>
                    {CATEGORIES[k].label} {Math.round((v/totalCats)*100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => onOpenSettings && onOpenSettings()}
          className={cls("w-full mt-6 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border", dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-50")}>
          <Sparkles size={14}/>
          설정
        </button>
        <button onClick={() => { onLogout(); close(); }}
          className={cls("w-full mt-2 py-3 rounded-2xl text-sm font-bold border", dark ? "border-gray-700 text-rose-400" : "border-gray-200 text-rose-500")}>
          로그아웃
        </button>
      </div>
    </div>
  );
};

const UserProfileScreen = ({ author, avatar, reviews, currentUser, isFollowing, onToggleFollow, onClose, onOpen, dark }) => {
  const [exiting, close] = useExit(onClose);
  const userData = SEED_USERS[author];
  const seedReviews = userData ? userData.reviewIds.map((id) => SEED_REVIEWS.find((r) => r.id === id)).filter(Boolean) : [];
  const userReviews = reviews.filter((r) => r.author === author);
  const allReviews = [...userReviews, ...seedReviews];
  const finalAvatar = avatar || userData?.avatar || "";
  const isMe = currentUser && currentUser.nickname === author;

  return (
    <div className={cls("fixed inset-0 z-40 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b backdrop-blur", dark ? "bg-gray-900/80 border-gray-800" : "bg-white/80 border-gray-100")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>{author}</p>
        <div className="w-6"/>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 text-center">
          <Avatar id={finalAvatar} size={48} className="w-24 h-24 mx-auto shadow-lg" rounded="rounded-full"/>
          <h2 className={cls("text-2xl font-black mt-4 tracking-tight", dark ? "text-white" : "text-gray-900")}>{author}</h2>
          <p className={cls("text-xs mt-1.5 max-w-xs mx-auto", dark ? "text-gray-400" : "text-gray-500")}>
            {userData?.bio || (allReviews.length > 0 ? `${allReviews.length}개의 웨이로그를 기록 중` : "웨이로그 멤버")}
          </p>

          <div className={cls("flex items-center justify-around mt-5 py-4 rounded-2xl mx-2", dark ? "bg-gray-800" : "bg-white")}>
            <div className="text-center">
              <p className={cls("text-lg font-black", dark ? "text-white" : "text-gray-900")}>{allReviews.length}</p>
              <p className={cls("text-xs font-bold uppercase tracking-wider mt-0.5", dark ? "text-gray-500" : "text-gray-500")}>Posts</p>
            </div>
            <div className={cls("w-px h-10", dark ? "bg-gray-700" : "bg-gray-200")}/>
            <div className="text-center">
              <p className={cls("text-lg font-black", dark ? "text-white" : "text-gray-900")}>{allReviews.reduce((s, r) => s + (r.likes || 0), 0)}</p>
              <p className={cls("text-xs font-bold uppercase tracking-wider mt-0.5", dark ? "text-gray-500" : "text-gray-500")}>Likes</p>
            </div>
            <div className={cls("w-px h-10", dark ? "bg-gray-700" : "bg-gray-200")}/>
            <div className="text-center">
              <p className={cls("text-lg font-black", dark ? "text-white" : "text-gray-900")}>{allReviews.reduce((s, r) => s + (r.views || 0), 0)}</p>
              <p className={cls("text-xs font-bold uppercase tracking-wider mt-0.5", dark ? "text-gray-500" : "text-gray-500")}>Views</p>
            </div>
          </div>

          {!isMe && currentUser && (
            <button onClick={() => onToggleFollow(author)}
              className={cls("mt-4 px-8 py-2.5 rounded-full font-black text-sm transition active:scale-95 inline-flex items-center gap-2",
                isFollowing
                  ? dark ? "bg-gray-800 text-gray-300 border border-gray-700" : "bg-white text-gray-700 border border-gray-200"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30")}>
              {isFollowing ? <><Check size={14}/> 팔로잉</> : <><Plus size={14}/> 팔로우</>}
            </button>
          )}
        </div>

        <div className="px-4 pb-20">
          <p className={cls("text-xs font-bold uppercase tracking-wider mb-3 px-1", dark ? "text-gray-500" : "text-gray-500")}>웨이로그</p>
          {allReviews.length === 0 ? (
            <div className={cls("py-12 text-center rounded-2xl border-2 border-dashed", dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400")}>
              <PenLine size={32} strokeWidth={1.5} className="mx-auto mb-2 opacity-50"/>
              <p className="text-xs font-medium">아직 작성한 웨이로그가 없어요</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {allReviews.map((r, i) => (
                <div key={r.id} className="animate-card-enter" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                  <Card r={r} onOpen={(x) => { close(); setTimeout(() => onOpen(x), 280); }} favs={new Set()} toggleFav={() => {}} dark={dark}/>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------- CHALLENGE COMPONENTS ----------

const MealUploadModal = ({ mealType, onClose, onSave, dark }) => {
  const [exiting, close] = useExit(onClose);
  const [photo, setPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCal, setEditCal] = useState("");
  const [editProtein, setEditProtein] = useState("");
  const [editCarb, setEditCarb] = useState("");
  const [editFat, setEditFat] = useState("");

  const mealLabels = { breakfast: "아침", lunch: "점심", dinner: "저녁" };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        const max = 800;
        if (width > max || height > max) {
          if (width > height) { height = Math.round((height * max) / width); width = max; }
          else { width = Math.round((width * max) / height); height = max; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        setPhoto(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    // TODO: 이미지 스토리지 필요 지점 - Firebase Storage로 마이그레이션
    setAnalyzing(true);
    aiMealAnalysis(mealType).then((ai) => {
      setResult(ai);
      setEditName(ai.name);
      setEditCal(String(ai.cal));
      setEditProtein(String(ai.protein));
      setEditCarb(String(ai.carb));
      setEditFat(String(ai.fat));
      setAnalyzing(false);
    });
  };

  const handleSave = () => {
    const data = editMode ? {
      name: editName || result.name,
      cal: parseInt(editCal) || result.cal,
      protein: parseInt(editProtein) || result.protein,
      carb: parseInt(editCarb) || result.carb,
      fat: parseInt(editFat) || result.fat,
    } : result;
    onSave({ ...data, photo, mealType, time: Date.now() });
    close();
  };

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-end", exiting ? "" : "animate-fade-in")}>
      <div className={cls("absolute inset-0 bg-black/50", exiting ? "animate-fade-out" : "")} onClick={close}/>
      <div className={cls("relative w-full rounded-t-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto", dark ? "bg-gray-900" : "bg-white", exiting ? "animate-slide-down" : "animate-slide-up")}>
        <div className={cls("w-12 h-1 rounded-full mx-auto mb-4", dark ? "bg-gray-700" : "bg-gray-300")}/>
        <h3 className={cls("text-lg font-black mb-1", dark ? "text-white" : "text-gray-900")}>
          {mealLabels[mealType] || "식사"} 기록
        </h3>
        <p className={cls("text-xs mb-4", dark ? "text-gray-400" : "text-gray-500")}>
          베타 - AI 분석 기능은 개발 중이에요
        </p>

        {!photo && !analyzing && (
          <label className={cls("flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed cursor-pointer transition active:scale-[0.98]",
            dark ? "border-gray-700 bg-gray-800/50 text-gray-400" : "border-emerald-200 bg-emerald-50/50 text-gray-500")}>
            <Camera size={36} className="text-emerald-500"/>
            <span className="text-sm font-bold">식단 사진 촬영 / 선택</span>
            <span className="text-xs opacity-70">사진을 올리면 AI가 자동 분석해요</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhoto}/>
          </label>
        )}

        {analyzing && (
          <div className={cls("py-12 rounded-2xl text-center", dark ? "bg-gray-800" : "bg-gray-50")}>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mx-auto flex items-center justify-center mb-4 animate-pulse">
              <Sparkles size={28} className="text-white"/>
            </div>
            <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>AI가 분석 중이에요...</p>
            <p className={cls("text-xs mt-1", dark ? "text-gray-400" : "text-gray-500")}>음식을 인식하고 영양소를 계산하고 있어요</p>
          </div>
        )}

        {result && !analyzing && (
          <div className="space-y-4">
            {photo && (
              <div className="rounded-2xl overflow-hidden h-40">
                <img src={photo} alt="" className="w-full h-full object-cover"/>
              </div>
            )}
            <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-gray-50")}>
              <div className="flex items-center justify-between mb-3">
                <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>
                  {editMode ? "직접 수정" : "AI 분석 결과"}
                </p>
                <button onClick={() => setEditMode(!editMode)}
                  className={cls("text-xs font-bold px-2 py-1 rounded-full", dark ? "bg-gray-700 text-gray-300" : "bg-white text-gray-600")}>
                  {editMode ? "자동 결과 보기" : "수정하기"}
                </button>
              </div>
              {editMode ? (
                <div className="space-y-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="음식 이름"
                    className={cls("w-full px-3 py-2 rounded-xl text-sm font-bold", dark ? "bg-gray-700 text-white" : "bg-white text-gray-900")}/>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>칼로리</label>
                      <input value={editCal} onChange={(e) => setEditCal(e.target.value)} type="number"
                        className={cls("w-full px-3 py-2 rounded-xl text-sm", dark ? "bg-gray-700 text-white" : "bg-white text-gray-900")}/>
                    </div>
                    <div>
                      <label className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>단백질(g)</label>
                      <input value={editProtein} onChange={(e) => setEditProtein(e.target.value)} type="number"
                        className={cls("w-full px-3 py-2 rounded-xl text-sm", dark ? "bg-gray-700 text-white" : "bg-white text-gray-900")}/>
                    </div>
                    <div>
                      <label className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>탄수화물(g)</label>
                      <input value={editCarb} onChange={(e) => setEditCarb(e.target.value)} type="number"
                        className={cls("w-full px-3 py-2 rounded-xl text-sm", dark ? "bg-gray-700 text-white" : "bg-white text-gray-900")}/>
                    </div>
                    <div>
                      <label className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>지방(g)</label>
                      <input value={editFat} onChange={(e) => setEditFat(e.target.value)} type="number"
                        className={cls("w-full px-3 py-2 rounded-xl text-sm", dark ? "bg-gray-700 text-white" : "bg-white text-gray-900")}/>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className={cls("text-base font-bold mb-3", dark ? "text-white" : "text-gray-900")}>{result.name}</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className={cls("p-2 rounded-xl", dark ? "bg-gray-700" : "bg-white")}>
                      <p className="text-lg font-black text-emerald-500">{result.cal}</p>
                      <p className={cls("text-[10px] font-bold", dark ? "text-gray-400" : "text-gray-500")}>kcal</p>
                    </div>
                    <div className={cls("p-2 rounded-xl", dark ? "bg-gray-700" : "bg-white")}>
                      <p className="text-lg font-black text-blue-500">{result.protein}g</p>
                      <p className={cls("text-[10px] font-bold", dark ? "text-gray-400" : "text-gray-500")}>단백질</p>
                    </div>
                    <div className={cls("p-2 rounded-xl", dark ? "bg-gray-700" : "bg-white")}>
                      <p className="text-lg font-black text-amber-500">{result.carb}g</p>
                      <p className={cls("text-[10px] font-bold", dark ? "text-gray-400" : "text-gray-500")}>탄수화물</p>
                    </div>
                    <div className={cls("p-2 rounded-xl", dark ? "bg-gray-700" : "bg-white")}>
                      <p className="text-lg font-black text-rose-500">{result.fat}g</p>
                      <p className={cls("text-[10px] font-bold", dark ? "text-gray-400" : "text-gray-500")}>지방</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={handleSave}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-sm shadow-lg active:scale-[0.98] transition">
              저장하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ExerciseModal = ({ onClose, onSave, dark }) => {
  const [exiting, close] = useExit(onClose);
  const [type, setType] = useState(null);
  const [minutes, setMinutes] = useState("");
  const [intensity, setIntensity] = useState("mid");

  const calc = () => {
    if (!type || !minutes) return 0;
    const et = EXERCISE_TYPES.find((e) => e.key === type);
    if (!et) return 0;
    return Math.round(et.calPerMin[intensity] * parseInt(minutes));
  };

  const handleSave = () => {
    if (!type || !minutes || parseInt(minutes) <= 0) return;
    const et = EXERCISE_TYPES.find((e) => e.key === type);
    onSave({
      type, label: et?.label || type, iconKey: et?.key || "free",
      minutes: parseInt(minutes), intensity, calories: calc(), time: Date.now(),
    });
    close();
  };

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-end", exiting ? "" : "animate-fade-in")}>
      <div className={cls("absolute inset-0 bg-black/50", exiting ? "animate-fade-out" : "")} onClick={close}/>
      <div className={cls("relative w-full rounded-t-3xl p-6 shadow-2xl", dark ? "bg-gray-900" : "bg-white", exiting ? "animate-slide-down" : "animate-slide-up")}>
        <div className={cls("w-12 h-1 rounded-full mx-auto mb-4", dark ? "bg-gray-700" : "bg-gray-300")}/>
        <h3 className={cls("text-lg font-black mb-4", dark ? "text-white" : "text-gray-900")}>운동 기록</h3>

        <p className={cls("text-xs font-bold mb-2", dark ? "text-gray-400" : "text-gray-500")}>운동 종류</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {EXERCISE_TYPES.map((et) => (
            <button key={et.key} onClick={() => setType(et.key)}
              className={cls("p-3 rounded-2xl flex flex-col items-center gap-1.5 transition active:scale-95",
                type === et.key
                  ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg"
                  : dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700")}>
              <et.Icon size={20}/>
              <span className="text-xs font-bold">{et.label}</span>
            </button>
          ))}
        </div>

        <p className={cls("text-xs font-bold mb-2", dark ? "text-gray-400" : "text-gray-500")}>시간 (분)</p>
        <input value={minutes} onChange={(e) => setMinutes(e.target.value)} type="number" placeholder="30"
          className={cls("w-full px-4 py-3 rounded-2xl text-sm font-bold mb-4", dark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900")}/>

        <p className={cls("text-xs font-bold mb-2", dark ? "text-gray-400" : "text-gray-500")}>강도</p>
        <div className="flex gap-2 mb-4">
          {[
            { k: "low", label: "저강도", color: "from-sky-400 to-cyan-500" },
            { k: "mid", label: "중강도", color: "from-amber-400 to-orange-500" },
            { k: "high", label: "고강도", color: "from-rose-400 to-red-500" },
          ].map((i) => (
            <button key={i.k} onClick={() => setIntensity(i.k)}
              className={cls("flex-1 py-2.5 rounded-2xl text-xs font-black transition active:scale-95",
                intensity === i.k
                  ? `bg-gradient-to-r ${i.color} text-white shadow`
                  : dark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600")}>
              {i.label}
            </button>
          ))}
        </div>

        {type && minutes && parseInt(minutes) > 0 && (
          <div className={cls("p-4 rounded-2xl mb-4 text-center", dark ? "bg-gray-800" : "bg-emerald-50")}>
            <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>예상 소비 칼로리</p>
            <p className="text-3xl font-black text-emerald-500 mt-1">{calc()} <span className="text-sm">kcal</span></p>
          </div>
        )}

        <button onClick={handleSave} disabled={!type || !minutes || parseInt(minutes) <= 0}
          className={cls("w-full py-3.5 rounded-2xl font-black text-sm shadow-lg active:scale-[0.98] transition",
            type && minutes && parseInt(minutes) > 0
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
              : dark ? "bg-gray-800 text-gray-600" : "bg-gray-200 text-gray-400")}>
          저장하기
        </button>
      </div>
    </div>
  );
};

const InbodyScreen = ({ records, onAdd, onClose, dark }) => {
  const [exiting, close] = useExit(onClose);
  const [adding, setAdding] = useState(false);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [bmi, setBmi] = useState("");

  const handleAdd = () => {
    if (!weight) return;
    onAdd({
      id: Date.now(),
      date: new Date().toISOString(),
      weight: parseFloat(weight) || 0,
      bodyFat: parseFloat(bodyFat) || 0,
      muscle: parseFloat(muscle) || 0,
      bmi: parseFloat(bmi) || 0,
    });
    setWeight(""); setBodyFat(""); setMuscle(""); setBmi("");
    setAdding(false);
  };

  const sorted = [...(records || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = sorted[0];
  const prev = sorted[1];

  const delta = (cur, old) => {
    if (!cur || !old) return null;
    const d = cur - old;
    if (Math.abs(d) < 0.01) return null;
    return d;
  };

  // SVG 선 그래프 (체중 변화)
  const graphData = [...(records || [])].sort((a, b) => new Date(a.date) - new Date(b.date)).filter((r) => r.weight > 0);

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close}><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>인바디 기록</p>
        <button onClick={() => setAdding(true)} className="text-emerald-500"><Plus size={22}/></button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {adding && (
          <div className={cls("p-4 rounded-2xl space-y-3", dark ? "bg-gray-800" : "bg-white")}>
            <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>새 기록 추가</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "체중 (kg)", val: weight, set: setWeight },
                { label: "체지방 (%)", val: bodyFat, set: setBodyFat },
                { label: "근육량 (kg)", val: muscle, set: setMuscle },
                { label: "BMI", val: bmi, set: setBmi },
              ].map((f) => (
                <div key={f.label}>
                  <label className={cls("text-xs font-bold block mb-1", dark ? "text-gray-400" : "text-gray-500")}>{f.label}</label>
                  <input value={f.val} onChange={(e) => f.set(e.target.value)} type="number" step="0.1"
                    className={cls("w-full px-3 py-2 rounded-xl text-sm font-bold", dark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900")}/>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className={cls("flex-1 py-2.5 rounded-xl text-sm font-bold", dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600")}>취소</button>
              <button onClick={handleAdd} disabled={!weight}
                className={cls("flex-1 py-2.5 rounded-xl text-sm font-black", weight ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" : dark ? "bg-gray-700 text-gray-600" : "bg-gray-200 text-gray-400")}>
                저장
              </button>
            </div>
          </div>
        )}

        {latest && (
          <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
            <p className={cls("text-xs font-bold mb-3", dark ? "text-gray-400" : "text-gray-500")}>최근 기록 vs 이전</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "체중", val: latest.weight, unit: "kg", prev: prev?.weight },
                { label: "체지방", val: latest.bodyFat, unit: "%", prev: prev?.bodyFat, invert: true },
                { label: "근육량", val: latest.muscle, unit: "kg", prev: prev?.muscle },
                { label: "BMI", val: latest.bmi, unit: "", prev: prev?.bmi, invert: true },
              ].map((item) => {
                const d = delta(item.val, item.prev);
                const good = d ? (item.invert ? d < 0 : d > 0) : null;
                return (
                  <div key={item.label} className={cls("p-3 rounded-xl", dark ? "bg-gray-700" : "bg-gray-50")}>
                    <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>{item.label}</p>
                    <p className={cls("text-xl font-black mt-1", dark ? "text-white" : "text-gray-900")}>
                      {item.val || "-"}<span className="text-xs font-bold ml-0.5">{item.unit}</span>
                    </p>
                    {d !== null && (
                      <p className={cls("text-xs font-bold mt-0.5", good ? "text-emerald-500" : "text-rose-500")}>
                        {d > 0 ? "+" : ""}{d.toFixed(1)}{item.unit}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {graphData.length >= 2 && (
          <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
            <p className={cls("text-xs font-bold mb-3", dark ? "text-gray-400" : "text-gray-500")}>체중 변화</p>
            <svg viewBox="0 0 300 120" className="w-full h-28">
              {(() => {
                const vals = graphData.map((d) => d.weight);
                const min = Math.min(...vals) - 1;
                const max = Math.max(...vals) + 1;
                const range = max - min || 1;
                const pts = graphData.map((d, i) => ({
                  x: graphData.length === 1 ? 150 : 20 + (i / (graphData.length - 1)) * 260,
                  y: 10 + ((max - d.weight) / range) * 90,
                }));
                const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                return (
                  <>
                    <path d={line} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="4" fill="#10b981"/>
                        <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[9px] font-bold" fill={dark ? "#9ca3af" : "#6b7280"}>{vals[i]}</text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        )}

        <div className="space-y-2">
          <p className={cls("text-xs font-bold px-1", dark ? "text-gray-400" : "text-gray-500")}>기록 히스토리</p>
          {sorted.length === 0 && (
            <div className={cls("py-8 text-center rounded-2xl border-2 border-dashed", dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400")}>
              <Activity size={28} className="mx-auto mb-2 opacity-50"/>
              <p className="text-xs font-medium">아직 기록이 없어요</p>
            </div>
          )}
          {sorted.map((r) => (
            <div key={r.id} className={cls("p-3 rounded-2xl flex items-center gap-3", dark ? "bg-gray-800" : "bg-white")}>
              <div className={cls("w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-emerald-400 to-teal-500")}>
                <Activity size={18}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>{new Date(r.date).toLocaleDateString("ko-KR")}</p>
                <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>
                  {r.weight}kg · {r.bodyFat}% · {r.muscle}kg
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ChallengeGraphScreen = ({ challenge, dailyLogs, inbodyRecords, onClose, dark }) => {
  const [exiting, close] = useExit(onClose);
  const [activeTab, setActiveTab] = useState("weight");
  const graphRef = useRef(null);

  const tabs = [
    { key: "weight", label: "체중" },
    { key: "bodyFat", label: "체지방" },
    { key: "muscle", label: "근육량" },
    { key: "calories", label: "칼로리" },
  ];

  const getGraphPoints = () => {
    if (activeTab === "calories") {
      const entries = Object.entries(dailyLogs || {})
        .map(([date, log]) => ({ date, val: (log.meals || []).reduce((s, m) => s + (m.cal || 0), 0) }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14);
      return entries;
    }
    const sorted = [...(inbodyRecords || [])]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .filter((r) => r[activeTab] > 0);
    return sorted.map((r) => ({ date: r.date, val: r[activeTab] }));
  };

  const points = getGraphPoints();

  const handleSaveImage = () => {
    if (!graphRef.current) return;
    const svgEl = graphRef.current;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    canvas.width = 600; canvas.height = 300;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = dark ? "#111827" : "#ffffff";
    ctx.fillRect(0, 0, 600, 300);
    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 600, 300);
      const a = document.createElement("a");
      a.download = `waylog-challenge-${activeTab}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close}><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>변화 그래프</p>
        <button onClick={handleSaveImage} className="text-emerald-500"><Download size={20}/></button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className={cls("flex gap-1 p-1 rounded-2xl", dark ? "bg-gray-800" : "bg-gray-100")}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cls("flex-1 py-2 rounded-xl text-xs font-bold transition",
                activeTab === t.key ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow" : dark ? "text-gray-400" : "text-gray-500")}>
              {t.label}
            </button>
          ))}
        </div>

        <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
          {points.length < 2 ? (
            <div className="py-12 text-center">
              <BarChart3 size={36} className={cls("mx-auto mb-3 opacity-30", dark ? "text-gray-500" : "text-gray-400")}/>
              <p className={cls("text-sm font-bold", dark ? "text-gray-400" : "text-gray-500")}>데이터가 2개 이상 필요해요</p>
              <p className={cls("text-xs mt-1", dark ? "text-gray-500" : "text-gray-400")}>
                {activeTab === "calories" ? "식단을 기록하면 자동으로 그래프가 만들어져요" : "인바디를 기록해주세요"}
              </p>
            </div>
          ) : (
            <svg ref={graphRef} viewBox="0 0 300 150" className="w-full h-40">
              <rect width="300" height="150" fill={dark ? "#1f2937" : "#ffffff"} rx="8"/>
              {(() => {
                const vals = points.map((p) => p.val);
                const min = Math.min(...vals) - (Math.max(...vals) - Math.min(...vals)) * 0.1 || 0;
                const max = Math.max(...vals) + (Math.max(...vals) - Math.min(...vals)) * 0.1 || 1;
                const range = max - min || 1;
                const pts = points.map((p, i) => ({
                  x: 30 + (i / (points.length - 1)) * 250,
                  y: 15 + ((max - p.val) / range) * 110,
                  val: p.val,
                  date: p.date,
                }));
                const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                const area = `${line} L${pts[pts.length-1].x},130 L${pts[0].x},130 Z`;
                const color = activeTab === "bodyFat" ? "#f43f5e" : activeTab === "muscle" ? "#8b5cf6" : activeTab === "calories" ? "#f59e0b" : "#10b981";
                return (
                  <>
                    <defs>
                      <linearGradient id={`grad-${activeTab}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
                        <stop offset="100%" stopColor={color} stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path d={area} fill={`url(#grad-${activeTab})`}/>
                    <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="3.5" fill={color}/>
                        {(i === 0 || i === pts.length - 1 || points.length <= 7) && (
                          <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="8" fontWeight="bold" fill={dark ? "#9ca3af" : "#6b7280"}>
                            {typeof p.val === "number" ? p.val.toFixed(activeTab === "calories" ? 0 : 1) : p.val}
                          </text>
                        )}
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          )}
        </div>

        {challenge?.targetCalories && activeTab === "calories" && (
          <div className={cls("p-3 rounded-2xl flex items-center gap-2", dark ? "bg-amber-900/30" : "bg-amber-50")}>
            <Target size={16} className="text-amber-500"/>
            <p className={cls("text-xs font-bold", dark ? "text-amber-300" : "text-amber-700")}>
              목표 칼로리: {challenge.targetCalories} kcal/일
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const AnonCommunityScreen = ({ challenge, onClose, dark, anonPosts, onAddPost }) => {
  const [exiting, close] = useExit(onClose);
  const [composing, setComposing] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");

  const anonId = challenge?.anonId || "익명";
  const dayNum = getChallengeDay(challenge?.startDate);

  const handlePost = () => {
    if (!postBody.trim()) return;
    onAddPost({
      id: Date.now(),
      anonId,
      dayNum,
      title: postTitle.trim(),
      body: postBody.trim(),
      likes: Math.floor(Math.random() * 15) + 1,
      createdAt: Date.now(),
    });
    setPostTitle(""); setPostBody(""); setComposing(false);
  };

  const sorted = [...(anonPosts || [])].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close}><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>챌린지 커뮤니티</p>
        <button onClick={() => setComposing(true)} className="text-emerald-500"><PenLine size={20}/></button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {composing && (
          <div className={cls("p-4 rounded-2xl space-y-3", dark ? "bg-gray-800" : "bg-white")}>
            <div className="flex items-center gap-2 mb-1">
              <CircleUser size={16} className="text-emerald-500"/>
              <span className={cls("text-xs font-bold", dark ? "text-gray-300" : "text-gray-700")}>{anonId}</span>
              <span className={cls("text-xs px-2 py-0.5 rounded-full font-bold", dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")}>Day {dayNum}</span>
            </div>
            <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="제목 (선택)"
              className={cls("w-full px-3 py-2 rounded-xl text-sm font-bold", dark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900")}/>
            <textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} placeholder="오늘의 챌린지를 공유해보세요..."
              rows={3} className={cls("w-full px-3 py-2 rounded-xl text-sm resize-none", dark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900")}/>
            <div className="flex gap-2">
              <button onClick={() => { setComposing(false); setPostTitle(""); setPostBody(""); }}
                className={cls("flex-1 py-2.5 rounded-xl text-sm font-bold", dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600")}>취소</button>
              <button onClick={handlePost} disabled={!postBody.trim()}
                className={cls("flex-1 py-2.5 rounded-xl text-sm font-black",
                  postBody.trim() ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" : dark ? "bg-gray-700 text-gray-600" : "bg-gray-200 text-gray-400")}>
                공유하기
              </button>
            </div>
          </div>
        )}

        {sorted.length === 0 && !composing && (
          <div className={cls("py-12 text-center rounded-2xl border-2 border-dashed", dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400")}>
            <Users size={32} className="mx-auto mb-2 opacity-50"/>
            <p className="text-sm font-bold">아직 게시물이 없어요</p>
            <p className="text-xs mt-1">첫 번째로 챌린지 후기를 공유해보세요!</p>
          </div>
        )}

        {sorted.map((p) => (
          <div key={p.id} className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
            <div className="flex items-center gap-2 mb-2">
              <CircleUser size={16} className={p.anonId === anonId ? "text-emerald-500" : dark ? "text-gray-400" : "text-gray-500"}/>
              <span className={cls("text-xs font-bold", dark ? "text-gray-300" : "text-gray-700")}>{p.anonId}</span>
              <span className={cls("text-xs px-2 py-0.5 rounded-full font-bold", dark ? "bg-amber-900/40 text-amber-300" : "bg-amber-50 text-amber-700")}>Day {p.dayNum}</span>
              {p.anonId === anonId && <span className={cls("text-[10px] px-1.5 py-0.5 rounded-full font-bold", dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")}>나</span>}
            </div>
            {p.title && <p className={cls("text-sm font-black mb-1", dark ? "text-white" : "text-gray-900")}>{p.title}</p>}
            <p className={cls("text-sm leading-relaxed", dark ? "text-gray-300" : "text-gray-700")}>{p.body}</p>
            <div className={cls("flex items-center gap-2 mt-3 pt-2 border-t", dark ? "border-gray-700" : "border-gray-100")}>
              <Heart size={14} className="text-rose-500" fill="currentColor"/>
              <span className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>{p.likes} 응원</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DailyReportCard = ({ challenge, dailyLogs, dark }) => {
  const dayNum = getChallengeDay(challenge?.startDate);
  const today = new Date().toISOString().slice(0, 10);
  const todayLog = dailyLogs?.[today];
  const now = new Date().getHours();

  if (now < 22 || !todayLog) return null;

  const totalCal = (todayLog.meals || []).reduce((s, m) => s + (m.cal || 0), 0);
  const totalBurned = (todayLog.exercises || []).reduce((s, e) => s + (e.calories || 0), 0);
  const completedMissions = (todayLog.completedMissions || []).length;
  const weekNum = getChallengeWeek(dayNum);
  const totalMissions = CHALLENGE_MISSIONS[weekNum - 1]?.missions?.length || 5;
  const rate = Math.round((completedMissions / totalMissions) * 100);

  const [encouragement, setEncouragement] = useState(
    rate >= 80 ? "오늘 하루 정말 잘 보냈어요! 내일도 이 기세로!" : rate >= 50 ? "절반 이상 달성! 조금만 더 힘내봐요." : "내일은 더 좋은 하루가 될 거예요. 화이팅!"
  );
  useEffect(() => {
    aiDailyReport(totalCal, totalBurned, completedMissions, totalMissions, challenge?.targetCalories || 2000)
      .then((msg) => setEncouragement(msg));
  }, []);

  return (
    <div className={cls("p-4 rounded-2xl mt-4", dark ? "bg-gray-800" : "bg-white")}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <BarChart3 size={16} className="text-white"/>
        </div>
        <div>
          <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>오늘의 리포트</p>
          <p className={cls("text-[10px] font-bold", dark ? "text-gray-400" : "text-gray-500")}>Day {dayNum} · AI 분석</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className={cls("p-2 rounded-xl text-center", dark ? "bg-gray-700" : "bg-gray-50")}>
          <p className="text-base font-black text-emerald-500">{totalCal}</p>
          <p className={cls("text-[10px] font-bold", dark ? "text-gray-400" : "text-gray-500")}>섭취 kcal</p>
        </div>
        <div className={cls("p-2 rounded-xl text-center", dark ? "bg-gray-700" : "bg-gray-50")}>
          <p className="text-base font-black text-amber-500">{totalBurned}</p>
          <p className={cls("text-[10px] font-bold", dark ? "text-gray-400" : "text-gray-500")}>소비 kcal</p>
        </div>
        <div className={cls("p-2 rounded-xl text-center", dark ? "bg-gray-700" : "bg-gray-50")}>
          <p className="text-base font-black text-violet-500">{rate}%</p>
          <p className={cls("text-[10px] font-bold", dark ? "text-gray-400" : "text-gray-500")}>미션 달성</p>
        </div>
      </div>
      <p className={cls("text-xs p-3 rounded-xl italic leading-relaxed", dark ? "bg-gray-700 text-gray-300" : "bg-emerald-50 text-emerald-700")}>
        "{encouragement}"
      </p>
    </div>
  );
};

const ChallengeStartScreen = ({ onClose, onStart, dark }) => {
  const [exiting, close] = useExit(onClose);
  const [step, setStep] = useState(0);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("female");
  const [goal, setGoal] = useState("");
  const [coachTone, setCoachTone] = useState("");
  const [warning, setWarning] = useState("");

  const bmr = weight && height && age ? calcBMR(parseFloat(weight), parseFloat(height), parseInt(age), gender) : 0;
  const targetCal = bmr && goal ? calcTargetCalories(bmr, goal) : 0;
  const bmiVal = weight && height ? (parseFloat(weight) / ((parseFloat(height) / 100) ** 2)).toFixed(1) : 0;

  const checkWarnings = () => {
    setWarning("");
    if (parseFloat(bmiVal) < 18.5 && goal === "lose") {
      setWarning("BMI가 18.5 미만이에요. 감량보다 건강 유지를 추천드려요.");
      return false;
    }
    if (targetCal > 0 && targetCal < 1200) {
      setWarning("일일 칼로리가 1200 미만이면 건강에 해로울 수 있어요. 목표를 조정해주세요.");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && (!height || !weight || !age)) return;
    if (step === 2) {
      if (!goal) return;
      if (!checkWarnings()) return;
    }
    if (step === 3 && !coachTone) return;
    if (step === 4) {
      const anonId = `챌린저${Math.floor(Math.random() * 9000) + 1000}`;
      onStart({
        startDate: new Date().toISOString(),
        height: parseFloat(height),
        weight: parseFloat(weight),
        bodyFat: parseFloat(bodyFat) || 0,
        age: parseInt(age),
        gender,
        goal,
        coachTone,
        bmr,
        targetCalories: targetCal,
        bmi: parseFloat(bmiVal),
        anonId,
        status: "active",
      });
      close();
      return;
    }
    setStep(step + 1);
    setWarning("");
  };

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return height && weight && age;
    if (step === 2) return !!goal;
    if (step === 3) return !!coachTone;
    if (step === 4) return true;
    return false;
  };

  const inputCls = cls("w-full px-4 py-3 rounded-2xl text-sm font-bold", dark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900");

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-white")}>
      <header className={cls("flex items-center justify-between p-4")}>
        <button onClick={close}><X size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <div className="flex gap-1.5">
          {[0,1,2,3,4].map((i) => (
            <div key={i} className={cls("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-emerald-500" : i < step ? "w-3 bg-emerald-300" : "w-3 bg-gray-300 dark:bg-gray-700")}/>
          ))}
        </div>
        <div className="w-6"/>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {step === 0 && (
          <div className="flex flex-col items-center justify-center text-center pt-8 animate-fade-in">
            <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-emerald-400 via-teal-500 to-amber-400 flex items-center justify-center shadow-2xl mb-8">
              <Trophy size={52} className="text-white"/>
            </div>
            <h2 className={cls("text-2xl font-black", dark ? "text-white" : "text-gray-900")}>바디키 8주 챌린지</h2>
            <p className={cls("text-sm mt-3 leading-relaxed max-w-xs", dark ? "text-gray-400" : "text-gray-500")}>
              8주간의 체계적인 식단 관리와 운동으로{"\n"}
              건강한 변화를 만들어보세요.{"\n\n"}
              AI 코치가 매일 맞춤 피드백을 드리고,{"\n"}
              주차별 미션으로 꾸준함을 만들어요.
            </p>
            <div className="flex gap-4 mt-8">
              {[
                { Icon: BarChart3, label: "AI 식단분석", color: "from-emerald-400 to-teal-500" },
                { Icon: Dumbbell, label: "운동 기록", color: "from-amber-400 to-orange-500" },
                { Icon: TrendingUp, label: "변화 그래프", color: "from-violet-400 to-purple-500" },
              ].map((f) => (
                <div key={f.label} className={cls("px-4 py-3 rounded-2xl text-center flex flex-col items-center gap-2", dark ? "bg-gray-800" : "bg-gray-50")}>
                  <div className={cls("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", f.color)}>
                    <f.Icon size={18} className="text-white"/>
                  </div>
                  <span className={cls("text-[10px] font-bold", dark ? "text-gray-400" : "text-gray-500")}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="pt-4 space-y-4 animate-fade-in">
            <h2 className={cls("text-xl font-black", dark ? "text-white" : "text-gray-900")}>신체 정보를 알려주세요</h2>
            <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>맞춤 칼로리와 운동량 계산에 사용돼요</p>
            <div>
              <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>키 (cm)</label>
              <input value={height} onChange={(e) => setHeight(e.target.value)} type="number" placeholder="165" className={inputCls}/>
            </div>
            <div>
              <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>몸무게 (kg)</label>
              <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" placeholder="65" className={inputCls}/>
            </div>
            <div>
              <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>체지방 (%, 선택)</label>
              <input value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} type="number" placeholder="25" className={inputCls}/>
            </div>
            <div>
              <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>나이</label>
              <input value={age} onChange={(e) => setAge(e.target.value)} type="number" placeholder="30" className={inputCls}/>
            </div>
            <div>
              <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>성별</label>
              <div className="flex gap-2">
                <button onClick={() => setGender("female")}
                  className={cls("flex-1 py-3 rounded-2xl text-sm font-bold transition",
                    gender === "female" ? "bg-gradient-to-r from-pink-400 to-rose-500 text-white shadow" : dark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600")}>
                  여성
                </button>
                <button onClick={() => setGender("male")}
                  className={cls("flex-1 py-3 rounded-2xl text-sm font-bold transition",
                    gender === "male" ? "bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow" : dark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600")}>
                  남성
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="pt-4 space-y-4 animate-fade-in">
            <h2 className={cls("text-xl font-black", dark ? "text-white" : "text-gray-900")}>목표를 선택해주세요</h2>
            <div className="space-y-3">
              {[
                { key: "lose", Icon: Flame, color: "from-rose-400 to-orange-500", label: "체중 감량", desc: "체지방 줄이기에 집중" },
                { key: "muscle", Icon: Dumbbell, color: "from-sky-400 to-blue-500", label: "근력 강화", desc: "근육량 늘리기에 집중" },
                { key: "health", Icon: Leaf, color: "from-emerald-400 to-teal-500", label: "건강 유지", desc: "균형 잡힌 생활 습관" },
              ].map((g) => (
                <button key={g.key} onClick={() => { setGoal(g.key); setWarning(""); }}
                  className={cls("w-full p-4 rounded-2xl flex items-center gap-4 text-left transition active:scale-[0.98]",
                    goal === g.key
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
                      : dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700")}>
                  <div className={cls("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", goal === g.key ? "bg-white/20" : `bg-gradient-to-br ${g.color}`)}>
                    <g.Icon size={22} className="text-white"/>
                  </div>
                  <div>
                    <p className="text-sm font-black">{g.label}</p>
                    <p className={cls("text-xs mt-0.5", goal === g.key ? "text-white/80" : dark ? "text-gray-500" : "text-gray-500")}>{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {bmr > 0 && goal && (
              <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-emerald-50")}>
                <p className={cls("text-xs font-bold mb-2", dark ? "text-gray-400" : "text-gray-600")}>자동 계산 결과</p>
                <div className="flex gap-4">
                  <div>
                    <p className={cls("text-xs", dark ? "text-gray-500" : "text-gray-500")}>기초대사량</p>
                    <p className={cls("text-lg font-black", dark ? "text-white" : "text-gray-900")}>{bmr} kcal</p>
                  </div>
                  <div>
                    <p className={cls("text-xs", dark ? "text-gray-500" : "text-gray-500")}>목표 칼로리</p>
                    <p className="text-lg font-black text-emerald-500">{targetCal} kcal</p>
                  </div>
                  <div>
                    <p className={cls("text-xs", dark ? "text-gray-500" : "text-gray-500")}>BMI</p>
                    <p className={cls("text-lg font-black", dark ? "text-white" : "text-gray-900")}>{bmiVal}</p>
                  </div>
                </div>
              </div>
            )}
            {warning && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-start gap-2">
                <Flame size={16} className="text-rose-500 mt-0.5 shrink-0"/>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-300">{warning}</p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="pt-4 space-y-4 animate-fade-in">
            <h2 className={cls("text-xl font-black", dark ? "text-white" : "text-gray-900")}>AI 코치를 선택하세요</h2>
            <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>매일 당신의 활동에 맞는 피드백을 보내드려요</p>
            <div className="space-y-3">
              {AI_COACH_TONES.map((t) => (
                <button key={t.key} onClick={() => setCoachTone(t.key)}
                  className={cls("w-full p-4 rounded-2xl text-left transition active:scale-[0.98]",
                    coachTone === t.key
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
                      : dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700")}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cls("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", coachTone === t.key ? "bg-white/20" : `bg-gradient-to-br ${t.color}`)}>
                      <t.Icon size={18} className="text-white"/>
                    </div>
                    <div>
                      <p className="text-sm font-black">{t.label}</p>
                      <p className={cls("text-xs", coachTone === t.key ? "text-white/80" : dark ? "text-gray-500" : "text-gray-500")}>{t.desc}</p>
                    </div>
                  </div>
                  <p className={cls("text-xs italic px-2 py-2 rounded-xl", coachTone === t.key ? "bg-white/20" : dark ? "bg-gray-700" : "bg-white")}>
                    "{t.example}"
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="pt-8 text-center animate-fade-in">
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-emerald-400 via-teal-500 to-amber-400 flex items-center justify-center shadow-2xl mx-auto mb-6">
              <Check size={44} className="text-white"/>
            </div>
            <h2 className={cls("text-2xl font-black", dark ? "text-white" : "text-gray-900")}>준비 완료!</h2>
            <p className={cls("text-sm mt-3 leading-relaxed", dark ? "text-gray-400" : "text-gray-500")}>
              8주간의 여정을 시작합니다.{"\n"}매일 꾸준히 기록하면{"\n"}놀라운 변화가 찾아올 거예요.
            </p>
            <div className={cls("mt-6 p-4 rounded-2xl mx-4 text-left", dark ? "bg-gray-800" : "bg-gray-50")}>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>목표</span>
                  <span className={cls("text-xs font-bold", dark ? "text-white" : "text-gray-900")}>
                    {goal === "lose" ? "체중 감량" : goal === "muscle" ? "근력 강화" : "건강 유지"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>목표 칼로리</span>
                  <span className="text-xs font-bold text-emerald-500">{targetCal} kcal/일</span>
                </div>
                <div className="flex justify-between">
                  <span className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>AI 코치</span>
                  <span className={cls("text-xs font-bold", dark ? "text-white" : "text-gray-900")}>
                    {AI_COACH_TONES.find((t) => t.key === coachTone)?.label || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>기간</span>
                  <span className={cls("text-xs font-bold", dark ? "text-white" : "text-gray-900")}>56일 (8주)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-8 pt-2">
        {step > 0 && (
          <button onClick={() => { setStep(step - 1); setWarning(""); }}
            className={cls("w-full py-3 rounded-2xl text-sm font-bold mb-2", dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600")}>
            이전
          </button>
        )}
        <button onClick={handleNext} disabled={!canNext()}
          className={cls("w-full py-4 rounded-2xl font-black text-base shadow-xl active:scale-[0.98] transition flex items-center justify-center gap-2",
            canNext()
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30"
              : dark ? "bg-gray-800 text-gray-600" : "bg-gray-200 text-gray-400")}>
          {step === 4 ? "챌린지 시작!" : step === 0 ? "시작하기" : "다음"}
          <ChevronRight size={18}/>
        </button>
      </div>
    </div>
  );
};

const ChallengeMainScreen = ({ challenge, dailyLogs, setDailyLogs, inbodyRecords, setInbodyRecords, anonPosts, setAnonPosts, onClose, dark, onShowToast }) => {
  const [exiting, close] = useExit(onClose);
  const [subTab, setSubTab] = useState("today");
  const [mealModal, setMealModal] = useState(null);
  const [exerciseModal, setExerciseModal] = useState(false);
  const [inbodyOpen, setInbodyOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [anonOpen, setAnonOpen] = useState(false);
  const [missionToast, setMissionToast] = useState("");

  const dayNum = getChallengeDay(challenge?.startDate);
  const weekNum = getChallengeWeek(dayNum);
  const weekMissions = CHALLENGE_MISSIONS[weekNum - 1] || CHALLENGE_MISSIONS[0];
  const today = new Date().toISOString().slice(0, 10);
  const todayLog = dailyLogs?.[today] || { meals: [], exercises: [], completedMissions: [] };
  const progress = dayNum / CHALLENGE_DAYS;

  // Streak 계산
  const calcStreak = () => {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < dayNum; i++) {
      const dateStr = new Date(d.getTime() - i * 86400000).toISOString().slice(0, 10);
      const log = dailyLogs?.[dateStr];
      if (log && (log.completedMissions?.length > 0 || log.meals?.length > 0)) streak++;
      else if (i > 0) break;
    }
    return streak;
  };
  const streak = calcStreak();

  const totalCalToday = todayLog.meals.reduce((s, m) => s + (m.cal || 0), 0);
  const totalBurnedToday = todayLog.exercises.reduce((s, e) => s + (e.calories || 0), 0);
  const completedCount = todayLog.completedMissions.length;

  const updateTodayLog = (updater) => {
    setDailyLogs((prev) => ({
      ...prev,
      [today]: updater(prev?.[today] || { meals: [], exercises: [], completedMissions: [] }),
    }));
  };

  const toggleMission = (missionId) => {
    updateTodayLog((log) => {
      const has = log.completedMissions.includes(missionId);
      const next = has
        ? log.completedMissions.filter((id) => id !== missionId)
        : [...log.completedMissions, missionId];
      // 전체 완료 시 축하
      if (!has && next.length === weekMissions.missions.length) {
        setMissionToast("오늘의 미션 전체 클리어!");
        setTimeout(() => setMissionToast(""), 2500);
      }
      return { ...log, completedMissions: next };
    });
  };

  const addMeal = (meal) => {
    updateTodayLog((log) => ({ ...log, meals: [...log.meals, meal] }));
    onShowToast && onShowToast("식단이 기록됐어요");
  };

  const addExercise = (ex) => {
    updateTodayLog((log) => ({ ...log, exercises: [...log.exercises, ex] }));
    onShowToast && onShowToast("운동이 기록됐어요");
  };

  // 변화량 계산 (시작 vs 최근)
  const sortedInbody = [...(inbodyRecords || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstInbody = sortedInbody[0];
  const latestInbody = sortedInbody[sortedInbody.length - 1];

  const [coachMsg, setCoachMsg] = useState("");
  useEffect(() => {
    aiCoachMessage(challenge?.coachTone || "cheerful", dayNum, completedCount, weekMissions.missions.length)
      .then((msg) => setCoachMsg(msg));
  }, [completedCount]);

  // 원형 진행 차트 SVG
  const circleR = 52;
  const circleC = 2 * Math.PI * circleR;
  const circleDash = circleC * progress;

  // 주간 감량 경고
  const weeklyWeightLoss = (() => {
    if (sortedInbody.length < 2) return 0;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const weekAgoRecord = sortedInbody.filter((r) => r.date <= weekAgo).pop();
    if (!weekAgoRecord || !latestInbody) return 0;
    return weekAgoRecord.weight - latestInbody.weight;
  })();

  return (
    <div className={cls("fixed inset-0 z-40 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close}><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>바디키 8주 챌린지</p>
        <div className="w-6"/>
      </header>

      <div className="flex-1 overflow-y-auto">
        {subTab === "today" && (
          <div className="p-4 space-y-4 pb-24">
            {/* 원형 차트 */}
            <div className="flex justify-center py-4">
              <div className="relative">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={circleR} fill="none" stroke={dark ? "#374151" : "#e5e7eb"} strokeWidth="8"/>
                  <circle cx="70" cy="70" r={circleR} fill="none"
                    stroke="url(#challengeGrad)" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${circleDash} ${circleC}`}
                    transform="rotate(-90 70 70)"/>
                  <defs>
                    <linearGradient id="challengeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981"/>
                      <stop offset="100%" stopColor="#f59e0b"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>D+{dayNum}</p>
                  <p className={cls("text-2xl font-black", dark ? "text-white" : "text-gray-900")}>{Math.round(progress * 100)}%</p>
                  <p className={cls("text-[10px]", dark ? "text-gray-500" : "text-gray-400")}>{dayNum}/{CHALLENGE_DAYS}일</p>
                </div>
              </div>
            </div>

            {/* 변화량 */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "체중", val: firstInbody && latestInbody ? (latestInbody.weight - firstInbody.weight).toFixed(1) : "-", unit: "kg", color: "text-emerald-500" },
                { label: "체지방", val: firstInbody && latestInbody ? (latestInbody.bodyFat - firstInbody.bodyFat).toFixed(1) : "-", unit: "%", color: "text-rose-500" },
                { label: "근육량", val: firstInbody && latestInbody ? (latestInbody.muscle - firstInbody.muscle).toFixed(1) : "-", unit: "kg", color: "text-violet-500" },
              ].map((s) => (
                <div key={s.label} className={cls("p-3 rounded-2xl text-center", dark ? "bg-gray-800" : "bg-white")}>
                  <p className={cls("text-[10px] font-bold", dark ? "text-gray-400" : "text-gray-500")}>{s.label}</p>
                  <p className={cls("text-lg font-black mt-0.5", s.color)}>
                    {s.val !== "-" && parseFloat(s.val) > 0 ? "+" : ""}{s.val}
                    <span className="text-xs">{s.unit}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* 주 2kg 이상 감량 경고 */}
            {weeklyWeightLoss > 2 && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-start gap-2">
                <Flame size={16} className="text-rose-500 mt-0.5 shrink-0"/>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-300">
                  주간 {weeklyWeightLoss.toFixed(1)}kg 감량은 과도할 수 있어요. 건강한 속도로 진행해주세요.
                </p>
              </div>
            )}

            {/* Streak */}
            {streak > 0 && (
              <div className={cls("flex items-center gap-2 px-4 py-3 rounded-2xl", dark ? "bg-amber-900/30" : "bg-amber-50")}>
                <Flame size={20} className="text-amber-500"/>
                <p className={cls("text-sm font-black", dark ? "text-amber-300" : "text-amber-700")}>{streak}일 연속 기록 중!</p>
              </div>
            )}

            {/* 주간 미션 */}
            <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>
                    Week {weekNum}: {weekMissions.title}
                  </p>
                  <p className={cls("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>
                    오늘의 미션 {completedCount}/{weekMissions.missions.length}
                  </p>
                </div>
                <div className={cls("px-2.5 py-1 rounded-full text-xs font-black", completedCount === weekMissions.missions.length ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : dark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500")}>
                  {completedCount === weekMissions.missions.length ? "완료!" : `${Math.round((completedCount / weekMissions.missions.length) * 100)}%`}
                </div>
              </div>
              <div className="space-y-2">
                {weekMissions.missions.map((m) => {
                  const done = todayLog.completedMissions.includes(m.id);
                  return (
                    <button key={m.id} onClick={() => toggleMission(m.id)}
                      className={cls("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition active:scale-[0.98]",
                        done ? dark ? "bg-emerald-900/30" : "bg-emerald-50" : dark ? "bg-gray-700/50" : "bg-gray-50")}>
                      <div className={cls("w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                        done ? "border-emerald-500 bg-emerald-500 scale-110" : dark ? "border-gray-600" : "border-gray-300")}>
                        {done && <Check size={14} className="text-white"/>}
                      </div>
                      <MissionIcon iconKey={m.icon} size={14} className={done ? "text-emerald-500" : dark ? "text-gray-400" : "text-gray-500"}/>
                      <span className={cls("text-sm font-bold flex-1", done ? "line-through opacity-60" : "", dark ? "text-white" : "text-gray-900")}>
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 오늘의 식단 */}
            <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
              <div className="flex items-center justify-between mb-3">
                <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>오늘의 식단</p>
                <p className={cls("text-xs font-bold", totalCalToday > (challenge?.targetCalories || 2000) ? "text-rose-500" : "text-emerald-500")}>
                  {totalCalToday} / {challenge?.targetCalories || "-"} kcal
                </p>
              </div>
              <div className="space-y-2">
                {["breakfast", "lunch", "dinner"].map((mt) => {
                  const meal = todayLog.meals.find((m) => m.mealType === mt);
                  const labels = { breakfast: "아침", lunch: "점심", dinner: "저녁" };
                  return (
                    <button key={mt} onClick={() => !meal && setMealModal(mt)}
                      className={cls("w-full flex items-center gap-3 p-3 rounded-xl text-left transition active:scale-[0.98]",
                        meal ? dark ? "bg-emerald-900/20" : "bg-emerald-50" : dark ? "bg-gray-700/50" : "bg-gray-50")}>
                      {meal?.photo ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                          <img src={meal.photo} alt="" className="w-full h-full object-cover"/>
                        </div>
                      ) : (
                        <div className={cls("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", dark ? "bg-gray-600" : "bg-gray-200")}>
                          <Camera size={16} className={dark ? "text-gray-400" : "text-gray-500"}/>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>{labels[mt]}</p>
                        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>
                          {meal ? meal.name : "기록하기"}
                        </p>
                      </div>
                      {meal && <span className="text-xs font-bold text-emerald-500">{meal.cal}kcal</span>}
                      {!meal && <Plus size={16} className={dark ? "text-gray-500" : "text-gray-400"}/>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 오늘의 운동 */}
            <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
              <div className="flex items-center justify-between mb-3">
                <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>오늘의 운동</p>
                <p className="text-xs font-bold text-amber-500">{totalBurnedToday} kcal 소비</p>
              </div>
              {todayLog.exercises.length > 0 && (
                <div className="space-y-2 mb-3">
                  {todayLog.exercises.map((ex, i) => (
                    <div key={i} className={cls("flex items-center gap-3 p-2 rounded-xl", dark ? "bg-gray-700/50" : "bg-gray-50")}>
                      <MissionIcon iconKey={ex.iconKey || ex.type || "free"} size={16} className={dark ? "text-emerald-400" : "text-emerald-600"}/>
                      <div className="flex-1">
                        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>{ex.label}</p>
                        <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>{ex.minutes}분 · {ex.intensity === "low" ? "저" : ex.intensity === "mid" ? "중" : "고"}강도</p>
                      </div>
                      <span className="text-xs font-bold text-amber-500">{ex.calories}kcal</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setExerciseModal(true)}
                className={cls("w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-[0.98]",
                  dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600")}>
                <Plus size={16}/> 운동 추가
              </button>
            </div>

            {/* AI 코치 */}
            <div className={cls("p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border", dark ? "border-emerald-800/50" : "border-emerald-200")}>
              <div className="flex items-center gap-2 mb-2">
                {(() => { const CoachIcon = AI_COACH_TONES.find((t) => t.key === challenge?.coachTone)?.Icon || Sparkles; return <CoachIcon size={18} className="text-emerald-500"/>; })()}
                <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>AI 코치</p>
                <span className={cls("text-[10px] px-1.5 py-0.5 rounded-full font-bold", dark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500")}>베타</span>
              </div>
              <p className={cls("text-sm leading-relaxed", dark ? "text-gray-300" : "text-gray-700")}>
                {coachMsg}
              </p>
            </div>

            {/* 일일 리포트 */}
            <DailyReportCard challenge={challenge} dailyLogs={dailyLogs} dark={dark}/>
          </div>
        )}

        {subTab === "graph" && (
          <div className="p-4">
            <ChallengeGraphScreen challenge={challenge} dailyLogs={dailyLogs} inbodyRecords={inbodyRecords} onClose={() => setSubTab("today")} dark={dark}/>
          </div>
        )}
      </div>

      {/* 하단 탭 */}
      <nav className={cls("border-t grid grid-cols-3 py-2.5", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        {[
          { k: "today", icon: Target, label: "오늘" },
          { k: "graphTab", icon: BarChart3, label: "그래프" },
          { k: "inbodyTab", icon: Activity, label: "인바디" },
        ].map(({ k, icon: Icon, label }) => (
          <button key={k} onClick={() => {
            if (k === "graphTab") setGraphOpen(true);
            else if (k === "inbodyTab") setInbodyOpen(true);
            else setSubTab(k);
          }}
            className="flex flex-col items-center gap-1 active:scale-95 transition">
            <Icon size={20} className={subTab === k ? "text-emerald-500" : dark ? "text-gray-500" : "text-gray-400"}/>
            <span className={cls("text-[10px] font-bold", subTab === k ? "text-emerald-500" : dark ? "text-gray-500" : "text-gray-400")}>{label}</span>
          </button>
        ))}
      </nav>

      {/* 커뮤니티 FAB */}
      <button onClick={() => setAnonOpen(true)}
        className="absolute right-4 bottom-20 w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl flex items-center justify-center active:scale-90 transition">
        <Users size={20}/>
      </button>

      {/* Modals */}
      {mealModal && <MealUploadModal mealType={mealModal} onClose={() => setMealModal(null)} onSave={addMeal} dark={dark}/>}
      {exerciseModal && <ExerciseModal onClose={() => setExerciseModal(false)} onSave={addExercise} dark={dark}/>}
      {inbodyOpen && <InbodyScreen records={inbodyRecords} onAdd={(r) => setInbodyRecords((prev) => [...prev, r])} onClose={() => setInbodyOpen(false)} dark={dark}/>}
      {graphOpen && <ChallengeGraphScreen challenge={challenge} dailyLogs={dailyLogs} inbodyRecords={inbodyRecords} onClose={() => setGraphOpen(false)} dark={dark}/>}
      {anonOpen && <AnonCommunityScreen challenge={challenge} onClose={() => setAnonOpen(false)} dark={dark} anonPosts={anonPosts} onAddPost={(p) => setAnonPosts((prev) => [...prev, p])}/>}

      {/* Mission toast */}
      {missionToast && (
        <div className="fixed inset-x-0 bottom-28 z-50 flex justify-center pointer-events-none px-4">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-black px-5 py-3 rounded-full shadow-xl animate-toast">
            {missionToast}
          </div>
        </div>
      )}
    </div>
  );
};

const ChallengeEntryCard = ({ challenge, dailyLogs, dark, onStart, onOpen, onResult }) => {
  if (!challenge) {
    return (
      <button onClick={onStart}
        className={cls("mx-4 mt-4 w-[calc(100%-2rem)] p-4 rounded-3xl flex items-center gap-4 text-left relative overflow-hidden active:scale-[0.98] transition",
          dark ? "bg-gray-800" : "bg-white")}
        style={{ boxShadow: "0 2px 16px -4px rgba(16,185,129,0.15)" }}>
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-amber-400"/>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
          <Trophy size={22} className="text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className={cls("text-[10px] font-black uppercase tracking-widest", dark ? "text-emerald-400" : "text-emerald-600")}>NEW CHALLENGE</p>
          <p className={cls("text-sm font-black mt-0.5", dark ? "text-white" : "text-gray-900")}>바디키 8주 챌린지</p>
          <p className={cls("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>AI 코치와 함께하는 8주 변화 프로그램</p>
        </div>
        <ChevronRight size={18} className={dark ? "text-gray-500" : "text-gray-400"}/>
      </button>
    );
  }

  if (challenge.status === "completed") {
    return (
      <button onClick={onResult}
        className={cls("mx-4 mt-4 w-[calc(100%-2rem)] p-4 rounded-3xl flex items-center gap-4 text-left relative overflow-hidden active:scale-[0.98] transition",
          dark ? "bg-gray-800" : "bg-white")}
        style={{ boxShadow: "0 2px 16px -4px rgba(245,158,11,0.15)" }}>
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-rose-400"/>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
          <Trophy size={22} className="text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className={cls("text-[10px] font-black uppercase tracking-widest", dark ? "text-amber-400" : "text-amber-600")}>COMPLETED</p>
          <p className={cls("text-sm font-black mt-0.5", dark ? "text-white" : "text-gray-900")}>챌린지 완주</p>
          <p className={cls("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>8주간의 여정을 확인해보세요</p>
        </div>
        <ChevronRight size={18} className={dark ? "text-gray-500" : "text-gray-400"}/>
      </button>
    );
  }

  // 진행 중 상태
  const dayNum = getChallengeDay(challenge.startDate);
  const weekNum = getChallengeWeek(dayNum);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLog = dailyLogs?.[todayStr] || { completedMissions: [] };
  const weekMissions = CHALLENGE_MISSIONS[weekNum - 1] || CHALLENGE_MISSIONS[0];
  const missionsDone = todayLog.completedMissions?.length || 0;
  const missionsTotal = weekMissions.missions.length;
  const pct = Math.round((dayNum / CHALLENGE_DAYS) * 100);

  return (
    <button onClick={onOpen}
      className={cls("mx-4 mt-4 w-[calc(100%-2rem)] p-5 rounded-3xl flex items-center gap-4 text-left relative overflow-hidden active:scale-[0.98] transition",
        dark ? "bg-gray-800 shadow-lg" : "bg-white shadow-lg")}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-amber-400" style={{ width: `${pct}%` }}/>
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 shadow">
        <Dumbbell size={24} className="text-white"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>D+{dayNum}</p>
          <span className={cls("text-xs", dark ? "text-gray-500" : "text-gray-400")}>/ {CHALLENGE_DAYS}일</span>
        </div>
        <div className={cls("w-full h-1.5 rounded-full mt-1.5 overflow-hidden", dark ? "bg-gray-700" : "bg-gray-100")}>
          <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }}/>
        </div>
        <p className={cls("text-xs mt-1.5 font-bold", dark ? "text-gray-400" : "text-gray-500")}>
          오늘 미션 {missionsDone}/{missionsTotal} · Week {weekNum}: {weekMissions.title}
        </p>
      </div>
      <ChevronRight size={18} className={dark ? "text-gray-500" : "text-gray-400"}/>
    </button>
  );
};

const OnboardingScreen = ({ onClose, dark }) => {
  const [step, setStep] = useState(0);
  const slides = [
    {
      Icon: Sparkles,
      gradient: "from-emerald-400 via-teal-500 to-cyan-500",
      title: "웨이로그에 오신 걸 환영해요",
      desc: "나만의 라이프스타일을 한 곳에 기록하고\n매주 자라나는 취향을 발견해보세요",
    },
    {
      Icon: Heart,
      gradient: "from-rose-400 via-pink-500 to-fuchsia-500",
      title: "좋아요로 취향을 학습해요",
      desc: "마음에 드는 카드의 하트를 누르면\n추천이 점점 정교해져요",
    },
    {
      Icon: Star,
      gradient: "from-amber-400 via-orange-500 to-rose-500",
      title: "무드를 부여해 보세요",
      desc: "Love · Good · Save · Wow 4가지 무드로\n내 감정을 카드에 담아요",
    },
    {
      Icon: PenLine,
      gradient: "from-violet-500 via-purple-500 to-pink-500",
      title: "매주 시그니처 카드를 받아요",
      desc: "활동 3개를 모으면 매주 자동으로\n나만의 취향 카드가 생성돼요",
    },
  ];

  const cur = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div className={cls("fixed inset-0 z-[60] max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col animate-slide-up", dark ? "bg-gray-900" : "bg-white")}>
      <div className="flex justify-end p-4 h-12">
        {!isLast && (
          <button onClick={onClose} className={cls("text-xs font-bold px-3 py-1.5 rounded-full", dark ? "text-gray-400 bg-gray-800" : "text-gray-500 bg-gray-100")}>
            건너뛰기
          </button>
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className={cls("w-32 h-32 rounded-[2.5rem] bg-gradient-to-br flex items-center justify-center shadow-2xl mb-8 transition-all duration-500", cur.gradient)} key={step}>
          <cur.Icon size={56} className="text-white animate-fade-in" strokeWidth={2}/>
        </div>
        <h2 className={cls("text-2xl font-black tracking-tight animate-fade-in", dark ? "text-white" : "text-gray-900")} key={`t-${step}`}>{cur.title}</h2>
        <p className={cls("text-sm mt-3 leading-relaxed whitespace-pre-line animate-fade-in", dark ? "text-gray-400" : "text-gray-500")} key={`d-${step}`}>{cur.desc}</p>
      </div>
      <div className="px-8 pb-10">
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <div key={i} className={cls("rounded-full transition-all duration-300",
              i === step ? "w-6 h-2 bg-emerald-500" : "w-2 h-2 bg-gray-300 dark:bg-gray-700")}/>
          ))}
        </div>
        <button onClick={() => isLast ? onClose() : setStep(step + 1)}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-base shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition flex items-center justify-center gap-2">
          {isLast ? "시작하기" : "다음"}
          <ChevronRight size={18}/>
        </button>
      </div>
    </div>
  );
};

const SettingsScreen = ({ user, dark, setDark, notifPref, setNotifPref, blockedList, onUnblock, onClose, onLogout, onClearData, onReplayOnboarding, onShowToast }) => {
  const [exiting, close] = useExit(onClose);
  const [confirmClear, setConfirmClear] = useState(false);
  const [blockListOpen, setBlockListOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(null); // "terms" | "privacy" | null
  const [storageInfo, setStorageInfo] = useState({ used: 0, quota: 0, percent: 0 });

  useEffect(() => {
    (async () => {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          const used = est.usage || 0;
          const quota = est.quota || 0;
          setStorageInfo({ used, quota, percent: quota > 0 ? Math.round((used / quota) * 100) : 0 });
        }
      } catch {}
    })();
  }, []);

  const formatBytes = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const cleanDraftCache = async () => {
    try {
      const list = await window.storage?.list?.("waylog:draft:");
      if (list && list.keys) {
        await Promise.all(list.keys.map((k) => window.storage.delete(k)));
      }
      onShowToast && onShowToast("임시 저장 캐시를 정리했어요");
    } catch {
      onShowToast && onShowToast("정리 중 오류가 발생했어요");
    }
  };

  const items = [
    { group: "표시", rows: [
      { icon: dark ? Sun : Moon, label: "다크모드", value: dark, type: "toggle", onChange: () => setDark(!dark) },
    ]},
    { group: "알림", rows: [
      { icon: Bell, label: "알림 받기", value: notifPref, type: "toggle", onChange: () => setNotifPref(!notifPref) },
    ]},
    { group: "계정", rows: [
      { icon: User, label: "이메일", sub: user?.email, type: "info" },
      { icon: Calendar, label: "가입일", sub: user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString("ko-KR") : "-", type: "info" },
      { icon: X, label: "차단 사용자 관리", sub: blockedList && blockedList.length > 0 ? `${blockedList.length}명` : "없음", type: "action", onClick: () => setBlockListOpen(true) },
    ]},
    { group: "데이터", rows: [
      { icon: Inbox, label: "저장 공간", sub: storageInfo.quota > 0 ? `${formatBytes(storageInfo.used)} / ${formatBytes(storageInfo.quota)} (${storageInfo.percent}%)` : "측정 중...", type: "info" },
      { icon: Inbox, label: "임시 저장 캐시 정리", sub: "작성 중이던 글의 임시 데이터를 비워요", type: "action", onClick: cleanDraftCache },
      { icon: Inbox, label: "모든 데이터 삭제", type: "action", danger: true, onClick: () => setConfirmClear(true) },
    ]},
    { group: "정보", rows: [
      { icon: Sparkles, label: "버전", sub: "5.5.0", type: "info" },
      { icon: BookOpen, label: "온보딩 다시 보기", type: "action", onClick: () => onReplayOnboarding && onReplayOnboarding() },
      { icon: BookOpen, label: "이용약관", type: "action", onClick: () => setDocOpen("terms") },
      { icon: BookOpen, label: "개인정보 처리방침", type: "action", onClick: () => setDocOpen("privacy") },
    ]},
  ];

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>설정</p>
        <div className="w-6"/>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {items.map((section) => (
          <div key={section.group}>
            <p className={cls("text-xs font-bold uppercase tracking-wider mb-2 px-2", dark ? "text-gray-500" : "text-gray-500")}>{section.group}</p>
            <div className={cls("rounded-2xl overflow-hidden", dark ? "bg-gray-800" : "bg-white")}>
              {section.rows.map((row, i) => {
                const RowIcon = row.icon;
                const Tag = row.type === "action" ? "button" : "div";
                return (
                  <Tag key={i} onClick={row.type === "action" ? row.onClick : undefined}
                    className={cls("w-full flex items-center gap-3 p-4 text-left transition",
                      row.type === "action" && (dark ? "active:bg-gray-700/30" : "active:bg-gray-50"),
                      i !== section.rows.length - 1 && (dark ? "border-b border-gray-700/50" : "border-b border-gray-100"))}>
                    <div className={cls("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", row.danger ? dark ? "bg-rose-900/30" : "bg-rose-50" : dark ? "bg-gray-700/50" : "bg-gray-100")}>
                      <RowIcon size={16} className={row.danger ? "text-rose-500" : dark ? "text-gray-300" : "text-gray-600"}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cls("text-sm font-bold", row.danger ? "text-rose-500" : dark ? "text-white" : "text-gray-900")}>{row.label}</p>
                      {row.sub && <p className={cls("text-xs font-normal opacity-70 mt-0.5", dark ? "text-gray-400" : "text-gray-600")}>{row.sub}</p>}
                    </div>
                    {row.type === "toggle" && (
                      <button onClick={row.onChange}
                        className={cls("relative w-11 h-6 rounded-full transition", row.value ? "bg-emerald-500" : dark ? "bg-gray-600" : "bg-gray-300")}>
                        <div className={cls("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", row.value ? "left-[22px]" : "left-0.5")}/>
                      </button>
                    )}
                    {row.type === "action" && <ChevronRight size={18} className={dark ? "text-gray-500" : "text-gray-400"}/>}
                  </Tag>
                );
              })}
            </div>
          </div>
        ))}
        <button onClick={() => { onLogout(); close(); }}
          className={cls("w-full py-3.5 rounded-2xl font-bold text-sm border", dark ? "border-gray-700 text-rose-400 bg-gray-800" : "border-gray-200 text-rose-500 bg-white")}>
          로그아웃
        </button>
        <p className={cls("text-xs text-center pb-4", dark ? "text-gray-600" : "text-gray-400")}>웨이로그 v5.3.0</p>
      </div>

      {confirmClear && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmClear(false)}/>
          <div className={cls("relative w-full rounded-3xl p-6 shadow-2xl animate-slide-up", dark ? "bg-gray-900" : "bg-white")}>
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
              <Inbox size={26} className="text-rose-500"/>
            </div>
            <p className={cls("text-base font-black text-center", dark ? "text-white" : "text-gray-900")}>모든 데이터를 삭제할까요?</p>
            <p className={cls("text-xs text-center mt-2 opacity-70", dark ? "text-gray-400" : "text-gray-600")}>좋아요, 무드, 작성한 글, 댓글이 모두 삭제돼요. 되돌릴 수 없어요.</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirmClear(false)}
                className={cls("flex-1 py-3 rounded-2xl font-bold text-sm border", dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600")}>취소</button>
              <button onClick={() => { onClearData(); setConfirmClear(false); close(); }}
                className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm">삭제</button>
            </div>
          </div>
        </div>
      )}

      {docOpen && (
        <div className="absolute inset-0 z-10 flex items-end animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDocOpen(null)}/>
          <div className={cls("relative w-full rounded-t-3xl shadow-2xl animate-slide-up max-h-[80vh] flex flex-col", dark ? "bg-gray-900" : "bg-white")}>
            <div className={cls("w-12 h-1 rounded-full mx-auto mt-3 mb-2 shrink-0", dark ? "bg-gray-700" : "bg-gray-300")}/>
            <div className="px-6 py-2 flex items-center justify-between shrink-0">
              <p className={cls("text-base font-black", dark ? "text-white" : "text-gray-900")}>
                {docOpen === "terms" ? "이용약관" : "개인정보 처리방침"}
              </p>
              <button onClick={() => setDocOpen(null)} aria-label="닫기" className={cls("w-8 h-8 rounded-full flex items-center justify-center", dark ? "bg-gray-800" : "bg-gray-100")}>
                <X size={14} className={dark ? "text-gray-400" : "text-gray-500"}/>
              </button>
            </div>
            <div className={cls("flex-1 overflow-y-auto px-6 pb-8 text-xs leading-relaxed", dark ? "text-gray-400" : "text-gray-600")}>
              {docOpen === "terms" ? (
                <div className="space-y-4">
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>제1조 (목적)</p>
                    <p>이 약관은 웨이로그(이하 "서비스")가 제공하는 라이프스타일 리뷰 공유 서비스의 이용과 관련하여 회사와 회원의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>제2조 (회원가입)</p>
                    <p>회원가입은 이용자가 약관에 동의하고 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 가입신청을 하는 것으로 성립합니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>제3조 (서비스 이용)</p>
                    <p>회원은 서비스가 제공하는 모든 기능을 자유롭게 이용할 수 있으며, 다른 회원의 권리를 침해하거나 서비스 운영을 방해해서는 안 됩니다. 위반 시 서비스 이용이 제한될 수 있습니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>제4조 (콘텐츠 저작권)</p>
                    <p>회원이 서비스 내에서 작성한 게시물의 저작권은 회원 본인에게 귀속됩니다. 단, 서비스는 게시물을 서비스 운영, 홍보, 개선 목적으로 활용할 수 있습니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>제5조 (책임 제한)</p>
                    <p>천재지변, 시스템 장애 등 회사의 귀책사유 없이 발생한 손해에 대해 회사는 책임을 지지 않습니다.</p>
                  </div>
                  <p className={cls("text-center pt-4 opacity-60", dark ? "text-gray-500" : "text-gray-400")}>본 약관은 데모 버전입니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>1. 수집하는 개인정보 항목</p>
                    <p>회원가입 시 닉네임, 이메일 주소, 비밀번호를 수집합니다. 서비스 이용 과정에서 작성한 글, 댓글, 좋아요, 무드 등의 활동 정보가 자동 수집됩니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>2. 개인정보 이용 목적</p>
                    <p>회원 식별, 서비스 제공, 추천 알고리즘 학습, 통계 분석 및 서비스 개선 목적으로 활용됩니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>3. 보관 기간</p>
                    <p>회원 탈퇴 시 모든 개인정보가 즉시 파기됩니다. 단, 관계 법령에 따라 일정 기간 보관해야 하는 정보는 그 기간 동안 보관됩니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>4. 제3자 제공</p>
                    <p>회원의 동의 없이 개인정보를 외부에 제공하지 않습니다. 단, 법적 요청이 있는 경우 예외로 합니다.</p>
                  </div>
                  <div>
                    <p className={cls("font-black text-sm mb-1", dark ? "text-white" : "text-gray-900")}>5. 회원의 권리</p>
                    <p>회원은 언제든지 자신의 개인정보를 열람, 수정, 삭제할 수 있습니다. 설정 메뉴의 *모든 데이터 삭제* 기능을 통해 즉시 처리됩니다.</p>
                  </div>
                  <p className={cls("text-center pt-4 opacity-60", dark ? "text-gray-500" : "text-gray-400")}>본 처리방침은 데모 버전입니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {blockListOpen && (
        <div className="absolute inset-0 z-10 flex items-end animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setBlockListOpen(false)}/>
          <div className={cls("relative w-full rounded-t-3xl shadow-2xl animate-slide-up max-h-[70vh] flex flex-col", dark ? "bg-gray-900" : "bg-white")}>
            <div className={cls("w-12 h-1 rounded-full mx-auto mt-3 mb-2 shrink-0", dark ? "bg-gray-700" : "bg-gray-300")}/>
            <div className="px-6 py-2 flex items-center justify-between shrink-0">
              <p className={cls("text-base font-black", dark ? "text-white" : "text-gray-900")}>차단된 사용자</p>
              <button onClick={() => setBlockListOpen(false)} aria-label="닫기" className={cls("w-8 h-8 rounded-full flex items-center justify-center", dark ? "bg-gray-800" : "bg-gray-100")}>
                <X size={14} className={dark ? "text-gray-400" : "text-gray-500"}/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-8">
              {(!blockedList || blockedList.length === 0) ? (
                <div className={cls("py-12 text-center", dark ? "text-gray-500" : "text-gray-400")}>
                  <X size={40} strokeWidth={1.5} className="mx-auto mb-3 opacity-40"/>
                  <p className="text-sm font-bold">차단한 사용자가 없어요</p>
                  <p className="text-xs mt-1 opacity-80">불편한 사용자는 미니 시트에서 차단할 수 있어요</p>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  {blockedList.map((author) => (
                    <div key={author} className={cls("flex items-center gap-3 p-3 rounded-2xl", dark ? "bg-gray-800" : "bg-gray-50")}>
                      <div className={cls("w-10 h-10 rounded-full flex items-center justify-center shrink-0", dark ? "bg-gray-700" : "bg-gray-200")}>
                        <User size={16} className={dark ? "text-gray-400" : "text-gray-500"}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cls("text-sm font-bold truncate", dark ? "text-white" : "text-gray-900")}>{author}</p>
                        <p className={cls("text-xs opacity-70", dark ? "text-gray-400" : "text-gray-500")}>차단됨</p>
                      </div>
                      <button onClick={() => onUnblock && onUnblock(author)}
                        className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-black rounded-full active:scale-95 transition shrink-0">
                        해제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SEED_USERS = {
  "건강한엄마": { avatar: "flower", reviewIds: [142, 152, 304], bio: "건강한 식탁을 사랑하는 두 아이 엄마" },
  "라떼러버": { avatar: "coffee", reviewIds: [252, 254], bio: "하루 5잔 카페인 중독자" },
  "다이어터김": { avatar: "leaf", reviewIds: [253, 302, 309], bio: "지속 가능한 다이어트 2년차" },
  "요가맘": { avatar: "feather", reviewIds: [147, 311], bio: "매일 아침 명상과 요가" },
};

const UserMiniSheet = ({ author, avatar, onClose, onOpen, onOpenProfile, isFollowing, onToggleFollow, isBlocked, onToggleBlock, currentUser, dark }) => {
  const [exiting, close] = useExit(onClose);
  const userData = SEED_USERS[author];
  const reviews = userData ? userData.reviewIds.map((id) => SEED_REVIEWS.find((r) => r.id === id)).filter(Boolean) : [];
  const finalAvatar = avatar || userData?.avatar || "";
  const isMe = currentUser && currentUser.nickname === author;

  return (
    <div className={cls("fixed inset-0 z-40 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-end", exiting ? "" : "animate-fade-in")}>
      <div className={cls("absolute inset-0 bg-black/50", exiting ? "animate-fade-out" : "")} onClick={close}/>
      <div className={cls("relative w-full rounded-t-3xl p-6 shadow-2xl", dark ? "bg-gray-900" : "bg-white", exiting ? "animate-slide-down" : "animate-slide-up")}>
        <div className={cls("w-12 h-1 rounded-full mx-auto mb-5", dark ? "bg-gray-700" : "bg-gray-300")}/>
        <div className="flex items-center gap-4">
          <Avatar id={finalAvatar} size={36} className="w-20 h-20 shadow-lg" rounded="rounded-full"/>
          <div className="flex-1 min-w-0">
            <h3 className={cls("text-xl font-black tracking-tight", dark ? "text-white" : "text-gray-900")}>{author}</h3>
            {userData?.bio && <p className={cls("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>{userData.bio}</p>}
            <p className={cls("text-xs mt-1.5 font-bold", dark ? "text-emerald-400" : "text-emerald-600")}>웨이로그 {reviews.length}개 작성</p>
          </div>
        </div>
        {reviews.length > 0 ? (
          <div className="mt-5">
            <p className={cls("text-xs font-bold uppercase tracking-wider mb-2", dark ? "text-gray-500" : "text-gray-500")}>최근 활동</p>
            <div className="grid grid-cols-3 gap-2">
              {reviews.slice(0, 3).map((r) => (
                <button key={r.id} onClick={() => { close(); setTimeout(() => onOpen(r), 280); }}
                  className="rounded-xl overflow-hidden active:scale-95 transition">
                  <SmartImg r={r} className="w-full aspect-square object-cover"/>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={cls("mt-5 py-6 text-center rounded-2xl border-2 border-dashed", dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400")}>
            <Sparkles size={24} className="mx-auto mb-2 opacity-40"/>
            <p className="text-xs">아직 공유한 활동이 없어요</p>
          </div>
        )}
        <div className="flex gap-2 mt-5">
          {!isMe && currentUser && (
            <button onClick={() => onToggleFollow(author)}
              className={cls("flex-1 py-3 rounded-2xl text-sm font-black transition active:scale-95 inline-flex items-center justify-center gap-1.5",
                isFollowing
                  ? dark ? "bg-gray-800 text-gray-300 border border-gray-700" : "bg-gray-100 text-gray-700"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md")}>
              {isFollowing ? <><Check size={14}/> 팔로잉</> : <><Plus size={14}/> 팔로우</>}
            </button>
          )}
          <button onClick={() => { close(); setTimeout(() => onOpenProfile && onOpenProfile({ author, avatar: finalAvatar }), 280); }}
            className={cls("flex-1 py-3 rounded-2xl text-sm font-bold border", dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-700")}>
            프로필 보기
          </button>
        </div>
        {!isMe && currentUser && (
          <button onClick={() => { onToggleBlock && onToggleBlock(author); close(); }}
            className={cls("w-full mt-3 py-2 text-xs font-bold active:opacity-60", isBlocked ? "text-emerald-500" : "text-rose-500")}>
            {isBlocked ? "차단 해제" : "이 사용자 차단하기"}
          </button>
        )}
      </div>
    </div>
  );
};

const WeeklySignatureCard = ({ user, taste, moods, favs, userReviews, reviews, sigHistory, onClose, dark, onShare }) => {
  const [exiting, close] = useExit(onClose);
  const [selectedHistory, setSelectedHistory] = useState(null);

  const totalCats = Object.values(taste.cats).reduce((a,b) => a+b, 0);
  const sortedCats = Object.entries(taste.cats).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]);
  const topCat = sortedCats[0];
  const moodCount = Object.values(moods || {}).filter(Boolean).length;
  const moodCounts = {};
  Object.values(moods || {}).forEach((m) => { if (m) moodCounts[m] = (moodCounts[m] || 0) + 1; });
  const topMoodKey = Object.entries(moodCounts).sort((a,b) => b[1]-a[1])[0]?.[0];
  const topMoodObj = topMoodKey && MOODS.find((m) => m.key === topMoodKey);
  const favReviews = reviews.filter((r) => favs.has(r.id)).slice(0, 3);

  let acc = 0;
  const stops = totalCats > 0 ? sortedCats.map(([k, v]) => {
    const start = (acc / totalCats) * 100;
    acc += v;
    const end = (acc / totalCats) * 100;
    return `${CAT_SOLID[k]} ${start}% ${end}%`;
  }).join(", ") : "#e5e7eb 0% 100%";

  const today = new Date();
  const onejan = new Date(today.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((today - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  const monthRange = `${today.getMonth() + 1}월 ${today.getDate()}일`;
  const signature = topCat ? SIGNATURES[topCat[0]] || "라이프스타일 탐험가" : "이제 막 시작한";

  const handleShare = async () => {
    const text = `${user.nickname}'s Way of Living\n${signature} 사람\n\n좋아요 ${favs.size} · 무드 ${moodCount} · 작성 ${userReviews.length}\n\n웨이로그에서 만든 나만의 취향 카드`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "내 취향 시그니처 카드", text });
        onShare && onShare("공유했어요");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        onShare && onShare("클립보드에 복사됐어요");
      }
    } catch {}
  };

  const downloadCard = () => {
    const escape = (s) => String(s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ecfdf5"/>
      <stop offset="0.5" stop-color="#ccfbf1"/>
      <stop offset="1" stop-color="#a5f3fc"/>
    </linearGradient>
    <linearGradient id="av" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#34d399"/>
      <stop offset="0.5" stop-color="#14b8a6"/>
      <stop offset="1" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" rx="60" fill="url(#bg)"/>
  <circle cx="720" cy="80" r="180" fill="#a7f3d0" opacity="0.4"/>
  <circle cx="80" cy="720" r="220" fill="#67e8f9" opacity="0.3"/>
  <rect x="60" y="80" width="100" height="100" rx="28" fill="url(#av)"/>
  <text x="110" y="148" font-family="-apple-system, sans-serif" font-size="48" font-weight="900" fill="white" text-anchor="middle">${escape((user.nickname || "?")[0])}</text>
  <text x="180" y="120" font-family="-apple-system, sans-serif" font-size="36" font-weight="900" fill="#0f172a">${escape(user.nickname)}</text>
  <text x="180" y="160" font-family="-apple-system, sans-serif" font-size="20" font-weight="700" fill="#10b981" letter-spacing="2">@WAYLOG</text>
  <text x="60" y="280" font-family="-apple-system, sans-serif" font-size="18" font-weight="900" fill="#10b981" letter-spacing="3">WEEK ${weekNum}</text>
  <text x="60" y="360" font-family="-apple-system, sans-serif" font-size="56" font-weight="900" fill="#0f172a">${escape(signature)}</text>
  <text x="60" y="420" font-family="-apple-system, sans-serif" font-size="56" font-weight="900" fill="#0f172a">사람</text>
  <g transform="translate(60, 540)">
    <rect width="220" height="120" rx="24" fill="white" opacity="0.7"/>
    <text x="110" y="55" font-family="-apple-system, sans-serif" font-size="42" font-weight="900" fill="#0f172a" text-anchor="middle">${favs.size}</text>
    <text x="110" y="90" font-family="-apple-system, sans-serif" font-size="16" font-weight="700" fill="#64748b" text-anchor="middle">좋아요</text>
  </g>
  <g transform="translate(290, 540)">
    <rect width="220" height="120" rx="24" fill="white" opacity="0.7"/>
    <text x="110" y="55" font-family="-apple-system, sans-serif" font-size="42" font-weight="900" fill="#0f172a" text-anchor="middle">${moodCount}</text>
    <text x="110" y="90" font-family="-apple-system, sans-serif" font-size="16" font-weight="700" fill="#64748b" text-anchor="middle">무드</text>
  </g>
  <g transform="translate(520, 540)">
    <rect width="220" height="120" rx="24" fill="white" opacity="0.7"/>
    <text x="110" y="55" font-family="-apple-system, sans-serif" font-size="42" font-weight="900" fill="#0f172a" text-anchor="middle">${userReviews.length}</text>
    <text x="110" y="90" font-family="-apple-system, sans-serif" font-size="16" font-weight="700" fill="#64748b" text-anchor="middle">작성</text>
  </g>
  <text x="60" y="730" font-family="-apple-system, sans-serif" font-size="18" font-weight="700" fill="#64748b" font-style="italic">${escape(monthRange)} · 매주 갱신</text>
</svg>`;
    try {
      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 1600; canvas.height = 1600; // 2x for retina
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, 1600, 1600);
          canvas.toBlob((blob) => {
            if (!blob) { onShare && onShare("이미지 변환 실패"); return; }
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = pngUrl;
            a.download = `waylog-week-${weekNum}-${user.nickname}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => { URL.revokeObjectURL(pngUrl); URL.revokeObjectURL(svgUrl); }, 1000);
            onShare && onShare("카드를 이미지로 저장했어요");
          }, "image/png");
        } catch {
          onShare && onShare("이미지 변환 실패");
        }
      };
      img.onerror = () => { onShare && onShare("다운로드 실패"); URL.revokeObjectURL(svgUrl); };
      img.src = svgUrl;
    } catch {
      onShare && onShare("다운로드에 실패했어요");
    }
  };

  return (
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto overflow-y-auto", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gradient-to-b from-emerald-50 via-teal-50 to-violet-50")}>
      <header className={cls("sticky top-0 z-10 flex items-center justify-between p-4 backdrop-blur", dark ? "bg-gray-900/80" : "bg-white/60")}>
        <button onClick={close} aria-label="닫기"><X size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>이번 주 시그니처</p>
        <div className="w-6"/>
      </header>

      <div className="px-5 py-6">
        <p className={cls("text-center text-xs mb-4", dark ? "text-gray-400" : "text-gray-500")}>
          {monthRange} · Week {weekNum}
        </p>

        {(favs.size + moodCount + userReviews.length === 0) && (
          <div className={cls("mb-4 px-4 py-3 rounded-2xl text-center", dark ? "bg-gray-800 text-gray-300" : "bg-amber-50 text-amber-700")}>
            <p className="text-xs font-bold">이번 주는 아직 조용해요</p>
            <p className="text-xs mt-1 opacity-80">좋아요 · 무드 · 글쓰기 활동을 시작해보세요</p>
          </div>
        )}

        {/* 시그니처 카드 본체 */}
        <div className={cls("aspect-square w-full rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-signature-enter",
          dark ? "bg-gradient-to-br from-gray-800 via-emerald-900/30 to-teal-900/40" : "bg-gradient-to-br from-white via-emerald-50 to-teal-100")}>
          {/* 배경 장식 */}
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-gradient-to-br from-emerald-200/50 to-teal-300/40"/>
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-gradient-to-tr from-cyan-200/40 to-emerald-200/30"/>
          <Sparkles className="absolute right-5 top-5 text-emerald-400/60" size={20}/>

          {/* 헤더: 아바타 + 닉네임 */}
          <div className="relative flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center text-3xl shadow-lg">
              {user.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Week {weekNum}</p>
              <h3 className="text-xl font-black tracking-tight text-gray-900 truncate">{user.nickname}'s Way</h3>
            </div>
          </div>

          {/* 도넛 차트 + 카테고리 범례 */}
          <div className="relative mt-6 flex items-center gap-5">
            <div className="relative w-28 h-28 shrink-0">
              {sortedCats.length === 1 ? (
                <>
                  <div className={cls("absolute inset-0 rounded-full bg-gradient-to-br shadow-2xl", CATEGORIES[sortedCats[0][0]].color)}/>
                  <div className="absolute inset-2 rounded-full border-2 border-white/40"/>
                  <div className="absolute inset-[18%] rounded-full bg-white shadow-inner flex items-center justify-center text-gray-700">
                    <CategoryIcon cat={sortedCats[0][0]} size={32} strokeWidth={2.2}/>
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 rounded-full shadow-lg" style={{ background: `conic-gradient(${stops})` }}/>
                  <div className="absolute inset-[18%] rounded-full bg-white shadow-inner flex items-center justify-center text-gray-700">
                    {topCat ? <CategoryIcon cat={topCat[0]} size={28} strokeWidth={2.2}/> : <Sparkles size={28}/>}
                  </div>
                </>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {sortedCats.length > 0 ? sortedCats.slice(0, 4).map(([k,v]) => (
                <div key={k} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_SOLID[k] }}/>
                  <span className="text-xs font-bold text-gray-700">{CATEGORIES[k].label}</span>
                  <span className="text-xs text-gray-500 ml-auto font-semibold">{Math.round((v/totalCats)*100)}%</span>
                </div>
              )) : (
                <p className="text-xs text-gray-400 italic">활동을 더 쌓아보세요</p>
              )}
            </div>
          </div>

          {/* 좋아한 아이템 썸네일 3개 */}
          {favReviews.length > 0 && (
            <div className="relative mt-4 grid grid-cols-3 gap-2">
              {favReviews.map((r) => (
                <div key={r.id} className="aspect-square rounded-xl overflow-hidden shadow-md">
                  <SmartImg r={r} className="w-full h-full object-cover"/>
                </div>
              ))}
              {Array.from({ length: 3 - favReviews.length }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square rounded-xl bg-white/50 border-2 border-dashed border-emerald-200"/>
              ))}
            </div>
          )}

          {/* 통계 미니 바 */}
          <div className="relative mt-3 flex justify-around items-center bg-white/70 backdrop-blur rounded-2xl py-2.5 shadow-sm">
            <div className="text-center">
              <p className="text-base font-black text-rose-500 leading-none">{favs.size}</p>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">Likes</p>
            </div>
            <div className="w-px h-8 bg-gray-200"/>
            <div className="text-center">
              <p className="text-base font-black text-amber-500 leading-none flex items-center justify-center gap-1">
                {moodCount}{topMoodObj && <topMoodObj.Icon size={12}/>}
              </p>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">Moods</p>
            </div>
            <div className="w-px h-8 bg-gray-200"/>
            <div className="text-center">
              <p className="text-base font-black text-emerald-500 leading-none">{userReviews.length}</p>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">Posts</p>
            </div>
          </div>

          {/* 시그니처 + 워터마크 */}
          <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between">
            <p className="text-xs italic text-gray-700 max-w-[60%] leading-tight">"{signature} 사람"</p>
            <p className="text-xs font-black text-emerald-600 tracking-[0.15em]">@WAYLOG</p>
          </div>
        </div>

        {/* 공유 + 다운로드 버튼 */}
        <div className="flex gap-2 mt-6">
          <button onClick={handleShare}
            className="flex-1 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-2xl font-bold shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition flex items-center justify-center gap-2">
            <Share2 size={18}/>
            공유하기
          </button>
          <button onClick={downloadCard}
            className={cls("py-4 px-5 rounded-2xl font-bold shadow-md active:scale-[0.98] transition flex items-center justify-center", dark ? "bg-gray-800 text-white" : "bg-white text-gray-900 border border-gray-200")}
            aria-label="카드 다운로드">
            <Inbox size={18}/>
          </button>
        </div>

        <p className={cls("text-xs text-center mt-4", dark ? "text-gray-500" : "text-gray-500")}>
          다음 카드는 매주 새로 생성돼요
        </p>

        {sigHistory && sigHistory.length > 0 && (
          <div className="mt-6">
            <p className={cls("text-xs font-black uppercase tracking-wider mb-3", dark ? "text-gray-500" : "text-gray-500")}>지난 카드</p>
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {sigHistory.map((h, i) => {
                const cat = h.topCat ? CATEGORIES[h.topCat] : null;
                return (
                  <button key={i} onClick={() => setSelectedHistory(h)}
                    className={cls("shrink-0 w-32 rounded-2xl p-3 shadow-md text-left active:scale-95 transition", cat ? `bg-gradient-to-br ${cat.color} text-white` : "bg-gradient-to-br from-emerald-500 to-teal-500 text-white")}>
                    <p className="text-xs font-black opacity-80 uppercase tracking-wider">WEEK {h.week}</p>
                    <p className="text-xs font-bold mt-2 opacity-90">{cat?.label || "전체"}</p>
                    <div className="flex gap-2 mt-2 text-xs font-bold opacity-90">
                      <span className="inline-flex items-center gap-0.5"><Heart size={9} fill="currentColor"/>{h.favs}</span>
                      <span className="inline-flex items-center gap-0.5"><Star size={9} fill="currentColor"/>{h.moods}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedHistory && (() => {
        const h = selectedHistory;
        const cat = h.topCat ? CATEGORIES[h.topCat] : null;
        return (
          <div className="fixed inset-0 z-[60] max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedHistory(null)}/>
            <div className={cls("relative w-full rounded-3xl overflow-hidden shadow-2xl animate-slide-up", cat ? `bg-gradient-to-br ${cat.color}` : "bg-gradient-to-br from-emerald-500 to-teal-500")}>
              <button onClick={() => setSelectedHistory(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur flex items-center justify-center z-10">
                <X size={14} className="text-white"/>
              </button>
              <div className="p-6 text-white">
                <p className="text-xs font-black opacity-80 uppercase tracking-[0.15em]">WEEK {h.week} · {h.year}</p>
                <p className="text-2xl font-black mt-2">{cat?.label || "전체"} 위크</p>
                <p className="text-xs opacity-80 mt-1">{new Date(h.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 생성</p>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
                    <Heart size={16} className="mx-auto opacity-90" fill="currentColor"/>
                    <p className="text-lg font-black mt-1">{h.favs}</p>
                    <p className="text-xs opacity-80 font-bold">좋아요</p>
                  </div>
                  <div className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
                    <Star size={16} className="mx-auto opacity-90" fill="currentColor"/>
                    <p className="text-lg font-black mt-1">{h.moods}</p>
                    <p className="text-xs opacity-80 font-bold">무드</p>
                  </div>
                  <div className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
                    <PenLine size={16} className="mx-auto opacity-90"/>
                    <p className="text-lg font-black mt-1">{h.posts}</p>
                    <p className="text-xs opacity-80 font-bold">작성</p>
                  </div>
                </div>
                <div className="mt-5 p-4 bg-white/10 backdrop-blur rounded-2xl">
                  <p className="text-xs opacity-80 font-bold uppercase tracking-wider">@WAYLOG</p>
                  <p className="text-sm font-bold mt-2 italic">"{cat?.label || "다채로운"} 일주일을 보낸 사람"</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ---------- APP ----------
function AppInner() {
  const [tab, setTab] = useState("home");
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshingRef = useRef(false);
  const modalOpenRef = useRef(false);

  useEffect(() => {
    let startY = 0;
    let active = false;
    let currentDelta = 0;

    const onStart = (e) => {
      if (window.scrollY > 5 || refreshingRef.current || modalOpenRef.current) return;
      startY = e.touches[0].clientY;
      active = true;
      currentDelta = 0;
    };
    const onMove = (e) => {
      if (!active) return;
      const diff = e.touches[0].clientY - startY;
      if (diff > 0) {
        currentDelta = Math.min(diff * 0.5, 100);
        setPullY(currentDelta);
      }
    };
    const onEnd = () => {
      if (!active) return;
      active = false;
      if (currentDelta > 60) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullY(60);
        setRefreshKey((k) => k + 1);
        setTimeout(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          setPullY(0);
          setToast("새로운 추천을 가져왔어요");
        }, 900);
      } else {
        setPullY(0);
      }
      currentDelta = 0;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [tab]);

  const nav = useNavStack();
  const [search, setSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [compose, setCompose] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [armClearNotif, setArmClearNotif] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setToast("다시 연결됐어요"); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  useEffect(() => {
    if (!armClearNotif) return;
    const t = setTimeout(() => setArmClearNotif(false), 3000);
    return () => clearTimeout(t);
  }, [armClearNotif]);
  const [notifications, setNotifications] = useStoredState("waylog:notifs", []);
  const [notifPref, setNotifPref] = useStoredState("waylog:notifPref", true);
  const notifPrefRef = useRef(notifPref);
  useEffect(() => { notifPrefRef.current = notifPref; }, [notifPref]);

  const pushNotif = (text, extra = {}) => {
    if (!notifPrefRef.current) return;
    setNotifications((p) => [
      { id: Date.now() + Math.random(), text, time: "방금", read: false, ...extra },
      ...p
    ]);
  };
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [toast, setToast] = useState("");
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); } }, [toast]);
  const notifRef = useRef(null);
  const [dark, setDark] = useStoredState("waylog:dark", false);

  // --- 인증 (Supabase 우선, 실패 시 로컬 폴백) ---
  const [user, setUserRaw] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // user를 설정할 때 로컬에도 저장 (폴백용)
  const setUser = (u) => {
    setUserRaw(u);
    try { if (u) localStorage.setItem("waylog:user", JSON.stringify(u)); else localStorage.removeItem("waylog:user"); } catch {}
  };

  useEffect(() => {
    if (!supabase) {
      // Supabase 미설정 → 로컬 저장소에서 복원
      try { const saved = localStorage.getItem("waylog:user"); if (saved) setUserRaw(JSON.parse(saved)); } catch {}
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata || {};
        setUser({ id: session.user.id, email: session.user.email, nickname: meta.nickname || session.user.email.split("@")[0], avatar: "", joinedAt: session.user.created_at });
      } else {
        // Supabase 세션 없으면 로컬 폴백
        try { const saved = localStorage.getItem("waylog:user"); if (saved) setUserRaw(JSON.parse(saved)); } catch {}
      }
      setAuthLoading(false);
    }).catch(() => {
      try { const saved = localStorage.getItem("waylog:user"); if (saved) setUserRaw(JSON.parse(saved)); } catch {}
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata || {};
        setUser({ id: session.user.id, email: session.user.email, nickname: meta.nickname || session.user.email.split("@")[0], avatar: "", joinedAt: session.user.created_at });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- 좋아요 ---
  const [favsArr, setFavsArr] = useState([]);
  const favs = useMemo(() => new Set(favsArr), [favsArr]);

  useEffect(() => {
    if (!user) { setFavsArr([]); return; }
    (async () => {
      const { data } = await supabaseFavorites.fetchMine(user.id);
      if (data) setFavsArr(data);
    })();
  }, [user]);

  // --- 취향/무드/리뷰/댓글 ---
  const [taste, setTaste] = useStoredState("waylog:taste", { cats: {}, tags: {} });
  const [moods, setMoods] = useStoredState("waylog:moods", {});
  const [userReviews, setUserReviews] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      const { data, error } = await supabaseReviews.fetchAll();
      if (!error && data) {
        setUserReviews(data.map((r) => ({
          id: r.id, title: r.title, body: r.content, category: r.category,
          tags: r.tags || [], author: r.profiles?.nickname || "익명", authorId: r.user_id,
          date: (r.created_at || "").slice(0, 10), likes: r.likes_count || 0, views: r.views_count || 0,
          product: r.product_name || "", products: [], media: r.media || [], img: r.media?.[0] || "",
        })));
      }
    })();
  }, [authLoading, user]);

  const [recents, setRecents] = useStoredState("waylog:recents", []);
  const [commentsMap, setCommentsMap] = useState(SEED_COMMENTS);
  const [community, setCommunity] = useStoredState("waylog:community", [
    { id: 1, author: "건강한엄마", avatar: "flower", time: "방금 전", content: "오늘 퀸 Ti 웍으로 처음 무수분 요리 도전! 양배추가 이렇게 달았나 싶을 정도예요.", likes: 12, comments: 5, liked: false },
    { id: 2, author: "라떼러버", avatar: "coffee", time: "1시간 전", content: "까페드다몬 아메리카노 진짜 미쳤다… 사무실에서 마실 인스턴트인데 산미가 살아있어요.", likes: 24, comments: 8, liked: false },
    { id: 3, author: "다이어터김", avatar: "leaf", time: "3시간 전", content: "푸로틴 + 화이버 비츠 조합 두 달째인데 -4kg 찍었어요. 식단 일지 공유 원하시는 분?", likes: 47, comments: 19, liked: false },
    { id: 4, author: "요가맘", avatar: "feather", time: "어제", content: "라벤더 에센셜 오일 디퓨징하면서 명상하면 정말 깊게 잠들어요.", likes: 18, comments: 6, liked: false },
  ]);

  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboarded, setOnboarded] = useStoredState("waylog:onboarded", false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sigWeek, setSigWeek] = useStoredState("waylog:sigWeek", 0);
  const [sigHistory, setSigHistory] = useStoredState("waylog:sigHistory", []);
  const [followingArr, setFollowingArr] = useStoredState("waylog:following", []);
  const following = useMemo(() => new Set(followingArr), [followingArr]);
  const [blockedArr, setBlockedArr] = useStoredState("waylog:blocked", []);
  const blocked = useMemo(() => new Set(blockedArr), [blockedArr]);
  const [profileUser, setProfileUser] = useState(null);
  const tg = useTimeGradient(dark);

  const toggleBlock = (author) => {
    setBlockedArr((prev) => {
      if (prev.includes(author)) {
        setToast(`${author}님 차단을 해제했어요`);
        return prev.filter((a) => a !== author);
      }
      // 차단 시 팔로우도 자동 해제
      setFollowingArr((f) => f.filter((a) => a !== author));
      setToast(`${author}님을 차단했어요. 글과 댓글이 더 이상 표시되지 않아요`);
      return [...prev, author];
    });
  };

  const toggleFollow = (author) => {
    if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return; }
    setFollowingArr((prev) => {
      if (prev.includes(author)) {
        setToast(`${author}님 팔로우를 취소했어요`);
        return prev.filter((a) => a !== author);
      }
      setToast(`${author}님을 팔로우했어요`);
      pushNotif(`${author}님을 팔로우하기 시작했어요`);
      // 그 사용자의 최신 글이 있으면 알림 추가 (팔로우 피드 시뮬레이션)
      const latest = [...userReviews, ...SEED_REVIEWS].find((r) => r.author === author);
      if (latest) {
        setTimeout(() => pushNotif(`${author}님의 새 웨이로그: "${latest.title}"`, { targetReviewId: latest.id }), 1500);
      }
      return [...prev, author];
    });
  };

  // 모달 상태 추적 (풀 투 리프레시 비활성화용)
  useEffect(() => {
    modalOpenRef.current = !!(nav.stack.length || search || compose || authOpen || profileOpen || settingsOpen || onboardingOpen || selectedUser || profileUser || signatureOpen || challengeStartOpen || challengeMainOpen);
  });

  // 시그니처 카드 활성화 감지 (좋아요 + 무드 합산 ≥ 3, 주간 단위 리셋)
  useEffect(() => {
    if (!user) return;
    const moodCount = Object.values(moods || {}).filter(Boolean).length;
    const total = favs.size + moodCount;
    if (total < 3) return;
    const now = new Date();
    const onejan = new Date(now.getFullYear(), 0, 1);
    const currentWeek = Math.ceil(((now - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    if (currentWeek !== sigWeek) {
      pushNotif(`WEEK ${currentWeek} 시그니처 카드가 도착했어요`);
      setToast(`WEEK ${currentWeek} 시그니처 카드가 도착했어요`);
      setSigHistory((prev) => [
        { week: currentWeek, year: now.getFullYear(), createdAt: now.toISOString(), favs: favs.size, moods: moodCount, posts: userReviews.length, topCat: Object.entries(taste.cats).sort((a,b) => b[1]-a[1])[0]?.[0] || null },
        ...prev,
      ].slice(0, 12));
      setSigWeek(currentWeek);
    }
  }, [user, favs, moods, sigWeek]);

  const requireAuth = (fn) => {
    if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return; }
    fn();
  };

  // outside-click for notif
  useEffect(() => {
    if (!notifOpen) return;
    const h = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    setTimeout(() => document.addEventListener("click", h), 0);
    return () => document.removeEventListener("click", h);
  }, [notifOpen]);

  const reviews = useMemo(() => {
    let list = [...userReviews, ...SEED_REVIEWS].filter((r) => !blocked.has(r.author));
    if (refreshKey > 0) list = [...list].sort(() => Math.random() - 0.5);
    return list;
  }, [userReviews, blocked, refreshKey]);

  // ---------- Today's Pick ----------
  const [todaysPick, setTodaysPick, todaysPickLoaded] = useStoredState("waylog:todaysPick", null);

  // ---------- Challenge State ----------
  // TODO: Firebase 마이그레이션 필요 지점 - challenge 데이터를 Firestore로 이전
  const [challenge, setChallenge] = useStoredState("waylog:challenge", null);
  const [challengeDailyLogs, setChallengeDailyLogs] = useStoredState("waylog:challengeLogs", {});
  const [challengeInbody, setChallengeInbody] = useStoredState("waylog:challengeInbody", []);
  const [challengeAnonPosts, setChallengeAnonPosts] = useStoredState("waylog:challengeAnonPosts", []);
  const [challengeStartOpen, setChallengeStartOpen] = useState(false);
  const [challengeMainOpen, setChallengeMainOpen] = useState(false);
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null);

  useEffect(() => {
    if (!todaysPickLoaded) return;
    const today = new Date().toISOString().slice(0, 10);
    if (todaysPick?.date === today && todaysPick?.picks?.length === 4) return;
    if (reviews.length === 0) return;

    const scored = [...reviews]
      .map((r) => ({ r, score: (r.likes || 0) * 2 + (r.views || 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.r);

    if (scored.length < 4) return;

    // 폴백 템플릿 (AI 실패 시 사용)
    const makeFallbackPicks = (items) => {
      const headlines = {
        food: ["맛으로 완성하는 하루", "영양이 스며드는 한 끼", "건강한 식탁의 발견"],
        wellness: ["마음의 균형을 찾다", "오늘의 웰니스 루틴", "나를 돌보는 시간"],
        beauty: ["오늘의 뷰티 시크릿", "피부가 달라지는 순간", "빛나는 하루의 시작"],
        kitchen: ["퍼스널 케어의 정석", "매일의 나를 가꾸다", "작지만 확실한 변화"],
        home: ["일상을 바꾸는 한 끗", "공간의 품격", "홈 라이프 업그레이드"],
        one4one: ["나눔의 선한 영향력", "한 번의 선택, 두 배의 가치", "함께 만드는 변화"],
      };
      const sublines = ["웨이로거들의 뜨거운 관심을 받은 BEST", "오늘 가장 많은 사랑을 받은 리뷰", "지금 이 순간 가장 주목받는 픽", "모두가 기억할 만한 특별한 발견"];
      const gradients = ["from-rose-400 via-pink-500 to-fuchsia-500", "from-amber-400 via-orange-500 to-red-500", "from-emerald-400 via-teal-500 to-cyan-500", "from-violet-400 via-purple-500 to-indigo-500"];
      return items.map((r, i) => ({
        headline: (headlines[r.category] || ["오늘의 추천"])[i % 3],
        subline: sublines[i % sublines.length],
        gradient: gradients[i % gradients.length],
        review: r,
      }));
    };

    // 먼저 폴백으로 즉시 표시
    setTodaysPick({ date: today, picks: makeFallbackPicks(scored) });

    // AI로 업그레이드 시도
    generatePicksWithAI(scored).then((aiPicks) => {
      if (aiPicks && aiPicks.length === 4) setTodaysPick({ date: today, picks: aiPicks });
    });
  }, [reviews, todaysPickLoaded]);

  const generatePicksWithAI = async (topReviews) => {
    const prompt = `다음은 웨이로그 앱에서 오늘 가장 인기 있는 리뷰 4개입니다:
${topReviews.map((r, i) => `${i + 1}. [${CATEGORIES[r.category]?.label || r.category}] "${r.title}" - ${r.product || "제품 없음"} (좋아요 ${r.likes})`).join("\n")}

각 리뷰에 대해 매력적인 "Today's Pick" 배너 카피를 생성해주세요.
- headline: 감성적이고 호기심을 자극하는 10-15자 한글 문구
- subline: 리뷰의 매력을 설명하는 20-30자 한글 문구

JSON 배열만 응답: [{"headline":"...","subline":"...","reviewIndex":0},...]`;
    const text = await callClaude(prompt, 600);
    if (!text) return null;
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const gradients = [
        "from-rose-400 via-pink-500 to-fuchsia-500",
        "from-amber-400 via-orange-500 to-red-500",
        "from-emerald-400 via-teal-500 to-cyan-500",
        "from-violet-400 via-purple-500 to-indigo-500",
      ];
      return parsed.map((p, i) => ({
        headline: p.headline,
        subline: p.subline,
        gradient: gradients[i % gradients.length],
        review: topReviews[p.reviewIndex ?? i],
      }));
    } catch { return null; }
  };

  const learnFrom = (rev, weight = 1) => {
    if (!rev) return;
    setTaste((prev) => {
      const cats = { ...prev.cats, [rev.category]: Math.max(0, (prev.cats[rev.category] || 0) + weight) };
      const tags = { ...prev.tags };
      rev.tags.forEach((t) => { tags[t] = Math.max(0, (tags[t] || 0) + weight); });
      return { cats, tags };
    });
  };

  const toggleFav = async (id) => {
    const has = favsArr.includes(id);
    const rev = [...userReviews, ...SEED_REVIEWS].find((x) => x.id === id);

    // 취향 학습 (로컬)
    if (has) {
      learnFrom(rev, -1);
      if (moods[id] === "love" || moods[id] === "wow") learnFrom(rev, -2);
      if (moods[id]) setMoods((m) => { const c = { ...m }; delete c[id]; return c; });
    } else {
      learnFrom(rev, 1);
    }

    // 낙관적 업데이트
    setFavsArr((prev) => has ? prev.filter((x) => x !== id) : [...prev, id]);

    // Supabase 동기화
    if (user) {
      const { error } = has
        ? await supabaseFavorites.remove(user.id, id)
        : await supabaseFavorites.add(user.id, id);
      if (error) {
        // 롤백
        setFavsArr((prev) => has ? [...prev, id] : prev.filter((x) => x !== id));
      }
    }
  };

  // 무드 변경 시 취향 점수 보너스 (최고/영감은 강한 신호)
  const setMoodsWithBonus = (updater) => {
    setMoods((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // diff 추출
      Object.keys(next).forEach((rid) => {
        if (next[rid] !== prev[rid]) {
          const rev = [...userReviews, ...SEED_REVIEWS].find((x) => x.id === Number(rid));
          if (!rev) return;
          // 이전 무드 보너스 제거
          if (prev[rid] === "love" || prev[rid] === "wow") learnFrom(rev, -2);
          // 새 무드 보너스 추가
          if (next[rid] === "love" || next[rid] === "wow") learnFrom(rev, 2);
        }
      });
      return next;
    });
  };

  const openDetail = (r) => nav.push({ type: "detail", payload: r });
  const back = () => nav.pop();

  const addRecent = (term) => {
    setRecents((prev) => [term, ...prev.filter((t) => t !== term)].slice(0, 6));
  };
  const removeRecent = (term) => setRecents((prev) => prev.filter((t) => t !== term));
  const clearRecents = () => { setRecents([]); setToast("최근 검색어를 모두 삭제했어요"); };

  const submitReview = async (data) => {
    try {
      if (data.id) {
        // 수정 모드 (로컬)
        setUserReviews((prev) => prev.map((r) => r.id === data.id ? {
          ...r,
          title: data.title, body: data.body, product: data.product,
          products: data.products || [],
          media: data.media || [],
          tags: data.tags.length ? data.tags : ["내웨이로그"],
          category: data.category,
          img: data.img || "",
        } : r));
        // Supabase 수정
        if (user) {
          supabaseReviews.update(data.id, {
            title: data.title, content: data.body, category: data.category,
            tags: data.tags.length ? data.tags : ["내웨이로그"],
            product_name: data.product, media: data.media || [],
          }).catch(() => {});
        }
        setTimeout(() => setToast("웨이로그가 수정됐어요"), 280);
        return true;
      }

      // 새 리뷰
      const localR = {
        id: Date.now(),
        img: data.img || "",
        title: data.title, body: data.body, product: data.product,
        products: data.products || [],
        media: data.media || [],
        tags: data.tags.length ? data.tags : ["내웨이로그"],
        category: data.category, views: 0, likes: 0,
        date: new Date().toISOString().slice(0, 10),
        author: user?.nickname || "나",
        authorAvatar: user?.avatar || "",
      };
      setUserReviews((prev) => [localR, ...prev]);

      // Supabase 저장
      if (user) {
        supabaseReviews.create({
          user_id: user.id,
          title: data.title, content: data.body, category: data.category,
          tags: data.tags.length ? data.tags : ["내웨이로그"],
          product_name: data.product, media: data.media || [],
        }).catch(() => {});
      }

      setTimeout(() => { setTab("feed"); setToast("웨이로그가 등록됐어요"); }, 280);
      return true;
    } catch (err) {
      setToast("등록 실패. 미디어가 너무 크거나 저장 공간이 부족해요");
      return false;
    }
  };

  const deleteReview = (id) => {
    setUserReviews((prev) => prev.filter((r) => r.id !== id));
    setFavsArr((prev) => prev.filter((x) => x !== id));
    setMoods((prev) => { const m = { ...prev }; delete m[id]; return m; });
    setCommentsMap((prev) => { const m = { ...prev }; delete m[id]; return m; });
    if (user) supabaseReviews.delete(id).catch(() => {});
    setToast("웨이로그가 삭제됐어요");
  };

  const addComment = async (rid, text, parentId = null, mentionTo = null) => {
    if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return false; }
    const localComment = { id: Date.now(), author: user.nickname, avatar: user.avatar, time: "방금", createdAt: Date.now(), text, parentId, mentionTo, likedBy: [] };
    setCommentsMap((prev) => ({
      ...prev,
      [rid]: [...(prev[rid] || []), localComment],
    }));
    // Supabase 동기화 (비동기, 실패해도 로컬은 유지)
    supabaseComments.create({ user_id: user.id, review_id: rid, content: text, parent_id: parentId }).catch(() => {});
    return true;
  };

  const toggleCommentLike = (rid, cid) => {
    if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return; }
    setCommentsMap((prev) => ({
      ...prev,
      [rid]: (prev[rid] || []).map((c) => {
        if (c.id !== cid) return c;
        const likedBy = c.likedBy || [];
        const has = likedBy.includes(user.nickname);
        return { ...c, likedBy: has ? likedBy.filter((n) => n !== user.nickname) : [...likedBy, user.nickname] };
      }),
    }));
  };

  const deleteComment = (rid, cid) => {
    setCommentsMap((prev) => ({
      ...prev,
      [rid]: (prev[rid] || []).filter((c) => c.id !== cid),
    }));
    setToast("댓글이 삭제됐어요");
  };

  const clearAllData = async () => {
    setFavsArr([]); setMoods({}); setUserReviews([]); setCommentsMap({});
    setTaste({ cats: {}, tags: {} }); setNotifications([]); setSigWeek(0); setRecents([]);
    setSigHistory([]); setFollowingArr([]); setBlockedArr([]);
    setToast("모든 데이터가 삭제됐어요");
  };

  const logout = async () => {
    await supabaseAuth.signOut();
    setUser(null);
    setToast("로그아웃되었어요");
  };

  const likePost = (id) => {
    setCommunity((prev) => prev.map((p) => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
  };

  const addCommunityPost = (text) => {
    if (!user) return;
    const newPost = {
      id: Date.now(),
      author: user.nickname,
      avatar: user.avatar,
      time: "방금",
      content: text,
      likes: 0,
      comments: 0,
      liked: false,
    };
    setCommunity((prev) => [newPost, ...prev]);
    setToast("게시됐어요");
  };

  const screens = {
    home: <HomeScreen reviews={reviews} onOpen={openDetail} favs={favs} toggleFav={toggleFav} dark={dark} taste={taste} moods={moods} user={user} tg={tg} onPrimary={() => requireAuth(() => setCompose(true))} onSignature={() => setSignatureOpen(true)} refreshKey={refreshKey} todaysPick={todaysPick?.picks}
      challenge={challenge} dailyLogs={challengeDailyLogs}
      onChallengeStart={() => requireAuth(() => setChallengeStartOpen(true))}
      onChallengeOpen={() => setChallengeMainOpen(true)}
      onChallengeResult={() => setChallengeMainOpen(true)}/>,
    feed: <FeedScreen reviews={reviews} onOpen={openDetail} favs={favs} toggleFav={toggleFav} dark={dark} onCompose={() => setCompose(true)} following={following} user={user} />,
    fav: <FavScreen reviews={reviews} onOpen={openDetail} favs={favs} toggleFav={toggleFav} dark={dark} moods={moods} setMoods={setMoodsWithBonus} onBrowse={() => setTab("home")} onProductClick={setSelectedCatalogProduct}/>,
    comm: <CommunityScreen dark={dark} posts={community} onLike={likePost} onUserClick={setSelectedUser}
      user={user}
      onAddPost={addCommunityPost}
      onRequireAuth={() => { setAuthOpen(true); setToast("로그인이 필요해요"); }}
      onShare={async (p) => {
      const text = `${p.author}: ${p.content}\n\n— 웨이로그에서 공유`;
      try {
        if (navigator.share) {
          await navigator.share({ title: "웨이로그", text });
          setToast("공유했어요");
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          setToast("클립보드에 복사됐어요");
        }
      } catch {}
    }}/>,
  };

  return (
    <div className={cls("min-h-screen max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto pb-20 font-sans relative", dark ? "bg-gray-900" : "bg-gray-50")}
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        transform: pullY > 0 ? `translateY(${pullY}px)` : undefined,
        transition: refreshing || pullY === 0 ? "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)" : "none",
      }}>
      {pullY > 0 && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[55] flex items-center justify-center pointer-events-none"
          style={{ height: `${pullY}px`, width: "60px", marginTop: "-10px" }}>
          <div className={cls("rounded-full p-2 shadow-lg", dark ? "bg-gray-800" : "bg-white")}>
            <RefreshCw size={18}
              className={cls("text-emerald-500", refreshing && "animate-spin")}
              style={{ transform: refreshing ? undefined : `rotate(${pullY * 4}deg)`, transition: "transform 0.1s" }}/>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes toastIn { 0% { opacity: 0; transform: translateY(20px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; } 100% { opacity: 0; transform: translateY(-10px); } }
        @keyframes signatureEnter { 0% { transform: scale(0.85) translateY(20px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes cardEnter { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes slideProgress { from { width: 0%; } to { width: 100%; } }
        .animate-slide-up { animation: slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1); }
        .animate-slide-down { animation: slideDown 0.26s cubic-bezier(0.32, 0.72, 0, 1) forwards; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        .animate-fade-out { animation: fadeOut 0.2s ease-out forwards; }
        .animate-toast { animation: toastIn 2.2s ease-out; }
        .animate-signature-enter { animation: signatureEnter 0.42s cubic-bezier(0.32, 0.72, 0, 1); }
        .animate-shimmer { animation: shimmer 1.5s infinite linear; }
        .animate-card-enter { animation: cardEnter 0.4s ease-out backwards; }
        .tg-trans { transition: background-image 1.2s ease-in-out, background-color 1.2s ease-in-out; }
        button:focus-visible, a:focus-visible, [role="button"]:focus-visible {
          outline: 2px solid #10b981;
          outline-offset: 2px;
          border-radius: 4px;
        }
      `}</style>
      <header className={cls("sticky top-0 z-20 backdrop-blur border-b",
        dark ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-gray-100")}>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <h1 className={cls("text-xl font-black tracking-tight bg-gradient-to-r bg-clip-text text-transparent tg-trans", tg.solid)}>웨이로그</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => setDark(!dark)}
              aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
              className={cls("p-2 rounded-full", dark ? "hover:bg-gray-800" : "hover:bg-gray-100")}>
              {dark ? <Sun size={18} className="text-amber-400"/> : <Moon size={18} className="text-gray-700"/>}
            </button>
            <div className="relative" ref={notifRef}>
              <button onClick={(e) => {
                e.stopPropagation();
                setNotifOpen(!notifOpen);
                if (!notifOpen && unreadCount > 0) {
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                }
              }}
              aria-label={unreadCount > 0 ? `알림 ${unreadCount}개` : "알림"}
              className={cls("p-2 rounded-full relative", dark ? "hover:bg-gray-800" : "hover:bg-gray-100")}>
                <Bell size={18} className={dark ? "text-gray-300" : "text-gray-700"}/>
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 rounded-full text-xs font-bold text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className={cls("absolute right-0 top-12 w-72 rounded-2xl shadow-xl border z-30 overflow-hidden",
                  dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
                  <div className={cls("px-4 py-3 border-b flex items-center justify-between", dark ? "border-gray-700" : "border-gray-100")}>
                    <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>알림</p>
                    {notifications.length > 0 && (
                      <div className="flex gap-2">
                        {unreadCount > 0 && (
                          <button onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                            className={cls("text-xs font-bold active:opacity-60", dark ? "text-emerald-400" : "text-emerald-600")}>
                            모두 읽음
                          </button>
                        )}
                        <button onClick={() => {
                          if (armClearNotif) { setNotifications([]); setArmClearNotif(false); setToast("모든 알림이 삭제됐어요"); }
                          else { setArmClearNotif(true); }
                        }}
                          aria-label="모든 알림 삭제"
                          className={cls("text-xs font-bold active:opacity-60 transition", armClearNotif ? "text-rose-500" : dark ? "text-gray-500" : "text-gray-400")}>
                          {armClearNotif ? "진짜 삭제?" : "모두 삭제"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className={cls("py-10 text-center", dark ? "text-gray-500" : "text-gray-500")}>
                        <Bell size={28} className="mx-auto mb-2 opacity-30"/>
                        <p className="text-xs">아직 알림이 없어요</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button key={n.id} onClick={() => {
                          if (n.targetReviewId) {
                            const target = reviews.find((x) => x.id === n.targetReviewId);
                            if (target) { openDetail(target); setNotifOpen(false); }
                          }
                        }}
                          className={cls("w-full text-left px-4 py-3 border-b last:border-0 transition active:scale-[0.98]",
                            n.targetReviewId ? dark ? "hover:bg-gray-700/50" : "hover:bg-gray-50" : "cursor-default",
                            dark ? "border-gray-700" : "border-gray-100")}>
                          <p className={cls("text-xs", dark ? "text-gray-300" : "text-gray-700")}>{n.text}</p>
                          <p className={cls("text-xs font-normal opacity-70 mt-1", dark ? "text-gray-400" : "text-gray-600")}>{n.time}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {user ? (
              <button onClick={() => setProfileOpen(true)} className="ml-1 active:scale-90 transition">
                <Avatar id={user.avatar} size={18} className="w-9 h-9 shadow-md"/>
              </button>
            ) : (
              <button onClick={() => setAuthOpen(true)}
                className="ml-1 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full active:scale-95 transition shadow-md">
                로그인
              </button>
            )}
          </div>
        </div>
        <div className="px-4 pb-3">
          <button onClick={() => setSearch(true)}
            className={cls("w-full flex items-center gap-2 px-4 py-2.5 rounded-full transition active:scale-[0.98]", dark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200")}>
            <Search size={16} className={dark ? "text-gray-400" : "text-gray-500"}/>
            <span className={cls("text-sm", dark ? "text-gray-500" : "text-gray-500")}>리뷰, 상품, 태그 검색</span>
          </button>
        </div>
      </header>

      {screens[tab]}

      {/* FAB - 글쓰기 (max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl 컨테이너 우측에 정렬) */}
      <div className="fixed inset-x-0 bottom-0 pointer-events-none z-20 flex justify-center">
        <div className="w-full max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl relative h-0">
          <button onClick={() => requireAuth(() => setCompose(true))}
            aria-label="새 웨이로그 작성"
            className={cls("pointer-events-auto absolute right-4 bottom-[4.5rem] w-12 h-12 rounded-full bg-gradient-to-br shadow-xl flex items-center justify-center active:scale-90 transition hover:scale-105 tg-trans", tg.solid)}>
            <Plus size={26} className="text-white"/>
          </button>
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl z-[70] px-4 pt-2">
          <div className="bg-gray-900/95 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center justify-center gap-2 animate-slide-up">
            <Wind size={14}/> 오프라인 상태에요. 연결을 확인해주세요
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-44 z-40 flex justify-center pointer-events-none px-4">
          <div className="bg-gray-900/95 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl animate-toast">
            {toast}
          </div>
        </div>
      )}

      {/* Detail stack */}
      {nav.stack.map((s, i) => s.type === "detail" && (
        <DetailScreen key={`${s.payload.id}-${i}`} r={s.payload} onBack={back} onOpen={openDetail}
          favs={favs} toggleFav={toggleFav} dark={dark}
          comments={(commentsMap[s.payload.id] || []).filter((c) => !blocked.has(c.author))} addComment={addComment} deleteComment={deleteComment} toggleCommentLike={toggleCommentLike} user={user}
          onEdit={(r) => { setEditingReview(r); back(); setTimeout(() => setCompose(true), 280); }}
          onDelete={(r) => { deleteReview(r.id); back(); }}
          onReport={() => setToast("신고가 접수됐어요. 검토 후 조치할게요")}
          onHashtagClick={(tag) => { back(); setTimeout(() => { setSearchQ(tag); setSearch(true); }, 280); }}
          onUserClick={setSelectedUser}/>
      ))}
      {search && <SearchScreen reviews={reviews} onOpen={openDetail} favs={favs} toggleFav={toggleFav} dark={dark} onClose={() => setSearch(false)} recents={recents} addRecent={addRecent} removeRecent={removeRecent} clearRecents={clearRecents} q={searchQ} setQ={setSearchQ} onProductClick={setSelectedCatalogProduct}/>}
      {compose && <ComposeScreen onClose={() => { setCompose(false); setEditingReview(null); }} onSubmit={submitReview} dark={dark} editing={editingReview}/>}
      {authOpen && <AuthScreen onClose={() => setAuthOpen(false)} onAuth={(u) => {
        setUser(u);
        setToast(`${u.nickname}님 환영해요`);
        setNotifications((prev) => [
          { id: Date.now(), text: `${u.nickname}님, 웨이로그에 오신 것을 환영해요!`, time: "방금", read: false },
          { id: Date.now()+1, text: "첫 웨이로그를 작성하면 추천이 더 정교해져요", time: "방금", read: false },
          { id: Date.now()+2, text: "좋아요 3개를 모으면 나만의 시그니처 카드가 만들어져요", time: "방금", read: false },
          ...prev
        ]);
        if (!onboarded) setTimeout(() => setOnboardingOpen(true), 400);
      }} dark={dark}/>}
      {profileOpen && user && <ProfileScreen user={user} onClose={() => setProfileOpen(false)}
        onLogout={logout}
        onUpdateProfile={(u) => { setUser(u); setToast("프로필이 수정됐어요"); }}
        onOpenSettings={() => { setProfileOpen(false); setTimeout(() => setSettingsOpen(true), 100); }}
        dark={dark} favs={favs} moods={moods} userReviews={userReviews} taste={taste}/>}
      {settingsOpen && <SettingsScreen user={user} dark={dark} setDark={setDark}
        notifPref={notifPref} setNotifPref={setNotifPref}
        blockedList={blockedArr} onUnblock={toggleBlock}
        onClose={() => setSettingsOpen(false)}
        onLogout={logout}
        onClearData={clearAllData}
        onReplayOnboarding={() => { setSettingsOpen(false); setTimeout(() => setOnboardingOpen(true), 200); }}
        onShowToast={setToast}/>}
      {onboardingOpen && <OnboardingScreen onClose={() => { setOnboardingOpen(false); setOnboarded(true); }} dark={dark}/>}
      {selectedUser && <UserMiniSheet author={selectedUser.author} avatar={selectedUser.avatar}
        onClose={() => setSelectedUser(null)} onOpen={openDetail}
        onOpenProfile={(u) => setProfileUser(u)}
        isFollowing={following.has(selectedUser.author)}
        onToggleFollow={toggleFollow}
        isBlocked={blocked.has(selectedUser.author)}
        onToggleBlock={toggleBlock}
        currentUser={user}
        dark={dark}/>}
      {profileUser && <UserProfileScreen author={profileUser.author} avatar={profileUser.avatar}
        reviews={reviews} currentUser={user}
        isFollowing={following.has(profileUser.author)}
        onToggleFollow={toggleFollow}
        onClose={() => setProfileUser(null)} onOpen={openDetail} dark={dark}/>}
      {signatureOpen && user && <WeeklySignatureCard
        user={user} taste={taste} moods={moods} favs={favs} userReviews={userReviews} reviews={reviews} sigHistory={sigHistory}
        onClose={() => setSignatureOpen(false)} dark={dark} onShare={(msg) => setToast(msg)}/>}

      {challengeStartOpen && <ChallengeStartScreen
        onClose={() => setChallengeStartOpen(false)}
        onStart={(data) => {
          setChallenge(data);
          setChallengeInbody([{ id: Date.now(), date: new Date().toISOString(), weight: data.weight, bodyFat: data.bodyFat, muscle: 0, bmi: data.bmi }]);
          setToast("챌린지가 시작됐어요!");
          pushNotif("바디키 8주 챌린지가 시작됐어요!");
          setTimeout(() => setChallengeMainOpen(true), 300);
        }}
        dark={dark}/>}

      {selectedCatalogProduct && (
        <ProductDetailModal
          product={selectedCatalogProduct}
          onClose={() => setSelectedCatalogProduct(null)}
          reviews={reviews}
          dark={dark}
          onOpenReview={(r) => {
            setSelectedCatalogProduct(null);
            setTimeout(() => openDetail(r), 280);
          }}
          onCompose={() => {
            setSelectedCatalogProduct(null);
            setTimeout(() => setCompose(true), 280);
          }}
        />
      )}

      {challengeMainOpen && challenge && <ChallengeMainScreen
        challenge={challenge}
        dailyLogs={challengeDailyLogs}
        setDailyLogs={setChallengeDailyLogs}
        inbodyRecords={challengeInbody}
        setInbodyRecords={setChallengeInbody}
        anonPosts={challengeAnonPosts}
        setAnonPosts={setChallengeAnonPosts}
        onClose={() => setChallengeMainOpen(false)}
        dark={dark}
        onShowToast={setToast}/>}

      <nav className={cls("fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl border-t grid grid-cols-4 z-20 backdrop-blur-xl",
        dark ? "bg-gray-900/85 border-gray-800" : "bg-white/85 border-gray-100")}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)", paddingTop: "0.625rem" }}>
        {[
          { k: "home", icon: Home, label: "추천" },
          { k: "feed", icon: Utensils, label: "오늘뭐썼지" },
          { k: "fav", icon: Heart, label: "마이웨이템" },
          { k: "comm", icon: Users, label: "커뮤니티" },
        ].map(({ k, icon: Icon, label }) => {
          const active = tab === k;
          return (
            <button key={k} onClick={() => { setTab(k); nav.reset(); }}
              className="flex flex-col items-center gap-1 active:scale-95 transition relative">
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8}
                  className={cls("transition-all duration-200", active && "-translate-y-[1px]",
                    active ? "text-emerald-500" : dark ? "text-gray-500" : "text-gray-400")}/>
                {active && <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500"/>}
              </div>
              <span className={cls("text-[10px] tracking-tight transition-all duration-200",
                active ? "font-black text-emerald-500" : dark ? "font-medium text-gray-500" : "font-medium text-gray-400")}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner/>
    </ErrorBoundary>
  );
}


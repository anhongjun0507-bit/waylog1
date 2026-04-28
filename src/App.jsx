import { useState, useEffect, useMemo, useRef, useCallback, useContext, createContext, Component, lazy, Suspense, memo } from "react";
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  // App.jsx 에서 직접 JSX 렌더에 사용하는 아이콘만. 상수/컴포넌트용 아이콘은 해당 파일로 이동.
  Heart, Users, User, Bell, Search, ArrowLeft, Plus,
  Eye, Moon, Sun, Sparkles, MessageCircle, Share2, X,
  Calendar, Camera, Check, Flame, ExternalLink, ChevronRight, ChevronLeft,
  Star, RefreshCw,
  BookOpen, PenLine, Target, Inbox, Wind, ShoppingBag,
  Trophy, Dumbbell, Activity,
  BarChart3, Download,
  Package, Send, Bookmark, Compass, Film, Images, Grid3x3, Tag, Menu, Settings as SettingsIcon,
  MoreHorizontal, Clock, UserPlus, Play, CircleUser
} from "lucide-react";

import { useCatalog, useCatalogLoading } from "./catalog.js";
import { supabase, migrationReady, auth as supabaseAuth, reviews as supabaseReviews, favorites as supabaseFavorites, comments as supabaseComments, challenges as supabaseChallenges, moodsApi as supabaseMoods, notifications as supabaseNotifs, reports as supabaseReports, storage as supabaseStorage, follows as supabaseFollows, profilesApi as supabaseProfiles, communityApi as supabaseCommunity } from "./supabase.js";
import { sanitizeImageUrl, sanitizeText, sanitizeInline } from "./utils/sanitize.js";
import { compressImage } from "./utils/image.js";
import { friendlyError } from "./utils/errors.js";
import { identify, events as analyticsEvents } from "./utils/analytics.js";
import { pushSupported, requestPushPermission, subscribePush } from "./utils/push.js";
import { sendPushNotification } from "./utils/sendPush.js";
import {
  BASE, CHALLENGE_WEEKS, CHALLENGE_DAYS, AI_CACHE_MAX, AI_CACHE_TTL_MS,
  PRODUCTS, MOODS, CATEGORIES, CAT_SOLID, CAT_ICON,
  CHALLENGE_MISSIONS, EXERCISE_TYPES,
  AI_COACH_TONES, REPORT_REASONS,
} from "./constants.js";
import { useDebouncedValue, useStoredState, useExit, useTimeGradient } from "./hooks.js";
import { cls, formatRelativeTime } from "./utils/ui.js";
import { getReviewProductNames } from "./utils/products.js";
import {
  pendingReviewsKey, pendingEditsKey,
  savePendingEdit, removePendingEdit,
  clearLegacyPendingKey,
  filterStalePending, filterStaleEdits,
} from "./utils/reviewSync.js";
// 디자인 시스템: W (Waylog Pinterest+IG+Shop), B (Bodyki Withings)
import {
  Avatar, MissionIcon, CategoryIcon, CategoryChip,
  ProductImage, SmartImg, Card, SectionTitle, SkeletonCard, MentionText, EmptyState, BottomSheet,
} from "./components/index.js";
import { SEED_REVIEWS, SEED_COMMENTS, POPULAR_TAGS } from "./mocks/seed.js";
import { AppProvider, useAppContext } from "./contexts/AppContext.js";
import { Capacitor } from "@capacitor/core";
import { Share as CapShare } from "@capacitor/share";
// Lazy-loaded screens — only fetched when their flag flips true. Cuts initial bundle.
const AdminModerationScreen = lazy(() => import("./screens/AdminModerationScreen.jsx").then(m => ({ default: m.AdminModerationScreen })));
const OnboardingScreen = lazy(() => import("./screens/OnboardingScreen.jsx").then(m => ({ default: m.OnboardingScreen })));
const InbodyScreen = lazy(() => import("./screens/InbodyScreen.jsx").then(m => ({ default: m.InbodyScreen })));
const ChallengeStartScreen = lazy(() => import("./screens/ChallengeStartScreen.jsx").then(m => ({ default: m.ChallengeStartScreen })));
const AuthScreen = lazy(() => import("./screens/AuthScreen.jsx"));
const ProfileScreen = lazy(() => import("./screens/ProfileScreen.jsx"));
const SettingsScreen = lazy(() => import("./screens/SettingsScreen.jsx"));
const ComposeScreen = lazy(() => import("./screens/ComposeScreen.jsx"));
const ShareCardModal = lazy(() => import("./components/ShareCardModal.jsx"));

// 과거 레거시 미디어 CDN (r.img 가 상대경로일 때 접두). 비워두면 상대경로 그대로 사용.
// 배포 환경별로 VITE_MEDIA_BASE 로 주입하거나 비워둔다 (현재는 Supabase Storage를 쓰므로 기본 비어있음).
// 상수들은 src/constants.js 로 이전됨

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
          style={{ fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', sans-serif" }}>
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
              className="flex-1 py-3 bg-brand-500 text-white rounded-2xl font-bold text-sm active:scale-95 transition">
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
// SEED_REVIEWS / SEED_COMMENTS / POPULAR_TAGS 는 src/mocks/seed.js 로 이전됨 (#29).
// 상수(CATEGORIES, MOODS, CHALLENGE_*, AVATAR_OPTIONS 등)는 src/constants.js 로 이전됨.

// MISSION_ICONS lookup 을 감싸는 작은 presentational 컴포넌트




// ---------- CLAUDE AI API ----------
// 서버측 Supabase Edge Function(`claude`)이 Anthropic API 키를 보유한다.
// 클라이언트 번들에는 Anthropic 키가 포함되지 않는다.
// 배포: supabase/functions/claude/README.md 참조.
const callClaude = async (prompt, maxTokens = 500) => {
  if (!supabase) {
    console.warn("Supabase 미설정 - Claude 폴백 사용");
    return null;
  }
  try {
    const { data, error } = await supabase.functions.invoke("claude", {
      body: { prompt, max_tokens: maxTokens },
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "claude_failed");
    return data.text || "";
  } catch (e) {
    console.warn("Claude API 호출 실패, 폴백 사용:", e?.message || e);
    return null;
  }
};

// Vision 호출 — data URL(base64) 이미지를 Claude 에 전달해 사진 분석.
// 실패 시 null 반환 → 호출측이 텍스트 기반 폴백 사용.
const callClaudeVision = async (prompt, imageDataUrl, maxTokens = 500) => {
  if (!supabase || !imageDataUrl) return null;
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(imageDataUrl);
  if (!match) return null;
  const mediaType = match[1];
  const data = match[2];
  try {
    const { data: resp, error } = await supabase.functions.invoke("claude", {
      body: {
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            { type: "text", text: prompt },
          ],
        }],
        max_tokens: maxTokens,
      },
    });
    if (error) throw error;
    if (!resp?.ok) throw new Error(resp?.error || "claude_vision_failed");
    return resp.text || "";
  } catch (e) {
    console.warn("Claude Vision 호출 실패, 폴백 사용:", e?.message || e);
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

// JSON 텍스트에서 첫 번째 {...} 블록만 추출 (모델이 앞뒤로 설명 붙일 때 대비).
const extractJsonBlock = (text) => {
  if (!text) return null;
  const cleaned = text.replace(/```json|```/g, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
};

const aiMealAnalysis = async (mealType, photoDataUrl) => {
  const mealLabel = { breakfast: "아침", lunch: "점심", dinner: "저녁" }[mealType] || "식사";

  // 1) 사진이 있으면 Vision 분석 시도
  if (photoDataUrl) {
    const visionPrompt = `이 사진은 사용자의 ${mealLabel} 식사입니다. 음식을 식별하고 영양 정보를 추정해주세요.
- 여러 음식이 보이면 한 끼의 총합으로 합쳐 계산하세요.
- 사진에 음식이 전혀 보이지 않으면 {"name":"음식 아님","cal":0,"protein":0,"carb":0,"fat":0}로 응답.
- 한국 음식이면 한국어 이름, 외국 음식이면 현지어/한국어 혼용.
JSON만 출력하세요 (코드블록/설명 없이): {"name":"음식 이름","cal":칼로리숫자,"protein":단백질g,"carb":탄수화물g,"fat":지방g}`;
    const visionText = await callClaudeVision(visionPrompt, photoDataUrl, 300);
    const block = extractJsonBlock(visionText);
    if (block) {
      try { return { ...JSON.parse(block), isFallback: false, source: "vision" }; }
      catch {}
    }
  }

  // 2) Vision 실패 → 텍스트 기반 추정 폴백
  const text = await callClaude(
    `한국인의 일반적인 ${mealLabel} 식사 메뉴를 하나 추정해주세요. JSON만 응답: {"name":"음식 이름","cal":칼로리숫자,"protein":단백질g,"carb":탄수화물g,"fat":지방g}`,
    200
  );
  const block = extractJsonBlock(text);
  if (block) {
    try { return { ...JSON.parse(block), isFallback: false, source: "text" }; }
    catch {}
  }

  // 3) 모두 실패 → 고정 폴백
  const options = fallbackMeals[mealType] || fallbackMeals.lunch;
  return { ...options[Math.floor(Math.random() * options.length)], isFallback: true, source: "stub" };
};

const aiCoachMessage = async (tone, dayNum, completedMissions, totalMissions) => {
  const rate = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;
  const toneDesc = { cheerful: "열정적이고 에너지 넘치는", gentle: "따뜻하고 공감하는", strict: "냉철하고 엄격한", funny: "유머러스하고 재미있는" }[tone] || "친근한";
  // 같은 Day+tone+달성률이면 하루 동안 같은 코칭 메시지 — 캐시로 비용 절감
  const cacheKey = `coach:${tone}:${dayNum}:${rate}`;
  const text = await cachedCallClaude(
    cacheKey,
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

const aiDailyReport = async (totalCal, totalBurned, completedMissions, totalMissions) => {
  const rate = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `report:${today}:${totalCal}:${totalBurned}:${rate}`;
  const text = await cachedCallClaude(
    cacheKey,
    `피트니스 일일 리포트 코멘트를 한국어 1-2문장으로 작성해주세요. 오늘 섭취 ${totalCal}kcal, 소비 ${totalBurned}kcal, 미션 달성률 ${rate}%. 격려와 구체적 조언을 포함. 텍스트만 응답.`,
    150
  );
  if (text) return text.trim();
  return rate >= 80 ? "오늘 하루 정말 잘 보냈어요! 내일도 이 기세로!" : rate >= 50 ? "절반 이상 달성! 조금만 더 힘내봐요." : "내일은 더 좋은 하루가 될 거예요. 화이팅!"
};

// AI 호출 결과 캐시 (동일 입력 → 동일 응답, 비용/지연 절감).
// 메모리 LRU(최대 50) + IndexedDB(window.storage) 영속.
// 기본 TTL 24h — 코치/리포트는 하루 단위라 충분.
const _aiMem = new Map();

// Map 의 삽입 순서를 LRU 로 유지하려면, 읽을 때마다 delete→set 으로 재삽입해야 한다.
// 그래야 keys().next() 가 '가장 오래 참조되지 않은' 항목이 된다.
const _aiCacheTouch = (key, entry) => {
  _aiMem.delete(key);
  _aiMem.set(key, entry);
};

const _aiCacheGet = async (key) => {
  const memHit = _aiMem.get(key);
  if (memHit && memHit.expires > Date.now()) {
    _aiCacheTouch(key, memHit); // access 시 최신 위치로
    return memHit.value;
  }
  if (memHit) _aiMem.delete(key); // 만료된 항목 정리
  try {
    const r = await window.storage?.get(`waylog:ai-cache:${key}`);
    if (r?.value) {
      const parsed = JSON.parse(r.value);
      if (parsed.expires > Date.now()) {
        _aiCacheTouch(key, parsed);
        return parsed.value;
      }
    }
  } catch {}
  return null;
};

const _aiCacheSet = async (key, value, ttl = AI_CACHE_TTL_MS) => {
  const entry = { value, expires: Date.now() + ttl };
  _aiCacheTouch(key, entry);
  // 용량 초과 시 가장 오래된 항목(삽입 순서 1번째) 제거 — 이제 진짜 LRU
  while (_aiMem.size > AI_CACHE_MAX) {
    const oldest = _aiMem.keys().next().value;
    _aiMem.delete(oldest);
  }
  try { await window.storage?.set(`waylog:ai-cache:${key}`, JSON.stringify(entry)); } catch {}
};

const cachedCallClaude = async (cacheKey, prompt, maxTokens = 500, ttl = AI_CACHE_TTL_MS) => {
  const cached = await _aiCacheGet(cacheKey);
  if (cached) return cached;
  const text = await callClaude(prompt, maxTokens);
  if (text) await _aiCacheSet(cacheKey, text, ttl);
  return text;
};

// 제품별 AI 리뷰 요약 (pros/cons/summary). null 반환 시 호출측이 폴백 표시.
const summarizeProduct = async (product, reviews) => {
  if (!product || !Array.isArray(reviews) || reviews.length < 5) return null;
  const sample = reviews.slice(0, 30).map((r) => ({
    title: (r.title || "").slice(0, 80),
    body: (r.body || "").slice(0, 400),
    tags: (r.tags || []).slice(0, 5),
  }));
  const prompt = `다음은 "${product.name}" 제품에 대한 한국어 사용자 리뷰들입니다.
장점 3개, 단점 2개, 전반 요약 1-2문장을 JSON으로만 응답하세요. 형식:
{"pros":[{"text":"...","count":n},{"text":"...","count":n},{"text":"...","count":n}],"cons":[{"text":"...","count":n},{"text":"...","count":n}],"summary":"..."}
리뷰 JSON: ${JSON.stringify(sample)}`;
  const text = await callClaude(prompt, 800);
  if (!text) return null;
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.pros) && Array.isArray(parsed.cons) && typeof parsed.summary === "string") {
      return parsed;
    }
  } catch {}
  return null;
};

// 인바디(InBody) 결과지 사진 → 5개 수치 + 한국어 해석 + 주간 생활습관 권장.
// callClaudeVision (Sonnet 4) 재활용. 실패 시 throw → 호출측이 토스트 + 수동 입력 폴백.
const analyzeInbodyImage = async (imageDataUrl) => {
  if (!imageDataUrl) throw new Error("ai_unavailable");
  const prompt = `당신은 인바디(InBody) 결과지를 분석하는 전문가입니다.
이 이미지에서 다음 5개 항목을 정확히 추출하고, 종합 분석을 제공해주세요.

추출 항목:
1. 체중 (kg, 숫자만)
2. 골격근량 (kg, 숫자만)
3. 체지방량 (kg, 숫자만)
4. BMI (kg/m², 숫자만)
5. 체지방률 (%, 숫자만)

응답 형식 (JSON만, 마크다운 코드 블록 없이):
{
  "data": {
    "weight": 숫자 또는 null,
    "skeletal_muscle": 숫자 또는 null,
    "body_fat_mass": 숫자 또는 null,
    "bmi": 숫자 또는 null,
    "body_fat_percentage": 숫자 또는 null
  },
  "interpretation": "현재 신체 상태에 대한 친절한 한국어 해석 (3~5문장, 격려와 함께)",
  "weekly_lifestyle": {
    "exercise": "이번 주 운동 권장 (구체적 종류·빈도, 1~2문장)",
    "diet": "이번 주 식습관 권장 (1~2문장)",
    "sleep": "수면 권장 (시간 포함, 1문장)",
    "hydration": "물 섭취 권장 (1문장)",
    "tip": "이번 주 핵심 팁 (1~2문장, 격려)"
  }
}

규칙:
- 설명·서론·마크다운 코드 블록 금지, JSON 객체만
- 인식 못 하는 항목은 null
- 의학적 진단은 하지 말 것 (필요 시 병원 권유는 가능)
- 따뜻하고 격려하는 톤
- 엄마 세대 + 일반인 대상이라 어려운 용어는 자제`;
  const text = await callClaudeVision(prompt, imageDataUrl, 1500);
  if (!text) throw new Error("ai_unavailable");
  const block = extractJsonBlock(text);
  if (!block) throw new Error("ai_parse_failed");
  let parsed;
  try { parsed = JSON.parse(block); }
  catch { throw new Error("ai_parse_failed"); }
  if (!parsed?.data || !parsed?.interpretation || !parsed?.weekly_lifestyle) {
    throw new Error("ai_parse_failed");
  }
  const num = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  parsed.data = {
    weight: num(parsed.data.weight),
    skeletal_muscle: num(parsed.data.skeletal_muscle),
    body_fat_mass: num(parsed.data.body_fat_mass),
    bmi: num(parsed.data.bmi),
    body_fat_percentage: num(parsed.data.body_fat_percentage),
  };
  return parsed;
};

// calcBMR / calcTargetCalories 는 src/utils/challenge.js 로 이전됨 (ChallengeStartScreen 이 직접 import).

const getChallengeDay = (startDate) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  return Math.max(1, Math.min(CHALLENGE_DAYS, Math.floor((now - start) / 86400000) + 1));
};

const getChallengeWeek = (dayNum) => Math.min(CHALLENGE_WEEKS, Math.ceil(dayNum / 7));

// ---------- HOOKS ----------
// ---------- TINY UI HELPERS ----------



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
        <Check size={32} className="text-brand-500 mb-2"/>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>오늘의 픽 완료!</p>
        <p className={cls("text-xs mt-1 mb-4", dark ? "text-gray-400" : "text-gray-500")}>내일 새로운 추천이 기다려요</p>
        <button onClick={() => setIdx(0)} className="px-4 py-2 rounded-full bg-brand-500 text-white text-xs font-bold active:scale-95 transition">다시 시작</button>
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
        style={{
          transform: `translateX(${offset}px) rotate(${rot}deg)`,
          opacity,
          transition: (startX.current && !exitDir) ? "none" : "all 0.28s ease-out",
          touchAction: "none", // 카드 위에서는 브라우저가 세로 스크롤 안 하게 — 가로 스와이프만 JS 가 담당
        }}
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
// HomeScreen — Waylog 라이프스타일 매거진 홈
// 구조: 인사 → 카테고리 픽커 → (챌린지 배너) → 최신 웨이로그 피드
const HomeScreen = ({ reviews, onOpen, favs, toggleFav, dark, user, onPrimary, tg: _tg, challenge, dailyLogs: _dailyLogs, onChallengeStart, onChallengeOpen, onChallengeResult: _onChallengeResult, onProductClick: _onProductClick, onEditReview, onDeleteReview, loading = false }) => {
  const challengeActive = !!challenge && challenge.status !== "completed";
  const [activeCat, setActiveCat] = useState("all");

  // 피드 포스트 (chronological + 카테고리 필터)
  const feedPosts = useMemo(() => {
    const base = [...reviews].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (activeCat === "all") return base;
    return base.filter((r) => r.category === activeCat);
  }, [reviews, activeCat]);

  const dayNum = challenge?.startDate ? getChallengeDay(challenge.startDate) : 0;
  const catKeys = useMemo(() => ["all", ...Object.keys(CATEGORIES)], []);

  // 이번 주 인기 — 최근 7일 내 좋아요 많은 순 Top 5. "추천" 탭의 핵심 큐레이션.
  const weeklyTop = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return [...reviews]
      .filter((r) => r.img && r.date && new Date(r.date).getTime() >= weekAgo)
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 5);
  }, [reviews]);

  return (
    <div className={dark ? "bg-[#0a0a0a]" : "bg-white"}>
      {/* 인사 — 시간대 따라 무드 */}
      <div className="px-4 pt-6 pb-2">
        <h2 className={cls("text-[22px] font-black leading-tight tracking-tight", dark ? "text-white" : "text-black")}>
          {user ? `안녕하세요, ${user.nickname}님` : "오늘의 웨이로그"}
        </h2>
        <p className={cls("text-[13px] mt-1.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
          라이프스타일을 기록하고 발견하는 공간
        </p>
      </div>

      {/* 카테고리 픽커 — 민트 액센트, 가로 스크롤 */}
      <div className="px-4 pt-5 pb-1 overflow-x-auto scrollbar-hide flex gap-2" style={{ scrollbarWidth: "none" }}>
        {catKeys.map((k) => {
          const isAll = k === "all";
          const cat = isAll ? null : CATEGORIES[k];
          const selected = activeCat === k;
          return (
            <button key={k} onClick={() => setActiveCat(k)}
              className={cls("shrink-0 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition",
                selected
                  ? "bg-brand-500 text-white"
                  : dark ? "bg-[#1a1a1a] text-white border border-[#262626]" : "bg-white text-black border border-[#dbdbdb]")}>
              {isAll ? "전체" : cat.label}
            </button>
          );
        })}
      </div>

      {/* 챌린지 배너 — 활성일 때만, 전체 카테고리에서만 */}
      {challengeActive && activeCat === "all" && (
        <div className="px-4 pt-4">
          <button onClick={onChallengeOpen}
            className="w-full text-left block rounded-2xl overflow-hidden active:scale-[0.99] transition bg-gradient-to-br from-brand-500 to-brand-700">
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                <Dumbbell size={22} className="text-white" strokeWidth={2}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">진행 중</p>
                <p className="text-[16px] font-black text-white">바디키 D+{dayNum}</p>
                <p className="text-[12px] text-white/80">오늘 미션 확인하기</p>
              </div>
              <ChevronRight size={22} className="text-white"/>
            </div>
          </button>
        </div>
      )}
      {!challengeActive && activeCat === "all" && (
        <div className="px-4 pt-4">
          <button onClick={onChallengeStart}
            className={cls("w-full text-left block rounded-2xl overflow-hidden active:scale-[0.99] transition border",
              dark ? "bg-[#121212] border-[#262626]" : "bg-white border-[#dbdbdb]")}>
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                <Dumbbell size={22} className="text-brand-500" strokeWidth={2}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cls("text-[15px] font-bold", dark ? "text-white" : "text-black")}>바디키 8주 챌린지</p>
                <p className={cls("text-[12px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>건강한 루틴을 만들어봐요</p>
              </div>
              <ChevronRight size={20} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>
            </div>
          </button>
        </div>
      )}

      {/* 이번 주 인기 — 최근 7일 TOP 가로 캐러셀. 추천 탭의 핵심 큐레이션 */}
      {activeCat === "all" && weeklyTop.length >= 3 && (
        <>
          <div className="px-4 pt-8 pb-3 flex items-baseline justify-between">
            <h3 className={cls("text-[16px] font-black inline-flex items-center gap-2", dark ? "text-white" : "text-black")}>
              <span className="w-[3px] h-[14px] rounded-full bg-brand-500 self-center"/>
              <Flame size={15} className="text-brand-500"/> 이번 주 인기
            </h3>
            <span className={cls("text-[12px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>최근 7일</span>
          </div>
          <div className="pl-4 pr-1 overflow-x-auto scrollbar-hide flex gap-3 pb-2" style={{ scrollbarWidth: "none" }}>
            {weeklyTop.map((r, idx) => {
              const rCat = CATEGORIES[r.category];
              return (
                <button key={r.id} onClick={() => onOpen(r)}
                  className="shrink-0 w-[150px] text-left active:scale-[0.98] transition">
                  <div className={cls("relative w-full aspect-[3/4] rounded-xl overflow-hidden", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
                    <SmartImg r={r} className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent"/>
                    <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-brand-500 text-white text-[11px] font-black flex items-center justify-center shadow">
                      {idx + 1}
                    </span>
                    {rCat && (
                      <span className="absolute top-2 right-2 text-[11px] font-black px-2 py-0.5 rounded-full bg-black/60 text-white">
                        {rCat.label}
                      </span>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 text-white">
                      <Heart size={11} className="fill-accent-300 text-accent-300 shrink-0"/>
                      <span className="text-[11px] font-bold tabular-nums">{r.likes || 0}</span>
                    </div>
                  </div>
                  <p className={cls("text-[12px] font-bold mt-1.5 line-clamp-2 leading-tight min-h-[2.7em]", dark ? "text-white" : "text-black")}>
                    {r.title || "제목 없음"}
                  </p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* 섹션 헤더 — 민트 수직 바 anchor */}
      {feedPosts.length > 0 && (
        <div className="px-4 pt-8 pb-3 flex items-baseline justify-between">
          <h3 className={cls("text-[16px] font-black inline-flex items-center gap-2", dark ? "text-white" : "text-black")}>
            <span className="w-[3px] h-[14px] rounded-full bg-brand-500 self-center"/>
            {activeCat === "all" ? "최신 웨이로그" : `${CATEGORIES[activeCat]?.label} 리뷰`}
          </h3>
          <span className={cls("text-[12px] tabular-nums", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
            {feedPosts.length}개
          </span>
        </div>
      )}

      {/* 피드 포스트 */}
      {feedPosts.map((r) => (
        <Card key={r.id} r={r} onOpen={onOpen} isFav={favs.has(r.id)} toggleFav={toggleFav} dark={dark}
          user={user} onEdit={onEditReview} onDelete={onDeleteReview}/>
      ))}

      {/* 로딩 중엔 skeleton — empty state 먼저 보이면 "글이 없다"로 오해함 */}
      {loading && feedPosts.length === 0 && (
        <div className="px-4 pt-2 pb-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`home-sk-${i}`} className={cls("rounded-2xl overflow-hidden animate-pulse", dark ? "bg-[#0f0f0f]" : "bg-[#fafafa]")}>
              <div className={cls("w-full aspect-[4/3]", dark ? "bg-[#1a1a1a]" : "bg-[#efefef]")}/>
              <div className="p-3 space-y-2">
                <div className={cls("h-3 rounded w-3/4", dark ? "bg-[#1a1a1a]" : "bg-[#efefef]")}/>
                <div className={cls("h-3 rounded w-1/2", dark ? "bg-[#1a1a1a]" : "bg-[#efefef]")}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && feedPosts.length === 0 && (
        <div className="px-6 py-20 text-center">
          <div className={cls("w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
            <Camera size={28} strokeWidth={1.5} className="text-brand-500"/>
          </div>
          <p className={cls("text-[16px] font-bold", dark ? "text-white" : "text-black")}>
            {activeCat === "all" ? "첫 번째 웨이로그를 남겨보세요" : "이 카테고리엔 아직 리뷰가 없어요"}
          </p>
          <p className={cls("text-[14px] mt-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
            {activeCat === "all" ? "사진과 후기를 공유하면 피드에 나타나요" : "다른 카테고리도 둘러보세요"}
          </p>
          {activeCat === "all" && (
            <button onClick={onPrimary}
              className="mt-5 px-6 py-2.5 rounded-full bg-brand-500 text-white text-[14px] font-bold active:scale-95 transition">
              웨이로그 쓰기
            </button>
          )}
        </div>
      )}

      <div className="h-24"/>
    </div>
  );
};

// 피드 중간 챌린지 배너 — IG 스폰서 포스트 자리 같이 자연스럽게
const ChallengeFeedCard = ({ dayNum, dailyLogs, dark, onOpen }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLog = dailyLogs?.[todayStr] || { completedMissions: [] };
  const weekNum = getChallengeWeek(dayNum);
  const weekMissions = CHALLENGE_MISSIONS[weekNum - 1] || CHALLENGE_MISSIONS[0];
  const missionsDone = todayLog.completedMissions?.length || 0;
  const missionsTotal = weekMissions?.missions?.length || 5;
  const pct = Math.round((dayNum / CHALLENGE_DAYS) * 100);

  return (
    <button onClick={onOpen}
      className={cls("w-full text-left block border-y active:opacity-90 transition", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
          <Dumbbell size={16} className="text-white" strokeWidth={2}/>
        </div>
        <div className="flex-1">
          <p className={cls("text-[13px] font-bold", dark ? "text-white" : "text-black")}>바디키 8주 챌린지</p>
          <p className="text-[11px] text-[#737373]">스폰서 · Waylog</p>
        </div>
      </div>
      <div className="relative w-full aspect-square bg-gradient-to-br from-brand-500 via-brand-600 to-black overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <p className="text-[11px] uppercase tracking-[0.3em] opacity-80 font-bold mb-1">DAY</p>
          <p className="text-[120px] font-black leading-none tabular-nums">{dayNum}</p>
          <p className="text-[13px] opacity-80 mt-2">of {CHALLENGE_DAYS}</p>
          <div className="mt-6 w-48 h-[3px] rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${pct}%` }}/>
          </div>
          <p className="text-[13px] mt-3 font-semibold">오늘 미션 {missionsDone}/{missionsTotal}</p>
        </div>
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <p className={cls("text-[14px] font-bold", dark ? "text-white" : "text-black")}>오늘 미션 확인하기</p>
        <ChevronRight size={18} className={dark ? "text-white" : "text-black"}/>
      </div>
    </button>
  );
};

// ============================================================
// ExploreScreen — 검색/탐색 탭 (IG explore 패턴)
// 구조: 상단 검색바 → 카테고리 pill → 마소너리 그리드 (리뷰+제품 혼합)
// ============================================================
const ExploreScreen = ({ reviews, onOpen, favs, toggleFav, dark, onProductClick, onSearchOpen }) => {
  const CATALOG = useCatalog();
  const [activeCat, setActiveCat] = useState("all");

  // 리뷰와 제품을 섞어 grid 에 표시 (IG explore 느낌)
  const mixed = useMemo(() => {
    const items = [];
    const pool = activeCat === "all" ? reviews : reviews.filter((r) => r.category === activeCat);
    // 3개 리뷰마다 제품 1개 섞기
    let pIdx = 0;
    const products = (CATALOG || []).filter((p) => p.imageUrl && (activeCat === "all" || p.category === activeCat));
    pool.forEach((r, i) => {
      items.push({ type: "review", data: r });
      if ((i + 1) % 4 === 0 && products[pIdx]) {
        items.push({ type: "product", data: products[pIdx] });
        pIdx++;
      }
    });
    return items;
  }, [reviews, CATALOG, activeCat]);

  // IG explore 처럼 일부 셀은 크게 (2x2) — index 5, 11, 17... 을 big 셀로
  const isBigCell = (idx) => idx > 0 && (idx % 6 === 5);

  return (
    <div className={cls("min-h-screen", dark ? "bg-black" : "bg-white")}>
      {/* 상단 검색바 */}
      <div className={cls("px-4 py-2 border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
        <button onClick={onSearchOpen}
          className={cls("w-full flex items-center gap-2 px-3 py-2 rounded-lg", dark ? "bg-[#262626]" : "bg-[#efefef]")}>
          <Search size={14} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>
          <span className={cls("text-[14px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
            검색
          </span>
        </button>
      </div>

      {/* 카테고리 pills — 민트 액센트 */}
      <div className={cls("flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")} style={{ scrollbarWidth: "none" }}>
        {[{ key: "all", label: "전체" }, ...Object.entries(CATEGORIES).map(([k, c]) => ({ key: k, label: c.label }))].map((c) => (
          <button key={c.key} onClick={() => setActiveCat(c.key)}
            className={cls("shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition",
              activeCat === c.key
                ? "bg-brand-500 text-white"
                : dark ? "bg-[#1a1a1a] text-white border border-[#262626]" : "bg-white text-black border border-[#dbdbdb]")}>
            {c.label}
          </button>
        ))}
      </div>

      {/* 마소너리 그리드 — 3열 기반 (IG explore) */}
      <div className="grid grid-cols-3 gap-px">
        {mixed.map((item, idx) => {
          const big = isBigCell(idx);
          if (item.type === "review") {
            return (
              <button key={`r-${item.data.id}`} onClick={() => onOpen(item.data)}
                className={cls("relative overflow-hidden aspect-square active:opacity-80 transition",
                  big && "col-span-2 row-span-2 aspect-square")}>
                <SmartImg r={item.data} className="w-full h-full object-cover"/>
                {/* 영상/다중 미디어 배지 */}
                {item.data.media && item.data.media.length > 0 && (
                  <div className="absolute top-2 right-2">
                    {item.data.media.some((m) => m.type === "video") ? (
                      <Film size={18} className="text-white" strokeWidth={2} fill="currentColor"/>
                    ) : item.data.media.length > 1 ? (
                      <div className="w-[18px] h-[18px] relative">
                        <div className="absolute inset-0 bg-white rounded-sm"/>
                        <div className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-white/80 rounded-sm"/>
                      </div>
                    ) : null}
                  </div>
                )}
              </button>
            );
          }
          // 제품 셀 (IG shop grid 느낌)
          return (
            <button key={`p-${item.data.id}`} onClick={() => onProductClick && onProductClick(item.data)}
              className={cls("relative overflow-hidden aspect-square active:opacity-80 transition",
                dark ? "bg-[#121212]" : "bg-[#fafafa]",
                big && "col-span-2 row-span-2")}>
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <ProductImage src={item.data.imageUrl} alt={item.data.name} className="max-w-full max-h-full object-contain" iconSize={24}/>
              </div>
              <div className="absolute top-2 left-2">
                <ShoppingBag size={14} className="text-white drop-shadow-md" strokeWidth={2.5} fill="white"/>
              </div>
              {item.data.price > 0 && (
                <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white text-[11px] font-bold truncate">{item.data.brand}</p>
                  <p className="text-white text-[11px] tabular-nums">{item.data.price.toLocaleString()}원</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {mixed.length === 0 && (
        <div className="py-16 text-center">
          <p className={cls("text-[14px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
            해당 카테고리에 콘텐츠가 없어요
          </p>
        </div>
      )}

      <div className="h-24"/>
    </div>
  );
};

// ============================================================
// ReelsScreen — 챌린지 탭 (바디키 통합)
// IG Reels 같은 세로 전체화면 스크롤에 바디키 미션 카드들 배치
// ============================================================
const ReelsScreen = ({ reviews, onOpen, dark: _dark, user, challenge, dailyLogs, onChallengeStart, onChallengeOpen }) => {
  // 영상 리뷰 추출
  const videoReviews = useMemo(() => {
    return reviews.filter((r) => r.media && r.media.some((m) => m.type === "video")).slice(0, 20);
  }, [reviews]);

  // 챌린지 진행률
  const dayNum = challenge?.startDate ? getChallengeDay(challenge.startDate) : 0;
  const weekNum = dayNum ? getChallengeWeek(dayNum) : 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLog = dailyLogs?.[todayStr] || { completedMissions: [] };
  const weekMissions = CHALLENGE_MISSIONS[weekNum - 1] || CHALLENGE_MISSIONS[0];
  const missionsDone = todayLog.completedMissions?.length || 0;
  const missionsTotal = weekMissions?.missions?.length || 5;
  const pct = dayNum ? Math.round((dayNum / CHALLENGE_DAYS) * 100) : 0;

  return (
    <div className="bg-black min-h-screen text-white pb-20">
      {/* 상단 챌린지 상태 카드 (IG reels 첫 화면 같은 hero) */}
      {challenge && challenge.status !== "completed" ? (
        <button onClick={onChallengeOpen}
          className="relative block w-full h-[85vh] overflow-hidden active:scale-[0.995] transition">
          {/* 배경 — 그라디언트 */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-black"/>
          {/* 장식 도형 */}
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/5 blur-2xl"/>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-brand-300/20 blur-3xl"/>

          {/* 상단 정보 */}
          <div className="absolute top-5 inset-x-0 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell size={16} className="text-white/80"/>
                <span className="text-[12px] font-bold uppercase tracking-widest text-white/80">바디키 8주 챌린지</span>
              </div>
              <span className="text-[12px] text-white/60">Week {weekNum}</span>
            </div>
            <div className="mt-3 h-[3px] rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }}/>
            </div>
          </div>

          {/* 중앙 대형 D+N */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[14px] uppercase tracking-[0.3em] text-white/70 font-semibold">DAY</p>
              <p className="text-[140px] font-black leading-none tabular-nums tracking-tight mt-2">
                {dayNum}
              </p>
              <p className="text-[14px] text-white/60 mt-1">of {CHALLENGE_DAYS} days</p>
            </div>
          </div>

          {/* 하단 오늘 미션 + CTA */}
          <div className="absolute bottom-0 inset-x-0 p-5 pb-8">
            <p className="text-[14px] text-white/80 font-semibold mb-2">
              오늘 미션 <span className="tabular-nums font-bold text-white">{missionsDone}/{missionsTotal}</span>
            </p>
            <p className="text-[20px] font-bold leading-tight">{weekMissions?.title || "챌린지 미션"}</p>
            <div className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-[14px] font-bold">
              <Target size={15}/> 미션 확인하기
            </div>
          </div>

          {/* 우측 액션 바 (IG Reels 패턴) */}
          <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
            <button onClick={(e) => { e.stopPropagation(); onChallengeOpen(); }} className="flex flex-col items-center gap-1 active:scale-90 transition">
              <BarChart3 size={26} strokeWidth={1.8}/>
              <span className="text-[11px] font-semibold">기록</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onChallengeOpen(); }} className="flex flex-col items-center gap-1 active:scale-90 transition">
              <Activity size={26} strokeWidth={1.8}/>
              <span className="text-[11px] font-semibold">인바디</span>
            </button>
          </div>
        </button>
      ) : (
        /* 챌린지 미시작 — 시작 CTA 풀스크린 */
        <button onClick={onChallengeStart}
          className="relative block w-full h-[85vh] overflow-hidden active:scale-[0.995] transition">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-800 to-black"/>
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/5 blur-2xl"/>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-brand-300/20 blur-3xl"/>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <Trophy size={64} className="text-white/90 mb-5"/>
            <p className="text-[12px] uppercase tracking-[0.3em] text-white/70 font-bold mb-2">8-Week Challenge</p>
            <h2 className="text-[36px] font-black leading-tight">바디키<br/>8주 챌린지</h2>
            <p className="text-[15px] text-white/80 mt-4 leading-relaxed max-w-xs">
              AI 코치와 함께 56일간<br/>나만의 변화를 기록하세요
            </p>
            <div className="mt-8 inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white text-black text-[15px] font-bold">
              시작하기 <span>→</span>
            </div>
          </div>
        </button>
      )}

      {/* 영상 리뷰 섹션 (챌린지 외 — Reels 세로 스크롤 느낌) */}
      {videoReviews.length > 0 && (
        <section>
          <div className="px-4 pt-6 pb-3">
            <h3 className="text-[16px] font-bold">이번 주 영상 리뷰</h3>
            <p className="text-[12px] text-white/60 mt-0.5">
              {videoReviews.length}개의 영상 콘텐츠
            </p>
          </div>
          {videoReviews.map((r) => (
            <button key={r.id} onClick={() => onOpen(r)}
              className="relative block w-full h-[85vh] overflow-hidden border-t border-[#262626] active:scale-[0.995] transition">
              <SmartImg r={r} className="absolute inset-0 w-full h-full object-cover"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"/>
              {/* 좌하단 정보 */}
              <div className="absolute bottom-0 inset-x-0 p-5 pb-8 pr-20">
                <div className="flex items-center gap-2 mb-3">
                  <Avatar id={r.authorAvatar} size={10} className="w-8 h-8"/>
                  <span className="text-[14px] font-bold">{r.author}</span>
                  <button className="ml-1 text-[13px] font-bold text-white border border-white/80 px-3 py-0.5 rounded">
                    팔로우
                  </button>
                </div>
                <p className="text-[15px] font-bold mb-1">{r.title}</p>
                {r.product && <p className="text-[13px] text-white/80">— {r.product}</p>}
              </div>
              {/* 우측 액션 바 */}
              <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
                <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1 active:scale-90 transition">
                  <Heart size={28} strokeWidth={1.8}/>
                  <span className="text-[11px] font-semibold">{r.likes || 0}</span>
                </button>
                <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1 active:scale-90 transition">
                  <MessageCircle size={28} strokeWidth={1.8}/>
                  <span className="text-[11px] font-semibold">댓글</span>
                </button>
                <button onClick={(e) => e.stopPropagation()} className="active:scale-90 transition">
                  <Send size={28} strokeWidth={1.8}/>
                </button>
                <button onClick={(e) => e.stopPropagation()} className="active:scale-90 transition">
                  <Bookmark size={28} strokeWidth={1.8}/>
                </button>
              </div>
            </button>
          ))}
        </section>
      )}
    </div>
  );
};

// ============================================================
// ProfileSelfScreen — 내 프로필 (Waylog 매거진 스타일)
// 상단 header (avatar + nick + stats) → bio + action buttons → 탭 → 컨텐츠 그리드
// ============================================================
const ProfileSelfScreen = ({ user, reviews, favs, toggleFav: _toggleFav, dark, onOpen, onProductClick,
  challenge, dailyLogs: _dailyLogs, onChallengeOpen, onChallengeStart: _onChallengeStart,
  onEditProfile, onOpenSettings, onAuthOpen, following, followingArr: _followingArr, community: _community,
  toggleFollow, onUserClick }) => {
  const CATALOG = useCatalog();
  const [profileTab, setProfileTab] = useState("posts"); // posts | saved | tagged
  // 팔로워·팔로잉 수 — UserProfileScreen 과 동일 패턴.
  // 훅은 early-return 이전에 호출되어야 하므로 ProfileSelfScreen 상단에 둔다.
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [followListOpen, setFollowListOpen] = useState(null); // "followers" | "following" | null
  useEffect(() => {
    if (!user?.id) return;
    supabaseFollows.counts(user.id).then((c) => {
      if (c && typeof c === "object") setFollowCounts({ followers: c.followers || 0, following: c.following || 0 });
    }).catch(() => {});
  }, [user?.id, followListOpen]);

  // 로그인 안 한 경우
  if (!user) {
    return (
      <div className={cls("min-h-screen px-6 py-20 text-center", dark ? "bg-black text-white" : "bg-white text-black")}>
        <div className={cls("w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
          <User size={28} strokeWidth={1.5} className="text-brand-500"/>
        </div>
        <p className="text-[16px] font-bold">로그인 해주세요</p>
        <p className={cls("text-[14px] mt-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
          프로필을 보려면 로그인이 필요해요
        </p>
        <button onClick={onAuthOpen}
          className="mt-6 px-6 py-2.5 rounded-full bg-brand-500 text-white text-[14px] font-bold active:scale-95 transition">
          로그인
        </button>
      </div>
    );
  }

  // 사용자의 리뷰만 필터
  const myReviews = reviews.filter((r) => r.authorId === user.id || r.author === user.nickname);
  const savedReviews = reviews.filter((r) => favs.has(r.id));
  const savedProducts = (CATALOG || []).slice(0, 12); // 저장된 제품 — 지금은 샘플

  // 서버 count 우선. 로컬 following Set 은 초기 렌더/optimistic 반영용 (서버 fetch 완료 전).
  const followerCount = followCounts.followers;
  const followingCount = followCounts.following || (following ? following.size : 0);
  const challengeActive = challenge && challenge.status !== "completed";
  const dayNum = challengeActive ? getChallengeDay(challenge.startDate) : 0;

  const renderGridItem = (r) => {
    const rCat = CATEGORIES[r.category];
    const hasVideo = r.media && r.media.some((m) => m.type === "video");
    return (
      <button key={r.id} onClick={() => onOpen(r)}
        className="text-left group active:scale-[0.98] transition">
        <div className={cls("relative w-full aspect-[4/5] rounded-xl overflow-hidden", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
          {r.img
            ? <SmartImg r={r} className="w-full h-full object-cover"/>
            : <div className="w-full h-full flex items-center justify-center"><Camera size={24} strokeWidth={1.5} className={dark ? "text-[#404040]" : "text-[#c7c7c7]"}/></div>}
          {rCat && (
            <div className="absolute top-2 left-2">
              <span className={cls("text-[11px] font-black px-2 py-0.5 rounded-full", dark ? "bg-black/70 text-white" : "bg-white/95 text-black")}>
                {rCat.label}
              </span>
            </div>
          )}
          {hasVideo && (
            <div className="absolute top-2 right-2 bg-black/60 rounded-full w-6 h-6 flex items-center justify-center">
              <Film size={12} className="text-white"/>
            </div>
          )}
        </div>
        <p className={cls("text-[13px] font-bold mt-2 line-clamp-2 leading-[1.35]", dark ? "text-white" : "text-black")}>
          {r.title || "제목 없음"}
        </p>
        {r.likes > 0 && (
          <span className={cls("text-[11px] inline-flex items-center gap-0.5 mt-1 tabular-nums", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
            <Heart size={10} strokeWidth={2.2} className="fill-accent-500 text-accent-500"/>
            {r.likes}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={cls("min-h-screen pb-24", dark ? "bg-black text-white" : "bg-white text-black")}>
      {/* 프로필 헤더 */}
      <div className="px-4 pt-6">
        <div className="flex items-start gap-5">
          <div className="shrink-0">
            <Avatar id={user.avatar} size={24} className="w-[92px] h-[92px]"/>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[20px] font-black leading-tight truncate">{user.nickname}</p>
            <p className={cls("text-[12px] mt-0.5 truncate", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{user.email}</p>
            {challengeActive && (
              <div className={cls("mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold",
                dark ? "bg-brand-900/40 text-brand-200" : "bg-brand-50 text-brand-700")}>
                <Dumbbell size={12}/> 바디키 D+{dayNum}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-[14px] mt-4 whitespace-pre-wrap leading-[1.5]">{user.bio}</p>
        )}

        {/* Stats — 카드 스타일 */}
        <div className={cls("mt-5 grid grid-cols-3 rounded-2xl overflow-hidden",
          dark ? "bg-[#1a1a1a] border border-[#262626]" : "bg-[#fafafa] border border-[#dbdbdb]")}>
          <div className="text-center py-3 border-r"
            style={{ borderColor: dark ? "#262626" : "#dbdbdb" }}>
            <p className="text-[18px] font-black tabular-nums">{myReviews.length}</p>
            <p className={cls("text-[11px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>게시물</p>
          </div>
          <button onClick={() => user?.id && setFollowListOpen("followers")}
            className="text-center py-3 border-r active:opacity-60"
            style={{ borderColor: dark ? "#262626" : "#dbdbdb" }}>
            <p className="text-[18px] font-black tabular-nums">{followerCount}</p>
            <p className={cls("text-[11px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>팔로워</p>
          </button>
          <button onClick={() => user?.id && setFollowListOpen("following")}
            className="text-center py-3 active:opacity-60">
            <p className="text-[18px] font-black tabular-nums">{followingCount}</p>
            <p className={cls("text-[11px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>팔로잉</p>
          </button>
        </div>

        {/* Action buttons */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onEditProfile}
            className={cls("py-2.5 rounded-xl text-[13px] font-bold active:scale-95 transition",
              dark ? "bg-[#1a1a1a] text-white border border-[#262626]" : "bg-white text-black border border-[#dbdbdb]")}>
            프로필 편집
          </button>
          <button onClick={onOpenSettings}
            className={cls("py-2.5 rounded-xl text-[13px] font-bold active:scale-95 transition",
              dark ? "bg-[#1a1a1a] text-white border border-[#262626]" : "bg-white text-black border border-[#dbdbdb]")}>
            설정
          </button>
        </div>

        {/* 챌린지 바로가기 — 활성일 때만 */}
        {challengeActive && (
          <button onClick={onChallengeOpen}
            className="w-full mt-3 rounded-2xl overflow-hidden active:scale-[0.99] transition bg-gradient-to-br from-brand-500 to-brand-700">
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                <Dumbbell size={18} className="text-white" strokeWidth={2}/>
              </div>
              <div className="flex-1 text-left">
                <p className="text-[13px] font-black text-white">바디키 챌린지 진행 중</p>
                <p className="text-[11px] text-white/80 mt-0.5">D+{dayNum} / {CHALLENGE_DAYS} · 오늘 미션 확인</p>
              </div>
              <ChevronRight size={18} className="text-white"/>
            </div>
          </button>
        )}
      </div>

      {/* 탭 (posts / saved / tagged) — 민트 언더라인 */}
      <div className={cls("mt-6 border-b flex", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
        {[
          { k: "posts", icon: Grid3x3, label: "게시물", count: myReviews.length },
          { k: "saved", icon: Bookmark, label: "저장됨", count: savedReviews.length },
          { k: "tagged", icon: Tag, label: "태그", count: 0 },
        ].map(({ k, icon: Icon, label, count }) => {
          const active = profileTab === k;
          return (
            <button key={k} onClick={() => setProfileTab(k)}
              aria-label={label}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 relative active:opacity-60">
              <Icon size={18} strokeWidth={2}
                className={cls(active ? "text-brand-500" : dark ? "text-[#737373]" : "text-[#a8a8a8]")}/>
              <span className={cls("text-[11px] font-bold",
                active ? "text-brand-500" : dark ? "text-[#737373]" : "text-[#a8a8a8]")}>
                {label}{count > 0 && ` ${count}`}
              </span>
              {active && (
                <div className="absolute bottom-0 inset-x-4 h-[2px] bg-brand-500 rounded-full"/>
              )}
            </button>
          );
        })}
      </div>

      {/* 그리드 */}
      {profileTab === "posts" && (
        <>
          {myReviews.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 px-4 pt-4">
              {myReviews.map(renderGridItem)}
            </div>
          ) : (
            <EmptyGridHint dark={dark} icon={Camera} title="첫 번째 웨이로그를 남겨보세요"
              desc="사진과 후기를 공유하면 여기에 나타나요"/>
          )}
        </>
      )}
      {profileTab === "saved" && (
        <>
          {savedReviews.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 px-4 pt-4">
              {savedReviews.map(renderGridItem)}
            </div>
          ) : savedProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 px-4 pt-4">
              {savedProducts.map((p) => {
                const pCat = CATEGORIES[p.category];
                return (
                  <button key={p.id} onClick={() => onProductClick && onProductClick(p)}
                    className="text-left active:scale-[0.98] transition">
                    <div className={cls("relative w-full aspect-[4/5] rounded-xl overflow-hidden flex items-center justify-center p-6", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
                      <ProductImage src={p.imageUrl} alt={p.name} className="max-w-full max-h-full object-contain" iconSize={28}/>
                      {pCat && (
                        <div className="absolute top-2 left-2">
                          <span className={cls("text-[11px] font-black px-2 py-0.5 rounded-full", dark ? "bg-black/70 text-white" : "bg-white/95 text-black")}>
                            {pCat.label}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className={cls("text-[13px] font-bold mt-2 line-clamp-2 leading-[1.35]", dark ? "text-white" : "text-black")}>
                      {p.name}
                    </p>
                    {p.brand && <p className={cls("text-[11px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{p.brand}</p>}
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyGridHint dark={dark} icon={Bookmark} title="저장한 항목이 없어요"
              desc="하트를 눌러 나중에 볼 수 있도록 저장하세요"/>
          )}
        </>
      )}
      {profileTab === "tagged" && (
        <EmptyGridHint dark={dark} icon={Tag} title="태그된 게시물이 없어요"
          desc="다른 사람이 회원님을 태그하면 여기에 나타나요"/>
      )}

      {followListOpen && user?.id && (
        <FollowListModal
          title={followListOpen === "followers" ? "팔로워" : "팔로잉"}
          userId={user.id}
          fetchFn={followListOpen === "followers" ? supabaseFollows.listFollowers : supabaseFollows.listFollowing}
          currentUser={user}
          following={following}
          onToggleFollow={toggleFollow}
          onClose={() => setFollowListOpen(null)}
          onUserClick={(u) => { setFollowListOpen(null); if (onUserClick) onUserClick(u); }}
          dark={dark}/>
      )}
    </div>
  );
};

// 프로필 탭 빈 상태 힌트
const EmptyGridHint = ({ dark, icon: Icon, title, desc }) => (
  <div className="py-16 text-center px-6">
    <div className={cls("w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
      <Icon size={22} strokeWidth={1.8} className="text-brand-500"/>
    </div>
    <p className={cls("text-[15px] font-bold", dark ? "text-white" : "text-black")}>{title}</p>
    <p className={cls("text-[13px] mt-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{desc}</p>
  </div>
);

// 카드 레이아웃과 같은 크기의 shimmer placeholder

const FeedScreen = ({ reviews, onOpen, favs, toggleFav, dark, onCompose: _onCompose, following, user, loading = false, onLoadMore, hasMore = false, loadingMore = false, highlightId = null }) => {
  const [activeCat, setActiveCat] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [sort, setSort] = useState("latest");
  const [feedMode, setFeedMode] = useState("all");
  const loadMoreRef = useRef(null);
  const CATALOG = useCatalog();

  // IntersectionObserver 로 리스트 하단 sentinel 관찰 → 도달 시 다음 페이지 로드
  useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) onLoadMore();
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [onLoadMore, hasMore]);
  const filtered = useMemo(() => {
    let list = [...reviews];
    if (feedMode === "following" && following) list = list.filter((r) => r.user_id && following.has(r.user_id));
    if (activeCat) list = list.filter((r) => r.category === activeCat);
    if (activeTag) list = list.filter((r) => (r.tags || []).includes(activeTag));
    list.sort((a,b) => sort === "likes" ? (b.likes || 0) - (a.likes || 0) : (b.date || "").localeCompare(a.date || ""));
    return list;
  }, [reviews, activeCat, activeTag, sort, feedMode, following]);

  // "오늘뭐썼지" 컨셉 — 최신순일 때 날짜별 섹션(오늘/어제/이번 주/이전)으로 묶어 오늘의 활동이 부각되도록
  const groupedByDate = useMemo(() => {
    if (sort !== "latest") return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 24 * 3600 * 1000;
    const weekAgo = today - 6 * 24 * 3600 * 1000; // 오늘 포함 7일
    const groups = { today: [], yesterday: [], week: [], older: [] };
    for (const r of filtered) {
      const t = r.date ? new Date(r.date).getTime() : 0;
      if (t >= today) groups.today.push(r);
      else if (t >= yesterday) groups.yesterday.push(r);
      else if (t >= weekAgo) groups.week.push(r);
      else groups.older.push(r);
    }
    return groups;
  }, [filtered, sort]);

  return (
    <div className={dark ? "bg-[#0a0a0a]" : "bg-white"}>
      <div className={cls("px-4 pt-3 pb-2")}>
        {user && (
          <div className={cls("flex border-b mb-2", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
            <button onClick={() => setFeedMode("all")}
              className={cls("flex-1 py-3 text-[14px] font-bold transition relative",
                feedMode === "all" ? (dark ? "text-white" : "text-black") : (dark ? "text-[#737373]" : "text-[#737373]"))}>
              전체
              {feedMode === "all" && <div className={cls("absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px]", dark ? "bg-white" : "bg-black")}/>}
            </button>
            <button onClick={() => setFeedMode("following")}
              className={cls("flex-1 py-3 text-[14px] font-bold transition relative",
                feedMode === "following" ? (dark ? "text-white" : "text-black") : (dark ? "text-[#737373]" : "text-[#737373]"))}>
              팔로잉 {following && following.size > 0 && <span className="opacity-60 text-[12px] ml-1">{following.size}</span>}
              {feedMode === "following" && <div className={cls("absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px]", dark ? "bg-white" : "bg-black")}/>}
            </button>
          </div>
        )}
        {/* 카테고리만 유지 — 인기 태그 칩은 상단 과밀 해소 위해 제거 (원하면 검색으로 필터) */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          <button onClick={() => { setActiveCat(null); setActiveTag(null); }}
            className={cls("text-[13px] px-3.5 py-2 rounded-full whitespace-nowrap font-bold shrink-0 transition",
              !activeCat && !activeTag
                ? "bg-brand-500 text-white"
                : dark ? "bg-[#1a1a1a] text-white border border-[#262626]" : "bg-white text-black border border-[#dbdbdb]")}>
            전체
          </button>
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <button key={k} onClick={() => { setActiveCat(k === activeCat ? null : k); setActiveTag(null); }}
              className={cls("text-[13px] px-3.5 py-2 rounded-full whitespace-nowrap font-bold shrink-0 transition",
                activeCat === k
                  ? "bg-brand-500 text-white"
                  : dark ? "bg-[#1a1a1a] text-white border border-[#262626]" : "bg-white text-black border border-[#dbdbdb]")}>
              {c.label}
            </button>
          ))}
          {/* activeTag 가 외부(상세 태그 클릭 등) 에서 설정된 경우 표시+해제 가능하도록 fallback */}
          {activeTag && (
            <button onClick={() => setActiveTag(null)}
              className="text-[13px] px-3.5 py-2 rounded-full whitespace-nowrap font-semibold shrink-0 transition bg-brand-500 text-white inline-flex items-center gap-1">
              #{activeTag} <X size={11}/>
            </button>
          )}
        </div>
      </div>
      <div className="px-4 mt-1 mb-3 flex justify-between items-center">
        <span className={cls("text-[13px] font-bold", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{filtered.length}개의 포스트</span>
        <div className="flex gap-1">
          {[{ k: "latest", label: "최신" }, { k: "likes", label: "인기" }].map((s) => (
            <button key={s.k} onClick={() => setSort(s.k)}
              className={cls("text-[12px] px-3 py-1 rounded-full font-bold transition",
                sort === s.k
                  ? "bg-brand-500 text-white"
                  : dark ? "bg-[#1a1a1a] text-[#a8a8a8]" : "bg-[#f2f2f2] text-[#737373]")}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {/* 2컬럼 매거진 그리드 — 이미지 중심 빠른 훑기 */}
      {loading && filtered.length === 0 && (
        <div className="grid grid-cols-2 gap-4 px-4 pb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-${i}`}>
              <div className={cls("w-full aspect-square rounded-xl", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}/>
              <div className={cls("h-3 rounded mt-2 w-4/5", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}/>
              <div className={cls("h-3 rounded mt-1 w-3/5", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}/>
            </div>
          ))}
        </div>
      )}
      {filtered.length > 0 && (() => {
        const renderCard = (r) => {
          const rCat = CATEGORIES[r.category];
          const hasVideo = r.media && r.media.some((m) => m.type === "video");
          const mediaCount = r.media ? r.media.length : 0;
          const isFav = favs.has(r.id);
          const highlight = r.id === highlightId;
          return (
            <button key={r.id} data-rid={r.id} onClick={() => onOpen(r)}
              className={cls("text-left active:scale-[0.98] transition", highlight && "ring-2 ring-brand-500 rounded-xl")}>
              {/* 이미지 — 정사각형 1:1. 세로 높이 줄여 화면당 카드 수 ↑, 스캔 용이 */}
              <div className={cls("relative w-full aspect-square rounded-xl overflow-hidden", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
                {r.img
                  ? <SmartImg r={r} className="w-full h-full object-cover"/>
                  : (
                    /* 이미지 없는 포스트 — 에디토리얼 quote 스타일 */
                    <div className={cls("w-full h-full p-3 flex flex-col justify-center relative ring-1",
                      dark ? "bg-[#0f0f0f] ring-white/5" : "bg-[#fafafa] ring-black/5")}>
                      <div className="absolute left-0 top-5 bottom-5 w-[3px] rounded-r bg-brand-500/70"/>
                      <p className={cls("text-[12.5px] font-medium line-clamp-4 leading-[1.5] pl-2", dark ? "text-white/85" : "text-[#333]")}>
                        {r.body || r.title || "웨이로그"}
                      </p>
                    </div>
                  )}
                {/* 카테고리 — 시각 무게 down (사이즈·대비·폰트 weight 낮춤). 제품 칩이 주인공 */}
                {rCat && (
                  <span className={cls("absolute top-2 left-2 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
                    dark ? "bg-black/55 text-white/90" : "bg-white/90 text-black/75")}>
                    {rCat.label}
                  </span>
                )}
                {(hasVideo || mediaCount > 1) && (
                  <div className="absolute top-2 right-2 bg-black/55 rounded-full w-6 h-6 flex items-center justify-center">
                    {hasVideo
                      ? <Film size={12} className="text-white"/>
                      : <Images size={12} className="text-white"/>}
                  </div>
                )}
                <button onClick={(e) => { e.stopPropagation(); toggleFav(r.id); }}
                  aria-label={isFav ? "좋아요 취소" : "좋아요"}
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/55 flex items-center justify-center active:scale-90 transition">
                  <Heart size={16} strokeWidth={2}
                    className={isFav ? "fill-accent-500 text-accent-500" : "text-white"}/>
                </button>
              </div>

              {/* 제목 — 항상 2줄 공간 확보 (line-clamp-2 + min-h 2줄) → 그리드 행 높이 일정 */}
              <p className={cls("text-[14px] font-bold mt-2.5 line-clamp-2 leading-[1.35] min-h-[2.7em]", dark ? "text-white" : "text-black")}>
                {r.title || "제목 없음"}
              </p>

              {/* 메타 한 줄 통합 — 제품/저자 가변이지만 min-h 로 행 높이 고정 */}
              <div className="flex items-start gap-1.5 mt-1.5 min-w-0 min-h-[2.5em]">
                {r.product ? (
                  <>
                    <ShoppingBag size={10} strokeWidth={2.2} className={cls("shrink-0 mt-[3px]", dark ? "text-brand-300" : "text-brand-600")}/>
                    <span className={cls("text-[11px] font-semibold line-clamp-2 min-w-0 flex-1", dark ? "text-brand-200" : "text-brand-700")}>
                      {getReviewProductNames(r, CATALOG).join(" · ")}
                    </span>
                  </>
                ) : (
                  <>
                    <Avatar id={r.authorAvatar} size={7} className="w-4 h-4 shrink-0"/>
                    <span className={cls("text-[11px] font-medium truncate min-w-0 flex-1", dark ? "text-[#d4d4d4]" : "text-[#525252]")}>
                      {r.author || "익명"}
                    </span>
                  </>
                )}
                {r.likes > 0 && (
                  <span className={cls("text-[11px] inline-flex items-center gap-0.5 ml-auto tabular-nums shrink-0", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                    <Heart size={10} strokeWidth={2.2} className="fill-accent-500 text-accent-500"/>
                    {r.likes}
                  </span>
                )}
              </div>
            </button>
          );
        };

        // 최신순일 때 날짜별 섹션, 인기순엔 단일 그리드
        if (groupedByDate) {
          const sections = [
            { key: "today", label: "오늘", items: groupedByDate.today },
            { key: "yesterday", label: "어제", items: groupedByDate.yesterday },
            { key: "week", label: "이번 주", items: groupedByDate.week },
            { key: "older", label: "이전", items: groupedByDate.older },
          ].filter((s) => s.items.length > 0);
          return (
            <div className="px-4 pb-6 space-y-8">
              {sections.map((sec) => (
                <div key={sec.key}>
                  {/* 섹션 헤더 — 좌측 민트 수직 바로 시각 anchor 강화 */}
                  <div className="flex items-baseline justify-between mb-3">
                    <h4 className={cls("text-[15px] font-black inline-flex items-center gap-2", dark ? "text-white" : "text-black")}>
                      <span className={cls("w-[3px] rounded-full h-[14px] self-center",
                        sec.key === "today" ? "bg-brand-500" : dark ? "bg-[#404040]" : "bg-[#d4d4d4]")}/>
                      {sec.label}
                    </h4>
                    <span className={cls("text-[11px] tabular-nums", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{sec.items.length}개</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {sec.items.map(renderCard)}
                  </div>
                </div>
              ))}
            </div>
          );
        }
        return (
          <div className="grid grid-cols-2 gap-4 px-4 pb-6">
            {filtered.map(renderCard)}
          </div>
        );
      })()}
      {!loading && filtered.length === 0 && (
        <div className="px-4 pt-8">
          <EmptyState
            icon={feedMode === "following" ? Users : Inbox}
            dark={dark}
            title={feedMode === "following" ? "팔로우한 사용자의 글이 없어요" : "해당 조건의 포스트가 없어요"}
            desc={feedMode === "following" ? "관심있는 사용자를 팔로우해보세요" : "필터를 바꿔서 다시 시도해보세요"}/>
        </div>
      )}
      {/* 무한 스크롤 sentinel */}
      {hasMore && !loading && filtered.length > 0 && (
        <div ref={loadMoreRef} className="py-6 flex items-center justify-center">
          {loadingMore ? (
            <span className={cls("inline-flex items-center gap-2 text-[13px] font-medium", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              <RefreshCw size={14} className="animate-spin"/> 더 불러오는 중...
            </span>
          ) : (
            <span className={cls("text-[13px]", dark ? "text-[#737373]" : "text-[#c7c7c7]")}>아래로 스크롤해서 더 보기</span>
          )}
        </div>
      )}
    </div>
  );
};

const ProductDetailModal = ({ product, onClose, reviews, dark, onOpenReview, onCompose, onProductClick }) => {
  const [exiting, close] = useExit(onClose);
  const [sortBy, setSortBy] = useState("latest");
  const [aiSummary, setAiSummary] = useState(null);
  const [aiExpanded, setAiExpanded] = useState(false);
  const CATALOG = useCatalog();

  // 아래로 드래그하면 닫기
  const sheetRef = useRef(null);
  const dragStartY = useRef(null);
  const [dragOffset, setDragOffset] = useState(0);
  const onDragStart = (e) => {
    // 스크롤이 맨 위일 때만 드래그 시작
    if (sheetRef.current && sheetRef.current.scrollTop > 0) return;
    dragStartY.current = e.touches?.[0]?.clientY ?? e.clientY;
  };
  const onDragMove = (e) => {
    if (dragStartY.current == null) return;
    const dy = (e.touches?.[0]?.clientY ?? e.clientY) - dragStartY.current;
    if (dy > 0) setDragOffset(dy);
  };
  const onDragEnd = () => {
    if (dragOffset > 120) close();
    else setDragOffset(0);
    dragStartY.current = null;
  };

  const allReviews = useMemo(() => {
    if (!product || !product.name) return [];
    return (reviews || []).filter((r) => {
      if (!r) return false;
      const nameMatch = (r.product || "").includes(product.name);
      const idMatch = (r.products || []).some((p) => p && p.id === product.id);
      return nameMatch || idMatch;
    });
  }, [product, reviews]);

  const sortedReviews = useMemo(() => {
    const list = [...allReviews];
    if (sortBy === "latest") list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    else if (sortBy === "popular") list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    else if (sortBy === "oldest") list.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    return list;
  }, [allReviews, sortBy]);

  const topTags = useMemo(() => {
    const tagMap = {};
    allReviews.forEach((r) => (r.tags || []).forEach((t) => { tagMap[t] = (tagMap[t] || 0) + 1; }));
    return Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
  }, [allReviews]);

  useEffect(() => {
    if (!product || allReviews.length < 5) return;
    const currentMonth = new Date().toISOString().slice(0, 7);
    // 캐시 키에 리뷰 수를 섞어 새 리뷰가 추가되면 자연 무효화
    const reviewBucket = Math.floor(allReviews.length / 5) * 5;
    const cacheKey = `waylog:ai-summary:${product.id}:${reviewBucket}`;
    let cancelled = false;
    (async () => {
      // 1) 캐시 hit → 즉시 사용
      try {
        const cached = await window.storage?.get(cacheKey);
        if (cached?.value) {
          const parsed = JSON.parse(cached.value);
          if (parsed.month === currentMonth && parsed.data) {
            if (!cancelled) setAiSummary(parsed);
            return;
          }
        }
      } catch {}

      // 2) 폴백을 먼저 그려서 빈 화면 방지
      const fallback = {
        month: currentMonth,
        generatedAt: new Date().toISOString().slice(0, 10),
        data: {
          pros: [
            { text: "흡수가 빠르고 효과 체감이 좋다", count: Math.min(allReviews.length, 12) },
            { text: "맛이 부담 없고 먹기 편하다", count: Math.min(allReviews.length, 8) },
            { text: "가격 대비 만족도가 높다", count: Math.min(allReviews.length, 6) },
          ],
          cons: [
            { text: "용량이 빨리 줄어든다", count: Math.max(1, Math.floor(allReviews.length * 0.3)) },
            { text: "호불호가 갈리는 맛", count: Math.max(1, Math.floor(allReviews.length * 0.2)) },
          ],
          summary: `${allReviews.length}개 리뷰를 종합하면, 대부분의 사용자가 ${product.name}의 효과와 편의성에 높은 만족도를 보이고 있어요.`,
        },
        isPlaceholder: true,
      };
      if (!cancelled) setAiSummary(fallback);

      // 3) 실제 AI 호출 → 성공 시 교체 + 캐시 저장
      const data = await summarizeProduct(product, allReviews);
      if (cancelled || !data) return;
      const result = {
        month: currentMonth,
        generatedAt: new Date().toISOString().slice(0, 10),
        data,
        isPlaceholder: false,
      };
      setAiSummary(result);
      try { await window.storage?.set(cacheKey, JSON.stringify(result)); } catch {}
    })();
    return () => { cancelled = true; };
    // product.id / allReviews.length 만 바뀌면 재계산 (객체 참조 바뀐다고 불필요한 재호출 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, allReviews.length]);

  if (!product) return null;

  const cat = CATEGORIES[product.category];
  const priceStr = product.price ? product.price.toLocaleString("ko-KR") + "원" : null;
  const hasReviews = allReviews.length > 0;

  return (
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-end", exiting ? "" : "animate-fade-in")}>
      <div className={cls("absolute inset-0 bg-black/50", exiting ? "animate-fade-out" : "")} onClick={close}/>
      <div ref={sheetRef}
        onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}
        onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
        className={cls("relative w-full rounded-t-2xl pb-safe max-h-[90vh] overflow-y-auto", dark ? "bg-black border-t border-[#262626]" : "bg-white border-t border-[#dbdbdb]", exiting ? "animate-slide-down" : "animate-slide-up")}
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)`, transition: "none", opacity: Math.max(0.5, 1 - dragOffset / 400) } : undefined}>
        <div className={cls("w-10 h-1 rounded-full mx-auto mt-2 mb-1 cursor-grab", dark ? "bg-[#262626]" : "bg-[#dbdbdb]")}/>

        {/* 이미지 */}
        <div className={cls("w-full h-64 flex items-center justify-center p-6 relative", dark ? "bg-[#121212]" : "bg-[#fafafa]")}>
          <ProductImage src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain" iconSize={56}/>
          {product.imageUrl && (
            <span className={cls("absolute bottom-2 right-3 text-[11px] opacity-50", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              이미지: amway.co.kr
            </span>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* 카테고리 + 브랜드 */}
          <div className="flex items-center gap-2">
            {cat && (
              <span className={cls("text-[11px] font-bold uppercase tracking-wider", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                {cat.label}
              </span>
            )}
            {product.brand && (
              <span className={cls("text-[12px] font-semibold", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>· {product.brand}</span>
            )}
          </div>

          {/* 제품명 + 가격 */}
          <div>
            <h3 className={cls("text-[18px] font-bold leading-tight", dark ? "text-white" : "text-black")}>{product.name}</h3>
            {priceStr && (
              <p className={cls("text-[16px] font-bold mt-1 tabular-nums", dark ? "text-white" : "text-black")}>{priceStr}</p>
            )}
          </div>

          {/* 태그 */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((t) => (
                <span key={t} className={cls("text-[12px] px-2.5 py-1 rounded-md font-medium", dark ? "bg-[#262626] text-[#a8a8a8]" : "bg-[#efefef] text-[#737373]")}>
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* 통계 영역 */}
          {hasReviews && (
            <div className={cls("flex items-center gap-3 py-3 border-y", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
              <div className="flex-1 text-center">
                <p className={cls("text-[18px] font-bold tabular-nums", dark ? "text-white" : "text-black")}>{allReviews.length}</p>
                <p className={cls("text-[12px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>리뷰</p>
              </div>
              <div className={cls("w-px h-8", dark ? "bg-[#262626]" : "bg-[#dbdbdb]")}/>
              <div className="flex-1 text-center">
                <p className={cls("text-[18px] font-bold tabular-nums", dark ? "text-white" : "text-black")}>{allReviews.reduce((s, r) => s + (r.likes || 0), 0)}</p>
                <p className={cls("text-[12px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>좋아요</p>
              </div>
              {topTags.length > 0 && (
                <>
                  <div className={cls("w-px h-8", dark ? "bg-[#262626]" : "bg-[#dbdbdb]")}/>
                  <div className="flex-1 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {topTags.map((t) => (
                        <span key={t} className={cls("text-[11px] font-semibold", dark ? "text-brand-300" : "text-brand-700")}>#{t}</span>
                      ))}
                    </div>
                    <p className={cls("text-[12px] mt-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>인기 태그</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI 리뷰 요약 */}
          {allReviews.length >= 5 && aiSummary?.data ? (
            <div className={cls("rounded-xl overflow-hidden border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
              <button onClick={() => setAiExpanded(!aiExpanded)}
                className="w-full p-3 flex items-center gap-3 text-left active:opacity-80 transition">
                <div className={cls("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", dark ? "bg-[#262626]" : "bg-white")}>
                  <Sparkles size={16} className={dark ? "text-white" : "text-black"}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cls("text-[14px] font-semibold", dark ? "text-white" : "text-black")}>AI 분석 요약</p>
                    {aiSummary.isPlaceholder && (
                      <span className={cls("text-[11px] font-bold px-1.5 py-0.5 rounded", dark ? "bg-[#262626] text-[#a8a8a8]" : "bg-[#efefef] text-[#737373]")}>DEMO</span>
                    )}
                  </div>
                  <p className={cls("text-[12px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                    리뷰 {allReviews.length}개 기반
                  </p>
                </div>
                <ChevronRight size={14} className={cls("transition-transform", aiExpanded ? "rotate-90" : "", dark ? "text-[#a8a8a8]" : "text-[#737373]")}/>
              </button>
              {aiExpanded && (
                <div className={cls("px-3 pb-3 space-y-3 animate-fade-in border-t", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
                  {/* 장점 */}
                  <div className="pt-3">
                    <p className={cls("text-[12px] font-bold uppercase tracking-wider mb-2", dark ? "text-brand-300" : "text-brand-600")}>장점</p>
                    <div className="space-y-1.5">
                      {aiSummary.data.pros.map((p, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className={cls("text-[13px] leading-relaxed flex-1", dark ? "text-white" : "text-black")}>· {p.text}</span>
                          <span className={cls("text-[11px] font-semibold shrink-0", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{p.count}명</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 단점 */}
                  <div>
                    <p className={cls("text-[12px] font-bold uppercase tracking-wider mb-2 text-red-500")}>단점</p>
                    <div className="space-y-1.5">
                      {aiSummary.data.cons.map((c, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className={cls("text-[13px] leading-relaxed flex-1", dark ? "text-white" : "text-black")}>· {c.text}</span>
                          <span className={cls("text-[11px] font-semibold shrink-0", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{c.count}명</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 총평 */}
                  <div className={cls("p-3 rounded-lg", dark ? "bg-[#262626]" : "bg-white")}>
                    <p className={cls("text-[12px] font-semibold mb-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>요약</p>
                    <p className={cls("text-[13px] leading-relaxed", dark ? "text-white" : "text-black")}>{aiSummary.data.summary}</p>
                  </div>
                  {aiSummary.isPlaceholder && (
                    <p className={cls("text-[11px] text-center pt-1", dark ? "text-[#737373]" : "text-[#a8a8a8]")}>
                      이 요약은 데모 데이터예요 · 곧 AI 자동 생성으로 전환됩니다
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : allReviews.length > 0 && allReviews.length < 5 ? (
            <div className={cls("p-3 rounded-xl flex items-center gap-3 border", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
              <Sparkles size={16} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>
              <div className="flex-1">
                <p className={cls("text-[13px] font-semibold", dark ? "text-white" : "text-black")}>AI 리뷰 요약</p>
                <p className={cls("text-[12px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>리뷰 {allReviews.length}/5개 · 5개 모이면 분석 시작</p>
              </div>
            </div>
          ) : null}

          {/* 버튼들 */}
          <div className="flex gap-2">
            {product.officialUrl && (
              <button onClick={() => window.open(product.officialUrl, "_blank")}
                className={cls("flex-1 py-2 rounded-lg text-[14px] font-semibold flex items-center justify-center gap-2 transition active:opacity-70",
                  dark ? "bg-[#262626] text-white" : "bg-[#efefef] text-black")}>
                <ExternalLink size={14}/> 공식 페이지
              </button>
            )}
            {!hasReviews && (
              <button onClick={() => onCompose && onCompose(product)}
                className="flex-1 py-2 rounded-lg text-[14px] font-bold bg-brand-500 text-white flex items-center justify-center gap-2 active:opacity-80 transition">
                <PenLine size={14}/> 리뷰 작성
              </button>
            )}
          </div>

          {/* 리뷰 섹션 */}
          {hasReviews ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className={cls("text-[15px] font-black", dark ? "text-white" : "text-black")}>리뷰 {allReviews.length}</p>
                <div className="flex gap-1">
                  {[{ key: "latest", label: "최신" }, { key: "popular", label: "인기" }, { key: "oldest", label: "오래된" }].map((s) => (
                    <button key={s.key} onClick={() => setSortBy(s.key)}
                      className={cls("text-[12px] px-3 py-1 rounded-full font-bold transition",
                        sortBy === s.key
                          ? "bg-brand-500 text-white"
                          : dark ? "bg-[#1a1a1a] text-[#a8a8a8]" : "bg-[#f2f2f2] text-[#737373]")}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {sortedReviews.map((rv) => (
                  <button key={rv.id} onClick={() => onOpenReview && onOpenReview(rv)}
                    className="text-left active:scale-[0.98] transition">
                    <div className={cls("relative w-full aspect-[4/5] rounded-xl overflow-hidden", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
                      {rv.img
                        ? <SmartImg r={rv} className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center"><Camera size={24} strokeWidth={1.5} className={dark ? "text-[#404040]" : "text-[#c7c7c7]"}/></div>}
                    </div>
                    <p className={cls("text-[12px] font-bold mt-1.5 line-clamp-2 leading-[1.35]", dark ? "text-white" : "text-black")}>
                      {rv.title || "제목 없음"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={cls("text-[11px] truncate", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{rv.author || "익명"}</p>
                      {rv.likes > 0 && (
                        <span className={cls("text-[11px] inline-flex items-center gap-0.5 ml-auto tabular-nums", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                          <Heart size={10} strokeWidth={2.2} className="fill-accent-500 text-accent-500"/>
                          {rv.likes}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className={cls("w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
                <PenLine size={22} strokeWidth={1.8} className="text-brand-500"/>
              </div>
              <p className={cls("text-[15px] font-bold", dark ? "text-white" : "text-black")}>아직 리뷰가 없어요</p>
              <p className={cls("text-[13px] mt-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>첫 번째 리뷰를 작성해보세요</p>
            </div>
          )}
        </div>

        {/* 같은 브랜드 제품 */}
        {(() => {
          const sameBrand = product.brand && (CATALOG || []).filter((p) => p.brand === product.brand && p.id !== product.id).slice(0, 8);
          if (!sameBrand || sameBrand.length === 0) return null;
          return (
            <div className={cls("px-4 py-4 border-t", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
              <p className={cls("text-[12px] font-semibold uppercase tracking-wider mb-3", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{product.brand}의 다른 제품</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                {sameBrand.map((p) => (
                  <button key={p.id} onClick={() => { if (onProductClick) { close(); setTimeout(() => onProductClick(p), 280); } }}
                    className={cls("shrink-0 w-24 rounded-lg overflow-hidden text-left active:opacity-80 transition", dark ? "bg-[#121212]" : "bg-[#fafafa]")}>
                    <div className="aspect-square flex items-center justify-center p-2">
                      <ProductImage src={p.imageUrl} alt={p.name} className="max-w-full max-h-full object-contain" iconSize={16}/>
                    </div>
                    <p className={cls("text-[11px] font-semibold px-2 pb-2 line-clamp-2 leading-tight", dark ? "text-white" : "text-black")}>{p.name}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 플로팅 리뷰 작성 버튼 (리뷰가 있을 때) */}
        {hasReviews && (
          <button onClick={() => onCompose && onCompose(product)}
            className="sticky bottom-4 ml-auto mr-4 mb-4 w-12 h-12 rounded-full bg-brand-500 text-white flex items-center justify-center active:opacity-80 transition shadow-lg">
            <PenLine size={18}/>
          </button>
        )}
      </div>
    </div>
  );
};

const FavScreen = ({ reviews, onOpen, favs, toggleFav, dark, moods, setMoods, onBrowse, onProductClick, loading = false }) => {
  const CATALOG = useCatalog();
  const catalogLoading = useCatalogLoading();
  // 기본 탭은 "제품 카탈로그" — 암웨이 전 제품 브라우징이 핵심. 즐겨찾기는 두 번째 탭.
  const [mainTab, setMainTab] = useState("catalog"); // "catalog" | "favs"
  const [view, setView] = useState("grid");
  const [moodPickerFor, setMoodPickerFor] = useState(null);
  const [catalogQ, setCatalogQ] = useState("");
  const [catalogCat, setCatalogCat] = useState("all");
  // 무드 배너 1회성 — localStorage 에 닫힘 기록. 재방문 시 표시 안 함.
  const [moodTipDismissed, setMoodTipDismissed] = useStoredState("waylog:fav:moodTipDismissed", false);
  // 페이지네이션: 30개씩 표시, 무한스크롤 sentinel 로 자동 증가.
  const CATALOG_PAGE_SIZE = 30;
  const [catalogVisible, setCatalogVisible] = useState(CATALOG_PAGE_SIZE);
  const catalogLoadMoreRef = useRef(null);
  useEffect(() => { setCatalogVisible(CATALOG_PAGE_SIZE); }, [catalogCat, catalogQ]);

  // 카탈로그 무한스크롤 — sentinel 관찰
  useEffect(() => {
    if (mainTab !== "catalog") return;
    const el = catalogLoadMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setCatalogVisible((v) => v + CATALOG_PAGE_SIZE);
      }
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [mainTab, catalogCat, catalogQ]);
  // reviews/favs가 변경될 때만 재필터 (상위 리렌더마다 반복 X)
  const list = useMemo(() => reviews.filter((r) => favs.has(r.id)), [reviews, favs]);
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
  }, [catalogCat, catalogQ, CATALOG]);

  const setMood = (rid, key) => {
    setMoods((prev) => ({ ...prev, [rid]: prev[rid] === key ? null : key }));
    setMoodPickerFor(null);
  };

  return (
    <div className={cls("min-h-screen", dark ? "bg-[#0a0a0a]" : "bg-white")}>
      <div className="px-4 pt-6">
        <h2 className={cls("text-[22px] font-black tracking-tight", dark ? "text-white" : "text-black")}>마이 웨이템</h2>
        <p className={cls("text-[13px] mt-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
          {mainTab === "favs" ? "저장한 리뷰를 다시 볼 수 있어요" : "관심 있는 제품을 찾아보세요"}
        </p>

        {/* 메인 탭 — 민트 액센트 언더라인 */}
        <div className={cls("flex mt-5 border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
          <button onClick={() => setMainTab("catalog")}
            className="flex-1 py-3 text-[14px] font-bold transition relative inline-flex items-center justify-center gap-1.5">
            <Package size={14} className={mainTab === "catalog" ? "text-brand-500" : dark ? "text-[#737373]" : "text-[#a8a8a8]"}/>
            <span className={mainTab === "catalog" ? "text-brand-500" : dark ? "text-[#737373]" : "text-[#a8a8a8]"}>제품 카탈로그</span>
            <span className={cls("tabular-nums text-[12px]", mainTab === "catalog" ? "text-brand-500" : dark ? "text-[#737373]" : "text-[#a8a8a8]")}>
              {catalogLoading ? "…" : CATALOG.length}
            </span>
            {mainTab === "catalog" && <div className="absolute bottom-0 inset-x-4 h-[2px] bg-brand-500 rounded-full"/>}
          </button>
          <button onClick={() => setMainTab("favs")}
            className="flex-1 py-3 text-[14px] font-bold transition relative inline-flex items-center justify-center gap-1.5">
            <Heart size={14} className={cls(mainTab === "favs" ? "fill-accent-500 text-accent-500" : dark ? "text-[#737373]" : "text-[#a8a8a8]")}/>
            <span className={mainTab === "favs" ? "text-brand-500" : dark ? "text-[#737373]" : "text-[#a8a8a8]"}>저장됨</span>
            <span className={cls("tabular-nums text-[12px]", mainTab === "favs" ? "text-brand-500" : dark ? "text-[#737373]" : "text-[#a8a8a8]")}>
              {list.length}
            </span>
            {mainTab === "favs" && <div className="absolute bottom-0 inset-x-4 h-[2px] bg-brand-500 rounded-full"/>}
          </button>
        </div>
      </div>
      <div className="px-4 pt-4 pb-24">

      {mainTab === "catalog" ? (
        <div>
          {/* 검색 */}
          <div className={cls("flex items-center gap-2 px-3.5 py-2.5 rounded-full mb-3", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
            <Search size={16} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>
            <input value={catalogQ} onChange={(e) => setCatalogQ(e.target.value)}
              placeholder="제품명 · 브랜드 · 태그로 찾기"
              className={cls("flex-1 bg-transparent outline-none text-[14px]", dark ? "text-white placeholder-[#737373]" : "text-black placeholder-[#8e8e8e]")}/>
            {catalogQ && <button onClick={() => setCatalogQ("")}><X size={14} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/></button>}
          </div>

          {/* 카테고리 칩 — 민트 액센트 */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {[
              { key: "all", label: "전체" },
              ...Object.entries(CATEGORIES).map(([k, c]) => ({ key: k, label: c.label })),
            ].map((c) => (
              <button key={c.key} onClick={() => setCatalogCat(c.key)}
                className={cls(
                  "px-3.5 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap shrink-0 transition",
                  catalogCat === c.key
                    ? "bg-brand-500 text-white"
                    : dark ? "bg-[#1a1a1a] text-white border border-[#262626]" : "bg-white text-black border border-[#dbdbdb]"
                )}>
                {c.label}
              </button>
            ))}
          </div>

          <p className={cls("text-[12px] font-bold mb-3 uppercase tracking-wider", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
            {catalogCat === "all" ? `${filteredCatalog.length}개 제품` : `${CATEGORIES[catalogCat]?.label || ""} ${filteredCatalog.length}개`}
            {catalogQ && <span className="normal-case ml-1">· "{catalogQ}" 검색</span>}
          </p>

          {filteredCatalog.length === 0 ? (
            <EmptyState icon={Search} dark={dark}
              title="검색 결과가 없어요"
              desc="다른 키워드로 검색해보세요"/>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {filteredCatalog.slice(0, catalogVisible).map((p, i) => {
                return (
                  <button key={p.id} onClick={() => onProductClick && onProductClick(p)}
                    className="text-left active:scale-[0.98] transition animate-card-enter flex flex-col"
                    style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                    <div className={cls("relative aspect-square rounded-lg overflow-hidden flex items-center justify-center p-2", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
                      <ProductImage src={p.imageUrl} alt={p.name} className="max-w-full max-h-full object-contain" iconSize={18}/>
                    </div>
                    {/* brand 슬롯 — 없어도 공간 예약 (타일 높이 통일) */}
                    <p className={cls("text-[11px] font-bold mt-1 truncate h-[15px] leading-[15px]", dark ? "text-brand-300" : "text-brand-700")}>
                      {p.brand || "\u00A0"}
                    </p>
                    {/* 제품명 — 2줄 고정 (1줄이어도 2줄 공간 확보) */}
                    <p className={cls("text-[11px] font-semibold line-clamp-2 leading-[1.3] min-h-[29px]", dark ? "text-white" : "text-black")}>
                      {p.name}
                    </p>
                    {/* 가격 슬롯 — 없어도 공간 예약 */}
                    <p className={cls("text-[11px] font-black tabular-nums mt-0.5 h-[15px] leading-[15px]", dark ? "text-white" : "text-black")}>
                      {p.price > 0 ? `${p.price.toLocaleString()}원` : "\u00A0"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* 무한스크롤 sentinel — IntersectionObserver 트리거 */}
          {filteredCatalog.length > catalogVisible && (
            <div ref={catalogLoadMoreRef} className="py-6 flex items-center justify-center">
              <span className={cls("inline-flex items-center gap-2 text-[12px] font-medium", dark ? "text-[#737373]" : "text-[#a8a8a8]")}>
                <RefreshCw size={12} className="animate-spin"/> 더 불러오는 중...
              </span>
            </div>
          )}
          {filteredCatalog.length > 0 && filteredCatalog.length <= catalogVisible && filteredCatalog.length > CATALOG_PAGE_SIZE && (
            <p className={cls("text-center text-[12px] mt-4 py-2", dark ? "text-[#737373]" : "text-[#a8a8a8]")}>
              전체 {filteredCatalog.length}개 모두 표시됐어요
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className={cls("text-[13px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>저장한 게시물 {list.length}개</p>
            <div className="flex gap-1">
              <button onClick={() => setView("grid")}
                aria-label="그리드 보기"
                className={cls("p-1.5 rounded transition", view === "grid" ? (dark ? "text-white" : "text-black") : (dark ? "text-[#737373]" : "text-[#a8a8a8]"))}>
                <Grid3x3 size={20} strokeWidth={1.8}/>
              </button>
              <button onClick={() => setView("timeline")}
                aria-label="월별 보기"
                className={cls("p-1.5 rounded transition", view === "timeline" ? (dark ? "text-white" : "text-black") : (dark ? "text-[#737373]" : "text-[#a8a8a8]"))}>
                <Calendar size={20} strokeWidth={1.8}/>
              </button>
            </div>
          </div>

      {loading && list.length === 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`fav-sk-${i}`} className="animate-pulse">
              <div className={cls("w-full aspect-square rounded-xl", dark ? "bg-[#1a1a1a]" : "bg-[#efefef]")}/>
              <div className={cls("h-3 rounded mt-2 w-3/4", dark ? "bg-[#1a1a1a]" : "bg-[#efefef]")}/>
              <div className={cls("h-3 rounded mt-1 w-1/2", dark ? "bg-[#1a1a1a]" : "bg-[#efefef]")}/>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div className={cls("w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ring-1", dark ? "ring-[#262626]" : "ring-[#dbdbdb]")}>
            <Heart size={28} strokeWidth={1.8} className="text-brand-500"/>
          </div>
          <p className={cls("text-[16px] font-bold", dark ? "text-white" : "text-black")}>저장한 항목이 없어요</p>
          <p className={cls("text-[14px] mt-1 max-w-xs mx-auto inline-flex items-center justify-center gap-1 flex-wrap", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
            피드 카드의 <Heart size={13} className="fill-accent-500 text-accent-500 inline-block"/> 하트를 누르면 여기에 저장돼요
          </p>
          <div>
            <button onClick={onBrowse}
              className="mt-5 px-6 py-2 bg-brand-500 text-white text-[14px] font-bold rounded-lg active:opacity-80 transition">
              게시물 둘러보기
            </button>
          </div>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-4">
          {list.map((r) => {
            const rCat = CATEGORIES[r.category];
            const mood = MOODS.find((m) => m.key === moods[r.id]);
            return (
              <button key={r.id} onClick={() => onOpen(r)}
                className="text-left active:scale-[0.98] transition">
                {/* FeedScreen 과 동일한 카드 스타일 — aspect-square, 무게 줄인 카테고리 칩, quote fallback */}
                <div className={cls("relative w-full aspect-square rounded-xl overflow-hidden", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
                  {r.img
                    ? <SmartImg r={r} className="w-full h-full object-cover"/>
                    : (
                      <div className={cls("w-full h-full p-3 flex flex-col justify-center relative ring-1",
                        dark ? "bg-[#0f0f0f] ring-white/5" : "bg-[#fafafa] ring-black/5")}>
                        <div className="absolute left-0 top-5 bottom-5 w-[3px] rounded-r bg-brand-500/70"/>
                        <p className={cls("text-[12.5px] font-medium line-clamp-4 leading-[1.5] pl-2", dark ? "text-white/85" : "text-[#333]")}>
                          {r.body || r.title || "웨이로그"}
                        </p>
                      </div>
                    )}
                  {rCat && (
                    <span className={cls("absolute top-2 left-2 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
                      dark ? "bg-black/55 text-white/90" : "bg-white/90 text-black/75")}>
                      {rCat.label}
                    </span>
                  )}
                  {/* 무드 오버레이 — 설정된 무드가 그리드 뷰에도 보이도록 */}
                  {mood && mood.Icon && (
                    <span className={cls("absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 rounded-full",
                      dark ? "bg-black/65" : "bg-white/90")}>
                      <mood.Icon size={12} strokeWidth={2} className={mood.color}/>
                    </span>
                  )}
                </div>

                <p className={cls("text-[14px] font-bold mt-2.5 line-clamp-2 leading-[1.35] min-h-[2.7em]", dark ? "text-white" : "text-black")}>
                  {r.title || "제목 없음"}
                </p>

                {/* 메타 한 줄 통합 — FeedScreen 과 동일 패턴, min-h 로 행 높이 고정 */}
                <div className="flex items-start gap-1.5 mt-1.5 min-w-0 min-h-[2.5em]">
                  {r.product ? (
                    <>
                      <ShoppingBag size={10} strokeWidth={2.2} className={cls("shrink-0 mt-[3px]", dark ? "text-brand-300" : "text-brand-600")}/>
                      <span className={cls("text-[11px] font-semibold line-clamp-2 min-w-0 flex-1", dark ? "text-brand-200" : "text-brand-700")}>
                        {getReviewProductNames(r, CATALOG).join(" · ")}
                      </span>
                    </>
                  ) : (
                    <>
                      <Avatar id={r.authorAvatar} size={7} className="w-4 h-4 shrink-0"/>
                      <span className={cls("text-[11px] font-medium truncate min-w-0 flex-1", dark ? "text-[#d4d4d4]" : "text-[#525252]")}>
                        {r.author || "익명"}
                      </span>
                    </>
                  )}
                  {r.likes > 0 && (
                    <span className={cls("text-[11px] inline-flex items-center gap-0.5 ml-auto tabular-nums shrink-0", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                      <Heart size={10} strokeWidth={2.2} className="fill-accent-500 text-accent-500"/>
                      {r.likes}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {!moodTipDismissed && (
            <div className={cls("px-3 py-2 rounded-xl text-xs flex items-center gap-1.5", dark ? "bg-[#121212] text-[#a8a8a8]" : "bg-[#f5f5f5] text-[#525252]")}>
              <span className="text-amber-500">⭐</span>
              <span className="flex-1">표시된 무드는 추천에 더 강하게 반영돼요</span>
              <button onClick={() => setMoodTipDismissed(true)} aria-label="닫기" className="active:opacity-60 shrink-0">
                <X size={14}/>
              </button>
            </div>
          )}
          {byMonth.map(([month, items]) => (
            <div key={month}>
              <div className="flex items-center gap-2 mb-3">
                <div className={cls("w-1.5 h-1.5 rounded-full", dark ? "bg-white" : "bg-black")}/>
                <h3 className={cls("text-[14px] font-semibold", dark ? "text-white" : "text-black")}>{month.split("-")[0]}년 {parseInt(month.split("-")[1])}월</h3>
                <div className={cls("flex-1 h-px", dark ? "bg-[#262626]" : "bg-[#dbdbdb]")}/>
              </div>
              <div className={cls("space-y-3 pl-4 border-l ml-1", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
                {items.map((r) => {
                  const mood = MOODS.find((m) => m.key === moods[r.id]);
                  return (
                  <div key={r.id} className={cls("rounded-2xl overflow-hidden -ml-1 ring-1", dark ? "bg-[#121212] ring-[#262626]" : "bg-white ring-[#efefef]")}>
                    <button onClick={() => onOpen(r)} className="flex gap-3 w-full text-left">
                      <SmartImg r={r} className="w-16 h-16 object-cover shrink-0"/>
                      <div className="flex-1 py-2 pr-2 min-w-0">
                        <p className={cls("text-xs font-normal opacity-70", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{formatRelativeTime(r.createdAt || r.date)}</p>
                        <p className={cls("text-sm font-bold line-clamp-1", dark ? "text-white" : "text-black")}>{r.title}</p>
                        <p className={cls("text-xs line-clamp-2", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                          {getReviewProductNames(r, CATALOG).join(" · ")}
                        </p>
                      </div>
                    </button>
                    <div className={cls("flex items-center gap-1.5 px-3 pb-2.5 pt-1 border-t flex-wrap", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
                      {moodPickerFor === r.id ? (
                        <>
                          {MOODS.map((m) => (
                            <button key={m.key} onClick={() => setMood(r.id, m.key)}
                              className={cls("text-[12px] px-2 py-1 rounded-lg flex items-center gap-1 transition", dark ? "bg-[#262626] text-white" : "bg-[#efefef] text-black")}>
                              <m.Icon size={11} className={m.color}/>
                              <span className="text-[11px] font-semibold">{m.label}</span>
                              {m.strong && <Star size={8} className="text-amber-400 fill-amber-400"/>}
                            </button>
                          ))}
                          <button onClick={() => setMoodPickerFor(null)}
                            className={cls("ml-auto w-6 h-6 rounded-full flex items-center justify-center", dark ? "bg-[#262626] text-white" : "bg-[#efefef] text-black")}>
                            <X size={12}/>
                          </button>
                        </>
                      ) : mood ? (
                        <button onClick={() => setMoodPickerFor(r.id)}
                          className={cls("text-[12px] px-2 py-1 rounded-lg flex items-center gap-1", dark ? "bg-[#262626] text-white" : "bg-[#efefef] text-black")}>
                          <mood.Icon size={11}/>
                          <span className="text-[11px] font-semibold">{mood.label}</span>
                          {mood.strong && <Star size={8} className="text-amber-400 fill-amber-400"/>}
                        </button>
                      ) : (
                        <button onClick={() => setMoodPickerFor(r.id)}
                          className={cls("text-[12px] px-2 py-1 rounded-lg font-semibold", dark ? "bg-[#262626] text-[#a8a8a8]" : "bg-[#efefef] text-[#737373]")}>
                          + 무드
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
    </div>
  );
};

const CommunityComposeModal = ({ onClose, onPost, dark, user, challenge, editing }) => {
  const [exiting, close] = useExit(onClose);
  const CATALOG = useCatalog();
  const isEdit = !!editing;
  const [content, setContent] = useState(editing?.content || "");
  const [image, setImage] = useState(editing?.image || null);
  const [product, setProduct] = useState(editing?.product || null);
  const [productQuery, setProductQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(!!editing?.isAnonymous);
  const dq = useDebouncedValue(productQuery, 200);
  const hasActiveChallenge = !!(challenge?.startDate && challenge?.status !== "completed");
  const dayNum = hasActiveChallenge ? getChallengeDay(challenge.startDate) : 0;

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        const max = 600;
        if (w > max || h > max) { if (w > h) { h = Math.round((h * max) / w); w = max; } else { w = Math.round((w * max) / h); h = max; } }
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        setImage(c.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const filtered = useMemo(() => {
    if (!dq.trim()) return (CATALOG || []).slice(0, 12);
    const q = dq.toLowerCase();
    return (CATALOG || []).filter((p) => (p.name + p.brand + (p.tags || []).join("")).toLowerCase().includes(q)).slice(0, 20);
  }, [CATALOG, dq]);

  const submit = useCallback(() => {
    const trimmed = (content || "").trim();
    if (!trimmed) return;
    const meta = {
      isAnonymous,
      challengeId: isAnonymous && hasActiveChallenge ? challenge.id || null : null,
      dayNum: isAnonymous && hasActiveChallenge ? dayNum : null,
    };
    try {
      onPost(trimmed, product, image, meta);
    } catch (err) {
      console.error("[community-compose] onPost ERROR:", err);
    }
    close();
  }, [content, isAnonymous, hasActiveChallenge, challenge, dayNum, product, image, onPost, close]);

  // Android WebView ghost-tap 방어.
  // autoFocus 된 textarea 상태에서 게시 버튼을 탭하면 click 합성 전에 blur →
  // 키보드 닫힘 애니메이션 → 컨텐츠 영역 리사이즈 → 버튼 좌표 이동으로
  // 합성 click 이 원래 touchstart 좌표의 (이동된) 다른 요소에 도달해 실종될 수 있음.
  // 해결: pointerup 을 1차 트리거로 네이티브 등록 (키보드 dismiss 이전에 발동),
  // click 을 2차 백업으로 등록. submittingRef 로 중복 실행 차단.
  // React 이벤트 위임을 거치지 않고 addEventListener 로 직접 바인딩 — WebView 에서
  // 합성 click 이 지연·유실되는 경우에도 최소 pointerup 은 확보.
  const publishButtonRef = useRef(null);
  const submittingRef = useRef(false);
  const safeSubmitRef = useRef(null);
  safeSubmitRef.current = () => {
    if (submittingRef.current) return;
    const trimmed = (content || "").trim();
    if (!trimmed) return;
    submittingRef.current = true;
    // close() 애니메이션(~260ms) + Supabase 응답까지 덮는 여유값. 재시도가 필요하면
    // 모달이 닫혔으므로 재오픈 시 새 인스턴스가 만들어져 플래그는 자동 초기화.
    setTimeout(() => { submittingRef.current = false; }, 500);
    submit();
  };
  useEffect(() => {
    const btn = publishButtonRef.current;
    if (!btn) return;
    const onPointerUp = () => safeSubmitRef.current?.();
    const onClick = () => safeSubmitRef.current?.();
    btn.addEventListener("pointerup", onPointerUp);
    btn.addEventListener("click", onClick);
    return () => {
      btn.removeEventListener("pointerup", onPointerUp);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    // z-[100] 로 상승 + pt-safe 를 inline paddingTop 으로 대체 (제조사별 safe-area 값
    // 0 또는 비정상이어도 최소 20px 보장). touchAction: manipulation 으로 탭 지연 제거.
    <div role="dialog" aria-modal="true"
      className={cls("fixed inset-0 z-[100] max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}
      style={{ paddingTop: "max(env(safe-area-inset-top), 20px)", touchAction: "manipulation" }}>
      <header
        className={cls("relative z-10 flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}
        style={{ pointerEvents: "auto" }}>
        <button onClick={close}
          className={cls("text-sm font-bold min-w-[44px] min-h-[44px] -m-2 px-2 py-2 touch-manipulation", dark ? "text-gray-400" : "text-gray-500")}>취소</button>
        <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>{isEdit ? "커뮤니티 수정" : "커뮤니티 글쓰기"}</p>
        <button
          ref={publishButtonRef}
          type="button"
          disabled={!content.trim()}
          className={cls("relative z-20 min-w-[60px] min-h-[44px] px-4 rounded-lg text-sm font-semibold touch-manipulation active:scale-95 transition",
            content.trim()
              ? "bg-brand-500 text-white active:bg-brand-600"
              : dark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-400")}
          style={{
            WebkitTapHighlightColor: "rgba(0,113,206,0.3)",
            userSelect: "none",
            pointerEvents: "auto",
            touchAction: "manipulation",
          }}>{isEdit ? "수정" : "게시"}</button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 작성자 */}
        <div className="flex items-center gap-2.5">
          <Avatar id={user?.avatar || ""} size={16} className="w-10 h-10" rounded="rounded-full"/>
          <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>{user?.nickname || "사용자"}</p>
        </div>
        {/* 본문 */}
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="무슨 이야기를 나눠볼까요?"
          rows={6} autoFocus
          className={cls("w-full text-sm bg-transparent outline-none resize-none leading-relaxed", dark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400")}/>
        <div className="flex items-center justify-between">
          <label className={cls("flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 transition", dark ? "text-gray-400" : "text-gray-500")}>
            <Camera size={16}/> 사진
            <input type="file" accept="image/*" className="hidden" onChange={handleImage}/>
          </label>
          <p className={cls("text-xs", content.length > 300 ? "text-rose-500 font-bold" : dark ? "text-gray-500" : "text-gray-400")}>{content.length}/300</p>
        </div>
        {image && (
          <div className="relative inline-block">
            <img src={image} alt="" loading="lazy" decoding="async" className="w-full max-h-48 object-cover rounded-xl"/>
            <button onClick={() => setImage(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"><X size={14} className="text-white"/></button>
          </div>
        )}

        {/* 제품 태그 */}
        {product ? (
          <div className={cls("flex items-center gap-3 p-3 rounded-2xl", dark ? "bg-gray-800" : "bg-gray-100")}>
            <ProductImage src={product.imageUrl} alt={product.name} className="w-10 h-10 object-contain shrink-0" iconSize={16}/>
            <div className="flex-1 min-w-0">
              <p className={cls("text-xs font-bold truncate", dark ? "text-white" : "text-gray-900")}>{product.name}</p>
              <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>{product.brand}</p>
            </div>
            <button onClick={() => setProduct(null)} aria-label="선택한 제품 제거" className={cls("min-w-tap min-h-tap flex items-center justify-center rounded-full -m-2", dark ? "text-gray-400" : "text-gray-500")}><X size={14}/></button>
          </div>
        ) : (
          <button onClick={() => setPickerOpen(!pickerOpen)}
            className={cls("flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition active:scale-[0.98] w-full",
              dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600")}>
            <ShoppingBag size={16}/> 제품 태그 추가 <span className={cls("text-xs font-normal ml-auto", dark ? "text-gray-500" : "text-gray-400")}>선택사항</span>
          </button>
        )}

        {/* 제품 검색 피커 */}
        {pickerOpen && !product && (
          <div className={cls("rounded-2xl overflow-hidden border", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}>
            <div className="p-3">
              <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)}
                placeholder="제품명 또는 브랜드 검색"
                className={cls("w-full px-3 py-2 rounded-xl text-sm", dark ? "bg-gray-700 text-white placeholder-gray-500" : "bg-gray-100 text-gray-900 placeholder-gray-400")}/>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => { setProduct(p); setPickerOpen(false); setProductQuery(""); }}
                  className={cls("w-full flex items-center gap-3 px-3 py-2 text-left transition", dark ? "hover:bg-gray-700" : "hover:bg-gray-50")}>
                  <ProductImage src={p.imageUrl} alt={p.name} className="w-8 h-8 object-contain shrink-0" iconSize={14}/>
                  <div className="flex-1 min-w-0">
                    <p className={cls("text-xs font-bold truncate", dark ? "text-white" : "text-gray-900")}>{p.name}</p>
                    <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>{p.brand}</p>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && <p className={cls("text-xs text-center py-4", dark ? "text-gray-500" : "text-gray-400")}>검색 결과가 없어요</p>}
            </div>
          </div>
        )}

        {/* 익명 옵션 */}
        <label className={cls("flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer active:scale-[0.99] transition",
          isAnonymous
            ? dark ? "bg-brand-900/30 ring-1 ring-brand-500/40" : "bg-brand-50 ring-1 ring-brand-200"
            : dark ? "bg-gray-800" : "bg-gray-100")}>
          <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 accent-brand-500 shrink-0"/>
          <div className="flex-1 min-w-0">
            <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>익명으로 게시</p>
            <p className={cls("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>
              {hasActiveChallenge
                ? `작성자 이름·아바타가 숨겨져요${isAnonymous ? ` · 바디키 Day ${dayNum} 배지 표시` : ""}`
                : "작성자 이름·아바타가 숨겨져요"}
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

const CommunityScreen = ({ dark, posts, onLike, onShare, onUserClick, user, onRequireAuth, comments, onAddComment, onDeleteComment, onToggleCommentLike, onCompose, onEditPost, onDeletePost }) => {
  const [expanded, setExpanded] = useState({});
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  return (
  <div className={dark ? "bg-[#0a0a0a]" : "bg-white"}>
    {/* 글쓰기 진입 */}
    <button onClick={() => user ? onCompose() : onRequireAuth()}
      className={cls("w-full px-4 py-3 flex items-center gap-3 text-left active:opacity-80 border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
      <Avatar id={user?.avatar || ""} size={14} className="w-10 h-10 shrink-0"/>
      <span className={cls("text-[14px] flex-1", dark ? "text-[#737373]" : "text-[#737373]")}>
        {user ? "지금 어떤 생각이 드세요?" : "로그인 후 참여하기"}
      </span>
      <PenLine size={16} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>
    </button>

    {posts.length === 0 && (
      <div className="px-6 py-16 text-center">
        <div className={cls("w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center", dark ? "bg-[#121212]" : "bg-[#f2f2f2]")}>
          <Users size={28} strokeWidth={1.5} className="text-brand-500"/>
        </div>
        <p className={cls("text-[16px] font-bold", dark ? "text-white" : "text-black")}>첫 이야기를 남겨보세요</p>
        <p className={cls("text-[14px] mt-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>웨이로그 커뮤니티에 가벼운 일상을 공유해보세요</p>
        <button onClick={() => user ? onCompose() : onRequireAuth()}
          className="mt-5 px-6 py-2.5 rounded-full bg-brand-500 text-white text-[14px] font-bold active:scale-95 transition">
          {user ? "글쓰기" : "로그인하기"}
        </button>
      </div>
    )}
    {posts.map((p) => {
      const isOpen = !!expanded[p.id];
      const isAnon = !!p.isAnonymous;
      const HeaderTag = isAnon ? "div" : "button";
      // 본인 글 판별 — 익명 여부 무관하게 user_id 로 판단. 서버 pending(temp-*) 은 메뉴 숨김.
      const isMine = !!(user && p.user_id && p.user_id === user.id && typeof p.id === "string" && !p.id.startsWith("temp-"));
      return (
      <article key={p.id} className={cls("px-4 py-3 border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
        <div className="flex items-start gap-3 mb-2">
          <HeaderTag
            {...(isAnon ? {} : { onClick: () => onUserClick({ author: p.author, avatar: p.avatar, userId: p.userId || p.user_id }) })}
            className={cls("flex items-center gap-3 flex-1 min-w-0", isAnon ? "" : "active:opacity-80")}>
            {isAnon ? (
              <div className={cls("w-9 h-9 rounded-full flex items-center justify-center shrink-0", dark ? "bg-[#262626]" : "bg-[#efefef]")}>
                <CircleUser size={20} className={dark ? "text-[#737373]" : "text-[#a8a8a8]"}/>
              </div>
            ) : (
              <Avatar id={p.avatar} size={12} className="w-9 h-9"/>
            )}
            <div className="text-left flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className={cls("text-[14px] font-bold", dark ? "text-white" : "text-black")}>{p.author}</p>
                {isAnon && (
                  <span className={cls("text-[11px] px-1.5 py-0.5 rounded-full font-bold", dark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600")}>익명</span>
                )}
                {isAnon && p.challengeId && p.dayNum && (
                  <span className={cls("text-[11px] px-1.5 py-0.5 rounded-full font-bold", dark ? "bg-amber-900/40 text-amber-300" : "bg-amber-50 text-amber-700")}>
                    바디키 Day {p.dayNum}
                  </span>
                )}
                <p className={cls("text-[13px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>· {formatRelativeTime(p.createdAt, p.time)}</p>
              </div>
            </div>
          </HeaderTag>
          {isMine && (
            <div className="relative shrink-0">
              <button onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}
                aria-label="옵션 메뉴"
                className={cls("p-1 active:opacity-60", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                <MoreHorizontal size={18}/>
              </button>
              {menuOpenId === p.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)}/>
                  <div className={cls("absolute right-0 top-8 z-20 rounded-2xl shadow-2xl overflow-hidden min-w-[140px] animate-fade-in", dark ? "bg-gray-800" : "bg-white")}>
                    <button onClick={() => { setMenuOpenId(null); onEditPost && onEditPost(p); }}
                      className={cls("w-full px-4 py-3 text-sm font-bold text-left flex items-center gap-2.5 whitespace-nowrap transition", dark ? "text-gray-200 active:bg-gray-700" : "text-gray-700 active:bg-gray-50")}>
                      <PenLine size={14} className="shrink-0"/> 수정하기
                    </button>
                    <div className={cls("h-px", dark ? "bg-gray-700" : "bg-gray-100")}/>
                    <button onClick={() => { setMenuOpenId(null); setConfirmDeleteId(p.id); }}
                      className="w-full px-4 py-3 text-sm font-bold text-left flex items-center gap-2.5 whitespace-nowrap text-rose-500 transition active:bg-rose-50 dark:active:bg-rose-900/20">
                      <X size={14} className="shrink-0"/> 삭제하기
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {confirmDeleteId === p.id && (
          <>
            <div className="fixed inset-0 z-[60] bg-black/50 animate-fade-in" onClick={() => setConfirmDeleteId(null)}/>
            <div className={cls("fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[90%] max-w-sm rounded-2xl p-5 shadow-2xl animate-fade-in", dark ? "bg-gray-900" : "bg-white")}>
              <p className={cls("text-[15px] font-bold", dark ? "text-white" : "text-black")}>이 게시물을 삭제할까요?</p>
              <p className={cls("text-[13px] mt-1.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>삭제된 게시물은 복구할 수 없어요.</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setConfirmDeleteId(null)}
                  className={cls("flex-1 py-2.5 rounded-xl text-sm font-bold", dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700")}>
                  취소
                </button>
                <button onClick={() => { const id = confirmDeleteId; setConfirmDeleteId(null); onDeletePost && onDeletePost(id); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-rose-500 text-white active:opacity-80">
                  삭제
                </button>
              </div>
            </div>
          </>
        )}
        <p className={cls("text-[15px] leading-[1.4] whitespace-pre-wrap ml-12", dark ? "text-white" : "text-black")}>{p.content}</p>
        {p.image && (
          <div className="ml-12 mt-3">
            <img src={p.image} alt="" loading="lazy" decoding="async" className="w-full rounded-xl max-h-80 object-cover"/>
          </div>
        )}
        {p.product && (
          <div className={cls("ml-12 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg", dark ? "bg-[#121212]" : "bg-[#fafafa]")}>
            <ShoppingBag size={13} className={dark ? "text-brand-300" : "text-brand-600"}/>
            <span className={cls("text-[12px] font-semibold truncate", dark ? "text-white" : "text-black")}>{p.product.name}</span>
            {p.product.brand && <span className="text-[11px] text-[#737373] shrink-0">{p.product.brand}</span>}
          </div>
        )}
        <div className="ml-12 flex items-center gap-5 mt-3">
          <button onClick={() => onLike(p.id)} className="inline-flex items-center gap-1.5 active:scale-90 transition">
            <Heart size={20} strokeWidth={1.8} className={p.liked ? "fill-accent-500 text-accent-500" : dark ? "text-white" : "text-black"}/>
            {p.likes > 0 && <span className={cls("text-[13px] font-semibold tabular-nums", dark ? "text-white" : "text-black")}>{p.likes}</span>}
          </button>
          <button onClick={() => setExpanded((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
            className="inline-flex items-center gap-1.5 active:scale-90 transition">
            <MessageCircle size={20} strokeWidth={1.8} className={cls(dark ? "text-white" : "text-black", "-scale-x-100")}/>
            {p.comments > 0 && <span className={cls("text-[13px] font-semibold tabular-nums", dark ? "text-white" : "text-black")}>{p.comments}</span>}
          </button>
          <button onClick={() => onShare(p)} className="active:scale-90 transition">
            <Send size={20} strokeWidth={1.8} className={dark ? "text-white" : "text-black"}/>
          </button>
        </div>
        {isOpen && (
          <div className="ml-12 mt-2">
            <PostCommentThread postId={p.id} comments={comments?.[p.id] || []}
              user={user} dark={dark}
              onUserClick={onUserClick}
              onAdd={onAddComment} onDelete={onDeleteComment} onToggleLike={onToggleCommentLike}
              onRequireAuth={onRequireAuth}/>
          </div>
        )}
      </article>
      );
    })}
    <div className="h-24"/>
  </div>
  );
};

// 커뮤니티 게시물의 인라인 댓글 스레드 — DetailScreen 의 댓글 UX(대댓글 1단계, 좋아요, 접기)와 동일.
const PostCommentThread = ({ postId, comments, user, dark, onUserClick, onAdd, onDelete, onToggleLike, onRequireAuth }) => {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null); // { id, author, isReply }
  const [expandedReplies, setExpandedReplies] = useState({});
  const topLevel = comments.filter((c) => !c.parentId);

  const submit = () => {
    if (!user) { onRequireAuth && onRequireAuth(); return; }
    if (!text.trim()) return;
    const parentId = replyTo?.id || null;
    const ok = onAdd(postId, text, parentId, replyTo?.isReply ? replyTo.author : null);
    if (ok) {
      setText(""); setReplyTo(null);
      if (parentId) setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
    }
  };

  return (
    <div className={cls("mt-3 pt-3 border-t", dark ? "border-gray-700" : "border-gray-100")}>
      {topLevel.length === 0 && (
        <p className={cls("text-xs text-center py-2", dark ? "text-gray-400" : "text-gray-500")}>첫 댓글을 남겨보세요</p>
      )}
      <div className="space-y-3">
        {topLevel.map((c) => {
          const replies = comments.filter((x) => x.parentId === c.id);
          const isExpanded = expandedReplies[c.id];
          const visibleReplies = isExpanded ? replies : replies.slice(0, 1);
          const hiddenCount = replies.length - 1;
          const isMine = !!(user && (c.authorId === user.id || c.author === user.nickname));
          const likedByMe = (c.likedBy || []).some((k) => k === user?.id || k === user?.nickname);
          return (
            <div key={c.id}>
              <div className="flex gap-2.5 group">
                <button onClick={() => onUserClick({ author: c.author, avatar: c.avatar, authorId: c.authorId })} className="active:scale-90 transition shrink-0">
                  <Avatar id={c.avatar} size={14} className="w-8 h-8"/>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <button onClick={() => onUserClick({ author: c.author, avatar: c.avatar, authorId: c.authorId })} className={cls("text-xs font-bold active:opacity-60", dark ? "text-white" : "text-gray-900")}>{c.author}</button>
                    {isMine && <span className={cls("text-xs font-bold px-1.5 py-0.5 rounded-full", dark ? "bg-brand-900/40 text-brand-200" : "bg-brand-50 text-brand-600")}>내 댓글</span>}
                    <p className={cls("text-xs font-normal opacity-70", dark ? "text-gray-400" : "text-gray-600")}>{formatRelativeTime(c.createdAt, c.time)}</p>
                  </div>
                  <p className={cls("text-xs mt-0.5", dark ? "text-gray-300" : "text-gray-700")}>
                    <MentionText text={c.text} dark={dark} onMentionClick={(name) => onUserClick && onUserClick({ author: name, avatar: "" })}/>
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button onClick={() => setReplyTo({ id: c.id, author: c.author, isReply: false })}
                      className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", dark ? "text-brand-300" : "text-brand-600")}>
                      답글 달기 <span className="text-xs">&#8629;</span>
                      {replies.length > 0 && <span className={cls("ml-0.5 px-1.5 py-0.5 rounded-full text-xs", dark ? "bg-brand-900/40" : "bg-brand-50")}>{replies.length}</span>}
                    </button>
                    <button onClick={() => onToggleLike(postId, c.id)}
                      className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", likedByMe ? "text-brand-500" : dark ? "text-gray-400" : "text-gray-500")}>
                      <Heart size={11} className={likedByMe ? "fill-accent-500" : ""}/>
                      {(c.likedBy || []).length > 0 && <span>{(c.likedBy || []).length}</span>}
                    </button>
                  </div>
                </div>
                {isMine && (
                  <button onClick={() => onDelete(postId, c.id)} aria-label="댓글 삭제"
                    className={cls("w-8 h-8 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center shrink-0 active:scale-90 transition", dark ? "bg-gray-800 text-gray-500 hover:text-rose-400" : "bg-gray-100 text-gray-400 hover:text-rose-500")}>
                    <X size={14}/>
                  </button>
                )}
              </div>
              {visibleReplies.length > 0 && (
                <div className={cls("mt-2 ml-5 pl-5 space-y-2 border-l-2", dark ? "border-gray-700" : "border-gray-200")}>
                  {visibleReplies.map((reply) => {
                    const isMyReply = user && reply.author === user.nickname;
                    const replyLikedByMe = (reply.likedBy || []).some((k) => k === user?.id || k === user?.nickname);
                    return (
                      <div key={reply.id} className="flex gap-2 group">
                        <button onClick={() => onUserClick({ author: reply.author, avatar: reply.avatar, authorId: reply.authorId })} className="active:scale-90 transition shrink-0">
                          <Avatar id={reply.avatar} size={12} className="w-6 h-6"/>
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <button onClick={() => onUserClick({ author: reply.author, avatar: reply.avatar, authorId: reply.authorId })} className={cls("text-xs font-bold active:opacity-60", dark ? "text-white" : "text-gray-900")}>{reply.author}</button>
                            {isMyReply && <span className={cls("text-xs font-bold px-1.5 py-0.5 rounded-full", dark ? "bg-brand-900/40 text-brand-200" : "bg-brand-50 text-brand-600")}>내 댓글</span>}
                            <p className={cls("text-xs font-normal opacity-70", dark ? "text-gray-400" : "text-gray-600")}>{formatRelativeTime(reply.createdAt, reply.time)}</p>
                          </div>
                          <p className={cls("text-xs mt-0.5", dark ? "text-gray-300" : "text-gray-700")}>
                            {reply.mentionTo && (
                              <button onClick={() => onUserClick && onUserClick({ author: reply.mentionTo, avatar: "" })}
                                className={cls("font-bold mr-1 active:opacity-60", dark ? "text-brand-300" : "text-brand-600")}>
                                @{reply.mentionTo}
                              </button>
                            )}
                            <MentionText text={reply.text} dark={dark} onMentionClick={(name) => onUserClick && onUserClick({ author: name, avatar: "" })}/>
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <button onClick={() => setReplyTo({ id: c.id, author: reply.author, isReply: true })}
                              className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", dark ? "text-brand-300" : "text-brand-600")}>
                              답글 달기 <span className="text-xs">&#8629;</span>
                            </button>
                            <button onClick={() => onToggleLike(postId, reply.id)}
                              className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", replyLikedByMe ? "text-brand-500" : dark ? "text-gray-400" : "text-gray-500")}>
                              <Heart size={10} className={replyLikedByMe ? "fill-accent-500" : ""}/>
                              {(reply.likedBy || []).length > 0 && <span>{(reply.likedBy || []).length}</span>}
                            </button>
                          </div>
                        </div>
                        {isMyReply && (
                          <button onClick={() => onDelete(postId, reply.id)} aria-label="답글 삭제"
                            className={cls("w-7 h-7 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center shrink-0 active:scale-90", dark ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400")}>
                            <X size={12}/>
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {!isExpanded && hiddenCount > 0 && (
                    <button onClick={() => setExpandedReplies((prev) => ({ ...prev, [c.id]: true }))}
                      className={cls("text-xs font-bold inline-flex items-center gap-1 pl-1 active:opacity-60", dark ? "text-brand-300" : "text-brand-600")}>
                      <span className="text-xs">&#8629;</span> 답글 {hiddenCount}개 더보기
                    </button>
                  )}
                  {isExpanded && hiddenCount > 0 && (
                    <button onClick={() => setExpandedReplies((prev) => ({ ...prev, [c.id]: false }))}
                      className={cls("text-xs font-bold pl-1 active:opacity-60", dark ? "text-gray-400" : "text-gray-500")}>
                      접기
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {replyTo && (
        <div className={cls("mt-3 px-3 py-2.5 rounded-xl flex items-center justify-between text-xs", dark ? "bg-brand-800/40 text-brand-200 ring-1 ring-brand-700/50" : "bg-brand-100 text-brand-800 ring-1 ring-brand-200")}>
          <span className="inline-flex items-center gap-1.5"><span className="text-sm">&#8629;</span> <span className="font-black">@{replyTo.author}</span>에게 답글 작성 중</span>
          <button onClick={() => setReplyTo(null)} aria-label="답글 취소" className="active:scale-90"><X size={12}/></button>
        </div>
      )}
      <div className={cls("mt-3 flex gap-2 p-2 rounded-full", dark ? "bg-gray-900" : "bg-gray-50")}>
        <input value={text} onChange={(e) => setText(e.target.value)}
          placeholder={replyTo ? `@${replyTo.author}에게 답글` : "댓글을 남겨보세요"}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          className={cls("flex-1 min-w-0 bg-transparent outline-none text-xs px-2", dark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400")}/>
        <button onClick={submit} disabled={!text.trim()}
          className={cls("shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full transition", text.trim() ? "bg-brand-500 text-white active:scale-95" : dark ? "bg-gray-800 text-gray-500" : "bg-gray-200 text-gray-400")}>
          등록
        </button>
      </div>
    </div>
  );
};

const SearchScreen = ({ reviews, onOpen, favs, toggleFav, dark, onClose, recents, addRecent, removeRecent, clearRecents, q, setQ, onProductClick }) => {
  const [exiting, close] = useExit(onClose);
  const CATALOG = useCatalog();
  const [filterCat, setFilterCat] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  // 타이핑 중 재필터 비용 절감 (518 제품 + 리뷰 전체 스캔)
  const dq = useDebouncedValue(q, 180);
  const hasText = !!((dq || "").trim());
  const hasCat = filterCat !== "all";
  const results = useMemo(() => {
    if (!hasText && !hasCat) return [];
    const s = (dq || "").toLowerCase();
    let list = (reviews || []).filter((r) => {
      if (!r) return false;
      if (hasCat && r.category !== filterCat) return false;
      if (!hasText) return true;
      const title = (r.title || "").toLowerCase();
      const body = (r.body || "").toLowerCase();
      const product = (r.product || "").toLowerCase();
      const author = (r.author || "").toLowerCase();
      const tags = (r.tags || []);
      return title.includes(s) || body.includes(s) || product.includes(s) || author.includes(s) || tags.some((t) => (t || "").toLowerCase().includes(s));
    });
    if (sortBy === "popular") list = [...list].sort((a, b) => b.likes - a.likes);
    else if (sortBy === "recent") list = [...list].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return list;
  }, [dq, reviews, filterCat, sortBy, hasText, hasCat]);

  const productResults = useMemo(() => {
    if (!hasText && !hasCat) return [];
    const s = (dq || "").toLowerCase();
    let list = (CATALOG || []).filter((p) => {
      if (!p) return false;
      if (hasCat && p.category !== filterCat) return false;
      if (!hasText) return true;
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const tags = (p.tags || []);
      return name.includes(s) || brand.includes(s) || tags.some((t) => (t || "").toLowerCase().includes(s));
    });
    return list.slice(0, 10);
  }, [dq, CATALOG, filterCat, hasText, hasCat]);

  const submit = (term) => { setQ(term); addRecent(term); };

  // 카테고리 또는 텍스트 중 하나라도 활성이면 결과 화면 — 카테고리 단독 필터도 지원
  const hasQuery = hasText || hasCat;

  return (
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-30 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col pt-safe pb-safe", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-black" : "bg-white")}>
      {/* 검색 헤더 */}
      <div className={cls("flex items-center gap-2 px-4 h-14 border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
        <button onClick={close} aria-label="뒤로" className="min-w-tap min-h-tap flex items-center justify-center active:opacity-60 -ml-1.5 shrink-0">
          <ArrowLeft size={22} className={dark ? "text-white" : "text-black"}/>
        </button>
        <div className={cls("flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-full", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
          <Search size={16} className={cls("shrink-0", dark ? "text-[#a8a8a8]" : "text-[#737373]")}/>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => q && addRecent(q)}
            placeholder="제품, 리뷰, 태그로 찾기"
            className={cls("flex-1 min-w-0 bg-transparent outline-none text-[14px]", dark ? "text-white placeholder-[#737373]" : "text-black placeholder-[#8e8e8e]")}/>
          {q && <button onClick={() => setQ("")} aria-label="지우기" className="shrink-0"><X size={14} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 검색 전 상태 — 최근 검색 + 인기 검색어 */}
        {!hasQuery && (
          <div>
            {recents.length > 0 && (
              <div className="pt-4">
                <div className="flex items-center justify-between px-4 pb-2">
                  <p className={cls("text-[13px] font-black uppercase tracking-wider", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>최근 검색</p>
                  <button onClick={() => clearRecents && clearRecents()}
                    className={cls("text-[13px] font-bold active:opacity-60", dark ? "text-brand-300" : "text-brand-700")}>
                    모두 지우기
                  </button>
                </div>
                {recents.map((t) => (
                  <div key={t} className={cls("flex items-center gap-3 px-4 py-2 active:bg-opacity-80", dark ? "active:bg-[#121212]" : "active:bg-[#fafafa]")}>
                    <button onClick={() => submit(t)}
                      className={cls("w-10 h-10 rounded-full flex items-center justify-center shrink-0", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
                      <Clock size={16} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>
                    </button>
                    <button onClick={() => submit(t)} className={cls("flex-1 text-left text-[14px] truncate", dark ? "text-white" : "text-black")}>
                      {t}
                    </button>
                    <button onClick={() => removeRecent && removeRecent(t)}
                      aria-label={`${t} 삭제`}
                      className="p-2 active:opacity-60 shrink-0">
                      <X size={14} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 카테고리 둘러보기 — 컬러 타일 */}
            <div className="px-4 pt-6 pb-3">
              <p className={cls("text-[13px] font-black uppercase tracking-wider mb-3", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>카테고리 둘러보기</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CATEGORIES).map(([k, c]) => {
                  const Icon = CAT_ICON[k] || Tag;
                  return (
                    <button key={k} onClick={() => { setFilterCat(k); setQ(""); }}
                      className={cls("flex items-center gap-3 px-4 py-3 rounded-2xl text-left active:scale-[0.98] transition",
                        dark ? c.dchip : c.chip)}>
                      <Icon size={20} strokeWidth={2}/>
                      <span className="text-[14px] font-bold">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 인기 태그 */}
            <div className="px-4 pt-4 pb-6">
              <p className={cls("text-[13px] font-black uppercase tracking-wider mb-3", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>지금 뜨는 태그</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.map((t) => (
                  <button key={t} onClick={() => submit(t)}
                    className={cls("text-[13px] px-3.5 py-1.5 rounded-full font-bold transition active:scale-95",
                      dark ? "bg-[#1a1a1a] text-white border border-[#262626]" : "bg-white text-black border border-[#dbdbdb]")}>
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 검색 결과 */}
        {hasQuery && (
          <div>
            {/* 필터/정렬 pill — 민트 액센트 */}
            <div className={cls("sticky top-0 z-10 border-b", dark ? "bg-black/95 border-[#262626]" : "bg-white/95 border-[#dbdbdb]")}>
              <div className="flex gap-2 overflow-x-auto px-4 py-2.5 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                <button onClick={() => setFilterCat("all")}
                  className={cls("shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition",
                    filterCat === "all"
                      ? "bg-brand-500 text-white"
                      : dark ? "bg-[#1a1a1a] text-white border border-[#262626]" : "bg-white text-black border border-[#dbdbdb]")}>
                  전체
                </button>
                {Object.entries(CATEGORIES).map(([k, c]) => (
                  <button key={k} onClick={() => setFilterCat(k)}
                    className={cls("shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition",
                      filterCat === k
                        ? "bg-brand-500 text-white"
                        : dark ? "bg-[#1a1a1a] text-white border border-[#262626]" : "bg-white text-black border border-[#dbdbdb]")}>
                    {c.label}
                  </button>
                ))}
                <div className={cls("w-px h-6 self-center shrink-0 mx-1", dark ? "bg-[#262626]" : "bg-[#dbdbdb]")}/>
                {[
                  { k: "relevance", label: "관련순" },
                  { k: "popular", label: "인기순" },
                  { k: "recent", label: "최신순" },
                ].map((s) => (
                  <button key={s.k} onClick={() => setSortBy(s.k)}
                    className={cls("shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition",
                      sortBy === s.k
                        ? (dark ? "bg-white text-black" : "bg-black text-white")
                        : dark ? "bg-[#1a1a1a] text-[#a8a8a8] border border-[#262626]" : "bg-white text-[#737373] border border-[#dbdbdb]")}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 제품 검색 결과 */}
            {productResults.length > 0 && (
              <div className={cls("border-b", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
                <p className={cls("text-[12px] font-black uppercase tracking-wider px-4 pt-4 pb-2", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                  제품 · {productResults.length}개
                </p>
                {productResults.map((p) => {
                  const pCat = CATEGORIES[p?.category];
                  return (
                    <button key={p.id} onClick={() => { onProductClick && onProductClick(p); }}
                      className={cls("w-full flex items-center gap-3 px-4 py-3 text-left active:bg-opacity-70 transition",
                        dark ? "active:bg-[#121212]" : "active:bg-[#fafafa]")}>
                      <div className={cls("w-12 h-12 rounded-xl shrink-0 flex items-center justify-center overflow-hidden", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
                        <ProductImage src={p.imageUrl} alt={p.name} className="max-w-full max-h-full object-contain p-1" iconSize={20}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cls("text-[14px] font-bold line-clamp-1", dark ? "text-white" : "text-black")}>{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {pCat && <span className={cls("text-[11px] font-bold px-1.5 py-0.5 rounded", dark ? pCat.dchip : pCat.chip)}>{pCat.label}</span>}
                          {p.brand && <p className={cls("text-[12px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{p.brand}</p>}
                          {p.price > 0 && <span className={cls("text-[13px] font-bold tabular-nums ml-auto", dark ? "text-white" : "text-black")}>{p.price.toLocaleString()}원</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 리뷰 결과 — 커뮤니티 리스트 (세로, 작성자+본문+태그 중심) */}
            {results.length > 0 && (
              <>
                <p className={cls("text-[12px] font-black uppercase tracking-wider px-4 pt-4 pb-2", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                  웨이로그 · {results.length}개
                </p>
                <div className={cls("divide-y", dark ? "divide-[#262626]" : "divide-[#dbdbdb]")}>
                  {results.map((r) => {
                    const rCat = CATEGORIES[r.category];
                    return (
                      <button key={r.id} onClick={() => { onOpen(r); close(); }}
                        className={cls("w-full flex gap-3 px-4 py-3 text-left active:bg-opacity-70 transition",
                          dark ? "active:bg-[#121212]" : "active:bg-[#fafafa]")}>
                        <div className={cls("relative w-[92px] h-[92px] rounded-xl overflow-hidden shrink-0", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
                          {r.img
                            ? <SmartImg r={r} className="w-full h-full object-cover"/>
                            : <div className="w-full h-full flex items-center justify-center"><Camera size={22} strokeWidth={1.5} className={dark ? "text-[#404040]" : "text-[#c7c7c7]"}/></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {rCat && (
                              <span className={cls("text-[11px] font-bold px-1.5 py-0.5 rounded", dark ? rCat.dchip : rCat.chip)}>
                                {rCat.label}
                              </span>
                            )}
                            {r.product && (
                              <span className={cls("text-[11px] truncate", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                                · {r.product}
                              </span>
                            )}
                          </div>
                          <p className={cls("text-[14px] font-bold mt-1 line-clamp-1 leading-[1.3]", dark ? "text-white" : "text-black")}>
                            {r.title || "제목 없음"}
                          </p>
                          {r.body && (
                            <p className={cls("text-[12.5px] mt-0.5 line-clamp-2 leading-[1.4]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                              {r.body}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className={cls("text-[11px] font-bold truncate", dark ? "text-white" : "text-black")}>
                              {r.author || "익명"}
                            </span>
                            {r.likes > 0 && (
                              <span className={cls("text-[11px] inline-flex items-center gap-0.5 tabular-nums", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                                <Heart size={10} strokeWidth={2.2} className="fill-accent-500 text-accent-500"/>
                                {r.likes}
                              </span>
                            )}
                            {r.date && (
                              <span className={cls("text-[11px]", dark ? "text-[#737373]" : "text-[#a8a8a8]")}>
                                {r.date.slice(5).replace("-", "/")}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* 빈 상태 */}
            {results.length === 0 && productResults.length === 0 && (
              <div className="py-16 text-center px-6">
                <div className={cls("w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center", dark ? "bg-[#1a1a1a]" : "bg-[#f2f2f2]")}>
                  <Search size={22} strokeWidth={1.8} className="text-brand-500"/>
                </div>
                <p className={cls("text-[15px] font-bold", dark ? "text-white" : "text-black")}>
                  {hasText ? `"${q}" ` : (hasCat ? `${CATEGORIES[filterCat]?.label || ""} ` : "")}검색 결과가 없어요
                </p>
                <p className={cls("text-[13px] mt-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                  {hasText ? "다른 검색어를 입력해보세요" : "다른 카테고리를 선택해보세요"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 답글이 없는 댓글에 대해 매번 새 `[]` 를 넘기지 않도록 공유하는 빈 배열.
// memo 얕은 비교에서 reference 안정성 확보.
const EMPTY_ARRAY = Object.freeze([]);

// 최상위 댓글 1개 + 그 답글들을 렌더. memo 로 감싸 DetailScreen 의 다른 state
// (특히 댓글 input 의 comment draft) 변경 시 기존 댓글들이 불필요하게 재렌더되는
// 것을 방지. 전달되는 콜백은 모두 상위에서 useCallback 으로 안정화된 것을 사용.
const CommentItem = memo(function CommentItem({
  comment: c, replies, isExpanded, hiddenCount, user, dark,
  onUserClick, onSetReplyTo, onLike, onReport, onDelete, onToggleExpanded,
  setCommentRef,
}) {
  const isMyComment = user && c.author === user.nickname;
  const visibleReplies = isExpanded ? replies : replies.slice(0, 1);
  const mentionClick = useCallback((name) => onUserClick && onUserClick({ author: name, avatar: "" }), [onUserClick]);
  const refCb = useCallback((el) => { if (setCommentRef) setCommentRef(c.id, el); }, [setCommentRef, c.id]);
  return (
    <div ref={refCb}>
      <div className="flex gap-2.5 group">
        <button onClick={() => onUserClick({ author: c.author, avatar: c.avatar, authorId: c.authorId })} className="active:scale-90 transition shrink-0">
          <Avatar id={c.avatar} size={14} className="w-8 h-8"/>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <button onClick={() => onUserClick({ author: c.author, avatar: c.avatar, authorId: c.authorId })} className={cls("text-xs font-bold active:opacity-60", dark ? "text-white" : "text-gray-900")}>{c.author}</button>
            {isMyComment && (
              <span className={cls("text-xs font-bold px-1.5 py-0.5 rounded-full", dark ? "bg-brand-900/40 text-brand-200" : "bg-brand-50 text-brand-600")}>내 댓글</span>
            )}
            <p className={cls("text-xs font-normal opacity-70", dark ? "text-gray-400" : "text-gray-600")}>{formatRelativeTime(c.createdAt, c.time)}</p>
          </div>
          <p className={cls("text-xs mt-0.5", dark ? "text-gray-300" : "text-gray-700")}>
            <MentionText text={c.text} dark={dark} onMentionClick={mentionClick}/>
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <button onClick={() => onSetReplyTo({ id: c.id, author: c.author, isReply: false })}
              className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", dark ? "text-brand-300" : "text-brand-600")}>
              답글 달기 <span className="text-xs">&#8629;</span>
              {replies.length > 0 && <span className={cls("ml-0.5 px-1.5 py-0.5 rounded-full text-xs", dark ? "bg-brand-900/40" : "bg-brand-50")}>{replies.length}</span>}
            </button>
            <button onClick={() => onLike(c.id)}
              className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", (c.likedBy || []).some((k) => k === user?.id || k === user?.nickname) ? "text-brand-500" : dark ? "text-gray-400" : "text-gray-500")}>
              <Heart size={11} className={(c.likedBy || []).some((k) => k === user?.id || k === user?.nickname) ? "fill-accent-500" : ""}/>
              {(c.likedBy || []).length > 0 && <span>{(c.likedBy || []).length}</span>}
            </button>
            {user && c.author !== user.nickname && (
              <button onClick={() => onReport(c.id)}
                className={cls("text-xs font-bold active:opacity-60", dark ? "text-gray-600" : "text-gray-400")}>
                신고
              </button>
            )}
          </div>
        </div>
        {isMyComment && (
          <button onClick={() => onDelete(c.id)} aria-label="댓글 삭제"
            className={cls("w-8 h-8 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center shrink-0 active:scale-90 transition", dark ? "bg-gray-800 text-gray-500 hover:text-rose-400" : "bg-gray-100 text-gray-400 hover:text-rose-500")}>
            <X size={14}/>
          </button>
        )}
      </div>
      {visibleReplies.length > 0 && (
        <div className={cls("mt-2 ml-5 pl-5 space-y-2 border-l-2", dark ? "border-gray-700" : "border-gray-200")}>
          {visibleReplies.map((reply) => {
            const isMyReply = user && reply.author === user.nickname;
            return (
            <div key={reply.id} className="flex gap-2 group">
              <button onClick={() => onUserClick({ author: reply.author, avatar: reply.avatar, authorId: reply.authorId })} className="active:scale-90 transition shrink-0">
                <Avatar id={reply.avatar} size={12} className="w-6 h-6"/>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <button onClick={() => onUserClick({ author: reply.author, avatar: reply.avatar, authorId: reply.authorId })} className={cls("text-xs font-bold active:opacity-60", dark ? "text-white" : "text-gray-900")}>{reply.author}</button>
                  {isMyReply && (
                    <span className={cls("text-xs font-bold px-1.5 py-0.5 rounded-full", dark ? "bg-brand-900/40 text-brand-200" : "bg-brand-50 text-brand-600")}>내 댓글</span>
                  )}
                  <p className={cls("text-xs font-normal opacity-70", dark ? "text-gray-400" : "text-gray-600")}>{formatRelativeTime(reply.createdAt, reply.time)}</p>
                </div>
                <p className={cls("text-xs mt-0.5", dark ? "text-gray-300" : "text-gray-700")}>
                  {reply.mentionTo && (
                    <button onClick={() => onUserClick && onUserClick({ author: reply.mentionTo, avatar: "" })}
                      className={cls("font-bold mr-1 active:opacity-60", dark ? "text-brand-300" : "text-brand-600")}>
                      @{reply.mentionTo}
                    </button>
                  )}
                  <MentionText text={reply.text} dark={dark} onMentionClick={mentionClick}/>
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <button onClick={() => onSetReplyTo({ id: c.id, author: reply.author, isReply: true })}
                    className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", dark ? "text-brand-300" : "text-brand-600")}>
                    답글 달기 <span className="text-xs">&#8629;</span>
                  </button>
                  <button onClick={() => onLike(reply.id)}
                    className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", (reply.likedBy || []).some((k) => k === user?.id || k === user?.nickname) ? "text-brand-500" : dark ? "text-gray-400" : "text-gray-500")}>
                    <Heart size={10} className={(reply.likedBy || []).some((k) => k === user?.id || k === user?.nickname) ? "fill-accent-500" : ""}/>
                    {(reply.likedBy || []).length > 0 && <span>{(reply.likedBy || []).length}</span>}
                  </button>
                  {user && reply.author !== user.nickname && (
                    <button onClick={() => onReport(reply.id)}
                      className={cls("text-xs font-bold active:opacity-60", dark ? "text-gray-600" : "text-gray-400")}>
                      신고
                    </button>
                  )}
                </div>
              </div>
              {isMyReply && (
                <button onClick={() => onDelete(reply.id)} aria-label="답글 삭제"
                  className={cls("w-7 h-7 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center shrink-0 active:scale-90", dark ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400")}>
                  <X size={12}/>
                </button>
              )}
            </div>
            );
          })}
          {!isExpanded && hiddenCount > 0 && (
            <button onClick={() => onToggleExpanded(c.id, true)}
              className={cls("text-xs font-bold inline-flex items-center gap-1 pl-1 active:opacity-60", dark ? "text-brand-300" : "text-brand-600")}>
              <span className="text-xs">&#8629;</span> 답글 {hiddenCount}개 더보기
            </button>
          )}
          {isExpanded && hiddenCount > 0 && (
            <button onClick={() => onToggleExpanded(c.id, false)}
              className={cls("text-xs font-bold pl-1 active:opacity-60", dark ? "text-gray-400" : "text-gray-500")}>
              접기
            </button>
          )}
        </div>
      )}
    </div>
  );
});

const DetailScreen = ({ r, onBack, onOpen, reviews: allReviews, favs, toggleFav, dark, comments, addComment, deleteComment, toggleCommentLike, user, onEdit, onDelete, onReport, onUserClick, onHashtagClick, onProductClick, deleting = false, following, onToggleFollow }) => {
  const [exiting, close] = useExit(onBack);
  // 신고 액션 시트 — 사용자가 사유를 선택한 뒤 onReport(target, reason) 호출.
  // 댓글 신고는 CommentItem → handleReport 경로로 setReportSheet 을 직접 호출.
  const [reportSheet, setReportSheet] = useState(null); // { type: "review"|"comment", id }
  const submitReport = (reason) => {
    if (!reportSheet || !onReport) return setReportSheet(null);
    onReport(reportSheet.type, reportSheet.id, reason);
    setReportSheet(null);
  };
  // 관련 리뷰는 리뷰 수×태그 수가 많을 때 비용이 커짐 → memoize.
  // 실데이터(allReviews)가 있으면 그것만 사용. 비어있을 때만 SEED_REVIEWS fallback
  // (온보딩/빈 상태 UX 보장). 사용자 데이터와 시드가 섞여 이상한 추천이 나오는 것 방지.
  const related = useMemo(() => {
    const tagSet = new Set(r.tags || []);
    const pool = (allReviews && allReviews.length > 0) ? allReviews : SEED_REVIEWS;
    return pool
      .filter((x) => x.id !== r.id && (x.tags || []).some((t) => tagSet.has(t)))
      .slice(0, 4);
  }, [allReviews, r.id, r.tags]);
  const cat = CATEGORIES[r.category] || CATEGORIES.food;
  // 리뷰의 product 이름을 카탈로그와 매칭 — 이미지/공식 링크 노출 및 클릭 연결
  const CATALOG = useCatalog();
  const matchedProducts = useMemo(() => {
    const names = getReviewProductNames(r, CATALOG);
    if (names.length === 0) return [];
    const catalog = Array.isArray(CATALOG) ? CATALOG : [];
    return names.map((name) => {
      if (catalog.length === 0) return { name, product: null };
      const exact = catalog.find((p) => p.name === name);
      if (exact) return { name, product: exact };
      const qLower = name.toLowerCase();
      const fuzzy = catalog.find((p) => {
        const n = (p.name || "").toLowerCase();
        return n === qLower || n.includes(qLower) || qLower.includes(n);
      });
      return { name, product: fuzzy || null };
    });
  }, [CATALOG, r.product, r.products]);
  const [comment, setComment] = useStoredState(`waylog:draft:comment:${r.id}`, "");
  const [replyTo, setReplyTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const commentRefs = useRef({});

  // 댓글을 최상위/답글로 1회만 분리 → CommentItem 에 전달되는 배열 identity 안정.
  // comment input 타이핑으로 DetailScreen 이 리렌더돼도 comments prop 자체가
  // 바뀌지 않는 한 이 계산은 캐시에서 바로 반환되고 CommentItem 은 memo 로 스킵.
  const topLevelComments = useMemo(() => comments.filter((c) => !c.parentId), [comments]);
  const repliesMap = useMemo(() => {
    const m = new Map();
    comments.forEach((c) => {
      if (!c.parentId) return;
      const arr = m.get(c.parentId);
      if (arr) arr.push(c); else m.set(c.parentId, [c]);
    });
    return m;
  }, [comments]);

  // CommentItem 에 넘기는 핸들러들 — shallow-compare memo 가 실제로 스킵되도록 안정화.
  const handleLike = useCallback((id) => toggleCommentLike && toggleCommentLike(r.id, id), [toggleCommentLike, r.id]);
  const handleReport = useCallback((id) => setReportSheet({ type: "comment", id }), []);
  const handleDelete = useCallback((id) => deleteComment && deleteComment(r.id, id), [deleteComment, r.id]);
  const handleToggleExpanded = useCallback((id, next) => setExpandedReplies((prev) => ({ ...prev, [id]: next })), []);
  const setCommentRef = useCallback((id, el) => { commentRefs.current[id] = el; }, []);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [zoomedImg, setZoomedImg] = useState(null); // { urls: string[], index: number } | null
  const [shareOpen, setShareOpen] = useState(false);
  const isMine = !!(user && (r.authorId === user.id || r.author === user.nickname));
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
    <div className={cls("fixed inset-0 z-30 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto overflow-y-auto pt-safe pb-safe", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-black" : "bg-white")}>
      <div className="relative">
        {r.media && r.media.length > 0 ? (
          <div className="relative">
            <div ref={galleryRef} onScroll={handleGalleryScroll} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none" }}>
              {r.media.map((m, mi) => (
                <div key={m.id} className="snap-start shrink-0 w-full h-80 bg-gray-200 dark:bg-gray-800">
                  {m.type === "image" ? (
                    <img src={m.url} alt="" loading="lazy" decoding="async" onClick={() => {
                      const imageUrls = r.media.filter((x) => x.type === "image").map((x) => x.url);
                      const idx = imageUrls.indexOf(m.url);
                      setZoomedImg({ urls: imageUrls, index: idx >= 0 ? idx : 0 });
                    }} className="w-full h-full object-cover cursor-zoom-in"/>
                  ) : (
                    <video src={m.url} className="w-full h-full object-cover" controls playsInline/>
                  )}
                </div>
              ))}
            </div>
            {r.media.length > 1 && (
              <>
                <div className="absolute top-4 right-16 px-2.5 py-1 rounded-full bg-black/70 text-white text-xs font-bold tabular-nums">
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
          <div onClick={() => r.img && setZoomedImg({ urls: [r.img], index: 0 })} className="cursor-zoom-in">
            <SmartImg r={r} className="w-full h-80 object-cover"/>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none"/>
        {/* 상단 floating 버튼은 노치/상태바를 피해 safe-area-inset-top 만큼 내려야 함 */}
        <button onClick={close} aria-label="뒤로"
          className="absolute left-4 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center"
          style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
          <ArrowLeft size={18} className="text-white"/>
        </button>
        <button onClick={() => toggleFav(r.id)} aria-label="좋아요"
          className="absolute right-4 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center"
          style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
          <Heart size={18} className={favs.has(r.id) ? "text-accent-500 fill-accent-500" : "text-white"}/>
        </button>
        <button onClick={() => setShareOpen(true)} aria-label="공유"
          className="absolute right-16 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center"
          style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
          <Share2 size={18} className="text-white"/>
        </button>
        {isMine && (
          <>
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label="옵션 메뉴"
              style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
              className="absolute right-28 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
              <span className="text-white text-lg font-black leading-none -mt-1">⋯</span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)}/>
                <div className={cls("absolute z-20 rounded-2xl shadow-2xl overflow-hidden min-w-[140px] animate-fade-in right-28", dark ? "bg-gray-800" : "bg-white")}
                  style={{ top: "calc(env(safe-area-inset-top) + 4rem)" }}>
                  <button onClick={() => { setMenuOpen(false); onEdit && onEdit(r); }}
                    className={cls("w-full px-4 py-3 text-sm font-bold text-left flex items-center gap-2.5 whitespace-nowrap transition", dark ? "text-gray-200 active:bg-gray-700" : "text-gray-700 active:bg-gray-50")}>
                    <PenLine size={14} className="shrink-0"/> 수정하기
                  </button>
                  <div className={cls("h-px", dark ? "bg-gray-700" : "bg-gray-100")}/>
                  <button onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                    className="w-full px-4 py-3 text-sm font-bold text-left flex items-center gap-2.5 whitespace-nowrap text-rose-500 transition active:bg-rose-50 dark:active:bg-rose-900/20">
                    <X size={14} className="shrink-0"/> 삭제하기
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
      <div className="p-5">
        {(() => {
          const authorNick = r.profiles?.nickname || r.author;
          const authorAvatar = r.profiles?.avatar_url || r.avatar || "";
          // mapReviewRow 결과는 authorId, 직접 DB row 는 user_id — 둘 다 수용.
          const authorUserId = r.authorId || r.user_id || null;
          const canFollowAuthor = !!authorUserId && !!user && !isMine;
          const isFollowingAuthor = canFollowAuthor && following && following.has(authorUserId);
          return (
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => onUserClick && onUserClick({ author: authorNick, avatar: authorAvatar, userId: authorUserId })}
                className="flex items-center gap-2.5 active:scale-[0.98] transition flex-1 min-w-0">
                <Avatar id={authorAvatar} size={18} className="w-10 h-10 shrink-0"/>
                <div className="text-left min-w-0">
                  <p className={cls("text-sm font-bold truncate", dark ? "text-white" : "text-gray-900")}>{authorNick}</p>
                  <p className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>{formatRelativeTime(r.date)}</p>
                </div>
              </button>
              {canFollowAuthor && (
                <button
                  onClick={() => onToggleFollow && onToggleFollow(authorUserId, authorNick)}
                  className={cls("px-4 py-1 rounded-lg text-[13px] font-semibold transition active:opacity-70 shrink-0",
                    isFollowingAuthor
                      ? (dark ? "bg-[#262626] text-white" : "bg-[#efefef] text-black")
                      : "bg-brand-500 text-white hover:bg-brand-600")}>
                  {isFollowingAuthor ? "팔로잉" : "팔로우"}
                </button>
              )}
            </div>
          );
        })()}
        {/* 좋아요 수 — IG 식 굵게 */}
        {r.likes > 0 && (
          <p className={cls("text-[14px] font-semibold", dark ? "text-white" : "text-black")}>
            좋아요 <span className="tabular-nums">{r.likes.toLocaleString()}</span>개
          </p>
        )}
        {/* 캡션 — username + text 형식 */}
        <p className={cls("mt-1 text-[14px] leading-[1.4]", dark ? "text-white" : "text-black")}>
          <span className="font-bold mr-1.5">{r.author || "익명"}</span>
          <span className="font-bold">{r.title}</span>
          {r.body && (
            <>
              <br/>
              <span>
                {(r.body || "").split(/(#[^\s#]+)/g).map((part, i) => {
                  if (part.startsWith("#") && part.length > 1) {
                    return (
                      <button key={i} onClick={() => onHashtagClick && onHashtagClick(part.slice(1))}
                        className={cls("active:opacity-60", dark ? "text-brand-300" : "text-brand-700")}>
                        {part}
                      </button>
                    );
                  }
                  return <span key={i}>{part}</span>;
                })}
              </span>
            </>
          )}
        </p>
        {/* 태그들 — IG 링크 블루 */}
        {r.tags && r.tags.length > 0 && (
          <p className={cls("mt-1.5 text-[14px] leading-[1.4]", dark ? "text-brand-300" : "text-brand-700")}>
            {r.tags.map((t, i) => (
              <button key={t} onClick={() => onHashtagClick && onHashtagClick(t)}
                className={cls("active:opacity-60", i > 0 && "ml-1")}>
                #{t}
              </button>
            ))}
          </p>
        )}
        {/* 카테고리 + 조회수 */}
        <div className="flex items-center gap-3 mt-2.5">
          <CategoryChip cat={r.category} dark={dark}/>
          {r.views > 0 && (
            <span className={cls("inline-flex items-center gap-1 text-[12px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              <Eye size={12}/> {r.views.toLocaleString()}
            </span>
          )}
        </div>

        {matchedProducts.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className={cls("text-[11px] font-bold uppercase tracking-wider px-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
              관련 상품 {matchedProducts.length > 1 && <span className="tabular-nums">· {matchedProducts.length}개</span>}
            </p>
            {matchedProducts.map(({ name, product }, idx) => {
              const clickable = !!(product && onProductClick);
              const content = (
                <>
                  {product?.imageUrl ? (
                    <div className={cls("w-14 h-14 rounded-xl overflow-hidden shrink-0", dark ? "bg-gray-700" : "bg-gray-100")}>
                      <img src={product.imageUrl} alt={product.name} loading="lazy" decoding="async"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}/>
                    </div>
                  ) : (
                    <div className={cls("w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shrink-0", cat.color)}>
                      <ShoppingBag size={22} strokeWidth={2.2}/>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cls("text-[14px] font-semibold line-clamp-2", dark ? "text-white" : "text-black")}>
                      {product?.name || name}
                    </p>
                    {product && (
                      <p className={cls("text-[12px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                        {product.price ? `${product.price.toLocaleString()}원 · ` : ""}
                        상세 보기
                      </p>
                    )}
                  </div>
                  {clickable && <ChevronRight size={16} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>}
                </>
              );
              return clickable ? (
                <button key={idx} type="button" onClick={() => onProductClick(product)}
                  className={cls("w-full p-3 rounded-xl flex items-center gap-3 text-left active:opacity-70 transition border",
                    dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
                  {content}
                </button>
              ) : (
                <div key={idx} className={cls("p-3 rounded-xl flex items-center gap-3 border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
                  {content}
                </div>
              );
            })}
          </div>
        )}

        {/* Comments — IG 스타일 */}
        <div className={cls("mt-5 pt-4 border-t", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
          <h3 className={cls("text-[14px] font-semibold mb-4", dark ? "text-white" : "text-black")}>
            댓글 {comments.length > 0 && <span className="tabular-nums">{comments.length}</span>}
          </h3>
          {comments.length === 0 && (
            <div className="py-10 text-center">
              <p className={cls("text-[14px]", dark ? "text-white" : "text-black")}>아직 댓글이 없어요</p>
              <p className={cls("text-[13px] mt-1", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>대화를 시작해보세요</p>
            </div>
          )}
          <div className="space-y-3">
            {topLevelComments.map((c) => {
              const replies = repliesMap.get(c.id) || EMPTY_ARRAY;
              const isExpanded = !!expandedReplies[c.id];
              const hiddenCount = replies.length - 1;
              return (
                <CommentItem key={c.id}
                  comment={c} replies={replies}
                  isExpanded={isExpanded} hiddenCount={hiddenCount}
                  user={user} dark={dark}
                  onUserClick={onUserClick}
                  onSetReplyTo={setReplyTo}
                  onLike={handleLike}
                  onReport={handleReport}
                  onDelete={handleDelete}
                  onToggleExpanded={handleToggleExpanded}
                  setCommentRef={setCommentRef}/>
              );
            })}
          </div>
          {replyTo && (
            <div className={cls("mt-3 px-3 py-2.5 rounded-xl flex items-center justify-between text-xs animate-pulse", dark ? "bg-brand-800/40 text-brand-200 ring-1 ring-brand-700/50" : "bg-brand-100 text-brand-800 ring-1 ring-brand-200")}>
              <span className="inline-flex items-center gap-1.5"><span className="text-sm">&#8629;</span> <span className="font-black">@{replyTo.author}</span>에게 답글 작성 중</span>
              <button onClick={() => setReplyTo(null)} aria-label="답글 취소" className="active:scale-90"><X size={12}/></button>
            </div>
          )}
          <div className={cls("mt-3 flex items-center gap-3 py-2 border-t", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
            {user && <Avatar id={user.avatar} size={10} className="w-8 h-8 shrink-0"/>}
            <input value={comment} onChange={(e) => setComment(e.target.value)}
              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
              placeholder={replyTo ? `${replyTo.author}에게 답글 달기...` : "댓글 달기..."}
              className={cls("flex-1 min-w-0 bg-transparent outline-none text-[14px] min-h-[44px]", dark ? "text-white placeholder-[#737373]" : "text-black placeholder-[#8e8e8e]")}/>
            <button onClick={() => {
              if (comment.trim()) {
                const parentId = replyTo?.id || null;
                const ok = addComment(r.id, comment, parentId, replyTo?.isReply ? replyTo.author : null);
                if (ok) {
                  setComment(""); setReplyTo(null); window.storage?.delete(`waylog:draft:comment:${r.id}`);
                  if (parentId) {
                    setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
                    setTimeout(() => { commentRefs.current[parentId]?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100);
                  }
                }
              }
            }}
              disabled={!comment.trim()}
              className={cls("shrink-0 whitespace-nowrap text-[14px] font-semibold transition", comment.trim() ? "text-brand-700 active:opacity-60" : "text-brand-700/40")}>
              게시
            </button>
          </div>
        </div>

        {related.length > 0 && (
          <div className={cls("mt-6 pt-4 border-t", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
            <p className={cls("text-[12px] font-semibold uppercase tracking-wider mb-3", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>비슷한 게시물</p>
            <div className="grid grid-cols-3 gap-px pb-8 -mx-5">
              {related.map((x) => (
                <button key={x.id} onClick={() => onOpen(x)}
                  className="relative aspect-square overflow-hidden active:opacity-80 transition">
                  <SmartImg r={x} className="w-full h-full object-cover"/>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {zoomedImg && (() => {
        const { urls, index: initIdx } = zoomedImg;
        const ZoomViewer = () => {
          const [cur, setCur] = useState(initIdx);
          const scrollRef = useRef(null);
          const startX = useRef(null);
          const dragX = useRef(0);
          useEffect(() => {
            if (scrollRef.current) scrollRef.current.scrollLeft = cur * scrollRef.current.offsetWidth;
          }, []);
          const onSnap = () => {
            if (!scrollRef.current) return;
            const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
            setCur(idx);
          };
          // 키보드 좌우
          useEffect(() => {
            const handler = (e) => {
              if (e.key === "ArrowLeft" && cur > 0) { setCur(cur - 1); scrollRef.current?.scrollTo({ left: (cur - 1) * scrollRef.current.offsetWidth, behavior: "smooth" }); }
              if (e.key === "ArrowRight" && cur < urls.length - 1) { setCur(cur + 1); scrollRef.current?.scrollTo({ left: (cur + 1) * scrollRef.current.offsetWidth, behavior: "smooth" }); }
              if (e.key === "Escape") setZoomedImg(null);
            };
            window.addEventListener("keydown", handler);
            return () => window.removeEventListener("keydown", handler);
          }, [cur]);
          return (
            <div className="fixed inset-0 z-[60] max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto bg-black animate-fade-in flex flex-col">
              {/* 닫기 */}
              <button onClick={() => setZoomedImg(null)} aria-label="닫기"
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/80 flex items-center justify-center">
                <X size={18} className="text-white"/>
              </button>
              {/* 카운터 */}
              {urls.length > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/70 text-white text-xs font-bold tabular-nums">
                  {cur + 1} / {urls.length}
                </div>
              )}
              {/* 스와이프 영역 */}
              <div ref={scrollRef} onScroll={onSnap}
                className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: "none" }}>
                {urls.map((url, i) => (
                  <div key={i} className="snap-start shrink-0 w-full h-full flex items-center justify-center"
                    onClick={() => setZoomedImg(null)}>
                    <img src={url} alt="" decoding="async"
                      className="max-w-full max-h-full object-contain"
                      style={{ touchAction: "pinch-zoom" }}
                      onClick={(e) => e.stopPropagation()}/>
                  </div>
                ))}
              </div>
              {/* 하단 점 인디케이터 */}
              {urls.length > 1 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 items-center">
                  {urls.map((_, i) => (
                    <div key={i} className={cls("rounded-full transition-all duration-300",
                      i === cur ? "w-2.5 h-2.5 bg-white shadow" : "w-1.5 h-1.5 bg-white/40")}/>
                  ))}
                </div>
              )}
            </div>
          );
        };
        return <ZoomViewer/>;
      })()}
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
              <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                className={cls("flex-1 py-3 rounded-2xl font-bold text-sm border disabled:opacity-50", dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600")}>취소</button>
              <button onClick={async () => {
                  if (deleting) return;
                  const promise = onDelete && onDelete(r);
                  // async onDelete면 끝날 때까지 모달 유지, 동기면 즉시 닫기
                  if (promise && typeof promise.then === "function") { await promise; }
                  setConfirmDelete(false);
                }}
                disabled={deleting}
                className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-70">
                {deleting && <span className="inline-block w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" aria-hidden="true"/>}
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
      {reportSheet && (
        <div className="fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-end p-0 animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setReportSheet(null)}/>
          <div className={cls("relative w-full rounded-t-3xl p-5 shadow-2xl animate-slide-up pb-safe-plus", dark ? "bg-gray-900" : "bg-white")}>
            <p className={cls("text-sm font-black text-center", dark ? "text-white" : "text-gray-900")}>신고 사유 선택</p>
            <p className={cls("text-xs text-center mt-1 opacity-70", dark ? "text-gray-400" : "text-gray-600")}>허위 신고는 계정 제재 사유가 될 수 있어요</p>
            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r0) => (
                <button key={r0.key} onClick={() => submitReport(r0.key)}
                  className={cls("w-full py-3 rounded-2xl text-sm font-bold text-left px-4 active:scale-[0.98] transition",
                    dark ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-100 text-gray-800 hover:bg-gray-200")}>
                  {r0.label}
                </button>
              ))}
            </div>
            <button onClick={() => setReportSheet(null)}
              className={cls("w-full mt-3 py-3 rounded-2xl font-bold text-sm", dark ? "text-gray-400" : "text-gray-500")}>
              취소
            </button>
          </div>
        </div>
      )}

      <Suspense fallback={null}>{shareOpen && (
        <ShareCardModal review={r} onClose={() => setShareOpen(false)} dark={dark} user={user}/>
      )}</Suspense>
    </div>
  );
};

// 해시태그 칩 입력 — 띄어쓰기 자동완성에 방해받지 않도록 Enter/쉼표로 추가, 클릭/Backspace 로 제거.
// 외부와는 공백 구분 string 으로 호환 (기존 submit/draft 저장 그대로 사용).
const FollowListModal = ({ title, userId, fetchFn, currentUser, following, onToggleFollow, onClose, onUserClick, dark }) => {
  const [exiting, close] = useExit(onClose);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchFn(userId).then(({ data }) => { setList(data || []); setLoading(false); });
  }, [userId]);
  return (
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close}><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>{title}</p>
        <div className="w-6"/>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && <p className={cls("text-center text-sm py-8", dark ? "text-gray-500" : "text-gray-400")}>불러오는 중...</p>}
        {!loading && list.length === 0 && (
          <div className={cls("py-12 text-center", dark ? "text-gray-400" : "text-gray-500")}>
            <p className={cls("text-sm font-bold", dark ? "text-gray-200" : "text-gray-800")}>
              {title === "팔로워" ? "아직 팔로워가 없어요" : "아직 팔로우한 사용자가 없어요"}
            </p>
            <p className="text-xs mt-1.5 opacity-80">
              {title === "팔로워"
                ? "활발히 글을 남겨보세요. 좋아요와 팔로워가 늘어날 거예요"
                : "관심 있는 사용자를 팔로우해 보세요"}
            </p>
          </div>
        )}
        {list.map((u) => {
          const isMe = currentUser?.id === u.id;
          const isFollowed = following.has(u.id);
          return (
            <div key={u.id} className={cls("flex items-center gap-3 p-3 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
              <button onClick={() => { close(); setTimeout(() => onUserClick({ author: u.nickname, avatar: u.avatar, userId: u.id }), 280); }} className="shrink-0">
                <Avatar id={u.avatar || ""} size={20} className="w-11 h-11" rounded="rounded-full"/>
              </button>
              <button onClick={() => { close(); setTimeout(() => onUserClick({ author: u.nickname, avatar: u.avatar, userId: u.id }), 280); }} className="flex-1 text-left min-w-0">
                <p className={cls("text-sm font-bold truncate", dark ? "text-white" : "text-gray-900")}>{u.nickname || "사용자"}</p>
              </button>
              {!isMe && currentUser && (
                <button onClick={() => onToggleFollow(u.id, u.nickname)}
                  className={cls("px-4 py-1.5 rounded-full text-xs font-bold transition active:scale-95 shrink-0",
                    isFollowed
                      ? dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                      : "bg-brand-500 text-white")}>
                  {isFollowed ? "팔로잉" : "팔로우"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const UserProfileScreen = ({ author, avatar, userId, reviews, currentUser, isFollowing, onToggleFollow, following, onClose, onOpen, onUserClick, dark }) => {
  const [exiting, close] = useExit(onClose);
  const userData = SEED_USERS[author];
  const seedReviews = userData ? userData.reviewIds.map((id) => SEED_REVIEWS.find((r) => r.id === id)).filter(Boolean) : [];
  const userReviews = reviews.filter((r) => r.author === author);
  const allReviews = [...userReviews, ...seedReviews];
  const finalAvatar = avatar || userData?.avatar || "";
  const isMe = currentUser && currentUser.nickname === author;
  const canFollow = !!userId && !isMe && !!currentUser;

  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [followListOpen, setFollowListOpen] = useState(null); // "followers" | "following" | null

  useEffect(() => {
    if (userId) supabaseFollows.counts(userId).then(setCounts);
  }, [userId, isFollowing]);

  return (
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-40 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col overflow-x-hidden", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center gap-3 p-4 border-b", dark ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-gray-100")}>
        <button onClick={close} aria-label="뒤로" className="shrink-0"><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("flex-1 min-w-0 text-sm font-bold text-center truncate", dark ? "text-white" : "text-gray-900")}>{author}</p>
        <div className="w-6 shrink-0"/>
      </header>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-6 py-6 text-center">
          <Avatar id={finalAvatar} size={48} className="w-24 h-24 mx-auto shadow-lg" rounded="rounded-full"/>
          <h2 className={cls("text-2xl font-black mt-4 tracking-tight break-words", dark ? "text-white" : "text-gray-900")}>{author}</h2>
          <p className={cls("text-xs mt-1.5 max-w-xs mx-auto line-clamp-3 break-words", dark ? "text-gray-400" : "text-gray-500")}>
            {userData?.bio || (allReviews.length > 0 ? `${allReviews.length}개의 웨이로그를 기록 중` : "웨이로그 멤버")}
          </p>

          <div className={cls("grid grid-cols-3 items-center mt-5 py-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
            <div className="text-center min-w-0 px-2">
              <p className={cls("text-lg font-black tabular-nums truncate", dark ? "text-white" : "text-gray-900")}>{allReviews.length}</p>
              <p className={cls("text-[11px] font-bold mt-0.5 truncate", dark ? "text-gray-500" : "text-gray-500")}>게시물</p>
            </div>
            <button onClick={() => userId && setFollowListOpen("followers")}
              className={cls("text-center min-w-0 px-2 border-x active:scale-95 transition", dark ? "border-gray-700" : "border-gray-200")}>
              <p className={cls("text-lg font-black tabular-nums truncate", dark ? "text-white" : "text-gray-900")}>{counts.followers}</p>
              <p className={cls("text-[11px] font-bold mt-0.5 truncate", dark ? "text-gray-500" : "text-gray-500")}>팔로워</p>
            </button>
            <button onClick={() => userId && setFollowListOpen("following")}
              className="text-center min-w-0 px-2 active:scale-95 transition">
              <p className={cls("text-lg font-black tabular-nums truncate", dark ? "text-white" : "text-gray-900")}>{counts.following}</p>
              <p className={cls("text-[11px] font-bold mt-0.5 truncate", dark ? "text-gray-500" : "text-gray-500")}>팔로잉</p>
            </button>
          </div>

          {canFollow && (
            <button onClick={() => onToggleFollow()}
              className={cls("mt-4 px-8 py-2.5 rounded-full font-black text-sm transition active:scale-95 inline-flex items-center gap-2",
                isFollowing
                  ? dark ? "bg-gray-800 text-gray-300 border border-gray-700" : "bg-white text-gray-700 border border-gray-200"
                  : "bg-brand-500 text-white shadow-lg shadow-brand-500/30")}>
              {isFollowing ? <><Check size={14}/> 팔로잉</> : <><Plus size={14}/> 팔로우</>}
            </button>
          )}
        </div>

        <div className="pb-20">
          <p className={cls("text-xs font-bold uppercase tracking-wider mb-3 px-5", dark ? "text-gray-500" : "text-gray-500")}>웨이로그</p>
          {allReviews.length === 0 ? (
            <div className={cls("mx-4 py-12 text-center rounded-2xl border-2 border-dashed", dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400")}>
              <PenLine size={32} strokeWidth={1.5} className="mx-auto mb-2 opacity-50"/>
              <p className="text-xs font-medium">아직 작성한 웨이로그가 없어요</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {allReviews.map((r, i) => (
                <div key={r.id} className="animate-card-enter" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                  <Card r={r} onOpen={(x) => { close(); setTimeout(() => onOpen(x), 280); }} isFav={false} toggleFav={() => {}} dark={dark}/>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {followListOpen && userId && (
        <FollowListModal
          title={followListOpen === "followers" ? "팔로워" : "팔로잉"}
          userId={userId}
          fetchFn={followListOpen === "followers" ? supabaseFollows.listFollowers : supabaseFollows.listFollowing}
          currentUser={currentUser}
          following={following}
          onToggleFollow={onToggleFollow}
          onClose={() => setFollowListOpen(null)}
          onUserClick={(u) => { setFollowListOpen(null); close(); setTimeout(() => onUserClick(u), 280); }}
          dark={dark}/>
      )}
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
  const [reanalyzing, setReanalyzing] = useState(false);
  const reanalyzeTimer = useRef(null);

  const mealLabels = { breakfast: "아침", lunch: "점심", dinner: "저녁" };

  // 이름 변경 시 디바운스 후 AI 재분석
  const handleNameChange = (newName) => {
    setEditName(newName);
    if (reanalyzeTimer.current) clearTimeout(reanalyzeTimer.current);
    if (!newName.trim() || newName.trim() === result?.name) return;
    reanalyzeTimer.current = setTimeout(async () => {
      setReanalyzing(true);
      const prompt = `"${newName.trim()}" 한 인분의 영양 정보를 추정해주세요. JSON만 응답: {"cal":칼로리숫자,"protein":단백질g,"carb":탄수화물g,"fat":지방g}`;
      const text = await callClaude(prompt, 150);
      const block = extractJsonBlock(text);
      if (block) {
        try {
          const parsed = JSON.parse(block);
          setEditCal(String(parsed.cal || 0));
          setEditProtein(String(parsed.protein || 0));
          setEditCarb(String(parsed.carb || 0));
          setEditFat(String(parsed.fat || 0));
        } catch {}
      }
      setReanalyzing(false);
    }, 800);
  };

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
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setPhoto(dataUrl);
        // photo 세팅 완료 후 Vision 분석 시작
        setAnalyzing(true);
        aiMealAnalysis(mealType, dataUrl).then((ai) => {
          setResult(ai);
          setEditName(ai.name);
          setEditCal(String(ai.cal));
          setEditProtein(String(ai.protein));
          setEditCarb(String(ai.carb));
          setEditFat(String(ai.fat));
          setAnalyzing(false);
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
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
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-end", exiting ? "" : "animate-fade-in")}>
      <div className={cls("absolute inset-0 bg-black/50", exiting ? "animate-fade-out" : "")} onClick={close}/>
      <div className={cls("relative w-full rounded-t-3xl p-6 shadow-2xl pb-safe max-h-[85vh] overflow-y-auto", dark ? "bg-gray-900" : "bg-white", exiting ? "animate-slide-down" : "animate-slide-up")}>
        <div className={cls("w-12 h-1 rounded-full mx-auto mb-4", dark ? "bg-gray-700" : "bg-gray-300")}/>
        <h3 className={cls("text-lg font-black mb-1", dark ? "text-white" : "text-gray-900")}>
          {mealLabels[mealType] || "식사"} 기록
        </h3>
        <p className={cls("text-xs mb-4", dark ? "text-gray-400" : "text-gray-500")}>
          사진을 올리면 AI가 음식과 영양 정보를 자동으로 분석해요
        </p>

        {!photo && !analyzing && (
          <label className={cls("flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed cursor-pointer transition active:scale-[0.98]",
            dark ? "border-gray-700 bg-gray-800/50 text-gray-400" : "border-brand-200 bg-brand-50/50 text-gray-500")}>
            <Camera size={36} className="text-brand-500"/>
            <span className="text-sm font-bold">식단 사진 촬영 / 선택</span>
            <span className="text-xs opacity-70">사진을 올리면 AI가 자동 분석해요</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhoto}/>
          </label>
        )}

        {analyzing && (
          <div className={cls("py-12 rounded-2xl text-center", dark ? "bg-gray-800" : "bg-gray-50")}>
            <div className="w-16 h-16 rounded-full bg-brand-500 mx-auto flex items-center justify-center mb-4 animate-pulse">
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
                <img src={photo} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover"/>
              </div>
            )}
            <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-gray-50")}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>
                    {editMode ? "직접 수정" : "AI 분석 결과"}
                  </p>
                  {result.isFallback && !editMode && (
                    <p className={cls("text-xs mt-0.5", dark ? "text-amber-400" : "text-amber-600")}>AI 분석 실패 — 추천 식단으로 대체했어요. 직접 수정해주세요</p>
                  )}
                  {result.source === "vision" && !editMode && (
                    <p className={cls("text-xs mt-0.5", dark ? "text-brand-300" : "text-brand-600")}>사진 분석 결과예요. 맞지 않으면 수정해주세요</p>
                  )}
                </div>
                <button onClick={() => setEditMode(!editMode)}
                  className={cls("text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0", dark ? "bg-gray-700 text-gray-300" : "bg-white text-gray-600")}>
                  {editMode ? "자동 결과 보기" : "수정하기"}
                </button>
              </div>
              {editMode ? (
                <div className="space-y-2">
                  <div className="relative">
                    <input value={editName} onChange={(e) => handleNameChange(e.target.value)} placeholder="음식 이름"
                      className={cls("w-full px-3 py-2 rounded-xl text-sm font-bold", dark ? "bg-gray-700 text-white" : "bg-white text-gray-900")}/>
                    {reanalyzing && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <RefreshCw size={14} className={cls("animate-spin", dark ? "text-brand-300" : "text-brand-500")}/>
                      </div>
                    )}
                  </div>
                  {reanalyzing && (
                    <p className={cls("text-xs font-medium mt-1", dark ? "text-brand-300" : "text-brand-600")}>
                      "{editName}" 영양 정보 재분석 중...
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>칼로리</label>
                      <input value={editCal} onChange={(e) => setEditCal(e.target.value)} type="number" inputMode="numeric"
                        className={cls("w-full px-3 py-2 rounded-xl text-sm", dark ? "bg-gray-700 text-white" : "bg-white text-gray-900")}/>
                    </div>
                    <div>
                      <label className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>단백질(g)</label>
                      <input value={editProtein} onChange={(e) => setEditProtein(e.target.value)} type="number" inputMode="numeric"
                        className={cls("w-full px-3 py-2 rounded-xl text-sm", dark ? "bg-gray-700 text-white" : "bg-white text-gray-900")}/>
                    </div>
                    <div>
                      <label className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>탄수화물(g)</label>
                      <input value={editCarb} onChange={(e) => setEditCarb(e.target.value)} type="number" inputMode="numeric"
                        className={cls("w-full px-3 py-2 rounded-xl text-sm", dark ? "bg-gray-700 text-white" : "bg-white text-gray-900")}/>
                    </div>
                    <div>
                      <label className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>지방(g)</label>
                      <input value={editFat} onChange={(e) => setEditFat(e.target.value)} type="number" inputMode="numeric"
                        className={cls("w-full px-3 py-2 rounded-xl text-sm", dark ? "bg-gray-700 text-white" : "bg-white text-gray-900")}/>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className={cls("text-base font-bold mb-3", dark ? "text-white" : "text-gray-900")}>{result.name}</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className={cls("p-2 rounded-xl", dark ? "bg-gray-700" : "bg-white")}>
                      <p className="text-lg font-black text-brand-500">{result.cal}</p>
                      <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>kcal</p>
                    </div>
                    <div className={cls("p-2 rounded-xl", dark ? "bg-gray-700" : "bg-white")}>
                      <p className="text-lg font-black text-blue-500">{result.protein}g</p>
                      <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>단백질</p>
                    </div>
                    <div className={cls("p-2 rounded-xl", dark ? "bg-gray-700" : "bg-white")}>
                      <p className="text-lg font-black text-amber-500">{result.carb}g</p>
                      <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>탄수화물</p>
                    </div>
                    <div className={cls("p-2 rounded-xl", dark ? "bg-gray-700" : "bg-white")}>
                      <p className="text-lg font-black text-rose-500">{result.fat}g</p>
                      <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>지방</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={handleSave}
              className="w-full py-3.5 bg-brand-500 text-white rounded-2xl font-black text-sm shadow-lg active:scale-[0.98] transition">
              저장하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ExerciseModal = ({ onClose, onSave, dark, editing = null }) => {
  const [exiting, close] = useExit(onClose);
  const [type, setType] = useState(editing?.type || null);
  const [minutes, setMinutes] = useState(editing ? String(editing.minutes) : "");
  const [intensity, setIntensity] = useState(editing?.intensity || "mid");

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
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-end", exiting ? "" : "animate-fade-in")}>
      <div className={cls("absolute inset-0 bg-black/50", exiting ? "animate-fade-out" : "")} onClick={close}/>
      <div className={cls("relative w-full rounded-t-3xl p-6 shadow-2xl pb-safe", dark ? "bg-gray-900" : "bg-white", exiting ? "animate-slide-down" : "animate-slide-up")}>
        <div className={cls("w-12 h-1 rounded-full mx-auto mb-4", dark ? "bg-gray-700" : "bg-gray-300")}/>
        <h3 className={cls("text-lg font-black mb-4", dark ? "text-white" : "text-gray-900")}>{editing ? "운동 수정" : "운동 기록"}</h3>

        <p className={cls("text-xs font-bold mb-2", dark ? "text-gray-400" : "text-gray-500")}>운동 종류</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {EXERCISE_TYPES.map((et) => (
            <button key={et.key} onClick={() => setType(et.key)}
              className={cls("p-3 rounded-2xl flex flex-col items-center gap-1.5 transition active:scale-95",
                type === et.key
                  ? "bg-brand-500 text-white shadow-lg"
                  : dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700")}>
              <et.Icon size={20}/>
              <span className="text-xs font-bold">{et.label}</span>
            </button>
          ))}
        </div>

        <p className={cls("text-xs font-bold mb-2", dark ? "text-gray-400" : "text-gray-500")}>시간 (분)</p>
        <input value={minutes} onChange={(e) => setMinutes(e.target.value)} type="number" inputMode="numeric" placeholder="30"
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
          <div className={cls("p-4 rounded-2xl mb-4 text-center", dark ? "bg-gray-800" : "bg-brand-50")}>
            <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>예상 소비 칼로리</p>
            <p className="text-3xl font-black text-brand-500 mt-1">{calc()} <span className="text-sm">kcal</span></p>
          </div>
        )}

        <button onClick={handleSave} disabled={!type || !minutes || parseInt(minutes) <= 0}
          className={cls("w-full py-3.5 rounded-2xl font-black text-sm shadow-lg active:scale-[0.98] transition",
            type && minutes && parseInt(minutes) > 0
              ? "bg-brand-500 text-white"
              : dark ? "bg-gray-800 text-gray-600" : "bg-gray-200 text-gray-400")}>
          {editing ? "수정 완료" : "저장하기"}
        </button>
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
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>변화 그래프</p>
        <button onClick={handleSaveImage} aria-label="이미지 저장" className="text-brand-500"><Download size={20}/></button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className={cls("flex gap-1 p-1 rounded-2xl", dark ? "bg-gray-800" : "bg-gray-100")}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cls("flex-1 py-2 rounded-xl text-xs font-bold transition",
                activeTab === t.key ? "bg-brand-500 text-white shadow" : dark ? "text-gray-400" : "text-gray-500")}>
              {t.label}
            </button>
          ))}
        </div>

        <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-white")}>
          {points.length < 2 ? (
            <div className="py-12 text-center">
              <BarChart3 size={36} className={cls("mx-auto mb-3 opacity-30", dark ? "text-gray-400" : "text-gray-500")}/>
              <p className={cls("text-sm font-bold", dark ? "text-gray-400" : "text-gray-500")}>데이터가 2개 이상 필요해요</p>
              <p className={cls("text-xs mt-1", dark ? "text-gray-400" : "text-gray-500")}>
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
                const color = activeTab === "bodyFat" ? "#f43f5e" : activeTab === "muscle" ? "#8b5cf6" : activeTab === "calories" ? "#f59e0b" : "#0071CE";
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

        {/* 목표 칼로리 표시 제거됨 */}
      </div>
    </div>
  );
};


const DailyReportCard = ({ challenge, dailyLogs, dark }) => {
  // Hooks 는 early return 보다 앞에 와야 한다 (react-hooks/rules-of-hooks).
  const dayNum = getChallengeDay(challenge?.startDate);
  const today = new Date().toISOString().slice(0, 10);
  const todayLog = dailyLogs?.[today];
  const now = new Date().getHours();

  const totalCal = (todayLog?.meals || []).reduce((s, m) => s + (m.cal || 0), 0);
  const totalBurned = (todayLog?.exercises || []).reduce((s, e) => s + (e.calories || 0), 0);
  const completedMissions = (todayLog?.completedMissions || []).length;
  const weekNum = getChallengeWeek(dayNum);
  const totalMissions = CHALLENGE_MISSIONS[weekNum - 1]?.missions?.length || 5;
  const rate = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;

  const [encouragement, setEncouragement] = useState(
    rate >= 80 ? "오늘 하루 정말 잘 보냈어요! 내일도 이 기세로!" : rate >= 50 ? "절반 이상 달성! 조금만 더 힘내봐요." : "내일은 더 좋은 하루가 될 거예요. 화이팅!"
  );
  useEffect(() => {
    if (now < 22 || !todayLog) return;
    let alive = true;
    aiDailyReport(totalCal, totalBurned, completedMissions, totalMissions)
      .then((msg) => { if (alive) setEncouragement(msg); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, totalCal, totalBurned, completedMissions, totalMissions]);

  // 렌더 skip 은 hooks 호출 이후에
  if (now < 22 || !todayLog) return null;

  return (
    <div className={cls("p-4 rounded-2xl mt-4", dark ? "bg-gray-800" : "bg-white")}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <BarChart3 size={16} className="text-white"/>
        </div>
        <div>
          <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>오늘의 리포트</p>
          <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>Day {dayNum} · AI 분석</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className={cls("p-2 rounded-xl text-center", dark ? "bg-gray-700" : "bg-gray-50")}>
          <p className="text-base font-black text-brand-500">{totalCal}</p>
          <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>섭취 kcal</p>
        </div>
        <div className={cls("p-2 rounded-xl text-center", dark ? "bg-gray-700" : "bg-gray-50")}>
          <p className="text-base font-black text-amber-500">{totalBurned}</p>
          <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>소비 kcal</p>
        </div>
        <div className={cls("p-2 rounded-xl text-center", dark ? "bg-gray-700" : "bg-gray-50")}>
          <p className="text-base font-black text-violet-500">{rate}%</p>
          <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>미션 달성</p>
        </div>
      </div>
      <p className={cls("text-xs p-3 rounded-xl italic leading-relaxed", dark ? "bg-gray-700 text-gray-300" : "bg-brand-50 text-brand-700")}>
        "{encouragement}"
      </p>
    </div>
  );
};


// 미션 편집 모달에서 사용자가 고를 수 있는 아이콘 (탭으로 순환).
// 전체 MISSION_ICONS 중 의미 있는 서브셋만 노출 — UI 과부하 방지.
const MISSION_EDIT_ICONS = [
  "water", "shake", "photo", "walk", "stretch", "protein", "snack",
  "cardio", "strength", "sleep", "inbody", "review", "hiit",
  "scale", "meat", "write", "plan", "trophy", "fire", "selfie",
];

const MissionEditModal = ({ weekNum, title, missions, hasCustom, onSave, onReset, onClose, dark }) => {
  const [exiting, close] = useExit(onClose);
  const [editTitle, setEditTitle] = useState(title || `Week ${weekNum}`);
  const [items, setItems] = useState(() => (missions || []).map((m) => ({ ...m })));

  const setLabel = (idx, v) => setItems((prev) => prev.map((m, i) => i === idx ? { ...m, label: v } : m));
  const cycleIcon = (idx) => setItems((prev) => prev.map((m, i) => {
    if (i !== idx) return m;
    const cur = MISSION_EDIT_ICONS.indexOf(m.icon);
    return { ...m, icon: MISSION_EDIT_ICONS[(cur + 1) % MISSION_EDIT_ICONS.length] };
  }));
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const addItem = () => setItems((prev) => [...prev, { id: `w${weekNum}_c${Date.now()}`, label: "", icon: "plan" }]);

  const cleaned = items.filter((m) => (m.label || "").trim().length > 0).map((m) => ({ ...m, label: m.label.trim() }));
  const canSave = cleaned.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ title: (editTitle || "").trim() || `Week ${weekNum}`, missions: cleaned });
    close();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto">
      <div className={cls("absolute inset-0 bg-black/50", exiting ? "animate-fade-out" : "animate-fade-in")} onClick={close}/>
      <div className={cls("relative w-full rounded-t-3xl p-6 shadow-2xl pb-safe max-h-[88vh] overflow-y-auto",
        dark ? "bg-gray-900" : "bg-white",
        exiting ? "animate-slide-down" : "animate-slide-up")}>
        <div className={cls("w-12 h-1 rounded-full mx-auto mb-4", dark ? "bg-gray-700" : "bg-gray-300")}/>
        <h3 className={cls("text-lg font-black mb-1", dark ? "text-white" : "text-gray-900")}>Week {weekNum} 미션 편집</h3>
        <p className={cls("text-xs mb-4", dark ? "text-gray-400" : "text-gray-500")}>
          내게 맞는 습관으로 바꿔보세요. 아이콘은 탭해서 다른 걸로 바꿀 수 있어요.
        </p>

        <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>주차 제목</label>
        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={20}
          className={cls("w-full px-3 py-2 rounded-xl text-sm font-bold mb-4 outline-none",
            dark ? "bg-gray-800 text-white placeholder-gray-500" : "bg-gray-100 text-gray-900 placeholder-gray-400")}/>

        <label className={cls("text-xs font-bold block mb-1.5", dark ? "text-gray-300" : "text-gray-600")}>미션 목록</label>
        <div className="space-y-2">
          {items.map((m, idx) => (
            <div key={m.id} className={cls("flex items-center gap-2 p-2 rounded-xl", dark ? "bg-gray-800" : "bg-gray-100")}>
              <button type="button" onClick={() => cycleIcon(idx)} aria-label="아이콘 변경"
                className={cls("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 active:scale-90 transition",
                  dark ? "bg-gray-700" : "bg-white")}>
                <MissionIcon iconKey={m.icon} size={16} className="text-brand-500"/>
              </button>
              <input value={m.label} onChange={(e) => setLabel(idx, e.target.value)} placeholder="미션 이름" maxLength={40}
                className={cls("flex-1 bg-transparent outline-none text-sm font-medium min-w-0",
                  dark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400")}/>
              <button type="button" onClick={() => removeItem(idx)} aria-label="미션 삭제"
                className={cls("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 active:scale-90 transition",
                  dark ? "text-gray-500 hover:text-rose-400" : "text-gray-400 hover:text-rose-500")}>
                <X size={16}/>
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <p className={cls("text-xs text-center py-6", dark ? "text-gray-400" : "text-gray-500")}>
              미션이 없어요. 아래 버튼으로 추가해주세요.
            </p>
          )}
        </div>

        <button type="button" onClick={addItem}
          className={cls("w-full mt-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 border-2 border-dashed active:scale-[0.98] transition",
            dark ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-500")}>
          <Plus size={14}/> 미션 추가
        </button>

        <div className={cls("grid gap-2 mt-5", hasCustom ? "grid-cols-2" : "grid-cols-1")}>
          {hasCustom && (
            <button type="button" onClick={() => { onReset(); close(); }}
              className={cls("py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition",
                dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700")}>
              기본값으로 되돌리기
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={!canSave}
            className={cls("py-3 rounded-xl text-sm font-bold bg-brand-500 text-white active:scale-[0.98] transition",
              !canSave && "opacity-50 cursor-not-allowed")}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

const ChallengeMainScreen = ({ challenge, setChallenge, dailyLogs, setDailyLogs, inbodyRecords, setInbodyRecords, onClose, dark, user, onAnalyzeInbody, onToast }) => {
  // setToast 는 Context 에서 구독 — prop drilling 제거
  const { setToast: onShowToast } = useAppContext();
  const [exiting, close] = useExit(onClose);
  const [subTab, setSubTab] = useState("today");
  const [mealModal, setMealModal] = useState(null);
  const [exerciseModal, setExerciseModal] = useState(false);
  const [inbodyOpen, setInbodyOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [missionEditOpen, setMissionEditOpen] = useState(false);
  const [missionToast, setMissionToast] = useState("");
  // 챌린지 포기 확인 모달 — 파괴적 액션이라 명시적 2단계 확인
  const [abandonOpen, setAbandonOpen] = useState(false);

  const dayNum = getChallengeDay(challenge?.startDate);
  const weekNum = getChallengeWeek(dayNum);
  // 사용자가 이 주차 미션을 편집했다면 override 사용, 아니면 기본값
  const defaultWeek = CHALLENGE_MISSIONS[weekNum - 1] || CHALLENGE_MISSIONS[0];
  const customForWeek = challenge?.customMissions?.[weekNum];
  const weekMissions = customForWeek && Array.isArray(customForWeek.missions) && customForWeek.missions.length > 0
    ? { week: weekNum, title: customForWeek.title || defaultWeek.title, missions: customForWeek.missions }
    : defaultWeek;
  const hasCustomThisWeek = !!customForWeek;

  const saveCustomMissions = ({ title, missions }) => {
    if (!setChallenge) return;
    setChallenge((prev) => prev ? ({
      ...prev,
      customMissions: { ...(prev.customMissions || {}), [weekNum]: { title, missions } },
    }) : prev);
    onShowToast && onShowToast("미션이 수정됐어요");
  };
  const resetCustomMissions = () => {
    if (!setChallenge) return;
    setChallenge((prev) => {
      if (!prev?.customMissions) return prev;
      const next = { ...prev.customMissions };
      delete next[weekNum];
      return { ...prev, customMissions: next };
    });
    onShowToast && onShowToast("기본 미션으로 되돌렸어요");
  };
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

  const [editingExercise, setEditingExercise] = useState(null); // { index, data }

  const updateExercise = (ex) => {
    if (editingExercise == null) return;
    const idx = editingExercise.index;
    updateTodayLog((log) => ({
      ...log,
      exercises: log.exercises.map((e, i) => (i === idx ? { ...ex, time: e.time } : e)),
    }));
    setEditingExercise(null);
    onShowToast && onShowToast("운동이 수정됐어요");
  };

  const deleteExercise = (idx) => {
    updateTodayLog((log) => ({
      ...log,
      exercises: log.exercises.filter((_, i) => i !== idx),
    }));
    onShowToast && onShowToast("운동이 삭제됐어요");
  };

  // 변화량 계산 (시작 vs 최근)
  const sortedInbody = [...(inbodyRecords || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstInbody = sortedInbody[0];
  const latestInbody = sortedInbody[sortedInbody.length - 1];

  const [coachMsg, setCoachMsg] = useState("");
  useEffect(() => {
    let alive = true;
    aiCoachMessage(challenge?.coachTone || "cheerful", dayNum, completedCount, weekMissions.missions.length)
      .then((msg) => { if (alive) setCoachMsg(msg); });
    return () => { alive = false; };
  }, [challenge?.coachTone, dayNum, completedCount, weekMissions.missions.length]);

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
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-40 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <header className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
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
                      <stop offset="0%" stopColor="#0071CE"/>
                      <stop offset="100%" stopColor="#f59e0b"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className={cls("text-[11px] font-semibold", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>D+{dayNum}</p>
                  <p className={cls("text-[24px] font-bold tabular-nums", dark ? "text-white" : "text-black")}>{Math.round(progress * 100)}%</p>
                  <p className={cls("text-[11px] tabular-nums", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{dayNum}/{CHALLENGE_DAYS}일</p>
                </div>
              </div>
            </div>

            {/* 변화량 */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "체중", val: firstInbody && latestInbody ? (latestInbody.weight - firstInbody.weight).toFixed(1) : "-", unit: "kg" },
                { label: "체지방", val: firstInbody && latestInbody ? (latestInbody.bodyFat - firstInbody.bodyFat).toFixed(1) : "-", unit: "%" },
                { label: "근육량", val: firstInbody && latestInbody ? (latestInbody.muscle - firstInbody.muscle).toFixed(1) : "-", unit: "kg" },
              ].map((s) => {
                const isPositive = s.val !== "-" && parseFloat(s.val) > 0;
                const isNegative = s.val !== "-" && parseFloat(s.val) < 0;
                return (
                  <div key={s.label} className={cls("p-3 rounded-xl text-center border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
                    <p className={cls("text-[11px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{s.label}</p>
                    <p className={cls("text-[16px] font-bold tabular-nums mt-0.5",
                      isPositive ? "text-brand-500" : isNegative ? "text-red-500" : (dark ? "text-white" : "text-black"))}>
                      {isPositive ? "+" : ""}{s.val}
                      <span className="text-[11px] font-medium opacity-60">{s.unit}</span>
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 주 2kg 이상 감량 경고 */}
            {weeklyWeightLoss > 2 && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                <Flame size={14} className="text-red-500 mt-0.5 shrink-0"/>
                <p className="text-[13px] text-red-500">
                  주간 {weeklyWeightLoss.toFixed(1)}kg 감량은 과도할 수 있어요. 건강한 속도로 진행해주세요.
                </p>
              </div>
            )}

            {/* Streak */}
            {streak > 0 && (
              <div className={cls("flex items-center gap-2 px-4 py-3 rounded-xl border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
                <Flame size={18} className="text-amber-500"/>
                <p className={cls("text-[14px] font-semibold", dark ? "text-white" : "text-black")}>{streak}일 연속 기록 중</p>
              </div>
            )}

            {/* 주간 미션 */}
            <div className={cls("p-4 rounded-xl border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={cls("text-[14px] font-semibold truncate", dark ? "text-white" : "text-black")}>
                      Week {weekNum} · {weekMissions.title}
                    </p>
                    {hasCustomThisWeek && (
                      <span className={cls("text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                        dark ? "bg-[#262626] text-white" : "bg-[#efefef] text-black")}>
                        내 미션
                      </span>
                    )}
                  </div>
                  <p className={cls("text-[12px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                    오늘의 미션 {completedCount}/{weekMissions.missions.length}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setMissionEditOpen(true)} aria-label="미션 편집"
                    className={cls("w-8 h-8 rounded-full flex items-center justify-center active:opacity-60 transition",
                      dark ? "bg-[#262626] text-white" : "bg-white text-black")}>
                    <PenLine size={13}/>
                  </button>
                  <div className={cls("px-2.5 py-1 rounded text-[11px] font-bold tabular-nums",
                    completedCount === weekMissions.missions.length
                      ? "bg-brand-500 text-white"
                      : (dark ? "bg-[#262626] text-[#a8a8a8]" : "bg-white text-[#737373]"))}>
                    {completedCount === weekMissions.missions.length ? "완료" : `${Math.round((completedCount / weekMissions.missions.length) * 100)}%`}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                {weekMissions.missions.map((m) => {
                  const done = todayLog.completedMissions.includes(m.id);
                  return (
                    <button key={m.id} onClick={() => toggleMission(m.id)}
                      className={cls("w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition active:opacity-70",
                        done ? (dark ? "bg-[#262626]" : "bg-white") : (dark ? "bg-black" : "bg-white"))}>
                      <div className={cls("w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                        done ? "border-brand-500 bg-brand-500" : (dark ? "border-[#262626]" : "border-[#dbdbdb]"))}>
                        {done && <Check size={12} className="text-white" strokeWidth={3}/>}
                      </div>
                      <MissionIcon iconKey={m.icon} size={14} className={cls("shrink-0 mt-1", done ? "text-brand-500" : (dark ? "text-[#a8a8a8]" : "text-[#737373]"))}/>
                      <span className={cls("text-[13px] flex-1 min-w-0 break-words leading-snug", done ? "line-through opacity-60" : "", dark ? "text-white" : "text-black")}>
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 오늘의 식단 */}
            <div className={cls("p-4 rounded-xl border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
              <div className="flex items-center justify-between mb-3">
                <p className={cls("text-[14px] font-semibold", dark ? "text-white" : "text-black")}>오늘의 식단</p>
                <p className={cls("text-[12px] font-semibold tabular-nums", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                  {totalCalToday} kcal
                </p>
              </div>
              <div className="space-y-1.5">
                {["breakfast", "lunch", "dinner"].map((mt) => {
                  const meal = todayLog.meals.find((m) => m.mealType === mt);
                  const labels = { breakfast: "아침", lunch: "점심", dinner: "저녁" };
                  return (
                    <button key={mt} onClick={() => !meal && setMealModal(mt)}
                      className={cls("w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition active:opacity-70",
                        dark ? "bg-black" : "bg-white")}>
                      {meal?.photo ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                          <img src={meal.photo} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover"/>
                        </div>
                      ) : (
                        <div className={cls("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", dark ? "bg-[#262626]" : "bg-[#efefef]")}>
                          <Camera size={14} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cls("text-[11px] font-semibold", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{labels[mt]}</p>
                        <p className={cls("text-[13px] font-semibold truncate", dark ? "text-white" : "text-black")}>
                          {meal ? meal.name : "기록하기"}
                        </p>
                      </div>
                      {meal && <span className={cls("text-[12px] font-semibold tabular-nums shrink-0", dark ? "text-brand-300" : "text-brand-600")}>{meal.cal}kcal</span>}
                      {!meal && <Plus size={14} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 오늘의 운동 */}
            <div className={cls("p-4 rounded-xl border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
              <div className="flex items-center justify-between mb-3">
                <p className={cls("text-[14px] font-semibold", dark ? "text-white" : "text-black")}>오늘의 운동</p>
                <p className={cls("text-[12px] font-semibold tabular-nums", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{totalBurnedToday} kcal 소비</p>
              </div>
              {todayLog.exercises.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {todayLog.exercises.map((ex, i) => (
                    <div key={i} className={cls("flex items-center gap-3 p-2 rounded-lg", dark ? "bg-black" : "bg-white")}>
                      <MissionIcon iconKey={ex.iconKey || ex.type || "free"} size={16} className={dark ? "text-white" : "text-black"}/>
                      <div className="flex-1 min-w-0">
                        <p className={cls("text-[13px] font-semibold", dark ? "text-white" : "text-black")}>{ex.label}</p>
                        <p className={cls("text-[11px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>{ex.minutes}분 · {ex.intensity === "low" ? "저" : ex.intensity === "mid" ? "중" : "고"}강도</p>
                      </div>
                      <span className={cls("text-[12px] font-semibold shrink-0 tabular-nums", dark ? "text-white" : "text-black")}>{ex.calories}kcal</span>
                      <button onClick={() => setEditingExercise({ index: i, data: ex })}
                        className={cls("p-1.5 rounded shrink-0 transition active:opacity-60", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                        <PenLine size={13}/>
                      </button>
                      <button onClick={() => deleteExercise(i)}
                        className={cls("p-1.5 rounded shrink-0 transition active:opacity-60", dark ? "text-[#a8a8a8] hover:text-red-500" : "text-[#737373] hover:text-red-500")}>
                        <X size={13}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setExerciseModal(true)}
                className={cls("w-full py-2 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition active:opacity-70",
                  dark ? "bg-[#262626] text-white" : "bg-white text-black border border-[#dbdbdb]")}>
                <Plus size={14}/> 운동 추가
              </button>
            </div>

            {/* AI 코치 */}
            <div className={cls("p-4 rounded-xl border", dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
              <div className="flex items-center gap-2 mb-2">
                {(() => { const CoachIcon = AI_COACH_TONES.find((t) => t.key === challenge?.coachTone)?.Icon || Sparkles; return <CoachIcon size={16} className={dark ? "text-white" : "text-black"}/>; })()}
                <p className={cls("text-[14px] font-semibold", dark ? "text-white" : "text-black")}>AI 코치</p>
                <span className={cls("text-[11px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider", dark ? "bg-[#262626] text-[#a8a8a8]" : "bg-[#efefef] text-[#737373]")}>BETA</span>
              </div>
              <p className={cls("text-[14px] leading-relaxed", dark ? "text-white/90" : "text-black/90")}>
                {coachMsg}
              </p>
            </div>

            {/* 일일 리포트 */}
            <DailyReportCard challenge={challenge} dailyLogs={dailyLogs} dark={dark}/>

            {/* 챌린지 포기하기 — 파괴적 액션이라 색 약하게 숨김 톤, 아래쪽 배치 */}
            <button onClick={() => setAbandonOpen(true)}
              className={cls("w-full mt-2 py-2.5 rounded-xl text-xs font-medium transition",
                dark ? "text-gray-500 hover:text-rose-400 hover:bg-gray-800" : "text-gray-400 hover:text-rose-500 hover:bg-rose-50")}>
              챌린지 포기하기
            </button>
          </div>
        )}

      </div>

      {/* 하단 탭 */}
      <nav className={cls("border-t grid grid-cols-3 pt-2.5 pb-safe-plus", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
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
            <Icon size={20} className={subTab === k ? "text-brand-500" : dark ? "text-gray-400" : "text-gray-500"}/>
            <span className={cls("text-xs font-bold", subTab === k ? "text-brand-500" : dark ? "text-gray-400" : "text-gray-500")}>{label}</span>
          </button>
        ))}
      </nav>

      {/* Modals */}
      {mealModal && <MealUploadModal mealType={mealModal} onClose={() => setMealModal(null)} onSave={addMeal} dark={dark}/>}
      {exerciseModal && <ExerciseModal onClose={() => setExerciseModal(false)} onSave={addExercise} dark={dark}/>}
      {editingExercise && <ExerciseModal onClose={() => setEditingExercise(null)} onSave={updateExercise} dark={dark} editing={editingExercise.data}/>}
      <Suspense fallback={null}>{inbodyOpen && <InbodyScreen records={inbodyRecords} onAdd={(r) => setInbodyRecords((prev) => [...prev, r])} onClose={() => setInbodyOpen(false)} dark={dark}
        user={user} onAnalyzeImage={onAnalyzeInbody} onToast={onToast}/>}</Suspense>
      {graphOpen && <ChallengeGraphScreen challenge={challenge} dailyLogs={dailyLogs} inbodyRecords={inbodyRecords} onClose={() => setGraphOpen(false)} dark={dark}/>}
      {abandonOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center px-4">
          <div className={cls("w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-slide-up", dark ? "bg-gray-900" : "bg-white")}>
            <p className={cls("text-base font-black text-center", dark ? "text-white" : "text-gray-900")}>챌린지를 포기할까요?</p>
            <p className={cls("text-sm text-center mt-2 leading-relaxed", dark ? "text-gray-400" : "text-gray-600")}>
              D+{dayNum}일차까지의 기록은 유지되지만 챌린지는 초기화돼요.<br/>
              언제든 다시 시작할 수 있어요.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button onClick={() => setAbandonOpen(false)}
                className={cls("py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition",
                  dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700")}>
                계속 도전하기
              </button>
              <button onClick={() => {
                setAbandonOpen(false);
                setChallenge && setChallenge(null);
                onShowToast && onShowToast("챌린지를 포기했어요. 언제든 다시 시작할 수 있어요");
                close();
              }}
                className="py-3 rounded-xl text-sm font-bold bg-rose-500 text-white active:scale-[0.98] transition">
                포기하기
              </button>
            </div>
          </div>
        </div>
      )}
      {missionEditOpen && (
        <MissionEditModal
          weekNum={weekNum}
          title={weekMissions.title}
          missions={weekMissions.missions}
          hasCustom={hasCustomThisWeek}
          onSave={saveCustomMissions}
          onReset={resetCustomMissions}
          onClose={() => setMissionEditOpen(false)}
          dark={dark}
        />
      )}

      {/* Mission toast */}
      {missionToast && (
        <div
          style={{ bottom: "calc(7rem + env(safe-area-inset-bottom))" }}
          className="fixed inset-x-0 z-50 flex justify-center pointer-events-none px-4">
          <div className="bg-brand-500 text-white text-sm font-black px-5 py-3 rounded-full shadow-xl animate-toast">
            {missionToast}
          </div>
        </div>
      )}
    </div>
  );
};

const ChallengeEntryCard = ({ challenge, dailyLogs, dark, hero = false, onStart, onOpen, onResult }) => {
  if (!challenge) {
    return (
      <button onClick={onStart}
        className={cls("mx-4 mt-3 w-[calc(100%-2rem)] p-4 rounded-xl flex items-center gap-3 text-left border active:opacity-80 transition",
          dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-300 to-brand-700 flex items-center justify-center shrink-0">
          <Trophy size={18} className="text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className={cls("text-[14px] font-bold", dark ? "text-white" : "text-black")}>바디키 8주 챌린지</p>
          <p className={cls("text-[12px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>AI 코치와 함께 8주 변화 프로그램</p>
        </div>
        <ChevronRight size={16} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>
      </button>
    );
  }

  if (challenge.status === "completed") {
    return (
      <button onClick={onResult}
        className={cls("mx-4 mt-3 w-[calc(100%-2rem)] p-4 rounded-xl flex items-center gap-3 text-left border active:opacity-80 transition",
          dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
          <Trophy size={18} className="text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className={cls("text-[11px] font-bold uppercase tracking-wider", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>COMPLETED</p>
          <p className={cls("text-[14px] font-bold", dark ? "text-white" : "text-black")}>챌린지 완주</p>
          <p className={cls("text-[12px] mt-0.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>8주간의 여정을 확인해보세요</p>
        </div>
        <ChevronRight size={16} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>
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

  // 진행 중 + hero: 홈 상단의 메인 카드로 크게 노출 (Hero 카드를 대체)
  if (hero) {
    return (
      <div className="mx-4 mt-4 rounded-3xl p-6 bg-gradient-to-br from-brand-500 to-brand-300 text-white relative overflow-hidden shadow-xl">
        <Dumbbell className="absolute right-4 top-4 opacity-25" size={64}/>
        <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10"/>
        <p className="text-xs opacity-80 font-bold tracking-wider uppercase relative">8주 챌린지 · Week {weekNum}</p>
        <h2 className="text-3xl font-black mt-1 leading-[1.1] relative">D+{dayNum}<span className="text-lg font-bold opacity-70 ml-2">/ {CHALLENGE_DAYS}</span></h2>
        <p className="text-sm font-medium mt-2 opacity-90 relative">
          오늘 미션 {missionsDone}/{missionsTotal} · {weekMissions.title}
        </p>
        <div className="w-full h-1.5 rounded-full mt-3 overflow-hidden bg-white/20 relative">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }}/>
        </div>
        <button onClick={onOpen}
          className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-600 rounded-full font-black text-base shadow-2xl shadow-black/20 active:scale-95 transition hover:scale-105 relative">
          <Target size={16}/>
          오늘 미션 보기
          <span className="text-lg">→</span>
        </button>
      </div>
    );
  }

  return (
    <button onClick={onOpen}
      className={cls("mx-4 mt-3 w-[calc(100%-2rem)] p-4 rounded-xl flex items-center gap-3 text-left relative overflow-hidden active:opacity-80 transition border",
        dark ? "bg-[#121212] border-[#262626]" : "bg-[#fafafa] border-[#dbdbdb]")}>
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-300 to-brand-700 flex items-center justify-center shrink-0">
        <Dumbbell size={20} className="text-white"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cls("text-[14px] font-bold", dark ? "text-white" : "text-black")}>D+{dayNum}</p>
          <span className={cls("text-[12px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>/ {CHALLENGE_DAYS}일</span>
        </div>
        <div className={cls("w-full h-1 rounded-full mt-1.5 overflow-hidden", dark ? "bg-[#262626]" : "bg-[#dbdbdb]")}>
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }}/>
        </div>
        <p className={cls("text-[12px] mt-1.5", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
          오늘 {missionsDone}/{missionsTotal} · Week {weekNum} {weekMissions.title}
        </p>
      </div>
      <ChevronRight size={16} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>
    </button>
  );
};

const SEED_USERS = {
  "건강한엄마": { avatar: "flower", reviewIds: [142, 152, 304], bio: "건강한 식탁을 사랑하는 두 아이 엄마" },
  "라떼러버": { avatar: "coffee", reviewIds: [252, 254], bio: "하루 5잔 카페인 중독자" },
  "다이어터김": { avatar: "leaf", reviewIds: [253, 302, 309], bio: "지속 가능한 다이어트 2년차" },
  "요가맘": { avatar: "feather", reviewIds: [147, 311], bio: "매일 아침 명상과 요가" },
};

const UserMiniSheet = ({ author, avatar, userId, onClose, onOpen, onOpenProfile, isFollowing, onToggleFollow, isBlocked, onToggleBlock, currentUser, dark }) => {
  const [exiting, close] = useExit(onClose);
  const userData = SEED_USERS[author];
  const reviews = userData ? userData.reviewIds.map((id) => SEED_REVIEWS.find((r) => r.id === id)).filter(Boolean) : [];
  const finalAvatar = avatar || userData?.avatar || "";
  const isMe = currentUser && currentUser.nickname === author;
  // user_id 가 있어야 Supabase 팔로우가 가능. 시드 author 는 user_id 없음.
  const canFollow = !!userId && !isMe && !!currentUser;

  return (
    <div role="dialog" aria-modal="true" className={cls("fixed inset-0 z-40 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-end", exiting ? "" : "animate-fade-in")}>
      <div className={cls("absolute inset-0 bg-black/50", exiting ? "animate-fade-out" : "")} onClick={close}/>
      <div className={cls("relative w-full rounded-t-3xl p-6 shadow-2xl pb-safe", dark ? "bg-gray-900" : "bg-white", exiting ? "animate-slide-down" : "animate-slide-up")}>
        <div className={cls("w-12 h-1 rounded-full mx-auto mb-5", dark ? "bg-gray-700" : "bg-gray-300")}/>
        <div className="flex items-center gap-4">
          <Avatar id={finalAvatar} size={36} className="w-20 h-20 shadow-lg" rounded="rounded-full"/>
          <div className="flex-1 min-w-0">
            <h3 className={cls("text-xl font-black tracking-tight", dark ? "text-white" : "text-gray-900")}>{author}</h3>
            {userData?.bio && <p className={cls("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>{userData.bio}</p>}
            <p className={cls("text-xs mt-1.5 font-bold", dark ? "text-brand-300" : "text-brand-600")}>웨이로그 {reviews.length}개 작성</p>
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
            <p className={cls("text-sm font-bold", dark ? "text-gray-300" : "text-gray-600")}>아직 공유한 활동이 없어요</p>
            <p className="text-xs mt-1 opacity-80">마음에 드는 글을 친구들에게 공유해 보세요</p>
          </div>
        )}
        <div className="flex gap-2 mt-5">
          {canFollow && (
            <button onClick={() => onToggleFollow()}
              className={cls("flex-1 py-3 rounded-2xl text-sm font-black transition active:scale-95 inline-flex items-center justify-center gap-1.5",
                isFollowing
                  ? dark ? "bg-gray-800 text-gray-300 border border-gray-700" : "bg-gray-100 text-gray-700"
                  : "bg-brand-500 text-white shadow-md")}>
              {isFollowing ? <><Check size={14}/> 팔로잉</> : <><Plus size={14}/> 팔로우</>}
            </button>
          )}
          <button onClick={() => { close(); setTimeout(() => onOpenProfile && onOpenProfile({ author, avatar: finalAvatar, userId }), 280); }}
            className={cls("flex-1 py-3 rounded-2xl text-sm font-bold border", dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-700")}>
            프로필 보기
          </button>
        </div>
        {!isMe && currentUser && (
          <button onClick={() => { onToggleBlock && onToggleBlock(author); close(); }}
            className={cls("w-full mt-3 py-2 text-xs font-bold active:opacity-60", isBlocked ? "text-brand-500" : "text-rose-500")}>
            {isBlocked ? "차단 해제" : "이 사용자 차단하기"}
          </button>
        )}
      </div>
    </div>
  );
};

// ---------- 리뷰 상세 라우트 ----------
// AppInner 가 review list / supabase fetch / DetailScreen 렌더를 Context 로 주입.
// 모듈 레벨 컴포넌트라 AppInner 리렌더 시에도 identity 가 안정 — DetailScreen 내부 로컬 state 보존.
const DetailRouteContext = createContext(null);

function DetailScreenRoute() {
  const { id } = useParams();
  const loc = useLocation();
  const navigate = useNavigate();
  const ctx = useContext(DetailRouteContext);
  const [review, setReview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const pre = loc.state?.review;
    if (pre && String(pre.id) === String(id)) { setReview(pre); return; }
    const local = ctx?.findLocal?.(id);
    if (local) { setReview(local); return; }
    setReview(null); // 로딩 상태로 리셋
    if (!ctx?.fetchById) {
      ctx?.setToast?.("글을 찾을 수 없어요");
      navigate("/", { replace: true });
      return;
    }
    (async () => {
      const found = await ctx.fetchById(id);
      if (cancelled) return;
      if (found) { setReview(found); return; }
      ctx.setToast?.("글을 찾을 수 없어요");
      navigate("/", { replace: true });
    })();
    return () => { cancelled = true; };
    // id 변경 시에만 재해결. ctx 는 ref-안정 클로저(렌더함수는 매 렌더 새로 오지만 fetch/find 는 동등 로직)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!review || !ctx) return null;
  return ctx.render(review, () => navigate(-1));
}

// 레거시 공유 링크 `/r/:id` → `/review/:id` 로 이동 (기존에 공유된 링크 호환).
function ReviewLegacyRedirect() {
  const { id } = useParams();
  return <Navigate to={`/review/${id}`} replace/>;
}

// ---------- 프로필 라우트 ----------
// /profile/:userId — 다른 사용자 프로필. 본인이면 /profile/me 로 리다이렉트.
// location.state.profile 에 preloaded {userId, author, avatar} 가 있으면 즉시 렌더.
// 직접 URL 접속 시엔 supabase profiles 에서 fetch.
const ProfileRouteContext = createContext(null);

function UserProfileRoute() {
  const { userId } = useParams();
  const loc = useLocation();
  const navigate = useNavigate();
  const ctx = useContext(ProfileRouteContext);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (ctx?.currentUserId && ctx.currentUserId === userId) {
      navigate("/profile/me", { replace: true });
      return;
    }
    const pre = loc.state?.profile;
    if (pre && String(pre.userId) === String(userId)) { setProfile(pre); return; }
    setProfile(null);
    if (!ctx?.fetchProfile) {
      ctx?.setToast?.("프로필을 찾을 수 없어요");
      navigate("/", { replace: true });
      return;
    }
    (async () => {
      const found = await ctx.fetchProfile(userId);
      if (cancelled) return;
      if (found) { setProfile(found); return; }
      ctx.setToast?.("프로필을 찾을 수 없어요");
      navigate("/", { replace: true });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!profile || !ctx) return null;
  return ctx.renderOther(profile, () => navigate(-1));
}

// ---------- APP ----------
function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();
  // 게시 직후 하이라이트할 리뷰 ID — 1.8초 후 자동 해제
  const [highlightId, setHighlightId] = useState(null);
  // toast: null | { msg: string, type: "info"|"success"|"error", action?: { label, onClick } }
  // setToast 는 string 또는 { msg, type, action } 를 받는다 (string 은 자동으로 type 추론)
  const [toast, setToastRaw] = useState(null);
  const setToast = useCallback((input) => {
    if (input === "" || input == null) { setToastRaw(null); return; }
    if (typeof input === "string") {
      // 메시지 내용으로 type 자동 추론 — 명백한 에러 키워드만. 모호어(차단/없어요)는 info 유지.
      const isError = /실패|오류했|에러|다시 시도|네트워크를 확인|지원하지 않|허용해주세요|차단돼/.test(input);
      setToastRaw({ msg: input, type: isError ? "error" : "info" });
    } else {
      setToastRaw({ msg: input.msg, type: input.type || "info", action: input.action || null });
    }
  }, []);
  // action 이 있으면 6초 유지해 사용자가 눌러볼 시간 확보
  useEffect(() => {
    if (!toast) return;
    const dur = toast.action ? 6000 : 2200;
    const t = setTimeout(() => setToastRaw(null), dur);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  // 레거시 익명 챌린지 커뮤니티 로컬 캐시 제거 (서버 이관 후 무의미).
  // 1회만 시도 — 실패해도 무시.
  useEffect(() => {
    window.storage?.delete("waylog:challengeAnonPosts").catch(() => {});
  }, []);

  // 1.3.0 — 앱 첫 실행 시 Android/iOS 시스템 알림 권한 다이얼로그 자동 요청.
  // 한 번만 시도 (localStorage 가드). 결과(허용/거부)는 OS 가 영구 기억.
  useEffect(() => {
    (async () => {
      try {
        const platform = Capacitor.getPlatform?.();
        if (platform !== "android" && platform !== "ios") return;
        if (localStorage.getItem("waylog:push:auto-requested")) return;

        const { PushNotifications } = await import("@capacitor/push-notifications");
        const { receive } = await PushNotifications.checkPermissions();
        if (receive === "granted" || receive === "denied") {
          localStorage.setItem("waylog:push:auto-requested", "1");
          return;
        }
        await PushNotifications.requestPermissions();
        localStorage.setItem("waylog:push:auto-requested", "1");
      } catch (e) {
        console.warn("auto push permission failed", e);
      }
    })();
  }, []);

  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const modalOpenRef = useRef(false);
  // pull-to-refresh 핸들러가 loadReviews 를 참조할 수 있도록 ref 로 보관 (선언 순서 이슈 우회)
  const loadReviewsRef = useRef(null);

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
        // 실제 서버 재fetch — 첫 페이지부터 다시 불러와 최신 다른 유저 글을 반영
        loadReviewsRef.current?.().finally(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          setPullY(0);
          setToast("새로고침 완료");
        });
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
  }, [location.pathname, setToast]);

  const [search, setSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [compose, setCompose] = useState(false);
  const [composeProduct, setComposeProduct] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [communityComposeOpen, setCommunityComposeOpen] = useState(false);
  const [editingCommunityPost, setEditingCommunityPost] = useState(null);
  const [deletingCommunityPostId, setDeletingCommunityPostId] = useState(null);
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
  }, [setToast]);
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
    const local = { id: Date.now() + Math.random(), text, createdAt: Date.now(), read: false, ...extra };
    setNotifications((p) => [local, ...p]);
    // 서버 동기화 — 실패해도 로컬 알림은 유지
    if (supabase && user?.id) {
      supabaseNotifs.create({ user_id: user.id, text, data: extra }).then(({ data }) => {
        if (data?.id) {
          setNotifications((p) => p.map((n) => n.id === local.id ? { ...n, id: data.id } : n));
        }
      }).catch(() => {});
    }
  };
  const unreadCount = notifications.filter((n) => !n.read).length;
  const notifRef = useRef(null);
  const [dark, setDark] = useStoredState("waylog:dark", false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", !!dark);
    // 네이티브(Capacitor)에서는 상태바 톤도 동기화 — 웹에서는 no-op
    import("./utils/platform.js").then(({ setNativeStatusBar }) => setNativeStatusBar(!!dark));
  }, [dark]);

  // --- 인증 — Supabase 를 single source of truth 로. 로컬 폴백(waylog:user) 제거 ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 세션 한 번당 profile 은 한 번만 fetch (토큰 리프레시 때마다 재요청 방지)
  const profileCacheRef = useRef({ userId: null, avatar: "" });
  // 동기 빌드: 세션만으로 즉시 user 객체 생성. avatar 는 캐시 또는 user_metadata fallback.
  // getProfile 을 blocking 경로에서 제거 — 새로고침 직후 GoTrueClient 내부 초기화와
  // 경쟁해 쿼리가 hang 할 경우 authLoading 이 풀리지 않는 회귀 원인이었음.
  const buildUserFromSession = (session) => {
    const meta = session.user.user_metadata || {};
    const avatar = profileCacheRef.current.userId === session.user.id
      ? profileCacheRef.current.avatar
      : (meta.avatar_url || "");
    return {
      id: session.user.id,
      email: session.user.email,
      nickname: meta.nickname || session.user.email.split("@")[0],
      avatar,
      joinedAt: session.user.created_at,
    };
  };
  // 비동기 avatar hydrate: 실패/지연해도 user state 와 authLoading 해제는 이미 완료.
  const hydrateProfileAvatar = async (userId) => {
    if (!userId || profileCacheRef.current.userId === userId) return;
    try {
      const { data: profile } = await supabaseAuth.getProfile(userId);
      const avatar = profile?.avatar_url || "";
      profileCacheRef.current = { userId, avatar };
      setUser((prev) => (prev && prev.id === userId ? { ...prev, avatar } : prev));
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    (async () => {
      try {
        // 네이티브 Preferences 마이그레이션 대기 — 웹에서는 즉시 resolve.
        // 이걸 기다려야 setSession 으로 복원된 세션을 getSession 이 픽업함.
        await migrationReady;
        const { data } = await supabase.auth.getSession();
        const session = data?.session || null;
        if (cancelled) return;
        if (session?.user) {
          setUser(buildUserFromSession(session));      // 동기, 즉시 완료
          hydrateProfileAvatar(session.user.id);        // 백그라운드, 결과 대기 안 함
        }
      } catch (e) {
        console.warn("초기 세션 로드 실패:", e);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();

    // onAuthStateChange: 실패/예외를 먹어도 로컬 세션은 유지
    let subscription = null;
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          if (event === "SIGNED_OUT") {
            setUser(null);
            // 토큰 만료 등 logout() 경로를 안 타는 로그아웃에서도 이전 사용자 state 잔존 방지
            resetUserState();
            return;
          }
          if (session?.user) {
            setUser(buildUserFromSession(session));
            hydrateProfileAvatar(session.user.id);
            if (event === "SIGNED_IN") {
              setAuthOpen(false);
              // DB trigger 미설정 환경 방어: profile row 없으면 생성 (idempotent).
              // 실패해도 조용히 무시 — 다음 시도에서 재생성됨.
              const meta = session.user.user_metadata || {};
              supabaseAuth.ensureProfile(session.user.id, {
                nickname: meta.nickname || session.user.email?.split("@")[0] || "",
                avatar_url: meta.avatar_url || "",
              }).catch(() => {});
            }
          }
        } catch (e) {
          console.warn("onAuthStateChange handler error:", e);
          // 토큰 리프레시 에러는 치명적이지 않으므로 현재 세션 유지
        }
      });
      subscription = data?.subscription || null;
    } catch (e) {
      console.warn("onAuthStateChange subscribe 실패:", e);
    }
    return () => {
      cancelled = true;
      try { subscription?.unsubscribe(); } catch {}
    };
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

  // 1.3.0 — 알림 권한 'granted' 인데 push_subscriptions 등록 안 됐으면 자동 등록.
  // 자동 권한 요청에서 허용한 경우, 로그인 후 즉시 토큰 발급/저장.
  useEffect(() => {
    if (!user?.id || !supabase) return;
    let cancelled = false;
    (async () => {
      try {
        const platform = Capacitor.getPlatform?.();
        if (platform !== "android" && platform !== "ios") return;
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const { receive } = await PushNotifications.checkPermissions();
        if (receive !== "granted") return;
        if (cancelled) return;

        const { data } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .like("endpoint", "native:%")
          .maybeSingle();
        if (cancelled) return;
        if (!data) await subscribePush(user.id);
      } catch (e) {
        console.warn("token register failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // --- 취향/무드/리뷰/댓글 ---
  const [taste, setTaste] = useStoredState("waylog:taste", { cats: {}, tags: {} });
  const [moods, setMoods] = useStoredState("waylog:moods", {});
  const [userReviews, setUserReviewsRaw] = useState([]);
  // 현재 사용자 ID 를 ref 로 추적: setUserReviews 클로저에서 최신 user.id 참조용 (사용자별 IndexedDB 키 격리)
  const userIdRef = useRef(null);
  useEffect(() => { userIdRef.current = user?.id || null; }, [user]);
  // 로컬 pending 리뷰를 사용자별 IndexedDB 키에 영속 저장 (서버 동기화 전 새로고침 대비)
  // 키 격리로 로그아웃/재로그인/계정 교체 시 데이터 유출·혼선 방지.
  const setUserReviews = useCallback((updater) => {
    setUserReviewsRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // pending 리뷰(숫자 ID = 아직 서버 미동기화)만 IndexedDB에 저장
      const pending = next.filter((r) => typeof r.id === "number");
      const key = pendingReviewsKey(userIdRef.current);
      try {
        if (pending.length > 0) {
          window.storage?.set(key, JSON.stringify(pending));
        } else {
          window.storage?.delete(key);
        }
      } catch {}
      return next;
    });
  }, []);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsHasMore, setReviewsHasMore] = useState(true);
  const [reviewsLoadingMore, setReviewsLoadingMore] = useState(false);
  const reviewsCursorRef = useRef(null); // 마지막 페이지의 created_at

  // 리뷰 row → UI 모델 매핑 (sanitize 포함)
  const mapReviewRow = (r) => {
    const mediaArr = Array.isArray(r.media) ? r.media : [];
    const firstMedia = mediaArr[0];
    const rawImg = firstMedia?.url || (typeof firstMedia === "string" ? firstMedia : "") || "";
    return {
      id: r.id,
      title: sanitizeInline(r.title, { maxLength: 200 }),
      body: sanitizeText(r.content, { maxLength: 5000 }),
      category: sanitizeInline(r.category, { maxLength: 40 }),
      tags: (r.tags || []).map((t) => sanitizeInline(t, { maxLength: 40 })).filter(Boolean),
      author: sanitizeInline(r.profiles?.nickname, { maxLength: 60 }) || "익명",
      authorId: r.user_id,
      authorAvatar: sanitizeImageUrl(r.profiles?.avatar_url) || "",
      date: (r.created_at || "").slice(0, 10),
      createdAt: r.created_at, // 페이지네이션 커서용
      likes: r.likes_count || 0,
      views: r.views_count || 0,
      product: sanitizeInline(r.product_name, { maxLength: 200 }),
      products: [],
      media: mediaArr
        .map((m) => (typeof m === "string"
          ? { type: "image", url: sanitizeImageUrl(m) }
          : { ...m, url: sanitizeImageUrl(m?.url) }))
        .filter((m) => !!m.url),
      img: sanitizeImageUrl(rawImg),
    };
  };

  // 서버 리뷰 재동기화. useEffect(초기 로드) + pull-to-refresh 에서 공용으로 호출.
  // 비로그인 상태에서도 public 리뷰는 fetch (RLS 가 anon SELECT 허용한다는 전제).
  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsHasMore(true);
    reviewsCursorRef.current = null;
    const currentUid = userIdRef.current;

    let pending = [];
    let pendingEdits = {};

    // 로그인 상태에서만 IndexedDB pending 복원 (익명은 스킵)
    if (currentUid) {
      await clearLegacyPendingKey();
      try {
        const stored = await window.storage?.get(pendingReviewsKey(currentUid));
        if (stored?.value) {
          const raw = JSON.parse(stored.value);
          pending = filterStalePending(raw);
          if (Array.isArray(raw) && raw.length !== pending.length) {
            if (pending.length === 0) await window.storage?.delete(pendingReviewsKey(currentUid));
            else await window.storage?.set(pendingReviewsKey(currentUid), JSON.stringify(pending));
          }
        }
      } catch {}
      try {
        const stored = await window.storage?.get(pendingEditsKey(currentUid));
        if (stored?.value) {
          const raw = JSON.parse(stored.value);
          pendingEdits = filterStaleEdits(raw);
          const rawKeyCount = raw && typeof raw === "object" && !Array.isArray(raw) ? Object.keys(raw).length : 0;
          if (rawKeyCount !== Object.keys(pendingEdits).length) {
            if (Object.keys(pendingEdits).length === 0) await window.storage?.delete(pendingEditsKey(currentUid));
            else await window.storage?.set(pendingEditsKey(currentUid), JSON.stringify(pendingEdits));
          }
        }
      } catch {}
    }

    const { data, error } = await supabaseReviews.fetchPage({ limit: 30 });
    // 사용자가 fetch 도중 바뀌었다면 stale 데이터 쓰기 금지
    if (currentUid !== userIdRef.current) { setReviewsLoading(false); return; }

    if (!error && Array.isArray(data)) {
      let mapped = data.map(mapReviewRow);
      if (Object.keys(pendingEdits).length > 0) {
        mapped = mapped.map((r) => {
          const edit = pendingEdits[r.id];
          if (!edit) return r;
          return {
            ...r,
            title: edit.title ?? r.title,
            body: edit.content ?? r.body,
            category: edit.category ?? r.category,
            tags: edit.tags ?? r.tags,
            product: edit.product_name ?? r.product,
            media: edit.media ?? r.media,
          };
        });
      }
      const serverIds = new Set(mapped.map((r) => r.id));
      const stillPending = pending.filter((r) => !serverIds.has(r.id));
      setUserReviews([...stillPending, ...mapped]);
      if (mapped.length > 0) reviewsCursorRef.current = mapped[mapped.length - 1].createdAt;
      if (mapped.length < 30) setReviewsHasMore(false);

      if (currentUid) {
        if (stillPending.length > 0) {
          (async () => {
            for (const pr of stillPending) {
              if (typeof pr.id !== "number") continue;
              if (currentUid !== userIdRef.current) return;
              const payload = {
                user_id: currentUid,
                title: pr.title,
                content: pr.body,
                category: pr.category,
                tags: pr.tags && pr.tags.length ? pr.tags : ["내웨이로그"],
                product_name: pr.product,
                media: pr.media || [],
              };
              try {
                const { data: created, error: createErr } = await supabaseReviews.create(payload);
                if (created?.id && !createErr) {
                  setUserReviews((prev) => prev.map((r) => r.id === pr.id ? { ...r, id: created.id } : r));
                }
              } catch {}
            }
          })();
        }
        const editEntries = Object.entries(pendingEdits);
        if (editEntries.length > 0) {
          (async () => {
            for (const [rid, payload] of editEntries) {
              if (currentUid !== userIdRef.current) return;
              try {
                const { error: updErr } = await supabaseReviews.update(rid, payload);
                if (!updErr) {
                  await removePendingEdit(currentUid, rid);
                }
              } catch {}
            }
          })();
        }
      }
    } else if (pending.length > 0) {
      // 서버 실패 + pending 있음 — pending 만 표시해서 최소한 내 글은 유지
      setUserReviews(pending);
    }
    setReviewsLoading(false);
  }, [setUserReviews]);

  useEffect(() => { loadReviewsRef.current = loadReviews; }, [loadReviews]);

  useEffect(() => {
    if (authLoading) return;
    loadReviews();
    // user?.id 만 의존성으로 — 프로필 업데이트로 user 참조 바뀌어도 재fetch 안 함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  // 다음 페이지 fetch (무한 스크롤에서 호출)
  const loadMoreReviews = async () => {
    if (reviewsLoadingMore || !reviewsHasMore || !reviewsCursorRef.current) return;
    setReviewsLoadingMore(true);
    try {
      const { data, error } = await supabaseReviews.fetchPage({
        cursor: reviewsCursorRef.current, limit: 30,
      });
      if (!error && Array.isArray(data)) {
        if (data.length === 0) {
          setReviewsHasMore(false);
        } else {
          const mapped = data.map(mapReviewRow);
          setUserReviews((prev) => {
            const seen = new Set(prev.map((r) => r.id));
            const fresh = mapped.filter((r) => !seen.has(r.id));
            return [...prev, ...fresh];
          });
          reviewsCursorRef.current = mapped[mapped.length - 1].createdAt;
          if (mapped.length < 30) setReviewsHasMore(false);
        }
      }
    } finally {
      setReviewsLoadingMore(false);
    }
  };

  // 커뮤니티 게시물 로드 — 비로그인 상태에서도 public 으로 가져옴 (RLS SELECT using(true))
  const mapCommunityRow = (r) => {
    const isAnon = !!r.is_anonymous;
    return {
      id: r.id,
      user_id: r.user_id, // 작성자 본인 판별용(삭제·수정) — 익명이라도 서버는 user_id 보관
      userId: isAnon ? null : r.user_id, // 프로필 이동 차단: 익명이면 null
      author: isAnon ? "익명" : (sanitizeInline(r.profiles?.nickname, { maxLength: 60 }) || "익명"),
      avatar: isAnon ? "" : (sanitizeImageUrl(r.profiles?.avatar_url) || ""),
      createdAt: r.created_at,
      content: sanitizeText(r.content, { maxLength: 1000 }),
      likes: 0,    // 실제 count 는 fetchPostLikeCounts 에서 채움
      comments: 0, // 실제 수 는 communityComments 에서 파생
      liked: false, // 서버 fetch 후 likedPostIds 에서 파생
      isAnonymous: isAnon,
      challengeId: r.challenge_id || null,
      dayNum: r.day_num || null,
      ...(r.product ? { product: r.product } : {}),
      ...(r.image_url ? { image: sanitizeImageUrl(r.image_url) } : {}),
    };
  };

  const mapCommunityCommentRow = (c) => ({
    id: c.id,
    author: sanitizeInline(c.profiles?.nickname, { maxLength: 60 }) || "익명",
    avatar: sanitizeImageUrl(c.profiles?.avatar_url || ""),
    authorId: c.user_id,
    text: sanitizeText(c.content, { maxLength: 500 }),
    time: "",
    createdAt: new Date(c.created_at).getTime(),
    parentId: c.parent_id || null,
    mentionTo: c.mention_to ? sanitizeInline(c.mention_to, { maxLength: 60 }) : null,
    likedBy: Array.isArray(c.community_comment_likes)
      ? c.community_comment_likes.map((l) => l.user_id).filter(Boolean)
      : [],
  });

  const communityHydratedRef = useRef(false);
  useEffect(() => {
    if (authLoading || communityHydratedRef.current) return;
    communityHydratedRef.current = true;
    (async () => {
      const { data, error } = await supabaseCommunity.fetchAll(50);
      if (error || !Array.isArray(data)) return;

      const postIds = data.map((p) => p.id);
      // 병렬로 좋아요 count / 댓글 fetch
      const [{ data: likeCounts }, { data: commentRows }] = await Promise.all([
        supabaseCommunity.fetchPostLikeCounts(postIds),
        supabaseCommunity.fetchCommentsByPosts(postIds),
      ]);

      setCommunity(data.map((r) => ({
        ...mapCommunityRow(r),
        likes: (likeCounts && likeCounts[r.id]) || 0,
      })));

      // 댓글을 postId 별로 그룹화
      if (Array.isArray(commentRows)) {
        const grouped = {};
        commentRows.forEach((c) => {
          const mapped = mapCommunityCommentRow(c);
          if (!grouped[c.post_id]) grouped[c.post_id] = [];
          grouped[c.post_id].push(mapped);
        });
        setCommunityComments(grouped);
      }
    })();
  }, [authLoading]);

  // 내가 좋아요한 게시물 hydrate — 로그인 후 1회. `liked` 플래그는 render 시점에 파생.
  useEffect(() => {
    if (!user?.id || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabaseCommunity.fetchMyPostLikes(user.id);
      if (!cancelled && Array.isArray(data)) setLikedPostIds(new Set(data));
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // moods / notifications 하이드레이션 (로그인 시 1회)
  const moodsNotifsHydratedRef = useRef(false);
  useEffect(() => {
    if (!user?.id || !supabase || moodsNotifsHydratedRef.current) return;
    moodsNotifsHydratedRef.current = true;
    (async () => {
      try {
        const [{ data: moodRows }, { data: notifRows }] = await Promise.all([
          supabaseMoods.fetchMine(user.id),
          supabaseNotifs.fetchMine(user.id, 50),
        ]);
        if (Array.isArray(moodRows) && moodRows.length) {
          const map = {};
          moodRows.forEach((m) => { map[m.review_id] = m.mood; });
          // 서버 상태를 기본으로, 로컬 값이 있고 서버에 없으면 유지
          setMoods((prev) => ({ ...prev, ...map }));
        }
        if (Array.isArray(notifRows) && notifRows.length) {
          setNotifications(notifRows.map((n) => ({
            id: n.id, text: sanitizeInline(n.text, { maxLength: 200 }),
            read: !!n.read, createdAt: new Date(n.created_at).getTime(),
            ...(n.data || {}),
          })));
        }
      } catch (e) { console.warn("moods/notifs hydrate 실패", e); }
    })();
    // user 변경(로그인)시에만 1회 hydrate — setter 들은 ref 안정적이므로 deps 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 로그아웃 시 하이드레이션 플래그 리셋 → 재로그인 시 다시 fetch
  useEffect(() => {
    if (!user) {
      moodsNotifsHydratedRef.current = false;
      challengeHydratedRef.current = false;
      identify(null);
    } else {
      identify(user.id, { nickname: user.nickname });
    }
  }, [user]);

  // 앱 시작 이벤트 (세션당 1회)
  useEffect(() => { analyticsEvents.appOpen(); }, []);

  // SW 새 버전 감지 → 사용자에게 새로고침 안내
  useEffect(() => {
    const onUpdate = () => {
      setToast("새 버전이 있어요. 화면을 당겨 새로고침해주세요");
      // 자동 활성화 원할 경우 reg.waiting?.postMessage("SKIP_WAITING") (현재는 수동)
    };
    window.addEventListener("waylog:sw-update", onUpdate);
    return () => window.removeEventListener("waylog:sw-update", onUpdate);
  }, [setToast]);

  const [recents, setRecents] = useStoredState("waylog:recents", []);
  const [commentsMap, setCommentsMap] = useState(SEED_COMMENTS);
  // 커뮤니티 — Supabase community_posts 테이블에서 fetch.
  // 이전에는 localStorage 만 사용해 다른 사용자에게 보이지 않던 버그 수정 (2026-04-19).
  const [community, setCommunity] = useState([]);
  // 커뮤니티 댓글: { [postId]: [{ id, author, avatar, authorId, text, time, createdAt, parentId, mentionTo, likedBy }] }
  // 서버 `community_comments` 테이블에서 fetch. localStorage 저장 안 함 (2026-04-19 서버화).
  const [communityComments, setCommunityComments] = useState({});
  // 내가 좋아요한 커뮤니티 게시물 id 집합 (uuid string Set) — 서버 `community_post_likes` 에서 hydrate
  const [likedPostIds, setLikedPostIds] = useState(() => new Set());

  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboarded, setOnboarded] = useStoredState("waylog:onboarded", false);
  const [selectedUser, setSelectedUser] = useState(null);
  // following: 내가 팔로우한 사용자들의 user_id (uuid) Set.
  // 닉네임 기반(v1) 과 분리하기 위해 v2 키 사용.
  const [followingArr, setFollowingArr] = useStoredState("waylog:following:v2", []);
  const following = useMemo(() => new Set(followingArr), [followingArr]);
  const [blockedArr, setBlockedArr] = useStoredState("waylog:blocked", []);
  const blocked = useMemo(() => new Set(blockedArr), [blockedArr]);
  const tg = useTimeGradient(dark);

  // 로그인 시 Supabase 에서 follows 동기화 (single source of truth).
  // 로컬 캐시는 offline/instant boot 용 fallback.
  useEffect(() => {
    if (!user?.id || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabaseFollows.fetchMine(user.id);
      if (cancelled || error) return;
      setFollowingArr(data || []);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const toggleBlock = (author) => {
    setBlockedArr((prev) => {
      if (prev.includes(author)) {
        setToast(`${author}님 차단을 해제했어요`);
        return prev.filter((a) => a !== author);
      }
      setToast(`${author}님을 차단했어요. 글과 댓글이 더 이상 표시되지 않아요`);
      return [...prev, author];
    });
  };

  // 호출자가 author/avatar/userId 또는 author/avatar/authorId(과거 prop)
  // 어느 쪽으로 넘기든 selectedUser 객체에 userId 필드로 통일된다.
  const openUser = useCallback((u) => setSelectedUser(u && {
    author: u.author,
    avatar: u.avatar || "",
    userId: u.userId || u.authorId || null,
  }), []);

  // (targetUserId: uuid, targetNickname: string) — UUID 기반.
  // 시드 author 처럼 user_id 가 없으면 진입점에서 호출 자체를 차단해야 한다.
  const toggleFollow = useCallback(async (targetUserId, targetNickname = "") => {
    if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return; }
    if (!targetUserId) { setToast("이 사용자는 팔로우할 수 없어요"); return; }
    if (targetUserId === user.id) { setToast("자기 자신은 팔로우할 수 없어요"); return; }
    const wasFollowing = following.has(targetUserId);
    // optimistic update — 실패 시 rollback
    setFollowingArr((prev) => wasFollowing
      ? prev.filter((id) => id !== targetUserId)
      : [...prev, targetUserId]);
    if (supabase) {
      const { error } = wasFollowing
        ? await supabaseFollows.remove(user.id, targetUserId)
        : await supabaseFollows.add(user.id, targetUserId);
      if (error) {
        // rollback
        setFollowingArr((prev) => wasFollowing
          ? [...prev, targetUserId]
          : prev.filter((id) => id !== targetUserId));
        setToast(wasFollowing ? "팔로우 취소에 실패했어요" : "팔로우에 실패했어요");
        return;
      }
    }
    // 새 팔로우만 알림 (취소는 안 보냄). 자기 자신은 위에서 이미 return 처리.
    if (!wasFollowing) {
      sendPushNotification(
        targetUserId,
        "follow",
        `${user.nickname}님이 팔로우했어요`,
        "프로필을 둘러보고 답팔로우해 보세요",
        { url: `/profile/${user.id}` },
      );
    }
    const label = targetNickname || "사용자";
    setToast(wasFollowing ? `${label}님 팔로우를 취소했어요` : `${label}님을 팔로우했어요`);
  }, [user, following, setToast, setFollowingArr]);

  // 모달 상태 추적 (풀 투 리프레시 비활성화용).
  // 리뷰 상세 라우트(/review/*) 도 오버레이 취급해 pull-to-refresh 차단.
  useEffect(() => {
    modalOpenRef.current = !!(
      location.pathname.startsWith("/review/") ||
      location.pathname.startsWith("/profile/") ||
      search || compose || communityComposeOpen || editingCommunityPost || authOpen || profileOpen || settingsOpen ||
      adminOpen || onboardingOpen || selectedUser || selectedCatalogProduct ||
      challengeStartOpen || challengeMainOpen || notifOpen
    );
  });

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
    // 서버/로컬 pending 리뷰 우선. 실제 데이터가 있으면 seed 를 절대 섞지 않음 (테스트 데이터 혼선 방지).
    // userReviews 가 완전히 비어있을 때만 onboarding 용 seed fallback — 빈 화면 대신 예시 표시.
    const real = userReviews.filter((r) => !blocked.has(r.author));
    if (real.length > 0) return real;
    if (reviewsLoading) return []; // 로딩 중엔 빈 배열 → skeleton 표시
    return SEED_REVIEWS.filter((r) => !blocked.has(r.author));
  }, [userReviews, blocked, reviewsLoading]);

  // ---------- Challenge State ----------
  // localStorage가 오프라인/미로그인 캐시 역할을 하고, 로그인 시 Supabase와 양방향 동기화.
  const [challenge, setChallenge] = useStoredState("waylog:challenge", null);
  const [challengeDailyLogs, setChallengeDailyLogs] = useStoredState("waylog:challengeLogs", {});
  const [challengeInbody, setChallengeInbody] = useStoredState("waylog:challengeInbody", []);
  const [challengeStartOpen, setChallengeStartOpen] = useState(false);
  const [challengeMainOpen, setChallengeMainOpen] = useState(false);
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null);
  const challengeHydratedRef = useRef(false);

  // 챌린지 writable 래퍼 — 로컬 업데이트 후 Supabase 에 diff 동기화
  // 깊은 비교(JSON.stringify)로 필드 변경을 정확히 감지 — 불필요한 upsert 방지
  const setChallengeDailyLogsSync = (updater) => {
    setChallengeDailyLogs((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (supabase && user?.id && challenge?.id) {
        const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
        keys.forEach((dayKey) => {
          const before = prev[dayKey];
          const after = next[dayKey];
          // 삭제 / 추가 / 내용 변경을 모두 감지
          if (before === after) return;
          try {
            if (JSON.stringify(before) === JSON.stringify(after)) return;
          } catch { /* stringify 실패 시 upsert 진행 */ }
          if (after === undefined) {
            // 키 삭제는 아직 지원 안 함 (서버에 남겨둠) — 필요 시 delete 엔드포인트 추가
            return;
          }
          // jsonb row 크기 제한 (Supabase Postgres row 기본 제한은 넉넉하지만, 사진 base64 가
          // data 에 섞여 들어오면 MB 단위가 될 수 있음. 512KB 초과 시 업서트 스킵 + 경고).
          let payloadSize = 0;
          try { payloadSize = JSON.stringify(after).length; } catch { payloadSize = 0; }
          if (payloadSize > 512 * 1024) {
            console.warn(`[challenge_logs] ${dayKey} 페이로드 ${Math.round(payloadSize / 1024)}KB — 서버 저장 스킵. 사진은 Supabase Storage 에 업로드 후 URL 만 저장 권장.`);
            setToast("일일 로그가 너무 커서 서버 저장을 건너뛰었어요. 사진을 줄여주세요");
            return;
          }
          supabaseChallenges.upsertLog({
            user_id: user.id, challenge_id: challenge.id, day_key: dayKey, data: after,
          }).catch(() => {});
        });
      }
      return next;
    });
  };

  const setChallengeInbodySync = (updater) => {
    setChallengeInbody((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (supabase && user?.id && Array.isArray(next)) {
        const prevIds = new Set(prev.map((i) => i.id));
        const added = next.filter((i) => !prevIds.has(i.id));
        added.forEach((rec) => {
          const { id, measuredAt, ...data } = rec;
          supabaseChallenges.addInbody({
            user_id: user.id, challenge_id: challenge?.id || null,
            measured_at: measuredAt || new Date().toISOString(), data,
          }).then(({ data: saved }) => {
            if (saved?.id && saved.id !== id) {
              // 서버 ID로 로컬 ID 교체
              setChallengeInbody((cur) => cur.map((r) => r.id === id ? { ...r, id: saved.id } : r));
            }
          }).catch(() => {});
        });
      }
      return next;
    });
  };


  // 챌린지 완료 자동 감지 — challenge.status/startDate 변경 시 trigger (setChallenge는 안정)
  useEffect(() => {
    if (!challenge || challenge.status === "completed" || !challenge.startDate) return;
    const now = new Date();
    const start = new Date(challenge.startDate);
    const elapsed = Math.floor((now - start) / 86400000) + 1;
    if (elapsed > CHALLENGE_DAYS) {
      setChallenge({ ...challenge, status: "completed", completedAt: new Date().toISOString() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge]);

  // 로그인 시 Supabase에서 챌린지 데이터 하이드레이션 (한 번만)
  useEffect(() => {
    if (!user?.id || !supabase || challengeHydratedRef.current) return;
    challengeHydratedRef.current = true;
    (async () => {
      try {
        const { data: ch } = await supabaseChallenges.fetchActive(user.id);
        if (ch) {
          setChallenge({
            id: ch.id,
            status: ch.status,
            startDate: ch.start_date,
            completedAt: ch.completed_at,
            ...(ch.profile || {}),
          });
          const [{ data: logs }, { data: inbody }] = await Promise.all([
            supabaseChallenges.fetchLogs(user.id, ch.id),
            supabaseChallenges.fetchInbody(user.id),
          ]);
          if (Array.isArray(logs) && logs.length) {
            const logMap = {};
            logs.forEach((l) => { logMap[l.day_key] = l.data || {}; });
            setChallengeDailyLogs(logMap);
          }
          if (Array.isArray(inbody) && inbody.length) {
            setChallengeInbody(inbody.map((i) => ({ id: i.id, measuredAt: i.measured_at, ...(i.data || {}) })));
          }
        }
      } catch (e) {
        console.warn("challenge hydrate 실패", e);
      }
    })();
    // hydration은 user.id 최초 로그인 시 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 챌린지 변경 시 서버 동기화 (디바운스 없이 상태 변경 → upsert)
  useEffect(() => {
    if (!user?.id || !supabase || !challenge || !challengeHydratedRef.current) return;
    const { id, status, startDate, completedAt, ...profile } = challenge;
    supabaseChallenges.upsert({
      id, user_id: user.id, status: status || "active", start_date: startDate,
      completed_at: completedAt || null, profile,
    }).then(({ data }) => {
      if (data?.id && data.id !== challenge.id) {
        setChallenge((prev) => prev ? { ...prev, id: data.id } : prev);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge, user?.id]);

  const learnFrom = useCallback((rev, weight = 1) => {
    if (!rev) return;
    setTaste((prev) => {
      const cats = { ...prev.cats, [rev.category]: Math.max(0, (prev.cats[rev.category] || 0) + weight) };
      const tags = { ...prev.tags };
      rev.tags.forEach((t) => { tags[t] = Math.max(0, (tags[t] || 0) + weight); });
      return { cats, tags };
    });
  }, [setTaste]);

  const toggleFav = useCallback(async (id) => {
    const has = favsArr.includes(id);
    const rev = [...userReviews, ...SEED_REVIEWS].find((x) => x.id === id);
    const prevMood = moods[id];

    // 취향 학습 (로컬)
    if (has) {
      learnFrom(rev, -1);
      if (prevMood === "love" || prevMood === "wow") learnFrom(rev, -2);
      if (prevMood) setMoods((m) => { const c = { ...m }; delete c[id]; return c; });
    } else {
      learnFrom(rev, 1);
    }

    // 낙관적 업데이트
    setFavsArr((prev) => has ? prev.filter((x) => x !== id) : [...prev, id]);

    // Supabase 동기화 — 숫자 id 는 아직 서버 sync 전 local pending 리뷰.
    // favorites.review_id 는 uuid 컬럼이라 insert 시도 시 type 거부 → 토스트 발생.
    // 로컬 낙관 상태만 유지하고 서버 호출 skip. 서버 sync 완료 후엔 UUID 라 정상 동작.
    if (user && typeof id === "string") {
      const { error } = has
        ? await supabaseFavorites.remove(user.id, id)
        : await supabaseFavorites.add(user.id, id);
      if (error) {
        // 롤백 — favs + taste + mood 모두 되돌림
        setFavsArr((prev) => has ? [...prev, id] : prev.filter((x) => x !== id));
        if (has) {
          learnFrom(rev, 1);
          if (prevMood === "love" || prevMood === "wow") learnFrom(rev, 2);
          if (prevMood) setMoods((m) => ({ ...m, [id]: prevMood }));
        } else {
          learnFrom(rev, -1);
        }
        setToast("좋아요 반영에 실패했어요. 네트워크를 확인해주세요");
      } else if (!has && rev) {
        // 새로 좋아요 — 글 작성자에게 푸시 (자기 자신 제외, 취소는 안 보냄)
        const authorId = rev.authorId || rev.user_id;
        if (authorId && authorId !== user.id) {
          sendPushNotification(
            authorId,
            "like",
            `${user.nickname}님이 좋아해요`,
            rev.title ? `"${rev.title.slice(0, 60)}"` : "회원님 글에 좋아요가 달렸어요",
            { url: `/review/${id}` },
          );
        }
        // P1-8: 첫 좋아요만 "마이웨이템 저장" 안내. 두 번째부터는 토스트 X.
        try {
          if (!localStorage.getItem("waylog:hint:like-saved")) {
            setToast("마이웨이템에 저장됐어요. 나중에 다시 볼 수 있어요");
            localStorage.setItem("waylog:hint:like-saved", "1");
          }
        } catch {}
      }
    }
  }, [favsArr, userReviews, moods, user, learnFrom, setToast, setMoods]);

  // 무드 변경 시 취향 점수 보너스 + 서버 동기화
  const setMoodsWithBonus = (updater) => {
    setMoods((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
      allKeys.forEach((rid) => {
        if (next[rid] !== prev[rid]) {
          const rev = [...userReviews, ...SEED_REVIEWS].find((x) => x.id === Number(rid));
          if (rev) {
            if (prev[rid] === "love" || prev[rid] === "wow") learnFrom(rev, -2);
            if (next[rid] === "love" || next[rid] === "wow") learnFrom(rev, 2);
          }
          // 서버 동기화 (로그인 시에만)
          if (supabase && user?.id) {
            if (next[rid]) supabaseMoods.upsert(user.id, rid, next[rid]).catch(() => {});
            else supabaseMoods.remove(user.id, rid).catch(() => {});
          }
        }
      });
      return next;
    });
  };

  const openDetail = useCallback((r) => {
    if (!r?.id) return;
    // 라우터로 이동 — state 로 review 객체 전달해 DetailScreenRoute 에서 재조회 없이 즉시 렌더.
    navigate(`/review/${r.id}`, { state: { review: r } });
    analyticsEvents.reviewOpened(r.id, r.category);
    // 서버 댓글 fetch → 로컬(미동기화)과 병합.
    // comment_likes 는 조인 배열이므로 user_id 배열로 변환해 likedBy 로 사용.
    if (supabase && r.id) {
      supabaseComments.fetchByReview(r.id).then(({ data, error }) => {
        if (error || !Array.isArray(data)) return;
        const serverComments = data.map((c) => ({
          id: c.id,
          authorId: c.user_id, // 프로필 조회 시 nickname 중복을 피하기 위한 고유 ID
          author: sanitizeInline(c.profiles?.nickname, { maxLength: 60 }) || "익명",
          avatar: sanitizeImageUrl(c.profiles?.avatar_url || ""),
          text: sanitizeText(c.content, { maxLength: 2000 }),
          parentId: c.parent_id || null,
          mentionTo: c.mention_to ? sanitizeInline(c.mention_to) : null,
          createdAt: new Date(c.created_at).getTime(),
          time: "",
          likedBy: Array.isArray(c.comment_likes)
            ? c.comment_likes.map((l) => l.user_id).filter(Boolean)
            : [],
        }));
        setCommentsMap((prev) => {
          const local = prev[r.id] || [];
          const serverIds = new Set(serverComments.map((c) => c.id));
          // 아직 서버 ID를 받지 못한(Date.now() 수치 ID) 로컬 댓글만 유지
          const localOnly = local.filter((c) => typeof c.id === "number" && !serverIds.has(c.id));
          // LRU: 최근 10개 review 의 댓글만 메모리 유지 (무한 누적 방지)
          const MAX_CACHE = 10;
          const merged = { ...prev, [r.id]: [...serverComments, ...localOnly] };
          const keys = Object.keys(merged);
          if (keys.length > MAX_CACHE) {
            // 현재 열린 리뷰 r.id 는 반드시 유지, 나머지 중 오래된 것부터 제거
            const toKeep = new Set([String(r.id), ...keys.slice(-MAX_CACHE + 1)]);
            const trimmed = {};
            keys.forEach((k) => { if (toKeep.has(k)) trimmed[k] = merged[k]; });
            return trimmed;
          }
          return merged;
        });
      });
    }
  }, [navigate]);
  // 리뷰 상세 라우트가 id 로 리뷰를 해결할 때 사용하는 fetcher.
  // 로컬 reviews 배열에 없을 때만 supabase 직접 조회 → mapReviewRow 매핑.
  // state 미참조 → useCallback([]) 으로 identity 고정 (context memoization 에 기여).
  const fetchReviewById = useCallback(async (id) => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from("reviews")
        .select("id, user_id, title, content, category, tags, product_name, media, likes_count, views_count, created_at")
        .eq("id", id).maybeSingle();
      if (error || !data) return null;
      let profile = null;
      if (data.user_id) {
        const { data: p } = await supabase.from("profiles")
          .select("id, nickname, avatar_url").eq("id", data.user_id).maybeSingle();
        profile = p || null;
      }
      return mapReviewRow({ ...data, profiles: profile });
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addRecent = (term) => {
    setRecents((prev) => [term, ...prev.filter((t) => t !== term)].slice(0, 6));
  };
  const removeRecent = (term) => setRecents((prev) => prev.filter((t) => t !== term));
  const clearRecents = () => { setRecents([]); setToast("최근 검색어를 모두 삭제했어요"); };

  // data URL → Blob (file 객체가 유실된 draft 복원 상황 대비)
  const dataUrlToBlob = async (dataUrl) => {
    try {
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch {
      return null;
    }
  };

  const uploadMedia = async (mediaItems) => {
    if (!user || !supabase) return mediaItems.map((m) => ({ id: m.id, type: m.type, url: m.url, duration: m.duration }));
    const uploaded = [];
    let failures = 0;
    let lastError = null;
    for (const m of mediaItems) {
      // 1) file 객체가 있으면 그대로 업로드
      let fileToUpload = m.file;
      const ext = m.type === "video" ? "mp4" : "jpg";

      // 2) file이 없고 data: URL이면 Blob으로 변환해서 업로드 (이전 버그: 빈 문자열로 날림)
      if (!fileToUpload && typeof m.url === "string" && m.url.startsWith("data:")) {
        fileToUpload = await dataUrlToBlob(m.url);
      }

      if (fileToUpload) {
        let toSend = fileToUpload;
        if (m.type === "image") {
          try {
            toSend = await compressImage(fileToUpload, { maxDimension: 1600, quality: 0.82 });
          } catch (e) {
            console.warn("[upload] compressImage failed, using original", e);
            toSend = fileToUpload;
          }
        }
        const { url, error } = await supabaseStorage.uploadMedia(user.id, toSend, `${m.id}.${ext}`);
        if (url && !error) {
          uploaded.push({ id: m.id, type: m.type, url, duration: m.duration });
          continue;
        }
        failures++;
        lastError = error;
        const sizeKb = toSend?.size ? Math.round(toSend.size / 1024) : "?";
        console.warn("[upload] supabase upload failed", {
          name: `${m.id}.${ext}`,
          type: m.type,
          sizeKb,
          mimeType: toSend?.type,
          errorName: error?.name,
          errorMessage: error?.message,
          errorStatus: error?.status || error?.statusCode,
          errorCause: error?.cause,
          errorOriginal: error?.originalError,
          errorJson: (() => { try { return JSON.stringify(error); } catch { return null; } })(),
          rawError: error,
        });
      } else {
        console.warn("[upload] no file blob available for media item", m);
      }

      // 3) 이미 원격 http(s) URL이면 그대로 재사용, 그 외는 스킵
      const safeUrl = typeof m.url === "string" && /^https?:/i.test(m.url) ? m.url : "";
      if (safeUrl) uploaded.push({ id: m.id, type: m.type, url: safeUrl, duration: m.duration });
    }
    if (failures > 0) {
      const reason = lastError?.message || lastError?.error || "";
      const hint = /bucket|not found/i.test(reason)
        ? " (Supabase 'review-media' 버킷 확인 필요)"
        : /policy|permission|row.level|rls/i.test(reason)
          ? " (Storage RLS 정책 확인 필요)"
          : reason ? ` (${reason})` : "";
      setToast(`업로드 ${failures}개 실패${hint}`);
    }
    return uploaded;
  };

  const submitReview = async (data) => {
    // 로그인 가드 — 로그인 안 된 상태에서 제출하면 서버 동기화가 절대 안 되므로 진입 차단
    if (!user) {
      setAuthOpen(true);
      setToast("로그인이 필요해요");
      return false;
    }

    // 텍스트 필드 sanitize
    data = {
      ...data,
      title: sanitizeInline(data.title, { maxLength: 200 }),
      body: sanitizeText(data.body, { maxLength: 5000 }),
      product: sanitizeInline(data.product, { maxLength: 200 }),
      category: sanitizeInline(data.category, { maxLength: 40 }),
      tags: (data.tags || []).map((t) => sanitizeInline(t, { maxLength: 40 })).filter(Boolean),
    };

    // 미디어는 일단 로컬 URL 그대로 사용 (업로드는 백그라운드)
    const localMedia = (data.media || []).map((m) => ({ id: m.id, type: m.type, url: m.url || "", duration: m.duration }));
    // 작성자 본인이 즉시 보는 썸네일도 mapReviewRow 와 동일하게 첫 미디어(이미지/동영상 무관) URL 사용
    const firstMedia = localMedia[0];

    if (data.id) {
      // 수정 모드 — 즉시 로컬 반영
      setUserReviews((prev) => prev.map((r) => r.id === data.id ? {
        ...r,
        title: data.title, body: data.body, product: data.product,
        products: data.products || [],
        media: localMedia,
        tags: data.tags.length ? data.tags : ["내웨이로그"],
        category: data.category,
        img: firstMedia?.url || data.img || "",
      } : r));
      setToast("웨이로그가 수정됐어요");
      // 서버 동기화 — 편집 내용을 IndexedDB에 미리 저장하고 3회 재시도. 실패 시 다음 앱 실행에서 자동 재시도.
      if (typeof data.id === "string") {
        const uid = user.id;
        const reviewId = data.id;
        const basePayload = {
          title: data.title, content: data.body, category: data.category,
          tags: data.tags.length ? data.tags : ["내웨이로그"],
          product_name: data.product, media: localMedia,
        };
        // 즉시 pending 에 저장 — 네트워크 전/중/후 창 닫혀도 다음 실행 시 복구
        savePendingEdit(uid, reviewId, basePayload).catch(() => {});
        (async () => {
          let uploaded = localMedia;
          try { uploaded = await uploadMedia(data.media || []); } catch {}
          if (userIdRef.current !== uid) return; // 업로드 도중 로그아웃/사용자 교체 시 중단
          const payload = { ...basePayload, media: uploaded };
          // 업로드 반영된 payload 로 pending 갱신
          await savePendingEdit(uid, reviewId, payload);
          for (let attempt = 0; attempt < 3; attempt++) {
            if (userIdRef.current !== uid) return;
            try {
              const { error: updErr } = await supabaseReviews.update(reviewId, payload);
              if (!updErr) {
                await removePendingEdit(uid, reviewId);
                return;
              }
            } catch {}
            if (attempt < 2) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          }
          if (userIdRef.current !== uid) return;
          // 3회 실패 — pendingEdit 는 유지. 수동 재시도 버튼 제공 (loadReviews 가 pendingEdit 재시도 포함).
          setToast({
            msg: "수정 내용이 아직 저장되지 못했어요",
            type: "error",
            action: { label: "다시 시도", onClick: () => loadReviewsRef.current?.() },
          });
        })();
      }
      return true;
    }

    // 새 리뷰 — 즉시 로컬에 추가하고 모달 닫기
    const localR = {
      id: Date.now(),
      img: firstMedia?.url || data.img || "",
      title: data.title, body: data.body, product: data.product,
      products: data.products || [],
      media: localMedia,
      tags: data.tags.length ? data.tags : ["내웨이로그"],
      category: data.category, views: 0, likes: 0,
      date: new Date().toISOString().slice(0, 10),
      author: user?.nickname || "나",
      authorAvatar: user?.avatar || "",
    };
    setUserReviews((prev) => [localR, ...prev]);

    setTimeout(() => {
      navigate("/feed");
      setToast("웨이로그가 등록됐어요");
      setHighlightId(localR.id);
      setTimeout(() => {
        document.querySelector(`[data-rid="${localR.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 350);
      setTimeout(() => setHighlightId(null), 1800);
    }, 280);

    // 서버 동기화 — 3회 재시도. 실패하면 로컬 pending 으로 IndexedDB에 남고, 다음 앱 실행 시 자동 재시도.
    const uid = user.id;
    (async () => {
      let uploaded = localMedia;
      try { uploaded = await uploadMedia(data.media || []); } catch {}
      // 업로드 도중 사용자 바뀌었으면 중단 (로그아웃/계정 교체)
      if (userIdRef.current !== uid) return;
      // mapReviewRow 와 동일하게 첫 미디어 URL 사용 (이미지 우선이지만 동영상-only 게시도 썸네일 영상으로 표시)
      const serverThumb = uploaded[0]?.url || "";
      // 업로드 결과를 로컬 pending 에도 반영 (다음 앱 실행 시 재시도할 때 동일한 media URL 사용)
      setUserReviews((prev) => prev.map((r) => r.id === localR.id ? { ...r, img: serverThumb || r.img, media: uploaded } : r));
      const payload = {
        user_id: uid,
        title: data.title, content: data.body, category: data.category,
        tags: data.tags.length ? data.tags : ["내웨이로그"],
        product_name: data.product, media: uploaded,
      };
      let lastErrorMsg = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        if (userIdRef.current !== uid) return; // 매 시도 전 사용자 확인
        try {
          const { data: created, error: createErr } = await supabaseReviews.create(payload);
          if (created?.id && !createErr) {
            setUserReviews((prev) => prev.map((r) => r.id === localR.id ? { ...r, id: created.id } : r));
            return; // 성공 — setUserReviews wrapper 가 pending(숫자 ID) 에서 제거
          }
          if (createErr?.message) lastErrorMsg = createErr.message;
        } catch (e) {
          if (e?.message) lastErrorMsg = e.message;
        }
        if (attempt < 2) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); // 2초, 4초 대기
      }
      if (userIdRef.current !== uid) return;
      // 3회 실패 — 로컬 pending 으로 유지. 사용자가 즉시 수동 재시도 가능.
      // 개발 환경에서만 원문 에러 노출 (스키마 정보 유출 방지 위해 프로덕션에선 간략 메시지)
      const detailed = import.meta.env.DEV && lastErrorMsg ? ` — ${lastErrorMsg}` : "";
      setToast({
        msg: `서버 저장 실패${detailed}. 네트워크 복구 시 자동 재시도`,
        type: "error",
        action: { label: "다시 시도", onClick: () => loadReviewsRef.current?.() },
      });
    })();

    return true; // 항상 성공 — 로컬에는 이미 저장됨
  };

  const [deletingReviewId, setDeletingReviewId] = useState(null);
  // 피드 카드의 ⋮ 메뉴에서 수정 선택 시 — 상세 진입 없이 바로 Compose 모달 오픈.
  // DetailScreen 의 onEdit 과 동일 효과이되 onBack 단계 불필요.
  const editReview = useCallback((rev) => {
    setEditingReview(rev);
    setCompose(true);
  }, []);

  const deleteReview = useCallback(async (id) => {
    if (deletingReviewId === id) return false; // 중복 호출 방지
    setDeletingReviewId(id);
    try {
      // 서버 우선 삭제: 성공 후에만 UI 제거 → "사라졌다 돌아오는" UX 방지
      if (user && typeof id === "string" && supabase) {
        const { error } = await supabaseReviews.delete(id);
        if (error) {
          setToast("삭제 실패. 네트워크를 확인해주세요");
          return false;
        }
      }
      setUserReviews((prev) => prev.filter((r) => r.id !== id));
      setFavsArr((prev) => prev.filter((x) => x !== id));
      setMoods((prev) => { const m = { ...prev }; delete m[id]; return m; });
      setCommentsMap((prev) => { const m = { ...prev }; delete m[id]; return m; });
      setToast("웨이로그가 삭제됐어요");
      return true;
    } finally {
      setDeletingReviewId(null);
    }
  }, [deletingReviewId, user, setToast, setUserReviews, setMoods]);

  const addComment = useCallback(async (rid, text, parentId = null, mentionTo = null) => {
    if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return false; }
    const cleanText = sanitizeText(text, { maxLength: 2000 });
    if (!cleanText.trim()) { setToast("댓글 내용을 입력해주세요"); return false; }

    // parentId 검증 — 존재하지 않거나, 이미 답글(대댓글 깊이 2+)이면 거부
    const existing = commentsMap[rid] || [];
    let validParentId = null;
    if (parentId != null) {
      const parent = existing.find((c) => c.id === parentId);
      if (!parent) {
        // 고아 스레드 방지: 부모가 없으면 최상위 댓글로 변환
        parentId = null;
      } else if (parent.parentId != null) {
        // 이미 답글인 댓글에 또 달면 원래 최상위로 올림 (한 단계 flat)
        parentId = parent.parentId;
      } else {
        // parentId는 local Date.now() 숫자일 수도, 서버 UUID일 수도 있음.
        // 서버 저장 시엔 서버 UUID만 전달 (로컬 ID는 서버가 모름).
        validParentId = typeof parent.id === "string" ? parent.id : null;
      }
    }

    const localId = Date.now();
    const localComment = {
      id: localId, author: user.nickname, avatar: user.avatar, authorId: user.id,
      time: "방금", createdAt: localId, text: cleanText,
      parentId, mentionTo: mentionTo ? sanitizeInline(mentionTo) : null, likedBy: [],
    };
    setCommentsMap((prev) => ({
      ...prev,
      [rid]: [...(prev[rid] || []), localComment],
    }));
    // Supabase 동기화 + 서버 ID로 교체
    if (supabase) {
      supabaseComments.create({
        user_id: user.id, review_id: rid,
        content: cleanText, parent_id: validParentId,
        mention_to: mentionTo ? sanitizeInline(mentionTo, { maxLength: 60 }) : null,
      })
        .then(({ data }) => {
          if (data?.id) {
            setCommentsMap((prev) => ({
              ...prev,
              [rid]: (prev[rid] || []).map((c) => c.id === localId ? { ...c, id: data.id } : c),
            }));
          }
        })
        .catch(() => {});
    }

    // 푸시 알림 — 자기 자신 제외, 글 작성자 + (답글이면) 부모 댓글 작성자
    const review = reviews.find((x) => x.id === rid);
    const reviewAuthorId = review?.authorId || review?.user_id || null;
    const preview = cleanText.length > 50 ? cleanText.slice(0, 50) + "…" : cleanText;
    if (reviewAuthorId && reviewAuthorId !== user.id) {
      sendPushNotification(
        reviewAuthorId,
        "comment",
        `${user.nickname}님이 댓글을 남겼어요`,
        preview,
        { url: `/review/${rid}` },
      );
    }
    if (parentId != null) {
      const parent = existing.find((c) => c.id === parentId);
      const parentAuthorId = parent?.authorId || parent?.user_id || null;
      // 글 작성자와 같으면 위에서 이미 보냈으니 중복 제외
      if (parentAuthorId && parentAuthorId !== user.id && parentAuthorId !== reviewAuthorId) {
        sendPushNotification(
          parentAuthorId,
          "comment",
          `${user.nickname}님이 답글을 남겼어요`,
          preview,
          { url: `/review/${rid}` },
        );
      }
    }
    return true;
  }, [user, commentsMap, reviews, setToast]);

  const toggleCommentLike = useCallback(async (rid, cid) => {
    if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return; }
    // 현재 상태 조회 후 낙관적 업데이트
    const current = (commentsMap[rid] || []).find((c) => c.id === cid);
    if (!current) return;
    const likedByKey = user.id || user.nickname;
    const wasLiked = (current.likedBy || []).includes(likedByKey);
    setCommentsMap((prev) => ({
      ...prev,
      [rid]: (prev[rid] || []).map((c) => {
        if (c.id !== cid) return c;
        const likedBy = c.likedBy || [];
        return {
          ...c,
          likedBy: wasLiked ? likedBy.filter((n) => n !== likedByKey) : [...likedBy, likedByKey],
        };
      }),
    }));
    // 서버 동기화 (서버 ID인 경우에만)
    if (supabase && typeof cid === "string" && user.id) {
      const { error } = wasLiked
        ? await supabaseComments.unlike(user.id, cid)
        : await supabaseComments.like(user.id, cid);
      if (error) {
        // 롤백
        setCommentsMap((prev) => ({
          ...prev,
          [rid]: (prev[rid] || []).map((c) => {
            if (c.id !== cid) return c;
            const likedBy = c.likedBy || [];
            return {
              ...c,
              likedBy: wasLiked ? [...likedBy, likedByKey] : likedBy.filter((n) => n !== likedByKey),
            };
          }),
        }));
        setToast("좋아요 반영에 실패했어요");
      }
    }
  }, [user, commentsMap, setToast]);

  const deleteComment = useCallback((rid, cid) => {
    setCommentsMap((prev) => ({
      ...prev,
      [rid]: (prev[rid] || []).filter((c) => c.id !== cid),
    }));
    if (supabase && typeof cid === "string") supabaseComments.delete(cid).catch(() => {});
    setToast("댓글이 삭제됐어요");
  }, [setToast]);

  const clearAllData = async () => {
    setFavsArr([]); setMoods({}); setUserReviews([]); setCommentsMap({});
    setTaste({ cats: {}, tags: {} }); setNotifications([]); setRecents([]);
    setFollowingArr([]); setBlockedArr([]);
    setToast("모든 데이터가 삭제됐어요");
  };

  // 세션 종료 시 사용자별 state 전체 리셋. logout() 과 onAuthStateChange(SIGNED_OUT) 양쪽에서 호출.
  // 여기서는 토스트/서버 호출은 하지 않음 — 순수 로컬 state 정리만 담당.
  // IndexedDB 의 pending 리뷰 키는 사용자별 격리라 지우지 않음 (같은 사용자 재로그인 시 복원 용이).
  const resetUserState = () => {
    setUserReviewsRaw([]);
    setFavsArr([]);
    setMoods({});
    setTaste({ cats: {}, tags: {} });
    setFollowingArr([]);
    setBlockedArr([]);
    setNotifications([]);
    setCommentsMap({});
    setChallenge(null);
    setChallengeDailyLogs({});
    setChallengeInbody([]);
    setCommunity([]);
    setCommunityComments({});
    setLikedPostIds(new Set());
    setRecents([]);
    // 재로그인 시 서버 hydration 을 다시 타도록 플래그 리셋
    moodsNotifsHydratedRef.current = false;
    challengeHydratedRef.current = false;
    communityHydratedRef.current = false;
    profileCacheRef.current = { userId: null, avatar: "" };
  };

  const logout = async () => {
    try {
      const { error } = await supabaseAuth.signOut() || {};
      if (error) {
        // 서버 로그아웃 실패해도 클라이언트는 clean up 진행 (로컬 토큰 제거).
        console.warn("signOut 서버 호출 실패:", error);
      }
    } catch (e) {
      console.warn("signOut 예외:", e);
    }
    setUser(null);
    resetUserState();
    setToast("로그아웃되었어요");
  };

  const likePost = async (id) => {
    if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return; }
    // 임시 id (optimistic 게시물) 는 서버에 아직 없으므로 좋아요 스킵
    if (typeof id !== "string" || id.startsWith("temp-")) return;
    const wasLiked = likedPostIds.has(id);
    // 낙관적 업데이트
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(id); else next.add(id);
      return next;
    });
    setCommunity((prev) => prev.map((p) => p.id === id
      ? { ...p, likes: Math.max(0, (p.likes || 0) + (wasLiked ? -1 : 1)) }
      : p));
    // 서버 동기화
    const { error } = wasLiked
      ? await supabaseCommunity.unlikePost(user.id, id)
      : await supabaseCommunity.likePost(user.id, id);
    if (error) {
      // 롤백
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(id); else next.delete(id);
        return next;
      });
      setCommunity((prev) => prev.map((p) => p.id === id
        ? { ...p, likes: Math.max(0, (p.likes || 0) + (wasLiked ? 1 : -1)) }
        : p));
      setToast("좋아요 반영에 실패했어요");
    }
  };

  const addCommunityPost = async (text, product = null, image = null, meta = {}) => {
    if (!user) return;
    const clean = sanitizeText(text, { maxLength: 1000 }).trim();
    if (!clean) return;
    const isAnon = !!meta.isAnonymous;
    const challengeId = meta.challengeId || null;
    const dayNum = meta.dayNum || null;
    // optimistic insert — 임시 id 로 즉시 표시, 서버 성공 시 교체 / 실패 시 제거
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      author: isAnon ? "익명" : user.nickname,
      avatar: isAnon ? "" : user.avatar,
      userId: isAnon ? null : user.id,
      user_id: user.id, // optimistic 비교용 — 서버 insert 는 본인 id 필요
      createdAt: new Date().toISOString(),
      content: clean,
      likes: 0,
      comments: 0,
      liked: false,
      isAnonymous: isAnon,
      challengeId,
      dayNum,
      ...(product ? { product: { id: product.id, name: product.name, brand: product.brand, imageUrl: product.imageUrl } } : {}),
      ...(image ? { image } : {}),
    };
    setCommunity((prev) => [optimistic, ...prev]);

    const payload = {
      user_id: user.id,
      content: clean,
      is_anonymous: isAnon,
      ...(challengeId ? { challenge_id: challengeId } : {}),
      ...(dayNum ? { day_num: dayNum } : {}),
      ...(product ? { product: { id: product.id, name: product.name, brand: product.brand, imageUrl: product.imageUrl } } : {}),
      ...(image ? { image_url: image } : {}),
    };
    let created = null, error = null;
    try {
      const res = await supabaseCommunity.create(payload);
      created = res?.data;
      error = res?.error;
      if (error) {
        // [1.0.2 디버그] 실기기에서 "게시 실패" 원인 파악 — logcat 에서 grep 가능
        console.error("[addCommunityPost] FAILED", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      }
    } catch (thrown) {
      console.error("[addCommunityPost] THREW", {
        message: thrown?.message,
        name: thrown?.name,
        stack: thrown?.stack,
      });
      error = thrown;
    }
    if (error || !created?.id) {
      setCommunity((prev) => prev.filter((p) => p.id !== tempId));
      setToast(`게시 실패: ${error?.message || "알 수 없음"}`);
      return;
    }
    setCommunity((prev) => prev.map((p) => p.id === tempId
      ? { ...optimistic, id: created.id, createdAt: created.created_at || optimistic.createdAt }
      : p));
    setToast("게시됐어요");
  };

  // 커뮤니티 글 삭제 — optimistic 제거 + 서버 동기화. 본인 글만 성공(RLS).
  const deleteCommunityPost = async (id) => {
    if (!user || deletingCommunityPostId === id) return false;
    if (typeof id !== "string" || id.startsWith("temp-")) {
      setToast("잠시 후 다시 시도해주세요");
      return false;
    }
    setDeletingCommunityPostId(id);
    try {
      if (supabase) {
        const { error } = await supabaseCommunity.delete(id);
        if (error) { setToast("삭제 실패. 네트워크를 확인해주세요"); return false; }
      }
      setCommunity((prev) => prev.filter((p) => p.id !== id));
      setCommunityComments((prev) => { const m = { ...prev }; delete m[id]; return m; });
      setToast("게시물이 삭제됐어요");
      return true;
    } finally {
      setDeletingCommunityPostId(null);
    }
  };

  // 커뮤니티 글 수정 — content / product / image / is_anonymous 패치.
  // 로컬 optimistic 반영 후 서버 update. 실패 시 이전 상태로 롤백.
  const updateCommunityPost = async (id, { content, product, image, isAnonymous }) => {
    if (!user) return false;
    if (typeof id !== "string" || id.startsWith("temp-")) {
      setToast("잠시 후 다시 시도해주세요");
      return false;
    }
    const clean = sanitizeText(content, { maxLength: 1000 }).trim();
    if (!clean) { setToast("내용을 입력해주세요"); return false; }
    const isAnon = !!isAnonymous;
    const prev = community.find((p) => p.id === id);
    if (!prev) return false;

    const nextProduct = product
      ? { id: product.id, name: product.name, brand: product.brand, imageUrl: product.imageUrl }
      : null;

    // optimistic — 로컬 카드 상태 업데이트
    setCommunity((list) => list.map((p) => {
      if (p.id !== id) return p;
      const patched = {
        ...p,
        content: clean,
        isAnonymous: isAnon,
        author: isAnon ? "익명" : user.nickname,
        avatar: isAnon ? "" : user.avatar,
        userId: isAnon ? null : user.id,
      };
      if (nextProduct) patched.product = nextProduct;
      else delete patched.product;
      if (image) patched.image = image;
      else delete patched.image;
      return patched;
    }));

    if (supabase) {
      const payload = {
        content: clean,
        is_anonymous: isAnon,
        product: nextProduct,
        image_url: image || null,
      };
      const { error } = await supabaseCommunity.update(id, payload);
      if (error) {
        // 롤백
        setCommunity((list) => list.map((p) => p.id === id ? prev : p));
        setToast("수정 실패. 네트워크를 확인해주세요");
        return false;
      }
    }
    setToast("게시물이 수정됐어요");
    return true;
  };

  // 커뮤니티 댓글 추가 — parentId 지정 시 답글, 깊이 2+ 이면 상위로 클램프
  // optimistic: 로컬 Date.now() id → 서버 성공 시 UUID 로 교체.
  const addCommunityComment = (postId, text, parentId = null, mentionTo = null) => {
    if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return false; }
    // 임시 id 게시물에는 댓글 불가 (서버에 post 가 없음)
    if (typeof postId !== "string" || postId.startsWith("temp-")) {
      setToast("잠시 후 다시 시도해주세요");
      return false;
    }
    const clean = sanitizeText(text, { maxLength: 500 }).trim();
    if (!clean) return false;
    const existing = communityComments[postId] || [];
    let validParentId = null;
    if (parentId != null) {
      const parent = existing.find((c) => c.id === parentId);
      if (!parent) parentId = null;
      else if (parent.parentId != null) parentId = parent.parentId;
      // 서버에는 서버 UUID parent_id 만 보냄 (로컬 숫자 id 는 서버가 모름)
      if (parent && typeof parent.id === "string") validParentId = parent.id;
    }
    const localId = Date.now();
    const newComment = {
      id: localId,
      author: user.nickname,
      avatar: user.avatar,
      authorId: user.id,
      text: clean,
      time: "방금",
      createdAt: Date.now(),
      parentId,
      mentionTo: mentionTo ? sanitizeInline(mentionTo, { maxLength: 60 }) : null,
      likedBy: [],
    };
    setCommunityComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), newComment] }));
    // 서버 동기화 (실패해도 로컬 유지 — review 댓글과 같은 관대한 정책)
    if (supabase) {
      supabaseCommunity.createComment({
        user_id: user.id,
        post_id: postId,
        content: clean,
        parent_id: validParentId,
        mention_to: mentionTo ? sanitizeInline(mentionTo, { maxLength: 60 }) : null,
      }).then(({ data }) => {
        if (data?.id) {
          setCommunityComments((prev) => ({
            ...prev,
            [postId]: (prev[postId] || []).map((c) => c.id === localId ? { ...c, id: data.id } : c),
          }));
        }
      }).catch(() => {});
    }
    return true;
  };

  const deleteCommunityComment = (postId, commentId) => {
    setCommunityComments((prev) => {
      const list = prev[postId] || [];
      const filtered = list.filter((c) => c.id !== commentId && c.parentId !== commentId);
      return { ...prev, [postId]: filtered };
    });
    // 서버 UUID 인 경우에만 서버 삭제
    if (supabase && typeof commentId === "string") {
      supabaseCommunity.deleteComment(commentId).catch(() => {});
    }
  };

  const toggleCommunityCommentLike = async (postId, commentId) => {
    if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return; }
    const key = user.id;
    const current = (communityComments[postId] || []).find((c) => c.id === commentId);
    if (!current) return;
    const wasLiked = (current.likedBy || []).some((k) => k === key);
    // 낙관적 업데이트
    setCommunityComments((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).map((c) => {
        if (c.id !== commentId) return c;
        const likedBy = c.likedBy || [];
        return { ...c, likedBy: wasLiked ? likedBy.filter((k) => k !== key) : [...likedBy, key] };
      }),
    }));
    // 서버 동기화 (UUID 댓글만)
    if (supabase && typeof commentId === "string") {
      const { error } = wasLiked
        ? await supabaseCommunity.unlikeComment(user.id, commentId)
        : await supabaseCommunity.likeComment(user.id, commentId);
      if (error) {
        // 롤백
        setCommunityComments((prev) => ({
          ...prev,
          [postId]: (prev[postId] || []).map((c) => {
            if (c.id !== commentId) return c;
            const likedBy = c.likedBy || [];
            return { ...c, likedBy: wasLiked ? [...likedBy, key] : likedBy.filter((k) => k !== key) };
          }),
        }));
        setToast("좋아요 반영에 실패했어요");
      }
    }
  };

  // 각 라우트 엔트리 — Routes 블록에서 element 로 사용.
  // explore/reels/profile 등은 (d) 단계에서 라우트 등록, 현재는 미노출.
  const homeEl = (
    <HomeScreen reviews={reviews} onOpen={openDetail} favs={favs} toggleFav={toggleFav} dark={dark} taste={taste} moods={moods} user={user} tg={tg} onPrimary={() => requireAuth(() => setCompose(true))}
      challenge={challenge} dailyLogs={challengeDailyLogs}
      onChallengeStart={() => requireAuth(() => setChallengeStartOpen(true))}
      onChallengeOpen={() => setChallengeMainOpen(true)}
      onChallengeResult={() => setChallengeMainOpen(true)}
      onProductClick={setSelectedCatalogProduct}
      onEditReview={editReview}
      onDeleteReview={(rev) => deleteReview(rev.id)}
      loading={reviewsLoading}/>
  );
  const feedEl = (
    <FeedScreen reviews={reviews} onOpen={openDetail} favs={favs} toggleFav={toggleFav} dark={dark} onCompose={() => setCompose(true)} following={following} user={user} loading={reviewsLoading} onLoadMore={loadMoreReviews} hasMore={reviewsHasMore} loadingMore={reviewsLoadingMore} highlightId={highlightId} />
  );
  const favEl = (
    <FavScreen reviews={reviews} onOpen={openDetail} favs={favs} toggleFav={toggleFav} dark={dark} moods={moods} setMoods={setMoodsWithBonus} onBrowse={() => navigate("/")} onProductClick={setSelectedCatalogProduct} loading={reviewsLoading}/>
  );
  const commEl = (
    <CommunityScreen dark={dark}
      posts={community.map((p) => ({
        ...p,
        comments: (communityComments[p.id] || []).length,
        liked: likedPostIds.has(p.id),
      }))}
      onLike={likePost} onUserClick={openUser}
      user={user}
      onRequireAuth={() => { setAuthOpen(true); setToast("로그인이 필요해요"); }}
      onCompose={() => setCommunityComposeOpen(true)}
      onEditPost={(p) => setEditingCommunityPost(p)}
      onDeletePost={deleteCommunityPost}
      comments={communityComments}
      onAddComment={addCommunityComment}
      onDeleteComment={deleteCommunityComment}
      onToggleCommentLike={toggleCommunityCommentLike}
      onShare={async (p) => {
        const text = `${p.author}: ${p.content}\n\n— 웨이로그에서 공유`;
        try {
          if (Capacitor.isNativePlatform()) {
            await CapShare.share({
              title: "웨이로그",
              text,
              dialogTitle: "어디에 공유할까요?",
            });
            // Android 시스템이 피드백 주므로 별도 토스트는 생략.
          } else if (navigator.share) {
            await navigator.share({ title: "웨이로그", text });
            setToast("공유했어요");
          } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            setToast("클립보드에 복사됐어요");
          }
        } catch (err) {
          // 사용자가 공유 시트에서 취소한 경우는 에러로 간주하지 않음.
          if (err?.name === "AbortError") return;
          if (typeof err?.message === "string" && err.message.toLowerCase().includes("cancel")) return;
        }
      }}/>
  );
  const profileSelfEl = (
    <ProfileSelfScreen user={user} reviews={reviews} favs={favs} toggleFav={toggleFav} dark={dark}
      onOpen={openDetail} onProductClick={setSelectedCatalogProduct}
      challenge={challenge} dailyLogs={challengeDailyLogs}
      onChallengeOpen={() => setChallengeMainOpen(true)}
      onChallengeStart={() => requireAuth(() => setChallengeStartOpen(true))}
      onEditProfile={() => setProfileOpen(true)}
      onOpenSettings={() => setSettingsOpen(true)}
      onAuthOpen={() => setAuthOpen(true)}
      following={following} followingArr={followingArr}
      community={community}
      toggleFollow={toggleFollow} onUserClick={openUser}/>
  );
  // dead routes — 하단네비 미노출, 직접 URL 입력으로만 접근.
  const exploreEl = (
    <ExploreScreen reviews={reviews} onOpen={openDetail} favs={favs} toggleFav={toggleFav} dark={dark}
      onProductClick={setSelectedCatalogProduct}
      onSearchOpen={() => setSearch(true)}/>
  );
  const reelsEl = (
    <ReelsScreen reviews={reviews} onOpen={openDetail} dark={dark} user={user}
      challenge={challenge} dailyLogs={challengeDailyLogs}
      onChallengeStart={() => requireAuth(() => setChallengeStartOpen(true))}
      onChallengeOpen={() => setChallengeMainOpen(true)}/>
  );

  // 앱 전역 Context — 화면들이 useAppContext 로 구독.
  // setter 들은 안정적이므로 deps 에서 제외 (user/dark 가 실제 변동 요인).
  // requireAuth 는 user 변경 시 재계산 필요.
  const appCtx = useMemo(() => ({
    user, dark, supabase,
    setToast, setAuthOpen,
    requireAuth: (fn) => {
      if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return; }
      fn();
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, dark]);

  // ---------- Android 뒤로가기 ----------
  // 모달 우선순위 cascade: compose → communityCompose → auth/settings/...
  // → 미니시트·상세모달 → navigate(-1) → root 에서 한 번 더 누르면 App.exitApp.
  const backHandlerRef = useRef(null);
  const exitArmedRef = useRef(false);
  backHandlerRef.current = ({ canGoBack: sysCanGoBack } = {}) => {
    // 1. 작성 중 모달 (데이터 손실 위험 최우선)
    if (compose) { setCompose(false); setEditingReview(null); setComposeProduct(null); return; }
    if (communityComposeOpen || editingCommunityPost) { setCommunityComposeOpen(false); setEditingCommunityPost(null); return; }
    // 2. 일반 전체화면 모달
    if (authOpen) { setAuthOpen(false); return; }
    if (settingsOpen) { setSettingsOpen(false); return; }
    if (profileOpen) { setProfileOpen(false); return; }
    if (adminOpen) { setAdminOpen(false); return; }
    if (onboardingOpen) { setOnboardingOpen(false); return; }
    if (challengeStartOpen) { setChallengeStartOpen(false); return; }
    if (challengeMainOpen) { setChallengeMainOpen(false); return; }
    if (search) { closeSearch(); return; }
    // 3. 시트·미니모달
    if (notifOpen) { setNotifOpen(false); return; }
    if (selectedUser) { setSelectedUser(null); return; }
    if (selectedCatalogProduct) { setSelectedCatalogProduct(null); return; }
    // 4. 히스토리 뒤로가기
    if (sysCanGoBack || location.pathname !== "/") {
      navigate(-1);
      return;
    }
    // 5. root — 더블 탭으로 종료
    if (exitArmedRef.current) {
      exitArmedRef.current = false;
      import("./utils/platform.js").then(({ exitApp }) => exitApp());
      return;
    }
    exitArmedRef.current = true;
    setToast("한 번 더 누르면 종료돼요");
    setTimeout(() => { exitArmedRef.current = false; }, 2000);
  };

  useEffect(() => {
    let sub;
    import("./utils/platform.js").then(({ initBackButtonHandler }) => {
      initBackButtonHandler((event) => backHandlerRef.current?.(event)).then((s) => { sub = s; });
    });
    return () => { sub?.remove?.(); };
  }, []);

  // SearchScreen 은 라우트가 아닌 state 기반 오버레이라 브라우저 back 이 반응하지 않음.
  // history sentinel 로 우회: 열 때 push → 브라우저 back → popstate → setSearch(false).
  // Capacitor Android 는 기존 backHandler 가 closeSearch 를 호출해 동일 경로로 닫는다.
  useEffect(() => {
    if (!search) return;
    window.history.pushState({ waylogSearch: true }, "");
    const onPop = () => setSearch(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [search]);

  // 검색 닫기 — sentinel 이 있으면 history.back() 으로 pop (popstate 가 setSearch(false) 호출).
  // 없으면 직접 상태만 바꿈. 호출측(backHandler / X 버튼) 에서 공통으로 사용.
  const closeSearch = useCallback(() => {
    if (window.history.state?.waylogSearch) window.history.back();
    else setSearch(false);
  }, []);

  // DetailScreenRoute 용 context 를 위한 stable 헬퍼들.
  // findLocal / fetchProfile 을 module-scope 로 끌어올릴 수는 없어 useCallback 으로 identity 고정.
  const findLocalReview = useCallback(
    (id) => reviews.find((rv) => String(rv.id) === String(id)) || null,
    [reviews]
  );

  // state 미참조, module import 만 사용 → deps 빈 배열.
  const fetchProfileById = useCallback(async (uid) => {
    if (!supabase || !uid) return null;
    try {
      const { data, error } = await supabase.from("profiles")
        .select("id, nickname, avatar_url").eq("id", uid).maybeSingle();
      if (error || !data) return null;
      return {
        userId: data.id,
        author: sanitizeInline(data.nickname, { maxLength: 60 }) || "익명",
        avatar: sanitizeImageUrl(data.avatar_url) || "",
      };
    } catch { return null; }
  }, []);

  // DetailScreen 전체를 JSX 로 생성. 모든 내부 함수 useCallback 화 되어 있어 deps 가 변할 때만
  // 새 identity. 이 함수 자체를 detailCtx.render 로 주입.
  const renderDetail = useCallback((r, onBack) => (
    <DetailScreen r={r} onBack={onBack} onOpen={openDetail}
      reviews={reviews} favs={favs} toggleFav={toggleFav} dark={dark}
      comments={(commentsMap[r.id] || []).filter((c) => !blocked.has(c.author))}
      addComment={addComment} deleteComment={deleteComment} toggleCommentLike={toggleCommentLike}
      user={user}
      deleting={deletingReviewId === r.id}
      onEdit={(rev) => { setEditingReview(rev); onBack(); setTimeout(() => setCompose(true), 280); }}
      onDelete={async (rev) => { const ok = await deleteReview(rev.id); if (ok) onBack(); }}
      onReport={(targetType = "review", targetId = r.id, reason = "inappropriate") => {
        if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return; }
        supabaseReports.create({ reporterId: user.id, targetType, targetId, reason })
          .then(({ error }) => setToast(error ? "신고 접수 실패. 잠시 후 다시 시도해주세요" : "신고가 접수됐어요. 검토 후 조치할게요"))
          .catch(() => setToast("신고 접수 실패"));
      }}
      onHashtagClick={(tag) => { onBack(); setTimeout(() => { setSearchQ(tag); setSearch(true); }, 280); }}
      onProductClick={setSelectedCatalogProduct}
      onUserClick={openUser}
      following={following}
      onToggleFollow={toggleFollow}/>
  ), [
    reviews, favs, dark, commentsMap, blocked, following, deletingReviewId, user,
    toggleFav, addComment, deleteComment, toggleCommentLike, deleteReview,
    openDetail, openUser, toggleFollow,
    setAuthOpen, setToast, setEditingReview, setCompose, setSearchQ, setSearch, setSelectedCatalogProduct,
  ]);

  const renderOtherProfile = useCallback((prof, onBack) => (
    <UserProfileScreen author={prof.author} avatar={prof.avatar} userId={prof.userId}
      reviews={reviews} currentUser={user}
      isFollowing={!!prof.userId && following.has(prof.userId)}
      following={following}
      onToggleFollow={(id, name) => toggleFollow(id || prof.userId, name || prof.author)}
      onClose={onBack} onOpen={openDetail} onUserClick={openUser} dark={dark}/>
  ), [reviews, user, dark, following, toggleFollow, openDetail, openUser]);

  // DetailScreenRoute 가 useContext 로 구독. 내부 필드(findLocalReview/fetchReviewById/setToast/renderDetail)
  // 가 모두 useCallback 기반이라 deps 가 바뀔 때만 새 객체 → DetailScreen 의 불필요 리렌더 제거.
  const detailCtx = useMemo(() => ({
    findLocal: findLocalReview,
    fetchById: fetchReviewById,
    setToast,
    render: renderDetail,
  }), [findLocalReview, fetchReviewById, setToast, renderDetail]);

  // UserProfileRoute 가 구독. 동일 전략.
  const profileCtx = useMemo(() => ({
    currentUserId: user?.id || null,
    fetchProfile: fetchProfileById,
    setToast,
    renderOther: renderOtherProfile,
  }), [user?.id, fetchProfileById, setToast, renderOtherProfile]);

  return (
    <AppProvider value={appCtx}>
    <DetailRouteContext.Provider value={detailCtx}>
    <ProfileRouteContext.Provider value={profileCtx}>
    <div className={cls("min-h-screen max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto pb-20 font-sans relative", dark ? "bg-gray-900" : "bg-gray-50")}
      style={{
        fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', sans-serif",
        transform: pullY > 0 ? `translateY(${pullY}px)` : undefined,
        transition: refreshing || pullY === 0 ? "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)" : "none",
      }}>
      {pullY > 0 && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[55] flex items-center justify-center pointer-events-none"
          style={{ height: `${pullY}px`, width: "60px", marginTop: "-10px" }}>
          <div className={cls("rounded-full p-2 shadow-lg", dark ? "bg-gray-800" : "bg-white")}>
            <RefreshCw size={18}
              className={cls("text-brand-500", refreshing && "animate-spin")}
              style={{ transform: refreshing ? undefined : `rotate(${pullY * 4}deg)`, transition: "transform 0.1s" }}/>
          </div>
        </div>
      )}
      {/* 상단 헤더 — IG 스타일: 로고 좌측 + 우측 heart(activity) + 다크토글 */}
      <header className={cls("sticky top-0 z-20 backdrop-blur-md border-b",
        dark ? "bg-black/90 border-[#262626]" : "bg-white/90 border-[#dbdbdb]")}
        style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}>
        <div className="px-4 h-[50px] flex items-center justify-between">
          {/* 로고 — 모든 탭에서 Waylog 로고 일관 노출 */}
          <button onClick={() => navigate("/")} className="active:opacity-60">
            <h1 className="text-[22px] font-black leading-none tracking-tight text-black dark:text-white">
              Waylog<span className="text-brand-500">·</span>
            </h1>
          </button>

          {/* 우측 액션 아이콘 — 다크토글 + 활동 + 프로필 */}
          <div className="flex items-center gap-3">
            <button onClick={() => setDark(!dark)} aria-label="테마 전환"
              className="p-1 active:scale-90 transition">
              {dark ? <Sun size={22} className="text-white"/> : <Moon size={22} className="text-black"/>}
            </button>
            {/* Activity (heart) — 알림 페이지 */}
            <div className="relative" ref={notifRef}>
              <button onClick={(e) => {
                e.stopPropagation();
                setNotifOpen(!notifOpen);
                if (!notifOpen && unreadCount > 0) {
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                  if (supabase && user?.id) supabaseNotifs.markAllRead(user.id).catch(() => {});
                }
              }}
              aria-label={unreadCount > 0 ? `활동 ${unreadCount}개` : "활동"}
              className="p-1 active:scale-90 transition relative">
                <Heart size={24} strokeWidth={1.8} className={dark ? "text-white" : "text-black"}/>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 min-w-[16px] h-[16px] px-1 bg-red-500 rounded-full text-[11px] font-bold text-white flex items-center justify-center leading-none tabular-nums">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className={cls("absolute right-0 top-10 w-80 rounded-xl overflow-hidden z-30 border",
                  dark ? "bg-black border-[#262626]" : "bg-white border-[#dbdbdb]")}
                  style={{ boxShadow: dark ? "0 4px 16px rgba(0,0,0,0.6)" : "0 4px 16px rgba(0,0,0,0.12)" }}>
                  <div className={cls("px-4 py-3.5 border-b flex items-center justify-between", dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
                    <p className={cls("text-[15px] font-bold", dark ? "text-white" : "text-black")}>활동</p>
                    {notifications.length > 0 && (
                      <div className="flex gap-3">
                        {unreadCount > 0 && (
                          <button onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                            className="text-[13px] font-bold text-brand-700 active:opacity-60">
                            모두 읽음
                          </button>
                        )}
                        <button onClick={() => {
                          if (armClearNotif) { setNotifications([]); setArmClearNotif(false); setToast("모든 알림이 삭제됐어요"); }
                          else { setArmClearNotif(true); }
                        }}
                          className={cls("text-[13px] font-bold active:opacity-60 transition", armClearNotif ? "text-red-500" : dark ? "text-[#a8a8a8]" : "text-[#737373]")}>
                          {armClearNotif ? "정말 삭제?" : "모두 삭제"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className={cls("py-12 text-center", dark ? "text-[#737373]" : "text-[#737373]")}>
                        <Heart size={32} className="mx-auto mb-2 opacity-30" strokeWidth={1.5}/>
                        <p className="text-[13px] font-bold">활동 내역이 없어요</p>
                        <p className="text-[11px] mt-1 opacity-80">글을 작성하거나 좋아요·댓글을 남기면 여기에 표시돼요</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button key={n.id} onClick={() => {
                          if (n.targetReviewId) {
                            const target = reviews.find((x) => x.id === n.targetReviewId);
                            if (target) { openDetail(target); setNotifOpen(false); }
                          }
                        }}
                          className={cls("w-full text-left px-4 py-3 border-b last:border-0 transition",
                            n.targetReviewId ? (dark ? "active:bg-[#121212]" : "active:bg-[#fafafa]") : "cursor-default",
                            dark ? "border-[#262626]" : "border-[#dbdbdb]")}>
                          <p className={cls("text-[14px]", dark ? "text-white" : "text-black")}>{n.text}</p>
                          <p className="text-[12px] text-[#737373] mt-1">{formatRelativeTime(n.createdAt, n.time)}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* 프로필 — 내 프로필 페이지(/profile/me) 진입, 비로그인 시 AuthScreen */}
            <button onClick={() => user ? navigate("/profile/me") : setAuthOpen(true)}
              aria-label="프로필"
              className="p-0.5 active:scale-90 transition">
              <div className={cls("w-7 h-7 rounded-full overflow-hidden", !user && (dark ? "bg-[#262626]" : "bg-[#f2f2f2]"))}>
                {user ? (
                  <Avatar id={user.avatar} size={8} className="w-full h-full"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={14} className={dark ? "text-white" : "text-black"} strokeWidth={2}/>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
        {/* 헤더 검색 pill — 탭 무관 상시 노출 */}
        <div className="px-4 pb-3">
          <button onClick={() => setSearch(true)}
            className={cls("w-full flex items-center gap-2 px-4 py-2.5 rounded-full transition active:scale-[0.98]",
              dark ? "bg-[#1a1a1a] hover:bg-[#222] border border-[#262626]" : "bg-[#f2f2f2] hover:bg-[#ebebeb]")}>
            <Search size={16} className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}/>
            <span className={cls("text-[14px]", dark ? "text-[#a8a8a8]" : "text-[#737373]")}>리뷰 · 제품 · 태그 검색</span>
          </button>
        </div>
      </header>

      {/* 라우트 전환 시 살짝 fade-in — pathname 변경 시 wrapper 재마운트 */}
      <div key={location.pathname} className="animate-fade-in">
        <Routes>
          <Route path="/" element={homeEl}/>
          <Route path="/feed" element={feedEl}/>
          <Route path="/fav" element={favEl}/>
          <Route path="/community" element={commEl}/>
          <Route path="/review/:id" element={<DetailScreenRoute/>}/>
          <Route path="/r/:id" element={<ReviewLegacyRedirect/>}/>
          <Route path="/profile/me" element={profileSelfEl}/>
          <Route path="/profile/:userId" element={<UserProfileRoute/>}/>
          {/* /explore, /reels 은 1.0 에서 미노출. exploreEl/reelsEl 변수 정의는 1.1.0 복원 대비 유지. */}
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </div>

      {/* FAB — 새 웨이로그 / 커뮤니티 글쓰기 */}
      {(() => {
        const isComm = location.pathname === "/community";
        return (
          <div className="fixed inset-x-0 bottom-0 pointer-events-none z-20 flex justify-center">
            <div className="w-full max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl relative h-0">
              <button onClick={() => {
                if (isComm) requireAuth(() => setCommunityComposeOpen(true));
                else requireAuth(() => setCompose(true));
              }}
                aria-label={isComm ? "커뮤니티 글쓰기" : "새 웨이로그 작성"}
                style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
                className={cls("pointer-events-auto absolute right-4 w-14 h-14 rounded-full shadow-xl flex items-center justify-center active:scale-90 transition",
                  isComm ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-brand-500")}>
                <Plus size={26} className="text-white" strokeWidth={2.5}/>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl z-[70] px-4 pt-safe pb-2">
          <div className="bg-gray-900/95 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center justify-center gap-2 animate-slide-up">
            <Wind size={14}/> 오프라인 상태에요. 연결을 확인해주세요
          </div>
        </div>
      )}

      {/* Toast — type 별 색 분기 (info: 검정, success: emerald, error: rose). action 있으면 버튼 렌더 */}
      {toast && (
        <div
          style={{ bottom: "calc(7rem + env(safe-area-inset-bottom))" }}
          className="fixed inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
          <div className={cls("text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl animate-toast inline-flex items-center gap-1.5 max-w-full",
            toast.action ? "pointer-events-auto" : "",
            toast.type === "error" ? "bg-rose-600/95" :
            toast.type === "success" ? "bg-brand-600/95" :
            "bg-gray-900/95")}>
            {toast.type === "error" && <X size={12} className="shrink-0"/>}
            {toast.type === "success" && <Check size={12} className="shrink-0"/>}
            <span className="truncate">{toast.msg}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => { try { toast.action.onClick?.(); } finally { setToastRaw(null); } }}
                className="ml-1 shrink-0 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white text-[11px] font-bold transition-colors"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        </div>
      )}

      {search && <SearchScreen reviews={reviews} onOpen={openDetail} favs={favs} toggleFav={toggleFav} dark={dark} onClose={closeSearch} recents={recents} addRecent={addRecent} removeRecent={removeRecent} clearRecents={clearRecents} q={searchQ} setQ={setSearchQ} onProductClick={setSelectedCatalogProduct}/>}
      <Suspense fallback={null}>{compose && <ComposeScreen onClose={() => { setCompose(false); setEditingReview(null); setComposeProduct(null); }} onSubmit={submitReview} dark={dark} editing={editingReview} prefillProduct={composeProduct}/>}</Suspense>
      {(communityComposeOpen || editingCommunityPost) && user && (
        <CommunityComposeModal
          onClose={() => { setCommunityComposeOpen(false); setEditingCommunityPost(null); }}
          onPost={(text, prod, img, meta) => {
            if (editingCommunityPost) {
              updateCommunityPost(editingCommunityPost.id, { content: text, product: prod, image: img, isAnonymous: meta?.isAnonymous });
            } else {
              addCommunityPost(text, prod, img, meta);
            }
            setCommunityComposeOpen(false);
            setEditingCommunityPost(null);
          }}
          dark={dark} user={user} challenge={challenge}
          editing={editingCommunityPost}/>
      )}
      <Suspense fallback={null}>{authOpen && <AuthScreen onClose={() => setAuthOpen(false)} onAuth={(u) => {
        setUser(u);
        setToast(`${u.nickname}님 환영해요`);
        setNotifications((prev) => [
          { id: Date.now(), text: `${u.nickname}님, 웨이로그에 오신 것을 환영해요!`, createdAt: Date.now(), read: false },
          { id: Date.now()+1, text: "첫 웨이로그를 작성하면 추천이 더 정교해져요", createdAt: Date.now(), read: false },
          ...prev
        ]);
        if (!onboarded) setTimeout(() => setOnboardingOpen(true), 400);
      }} dark={dark}/>}</Suspense>
      <Suspense fallback={null}>{profileOpen && user && <ProfileScreen user={user} onClose={() => setProfileOpen(false)}
        onLogout={logout}
        onUpdateProfile={async (u, avatarFile) => {
          let avatarUrl = u.avatar;
          if (avatarFile && supabase && u.id) {
            const { url } = await supabaseStorage.uploadAvatar(u.id, avatarFile);
            if (url) avatarUrl = url;
          }
          if (supabase && u.id) {
            await supabaseAuth.updateProfile(u.id, { nickname: u.nickname, avatar_url: avatarUrl });
            await supabaseAuth.updateUserMetadata({ nickname: u.nickname, avatar_url: avatarUrl });
          }
          const updated = { ...u, avatar: avatarUrl };
          profileCacheRef.current = { userId: u.id, avatar: avatarUrl };
          setUser(updated);
          setToast("프로필이 수정됐어요");
        }}
        onOpenSettings={() => { setProfileOpen(false); setTimeout(() => setSettingsOpen(true), 100); }}
        dark={dark} favs={favs} moods={moods} userReviews={userReviews} taste={taste}/>}</Suspense>
      <Suspense fallback={null}>{settingsOpen && <SettingsScreen user={user} dark={dark} setDark={setDark}
        notifPref={notifPref} setNotifPref={setNotifPref}
        blockedList={blockedArr} onUnblock={toggleBlock}
        onClose={() => setSettingsOpen(false)}
        onLogout={logout}
        onClearData={clearAllData}
        onReplayOnboarding={() => { setSettingsOpen(false); setTimeout(() => setOnboardingOpen(true), 200); }}
        onOpenAdmin={() => { setSettingsOpen(false); setTimeout(() => setAdminOpen(true), 200); }}
        onEnablePush={async () => {
          if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return; }
          if (!pushSupported()) { setToast("이 브라우저는 푸시 알림을 지원하지 않아요"); return; }
          const perm = await requestPushPermission();
          if (perm === "denied") { setToast("브라우저에서 알림이 차단돼 있어요. 사이트 설정에서 허용해주세요"); return; }
          if (perm !== "granted") { setToast("알림 권한을 허용해주세요"); return; }
          const sub = await subscribePush(user.id);
          setToast(sub ? "푸시 알림을 켰어요" : "푸시 구독 설정을 완료하지 못했어요. VAPID 키 설정 확인 필요");
        }}/>}</Suspense>
      <Suspense fallback={null}>{onboardingOpen && <OnboardingScreen onClose={() => { setOnboardingOpen(false); setOnboarded(true); }} dark={dark}/>}</Suspense>
      <Suspense fallback={null}>{adminOpen && <AdminModerationScreen dark={dark} onClose={() => setAdminOpen(false)}/>}</Suspense>
      {selectedUser && <UserMiniSheet author={selectedUser.author} avatar={selectedUser.avatar}
        userId={selectedUser.userId}
        onClose={() => setSelectedUser(null)} onOpen={openDetail}
        onOpenProfile={(u) => {
          setSelectedUser(null);
          if (!u?.userId) { setToast("프로필을 볼 수 없어요"); return; }
          navigate(`/profile/${u.userId}`, { state: { profile: { userId: u.userId, author: u.author, avatar: u.avatar } } });
        }}
        isFollowing={!!selectedUser.userId && following.has(selectedUser.userId)}
        onToggleFollow={() => toggleFollow(selectedUser.userId, selectedUser.author)}
        isBlocked={blocked.has(selectedUser.author)}
        onToggleBlock={toggleBlock}
        currentUser={user}
        dark={dark}/>}

      <Suspense fallback={null}>{challengeStartOpen && <ChallengeStartScreen
        onClose={() => setChallengeStartOpen(false)}
        onStart={(data) => {
          setChallenge(data);
          setChallengeInbody([{ id: Date.now(), date: new Date().toISOString(), weight: data.weight, bodyFat: data.bodyFat, muscle: 0, bmi: data.bmi }]);
          setToast("챌린지가 시작됐어요!");
          pushNotif("바디키 8주 챌린지가 시작됐어요!");
          setTimeout(() => setChallengeMainOpen(true), 300);
        }}
        dark={dark}/>}</Suspense>

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
          onCompose={(prod) => {
            setSelectedCatalogProduct(null);
            setComposeProduct(prod || selectedCatalogProduct);
            setTimeout(() => setCompose(true), 280);
          }}
          onProductClick={setSelectedCatalogProduct}
        />
      )}

      {challengeMainOpen && challenge && <ChallengeMainScreen
        challenge={challenge}
        setChallenge={setChallenge}
        dailyLogs={challengeDailyLogs}
        setDailyLogs={setChallengeDailyLogsSync}
        inbodyRecords={challengeInbody}
        setInbodyRecords={setChallengeInbodySync}
        onClose={() => setChallengeMainOpen(false)}
        dark={dark}
        user={user}
        onAnalyzeInbody={analyzeInbodyImage}
        onToast={setToast}/>}

      {/* 하단 네비 — 4탭 라벨 포함, 브랜드(더스티네이비) 액센트. 탭 라벨 개편은 4단계. */}
      <nav className={cls("fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl border-t grid grid-cols-4 z-20 backdrop-blur-xl",
        dark ? "bg-ink-900/95 border-ink-800" : "bg-white/95 border-ink-200")}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)", paddingTop: "0.5rem" }}>
        {[
          { to: "/", icon: Sparkles, label: "추천", end: true },
          { to: "/feed", icon: Grid3x3, label: "오늘뭐썼지" },
          { to: "/fav", icon: Heart, label: "마이웨이템" },
          { to: "/community", icon: Users, label: "커뮤니티" },
        ].map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            aria-label={label}
            className="min-h-tap flex flex-col items-center justify-center gap-1 active:scale-95 transition relative">
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6}
                  className={cls("transition-colors duration-200",
                    isActive ? "text-brand-700 dark:text-brand-200" : dark ? "text-ink-400" : "text-ink-500")}/>
                <span className={cls("text-[11px] tracking-tight transition-colors duration-200",
                  isActive ? "font-semibold text-brand-700 dark:text-brand-200" : dark ? "font-medium text-ink-400" : "font-medium text-ink-500")}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
    </ProfileRouteContext.Provider>
    </DetailRouteContext.Provider>
    </AppProvider>
  );
}

// 숨은 라우트: ?preview=sharecard — ShareCardModal 만 샘플 데이터로 렌더.
// 카테고리/다크모드/이미지 유무를 토글할 수 있어 카드 변형을 빠르게 검수 가능.
function SharecardPreview() {
  const [dark, setDark] = useState(false);
  const [category, setCategory] = useState("food");
  const [withImg, setWithImg] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); } }, [toast]);

  const ctx = useMemo(() => ({
    user: null, dark, supabase: null,
    setToast, setAuthOpen: () => {},
    requireAuth: (fn) => fn(),
  }), [dark]);

  const sampleByCategory = {
    food:     { title: "더블엑스 멀티비타민/멀티미네랄", product: "더블엑스", body: "한 달째 꾸준히 먹는 중. 아침 컨디션이 확실히 가볍고, 재구매 확정." },
    wellness: { title: "씽잉볼과 함께 ❤️", product: "라벤더 에센셜 오일", body: "요가 명상 시간에 디퓨징하면 마음이 한결 차분해져요." },
    beauty:   { title: "3개월만에 피부결 변화", product: "아티스트리 더마아키텍트", body: "꾸준히 사용하니 모공도 줄고 탄력이 올라온 느낌." },
    kitchen:  { title: "아침 세안 이거 하나면 끝", product: "하이드라매틱스 클렌저", body: "거품이 풍성하고 당김 없이 깔끔해요." },
    home:     { title: "퀸사용 첫경험", product: "암웨이 퀸 Ti 크라운 세트", body: "무수분 요리에 진심이 되었습니다." },
    one4one:  { title: "원포원 참여 후기", product: "뉴트리라이트 원포원", body: "매달 자동 참여 중. 뜻깊은 나눔이에요." },
  };
  const s = sampleByCategory[category];
  const review = {
    id: "preview",
    category,
    title: s.title,
    product: s.product,
    author: "지영",
    body: s.body,
    img: withImg ? "https://picsum.photos/seed/waylog/600/600" : "",
    likes: 42,
    date: "2026-04-16",
  };

  return (
    <AppProvider value={ctx}>
      <div className={cls("min-h-screen", dark ? "bg-gray-900" : "bg-gray-50")}>
        <div className={cls("max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto p-4 flex flex-wrap gap-2 items-center border-b",
          dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-100 text-gray-800")}>
          <span className="text-xs font-black mr-1">공유카드 프리뷰</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className={cls("text-xs rounded-lg px-2 py-1 border", dark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200")}>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => setWithImg((v) => !v)}
            className={cls("text-xs rounded-lg px-2 py-1 border", dark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200")}>
            이미지: {withImg ? "있음" : "없음(아이콘)"}
          </button>
          <button onClick={() => setDark((v) => !v)}
            className={cls("text-xs rounded-lg px-2 py-1 border", dark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200")}>
            {dark ? "라이트" : "다크"}
          </button>
        </div>
        <Suspense fallback={null}>
          <ShareCardModal review={review} dark={dark} user={null} onClose={() => setToast("프리뷰에서는 닫기 동작 없음")}/>
        </Suspense>
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-4 py-2 rounded-full z-[80]">{toast}</div>
        )}
      </div>
    </AppProvider>
  );
}

export default function App() {
  if (typeof window !== "undefined") {
    const preview = new URLSearchParams(window.location.search).get("preview");
    if (preview === "sharecard") {
      return <ErrorBoundary><SharecardPreview/></ErrorBoundary>;
    }
  }
  return (
    <ErrorBoundary>
      <AppInner/>
    </ErrorBoundary>
  );
}


import { useState, useEffect, useMemo, useRef, useCallback, Component, lazy, Suspense } from "react";
import {
  // App.jsx 에서 직접 JSX 렌더에 사용하는 아이콘만. 상수/컴포넌트용 아이콘은 해당 파일로 이동.
  Home, Utensils, Heart, Users, User, Bell, Search, ArrowLeft, Plus,
  Eye, Moon, Sun, Sparkles, MessageCircle, Share2, X,
  Calendar, Camera, Check, Flame, ExternalLink, ChevronRight,
  Star, RefreshCw,
  BookOpen, PenLine, Target, Inbox, Wind, ShoppingBag,
  Trophy, Dumbbell, Activity,
  BarChart3, Download,
  Package
} from "lucide-react";

import { useCatalog, useCatalogLoading } from "./catalog.js";
import { supabase, auth as supabaseAuth, reviews as supabaseReviews, favorites as supabaseFavorites, comments as supabaseComments, challenges as supabaseChallenges, moodsApi as supabaseMoods, notifications as supabaseNotifs, reports as supabaseReports, storage as supabaseStorage, follows as supabaseFollows, profilesApi as supabaseProfiles } from "./supabase.js";
import { sanitizeImageUrl, sanitizeText, sanitizeInline } from "./utils/sanitize.js";
import { compressImage } from "./utils/image.js";
import { friendlyError } from "./utils/errors.js";
import { identify, events as analyticsEvents } from "./utils/analytics.js";
import { pushSupported, requestPushPermission, subscribePush } from "./utils/push.js";
import {
  BASE, CHALLENGE_WEEKS, CHALLENGE_DAYS, AI_CACHE_MAX, AI_CACHE_TTL_MS,
  PRODUCTS, MOODS, CATEGORIES, CAT_SOLID,
  CHALLENGE_MISSIONS, EXERCISE_TYPES,
  AI_COACH_TONES, REPORT_REASONS,
} from "./constants.js";
import { useDebouncedValue, useStoredState, useNavStack, useExit, useTimeGradient } from "./hooks.js";
import { cls, formatRelativeTime } from "./utils/ui.js";
import {
  Avatar, MissionIcon, CategoryIcon, CategoryChip,
  ProductImage, SmartImg, Card, SectionTitle, SkeletonCard, MentionText, EmptyState,
} from "./components/index.js";
import { SEED_REVIEWS, SEED_COMMENTS, POPULAR_TAGS } from "./mocks/seed.js";
import { AppProvider, useAppContext } from "./contexts/AppContext.js";
// Lazy-loaded screens — only fetched when their flag flips true. Cuts initial bundle.
const AdminModerationScreen = lazy(() => import("./screens/AdminModerationScreen.jsx").then(m => ({ default: m.AdminModerationScreen })));
const OnboardingScreen = lazy(() => import("./screens/OnboardingScreen.jsx").then(m => ({ default: m.OnboardingScreen })));
const InbodyScreen = lazy(() => import("./screens/InbodyScreen.jsx").then(m => ({ default: m.InbodyScreen })));
const AnonCommunityScreen = lazy(() => import("./screens/AnonCommunityScreen.jsx").then(m => ({ default: m.AnonCommunityScreen })));
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

const aiDailyReport = async (totalCal, totalBurned, completedMissions, totalMissions, targetCal) => {
  const rate = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;
  const today = new Date().toISOString().slice(0, 10);
  // 같은 날짜·수치면 동일 리포트 → 캐시
  const cacheKey = `report:${today}:${totalCal}:${totalBurned}:${rate}:${targetCal}`;
  const text = await cachedCallClaude(
    cacheKey,
    `피트니스 일일 리포트 코멘트를 한국어 1-2문장으로 작성해주세요. 오늘 섭취 ${totalCal}kcal (목표 ${targetCal}kcal), 소비 ${totalBurned}kcal, 미션 달성률 ${rate}%. 격려와 구체적 조언을 포함. 텍스트만 응답.`,
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
const HomeScreen = ({ reviews, onOpen, favs, toggleFav, dark, user, onPrimary, tg, refreshKey = 0, challenge, dailyLogs, onChallengeStart, onChallengeOpen, onChallengeResult, onProductClick }) => {
  const CATALOG = useCatalog();
  const [hotMode, setHotMode] = useState("trending");
  const [exploreCat, setExploreCat] = useState("all");
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

  const filteredCatalog = useMemo(() => {
    const list = CATALOG || [];
    if (exploreCat === "all") return list.slice(0, 12);
    return list.filter((p) => p.category === exploreCat).slice(0, 12);
  }, [CATALOG, exploreCat]);

  const fadeBg = dark ? "from-gray-900" : "from-gray-50";

  return (
    <div className={dark ? "bg-gray-900" : "bg-gray-50"}>
      {/* ① 히어로 배너 */}
      <div className={cls("mx-4 mt-4 rounded-3xl p-6 bg-gradient-to-br text-white relative overflow-hidden shadow-xl tg-trans", tg.gradient)}>
        <Sparkles className="absolute right-4 top-4 opacity-25" size={64} />
        <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10"/>
        <p className="text-xs opacity-80 font-bold tracking-wider uppercase relative">{user ? `${user.nickname}님` : "WELCOME"}</p>
        <h2 className="text-3xl font-black mt-1 leading-[1.1] relative">{tg.text}</h2>
        <p className="text-sm font-medium mt-2 opacity-90 relative">{user ? "오늘은 어떤 걸 기록해볼까요?" : "나만의 라이프스타일을 기록하세요"}</p>
        <button onClick={onPrimary}
          className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-full font-black text-base shadow-2xl shadow-black/20 active:scale-95 transition hover:scale-105 relative">
          <PenLine size={16}/>
          {user ? "새 웨이로그 작성" : "둘러보기"}
          <span className="text-lg">→</span>
        </button>
      </div>

      {/* ② 챌린지 카드 */}
      <ChallengeEntryCard
          challenge={challenge}
          dailyLogs={dailyLogs}
          dark={dark}
          onStart={onChallengeStart}
          onOpen={onChallengeOpen}
          onResult={onChallengeResult}
        />

      {/* ⑤ 인기/최신 — 가로 스크롤 (히어로 카드 + 일반 카드) */}
      <div className="px-4 mt-8 mb-3 flex items-center justify-between">
        <h2 className={cls("text-lg font-extrabold tracking-tight", dark ? "text-white" : "text-gray-900")}>
          {hotMode === "trending" ? "요즘 뜨는 웨이로그" : "따끈따끈한 새 글"}
        </h2>
        <div className={cls("flex gap-1 text-xs rounded-full p-1", dark ? "bg-gray-800" : "bg-gray-100")}>
          <button onClick={() => setHotMode("trending")}
            className={cls("px-3 py-1 rounded-full font-bold transition", hotMode === "trending" ? (dark ? "bg-gray-700 text-emerald-400 shadow" : "bg-white text-emerald-600 shadow") : dark ? "text-gray-400" : "text-gray-500")}>
            인기
          </button>
          <button onClick={() => setHotMode("fresh")}
            className={cls("px-3 py-1 rounded-full font-bold transition", hotMode === "fresh" ? (dark ? "bg-gray-700 text-emerald-400 shadow" : "bg-white text-emerald-600 shadow") : dark ? "text-gray-400" : "text-gray-500")}>
            최신
          </button>
        </div>
      </div>
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto px-4 pb-3 snap-x scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {(hotMode === "trending" ? trending : fresh).map((r, i) => (
            <div key={`${hotMode}-${r.id}`} className={cls("snap-start shrink-0 animate-card-enter", i === 0 ? "w-64" : "w-48")} style={{ animationDelay: `${i * 60}ms` }}>
              <Card r={r} onOpen={onOpen} isFav={favs.has(r.id)} toggleFav={toggleFav} dark={dark} highlight={i === 0} />
            </div>
          ))}
        </div>
        <div className={cls("absolute right-0 top-0 bottom-3 w-8 pointer-events-none bg-gradient-to-l", fadeBg)} />
      </div>

      {/* ⑥ 탐색하기 — 카테고리 필터 + 3열 그리드 */}
      <div className="px-4 mt-10 mb-2">
        <h2 className={cls("text-lg font-extrabold tracking-tight", dark ? "text-white" : "text-gray-900")}>탐색하기</h2>
        <p className={cls("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>카테고리별 인기 제품을 확인해보세요</p>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {[{ key: "all", label: "전체" }, ...Object.entries(CATEGORIES).map(([k, c]) => ({ key: k, label: c.label }))].map((c) => (
          <button key={c.key} onClick={() => setExploreCat(c.key)}
            className={cls("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap",
              exploreCat === c.key
                ? (dark ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40" : "bg-emerald-500 text-white shadow-sm")
                : (dark ? "bg-gray-800 text-gray-400" : "bg-white text-gray-600 border border-gray-200"))}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2.5 px-4 pb-6">
        {filteredCatalog.map((p, i) => (
          <button key={p.id} onClick={() => onProductClick && onProductClick(p)}
            className={cls("rounded-2xl overflow-hidden text-left active:scale-[0.97] transition animate-card-enter", dark ? "bg-gray-800" : "bg-white shadow-sm")}
            style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
            <div className={cls("aspect-square flex items-center justify-center p-3", dark ? "bg-gray-900/60" : "bg-gray-50")}>
              <ProductImage src={p.imageUrl} alt={p.name} className="max-w-full max-h-full object-contain" iconSize={20}/>
            </div>
            <div className="p-2">
              <p className={cls("text-[10px] font-bold truncate", dark ? "text-emerald-400" : "text-emerald-600")}>{p.brand || ""}</p>
              <p className={cls("text-[11px] font-bold line-clamp-2 leading-tight mt-0.5", dark ? "text-white" : "text-gray-900")}>{p.name}</p>
              {p.price > 0 && <p className={cls("text-[10px] mt-1 tabular-nums", dark ? "text-gray-500" : "text-gray-400")}>{p.price.toLocaleString()}원</p>}
            </div>
          </button>
        ))}
        {filteredCatalog.length === 0 && (
          <div className={cls("col-span-3 py-8 text-center text-sm", dark ? "text-gray-500" : "text-gray-400")}>
            해당 카테고리에 제품이 없어요
          </div>
        )}
      </div>
    </div>
  );
};

// 카드 레이아웃과 같은 크기의 shimmer placeholder

const FeedScreen = ({ reviews, onOpen, favs, toggleFav, dark, onCompose: _onCompose, following, user, loading = false, onLoadMore, hasMore = false, loadingMore = false, highlightId = null }) => {
  const [activeCat, setActiveCat] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [sort, setSort] = useState("latest");
  const [feedMode, setFeedMode] = useState("all");
  const loadMoreRef = useRef(null);

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
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
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
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
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
        {loading && filtered.length === 0 && Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={`sk-${i}`} dark={dark}/>
        ))}
        {filtered.map((r, i) => (
          <div key={r.id} className="animate-card-enter" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
            <Card r={r} onOpen={onOpen} isFav={favs.has(r.id)} toggleFav={toggleFav} dark={dark} highlight={r.id === highlightId} />
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="col-span-2">
            <EmptyState
              icon={feedMode === "following" ? Users : Inbox}
              dark={dark}
              title={feedMode === "following" ? "팔로우한 사용자의 글이 없어요" : "해당 조건의 리뷰가 없어요"}
              desc={feedMode === "following" ? "관심있는 사용자를 팔로우해보세요" : "필터를 바꿔서 다시 시도해보세요"}/>
          </div>
        )}
        {/* 무한 스크롤 sentinel */}
        {hasMore && !loading && filtered.length > 0 && (
          <div ref={loadMoreRef} className="col-span-2 py-4 flex items-center justify-center">
            {loadingMore ? (
              <span className={cls("inline-flex items-center gap-2 text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>
                <RefreshCw size={14} className="animate-spin"/> 더 불러오는 중...
              </span>
            ) : (
              <span className={cls("text-xs", dark ? "text-gray-600" : "text-gray-400")}>아래로 스크롤해서 더 보기</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ProductDetailModal = ({ product, onClose, reviews, dark, onOpenReview, onCompose }) => {
  const [exiting, close] = useExit(onClose);
  const [sortBy, setSortBy] = useState("latest");
  const [aiSummary, setAiSummary] = useState(null);
  const [aiExpanded, setAiExpanded] = useState(false);

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
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-end", exiting ? "" : "animate-fade-in")}>
      <div className={cls("absolute inset-0 bg-black/50", exiting ? "animate-fade-out" : "")} onClick={close}/>
      <div className={cls("relative w-full rounded-t-3xl shadow-2xl pb-safe max-h-[90vh] overflow-y-auto", dark ? "bg-gray-900" : "bg-white", exiting ? "animate-slide-down" : "animate-slide-up")}>
        <div className={cls("w-12 h-1 rounded-full mx-auto mt-3 mb-2", dark ? "bg-gray-700" : "bg-gray-300")}/>

        {/* 이미지 */}
        <div className={cls("w-full h-56 flex items-center justify-center p-6 relative", dark ? "bg-gray-800" : "bg-gradient-to-b from-gray-50 to-white")}>
          <ProductImage src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain drop-shadow-lg" iconSize={56}/>
          {/* 이미지 출처 명시 — 제3자 상표/저작물임을 명확히 */}
          {product.imageUrl && (
            <span className={cls("absolute bottom-2 right-3 text-[10px] font-bold opacity-60", dark ? "text-gray-400" : "text-gray-500")}>
              이미지: amway.co.kr
            </span>
          )}
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

          {/* 통계 영역 */}
          {hasReviews && (
            <div className={cls("flex items-center gap-3 p-3 rounded-2xl", dark ? "bg-gray-800" : "bg-gray-50")}>
              <div className="flex-1 text-center">
                <p className={cls("text-lg font-black", dark ? "text-white" : "text-gray-900")}>{allReviews.length}</p>
                <p className={cls("text-[10px] font-bold", dark ? "text-gray-400" : "text-gray-500")}>리뷰</p>
              </div>
              <div className={cls("w-px h-8", dark ? "bg-gray-700" : "bg-gray-200")}/>
              <div className="flex-1 text-center">
                <p className={cls("text-lg font-black", dark ? "text-white" : "text-gray-900")}>{allReviews.reduce((s, r) => s + (r.likes || 0), 0)}</p>
                <p className={cls("text-[10px] font-bold", dark ? "text-gray-400" : "text-gray-500")}>총 좋아요</p>
              </div>
              {topTags.length > 0 && (
                <>
                  <div className={cls("w-px h-8", dark ? "bg-gray-700" : "bg-gray-200")}/>
                  <div className="flex-1 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {topTags.map((t) => (
                        <span key={t} className={cls("text-[10px] font-bold px-1.5 py-0.5 rounded-full", dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")}>#{t}</span>
                      ))}
                    </div>
                    <p className={cls("text-[10px] font-bold mt-1", dark ? "text-gray-400" : "text-gray-500")}>인기 태그</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI 리뷰 요약 */}
          {allReviews.length >= 5 && aiSummary?.data ? (
            <div className={cls("rounded-2xl overflow-hidden", dark ? "bg-violet-950/40 ring-1 ring-violet-800/30" : "bg-gradient-to-br from-violet-50 to-purple-50 ring-1 ring-violet-100")}>
              <button onClick={() => setAiExpanded(!aiExpanded)}
                className="w-full p-4 flex items-center gap-3 text-left active:opacity-80 transition">
                <div className={cls("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", dark ? "bg-violet-900/60" : "bg-violet-100")}>
                  <Sparkles size={18} className={dark ? "text-violet-300" : "text-violet-600"}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>AI가 분석한 이 제품</p>
                    {aiSummary.isPlaceholder && (
                      <span className={cls("text-[9px] font-bold px-1.5 py-0.5 rounded-full", dark ? "bg-violet-800/50 text-violet-300" : "bg-violet-100 text-violet-600")}>DEMO</span>
                    )}
                  </div>
                  <p className={cls("text-[10px] mt-0.5", dark ? "text-violet-400" : "text-violet-500")}>
                    리뷰 {allReviews.length}개 기반 · 마지막 분석: {aiSummary.generatedAt?.replace(/-/g, ".")}
                  </p>
                </div>
                <ChevronRight size={16} className={cls("transition-transform", aiExpanded ? "rotate-90" : "", dark ? "text-violet-400" : "text-violet-500")}/>
              </button>
              {aiExpanded && (
                <div className="px-4 pb-4 space-y-3 animate-fade-in">
                  {/* 장점 */}
                  <div>
                    <p className={cls("text-xs font-bold mb-1.5", dark ? "text-emerald-400" : "text-emerald-600")}>👍 장점</p>
                    <div className="space-y-1">
                      {aiSummary.data.pros.map((p, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className={cls("text-xs leading-relaxed flex-1", dark ? "text-gray-300" : "text-gray-700")}>• {p.text}</span>
                          <span className={cls("text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-full", dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")}>{p.count}명</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 단점 */}
                  <div>
                    <p className={cls("text-xs font-bold mb-1.5", dark ? "text-rose-400" : "text-rose-600")}>👎 단점</p>
                    <div className="space-y-1">
                      {aiSummary.data.cons.map((c, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className={cls("text-xs leading-relaxed flex-1", dark ? "text-gray-300" : "text-gray-700")}>• {c.text}</span>
                          <span className={cls("text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-full", dark ? "bg-rose-900/40 text-rose-300" : "bg-rose-50 text-rose-700")}>{c.count}명</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 총평 */}
                  <div className={cls("p-3 rounded-xl", dark ? "bg-violet-900/30" : "bg-white/70")}>
                    <p className={cls("text-xs font-bold mb-1", dark ? "text-violet-300" : "text-violet-700")}>💡 총평</p>
                    <p className={cls("text-xs leading-relaxed", dark ? "text-gray-300" : "text-gray-600")}>{aiSummary.data.summary}</p>
                  </div>
                  {aiSummary.isPlaceholder && (
                    <p className={cls("text-[10px] text-center pt-1", dark ? "text-violet-500" : "text-violet-400")}>
                      이 요약은 데모 데이터예요 · 곧 AI 자동 생성으로 전환됩니다
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : allReviews.length > 0 && allReviews.length < 5 ? (
            <div className={cls("p-4 rounded-2xl flex items-center gap-3", dark ? "bg-violet-950/20 ring-1 ring-violet-900/20" : "bg-violet-50/50 ring-1 ring-violet-100")}>
              <Sparkles size={18} className={dark ? "text-violet-500" : "text-violet-400"}/>
              <div>
                <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>AI 리뷰 요약</p>
                <p className={cls("text-[10px] mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>리뷰가 5개 이상 쌓이면 분석을 시작해요 ({allReviews.length}/5)</p>
              </div>
            </div>
          ) : null}

          {/* 버튼들 */}
          <div className="flex gap-2">
            {product.officialUrl && (
              <button onClick={() => window.open(product.officialUrl, "_blank")}
                className={cls("flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-[0.98]",
                  dark ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}>
                <ExternalLink size={15}/> 공식 페이지
              </button>
            )}
            {!hasReviews && (
              <button onClick={() => onCompose && onCompose(product)}
                className="flex-1 py-3 rounded-2xl text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition">
                <PenLine size={15}/> 첫 번째 리뷰 작성하기
              </button>
            )}
          </div>

          {/* 리뷰 섹션 */}
          {hasReviews ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>이 제품의 모든 리뷰</p>
                <div className={cls("flex gap-1 text-xs rounded-full p-0.5", dark ? "bg-gray-800" : "bg-gray-100")}>
                  {[{ key: "latest", label: "최신" }, { key: "popular", label: "인기" }, { key: "oldest", label: "오래된" }].map((s) => (
                    <button key={s.key} onClick={() => setSortBy(s.key)}
                      className={cls("px-2.5 py-1 rounded-full font-bold transition",
                        sortBy === s.key ? "bg-white text-emerald-600 shadow" : dark ? "text-gray-400" : "text-gray-500")}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {sortedReviews.map((rv) => (
                  <button key={rv.id} onClick={() => onOpenReview && onOpenReview(rv)}
                    className={cls("w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition active:scale-[0.98]", dark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-50 hover:bg-gray-100")}>
                    <SmartImg r={rv} className="w-16 h-16 rounded-xl object-cover shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className={cls("text-sm font-bold line-clamp-1", dark ? "text-white" : "text-gray-900")}>{rv.title}</p>
                      <p className={cls("text-xs mt-0.5 line-clamp-1", dark ? "text-gray-400" : "text-gray-500")}>{rv.author}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cls("text-xs inline-flex items-center gap-1", dark ? "text-gray-400" : "text-gray-500")}>
                          <Heart size={10}/> {rv.likes || 0}
                        </span>
                        <span className={cls("text-xs", dark ? "text-gray-600" : "text-gray-400")}>{rv.date}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className={dark ? "text-gray-600" : "text-gray-400"}/>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={cls("py-8 text-center rounded-2xl border-2 border-dashed", dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400")}>
              <PenLine size={28} className="mx-auto mb-2 opacity-40"/>
              <p className="text-sm font-bold">아직 리뷰가 없어요</p>
              <p className="text-xs mt-1 opacity-70">첫 번째 리뷰를 작성해보세요!</p>
            </div>
          )}
        </div>

        {/* 플로팅 리뷰 작성 버튼 (리뷰가 있을 때) */}
        {hasReviews && (
          <button onClick={() => onCompose && onCompose(product)}
            className="sticky bottom-4 ml-auto mr-4 mb-4 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center active:scale-90 transition">
            <PenLine size={18}/>
          </button>
        )}
      </div>
    </div>
  );
};

const FavScreen = ({ reviews, onOpen, favs, toggleFav, dark, moods, setMoods, onBrowse, onProductClick }) => {
  const CATALOG = useCatalog();
  const catalogLoading = useCatalogLoading();
  const [mainTab, setMainTab] = useState("catalog"); // "catalog" | "favs"
  const [view, setView] = useState("grid");
  const [moodPickerFor, setMoodPickerFor] = useState(null);
  const [catalogQ, setCatalogQ] = useState("");
  const [catalogCat, setCatalogCat] = useState("all");
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
    <div className="px-4 pt-4 pb-4">
      <h2 className={cls("text-2xl font-black tracking-tight", dark ? "text-white" : "text-gray-900")}>마이웨이템</h2>

      {/* 메인 탭 토글: 카탈로그 / 찜 목록 */}
      <div className={cls("flex gap-1 mt-3 mb-4 p-1 rounded-2xl", dark ? "bg-gray-800" : "bg-gray-100")}>
        <button onClick={() => setMainTab("catalog")}
          className={cls("flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition",
            mainTab === "catalog" ? dark ? "bg-gray-700 text-white shadow" : "bg-white text-gray-900 shadow" : dark ? "text-gray-400" : "text-gray-500")}>
          <Package size={13} className={mainTab === "catalog" ? "text-emerald-500" : ""}/> 제품 카탈로그 <span className={cls("tabular-nums", mainTab === "catalog" ? "text-emerald-500" : "")}>{catalogLoading ? "…" : CATALOG.length}</span>
        </button>
        <button onClick={() => setMainTab("favs")}
          className={cls("flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition",
            mainTab === "favs" ? dark ? "bg-gray-700 text-white shadow" : "bg-white text-gray-900 shadow" : dark ? "text-gray-400" : "text-gray-500")}>
          <Heart size={13} className={mainTab === "favs" ? "text-rose-500" : ""}/> 찜 목록 <span className={cls("tabular-nums", mainTab === "favs" ? "text-rose-500" : "")}>{list.length}</span>
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
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
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

          <p className={cls("text-xs font-bold mb-3", dark ? "text-gray-400" : "text-gray-500")}>{filteredCatalog.length}개 제품</p>

          {filteredCatalog.length === 0 ? (
            <EmptyState icon={Search} dark={dark}
              title="검색 결과가 없어요"
              desc="다른 키워드로 검색해보세요"/>
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
                        {p.brand && <p className={cls("text-[10px]", dark ? "text-gray-400" : "text-gray-500")}>{p.brand}</p>}
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
            <p className={cls("text-center text-xs font-bold mt-4 py-3", dark ? "text-gray-400" : "text-gray-500")}>
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
              <Card r={r} onOpen={onOpen} isFav={favs.has(r.id)} toggleFav={toggleFav} dark={dark} />
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

const CommunityScreen = ({ dark, posts, onLike, onShare, onUserClick, onAddPost, user, onRequireAuth, comments, onAddComment, onDeleteComment, onToggleCommentLike }) => {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState({}); // { [postId]: true }
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
          <span className={cls("text-xs", draft.length > 280 ? "text-rose-500 font-bold" : dark ? "text-gray-400" : "text-gray-500")}>
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

    {posts.map((p) => {
      const isOpen = !!expanded[p.id];
      return (
      <div key={p.id} className={cls("rounded-2xl p-4 shadow-sm", dark ? "bg-gray-800" : "bg-white")}>
        <button onClick={() => onUserClick({ author: p.author, avatar: p.avatar, userId: p.user_id || p.userId })}
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
          <button onClick={() => setExpanded((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
            className={cls("flex items-center gap-1 active:scale-90 transition", isOpen && "text-emerald-500")}>
            <MessageCircle size={14} className={isOpen ? "fill-emerald-500/20" : ""}/> {p.comments}
          </button>
          <button onClick={() => onShare(p)} className="ml-auto active:scale-90 transition"><Share2 size={14}/></button>
        </div>
        {isOpen && (
          <PostCommentThread postId={p.id} comments={comments?.[p.id] || []}
            user={user} dark={dark}
            onUserClick={onUserClick}
            onAdd={onAddComment} onDelete={onDeleteComment} onToggleLike={onToggleCommentLike}
            onRequireAuth={onRequireAuth}/>
        )}
      </div>
      );
    })}
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
          const isMine = user && c.author === user.nickname;
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
                    {isMine && <span className={cls("text-[10px] font-bold px-1.5 py-0.5 rounded-full", dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-600")}>내 댓글</span>}
                    <p className={cls("text-xs font-normal opacity-70", dark ? "text-gray-400" : "text-gray-600")}>{formatRelativeTime(c.createdAt, c.time)}</p>
                  </div>
                  <p className={cls("text-xs mt-0.5", dark ? "text-gray-300" : "text-gray-700")}>
                    <MentionText text={c.text} dark={dark} onMentionClick={(name) => onUserClick && onUserClick({ author: name, avatar: "" })}/>
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button onClick={() => setReplyTo({ id: c.id, author: c.author, isReply: false })}
                      className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", dark ? "text-emerald-400" : "text-emerald-600")}>
                      답글 달기 <span className="text-[10px]">&#8629;</span>
                      {replies.length > 0 && <span className={cls("ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]", dark ? "bg-emerald-900/40" : "bg-emerald-50")}>{replies.length}</span>}
                    </button>
                    <button onClick={() => onToggleLike(postId, c.id)}
                      className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", likedByMe ? "text-rose-500" : dark ? "text-gray-400" : "text-gray-500")}>
                      <Heart size={11} className={likedByMe ? "fill-rose-500" : ""}/>
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
                            {isMyReply && <span className={cls("text-[10px] font-bold px-1.5 py-0.5 rounded-full", dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-600")}>내 댓글</span>}
                            <p className={cls("text-xs font-normal opacity-70", dark ? "text-gray-400" : "text-gray-600")}>{formatRelativeTime(reply.createdAt, reply.time)}</p>
                          </div>
                          <p className={cls("text-xs mt-0.5", dark ? "text-gray-300" : "text-gray-700")}>
                            {reply.mentionTo && (
                              <button onClick={() => onUserClick && onUserClick({ author: reply.mentionTo, avatar: "" })}
                                className={cls("font-bold mr-1 active:opacity-60", dark ? "text-emerald-400" : "text-emerald-600")}>
                                @{reply.mentionTo}
                              </button>
                            )}
                            <MentionText text={reply.text} dark={dark} onMentionClick={(name) => onUserClick && onUserClick({ author: name, avatar: "" })}/>
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <button onClick={() => setReplyTo({ id: c.id, author: reply.author, isReply: true })}
                              className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", dark ? "text-emerald-400" : "text-emerald-600")}>
                              답글 달기 <span className="text-[10px]">&#8629;</span>
                            </button>
                            <button onClick={() => onToggleLike(postId, reply.id)}
                              className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", replyLikedByMe ? "text-rose-500" : dark ? "text-gray-400" : "text-gray-500")}>
                              <Heart size={10} className={replyLikedByMe ? "fill-rose-500" : ""}/>
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
                      className={cls("text-xs font-bold inline-flex items-center gap-1 pl-1 active:opacity-60", dark ? "text-emerald-400" : "text-emerald-600")}>
                      <span className="text-[10px]">&#8629;</span> 답글 {hiddenCount}개 더보기
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
        <div className={cls("mt-3 px-3 py-2.5 rounded-xl flex items-center justify-between text-xs", dark ? "bg-emerald-800/40 text-emerald-200 ring-1 ring-emerald-700/50" : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200")}>
          <span className="inline-flex items-center gap-1.5"><span className="text-sm">&#8629;</span> <span className="font-black">@{replyTo.author}</span>에게 답글 작성 중</span>
          <button onClick={() => setReplyTo(null)} aria-label="답글 취소" className="active:scale-90"><X size={12}/></button>
        </div>
      )}
      <div className={cls("mt-3 flex gap-2 p-2 rounded-full", dark ? "bg-gray-900" : "bg-gray-50")}>
        <input value={text} onChange={(e) => setText(e.target.value)}
          placeholder={replyTo ? `@${replyTo.author}에게 답글` : "댓글을 남겨보세요"}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          className={cls("flex-1 bg-transparent outline-none text-xs px-2", dark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400")}/>
        <button onClick={submit} disabled={!text.trim()}
          className={cls("px-3 py-1.5 text-xs font-bold rounded-full transition", text.trim() ? "bg-emerald-500 text-white active:scale-95" : dark ? "bg-gray-800 text-gray-500" : "bg-gray-200 text-gray-400")}>
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
  const results = useMemo(() => {
    if (!(dq || "").trim()) return [];
    const s = (dq || "").toLowerCase();
    let list = (reviews || []).filter((r) => {
      if (!r) return false;
      const title = (r.title || "").toLowerCase();
      const body = (r.body || "").toLowerCase();
      const product = (r.product || "").toLowerCase();
      const author = (r.author || "").toLowerCase();
      const tags = (r.tags || []);
      return title.includes(s) || body.includes(s) || product.includes(s) || author.includes(s) || tags.some((t) => (t || "").toLowerCase().includes(s));
    });
    if (filterCat !== "all") list = list.filter((r) => r.category === filterCat);
    if (sortBy === "popular") list = [...list].sort((a, b) => b.likes - a.likes);
    else if (sortBy === "recent") list = [...list].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return list;
  }, [dq, reviews, filterCat, sortBy]);

  const productResults = useMemo(() => {
    if (!(dq || "").trim()) return [];
    const s = (dq || "").toLowerCase();
    return (CATALOG || []).filter((p) => {
      if (!p) return false;
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const tags = (p.tags || []);
      return name.includes(s) || brand.includes(s) || tags.some((t) => (t || "").toLowerCase().includes(s));
    }).slice(0, 10);
  }, [dq, CATALOG]);

  const submit = (term) => { setQ(term); addRecent(term); };

  return (
    <div className={cls("fixed inset-0 z-30 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col pt-safe pb-safe", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
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
                    className={cls("text-xs font-bold active:opacity-60", dark ? "text-gray-400" : "text-gray-500")}>
                    전체 삭제
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recents.map((t) => (
                    <div key={t} className={cls("inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full", dark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600")}>
                      <button onClick={() => submit(t)} className="text-xs active:opacity-60">{t}</button>
                      <button onClick={() => removeRecent && removeRecent(t)}
                        aria-label={`${t} 삭제`}
                        className={cls("w-5 h-5 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center active:scale-90", dark ? "bg-gray-700 text-gray-500" : "bg-gray-100 text-gray-400")}>
                        <X size={10}/>
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
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
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
                  <Card r={r} onOpen={(x) => { onOpen(x); close(); }} isFav={favs.has(r.id)} toggleFav={toggleFav} dark={dark} />
                </div>
              ))}
              {results.length === 0 && productResults.length === 0 && (
                <div className="col-span-2">
                  <EmptyState icon={Search} dark={dark}
                    title={`"${q}"에 대한 결과가 없어요`}
                    desc="다른 키워드로 검색해보세요"/>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DetailScreen = ({ r, onBack, onOpen, reviews: allReviews, favs, toggleFav, dark, comments, addComment, deleteComment, toggleCommentLike, user, onEdit, onDelete, onReport, onUserClick, onHashtagClick, onProductClick, deleting = false, following, onToggleFollow }) => {
  const [exiting, close] = useExit(onBack);
  // 신고 액션 시트 — 사용자가 사유를 선택한 뒤 onReport(target, reason) 호출
  const [reportSheet, setReportSheet] = useState(null); // { type: "review"|"comment", id }
  const openReportSheet = (type, id) => setReportSheet({ type, id });
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
  const matchedProduct = useMemo(() => {
    const q = (r.product || "").trim();
    if (!q || !Array.isArray(CATALOG) || CATALOG.length === 0) return null;
    const exact = CATALOG.find((p) => p.name === q);
    if (exact) return exact;
    const qLower = q.toLowerCase();
    return CATALOG.find((p) => {
      const n = (p.name || "").toLowerCase();
      return n === qLower || n.includes(qLower) || qLower.includes(n);
    }) || null;
  }, [CATALOG, r.product]);
  const [comment, setComment] = useStoredState(`waylog:draft:comment:${r.id}`, "");
  const [replyTo, setReplyTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const commentRefs = useRef({});
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [zoomedImg, setZoomedImg] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
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
    <div className={cls("fixed inset-0 z-30 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto overflow-y-auto pt-safe pb-safe", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <div className="relative">
        {r.media && r.media.length > 0 ? (
          <div className="relative">
            <div ref={galleryRef} onScroll={handleGalleryScroll} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none" }}>
              {r.media.map((m) => (
                <div key={m.id} className="snap-start shrink-0 w-full h-80 bg-gray-200 dark:bg-gray-800">
                  {m.type === "image" ? (
                    <img src={m.url} alt="" loading="lazy" decoding="async" onClick={() => setZoomedImg(m.url)} className="w-full h-full object-cover cursor-zoom-in"/>
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
        {/* 상단 floating 버튼은 노치/상태바를 피해 safe-area-inset-top 만큼 내려야 함 */}
        <button onClick={close} aria-label="뒤로"
          className="absolute left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
          style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
          <ArrowLeft size={18} className="text-white"/>
        </button>
        <button onClick={() => toggleFav(r.id)} aria-label="좋아요"
          className="absolute right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
          style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
          <Heart size={18} className={favs.has(r.id) ? "text-rose-500 fill-rose-500" : "text-white"}/>
        </button>
        <button onClick={() => setShareOpen(true)} aria-label="공유"
          className="absolute right-16 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
          style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
          <Share2 size={18} className="text-white"/>
        </button>
        {isMine && (
          <>
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label="옵션 메뉴"
              className="absolute top-4 right-28 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
              <span className="text-white text-lg font-black leading-none -mt-1">⋯</span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)}/>
                <div className={cls("absolute top-16 right-28 z-20 rounded-2xl shadow-2xl overflow-hidden min-w-[140px] animate-fade-in", dark ? "bg-gray-800" : "bg-white")}>
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
        {(() => {
          const authorNick = r.profiles?.nickname || r.author;
          const authorAvatar = r.profiles?.avatar_url || r.avatar || "";
          const authorUserId = r.user_id || null;
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
                  className={cls("px-3.5 py-1.5 rounded-full text-xs font-black transition active:scale-95 inline-flex items-center gap-1 shrink-0",
                    isFollowingAuthor
                      ? dark ? "bg-gray-800 text-gray-300 border border-gray-700" : "bg-gray-100 text-gray-700"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow")}>
                  {isFollowingAuthor ? <><Check size={12}/> 팔로잉</> : <><Plus size={12}/> 팔로우</>}
                </button>
              )}
            </div>
          );
        })()}
        <CategoryChip cat={r.category} dark={dark}/>
        <h1 className={cls("text-2xl font-black tracking-tight mt-2 leading-tight", dark ? "text-white" : "text-gray-900")}>{r.title}</h1>
        <div className={cls("flex items-center gap-3 mt-2 text-xs", dark ? "text-gray-400" : "text-gray-500")}>
          <span className="flex items-center gap-1"><Heart size={12}/> {r.likes}</span>
          <span className="flex items-center gap-1"><Eye size={12}/> {r.views}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {(r.tags || []).map((t) => (
            <span key={t} className={cls("text-xs px-2.5 py-1 rounded-full", dark ? cat.dchip : cat.chip)}>#{t}</span>
          ))}
        </div>
        <p className={cls("mt-4 text-[15px] leading-relaxed whitespace-pre-wrap", dark ? "text-gray-200" : "text-gray-700")}>
          {(r.body || "").split(/(#[^\s#]+)/g).map((part, i) => {
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

        {(() => {
          const clickable = !!(matchedProduct && onProductClick);
          const content = (
            <>
              {matchedProduct?.imageUrl ? (
                <div className={cls("w-14 h-14 rounded-xl overflow-hidden shrink-0", dark ? "bg-gray-700" : "bg-gray-100")}>
                  <img src={matchedProduct.imageUrl} alt={matchedProduct.name} loading="lazy" decoding="async"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}/>
                </div>
              ) : (
                <div className={cls("w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shrink-0", cat.color)}>
                  <ShoppingBag size={22} strokeWidth={2.2}/>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={cls("text-[11px] font-bold uppercase tracking-wider", dark ? "text-emerald-400" : "text-emerald-600")}>
                  관련 상품
                </p>
                <p className={cls("text-sm font-bold line-clamp-2 mt-0.5", dark ? "text-white" : "text-gray-900")}>
                  {matchedProduct?.name || r.product}
                </p>
                {matchedProduct && (
                  <p className={cls("text-[11px] mt-0.5 font-medium", dark ? "text-gray-400" : "text-gray-500")}>
                    {matchedProduct.price ? `${matchedProduct.price.toLocaleString()}원 · ` : ""}
                    카탈로그 보기 · 다른 리뷰 &rsaquo;
                  </p>
                )}
              </div>
              {clickable && <ChevronRight size={18} className={dark ? "text-gray-400" : "text-gray-500"}/>}
            </>
          );
          return clickable ? (
            <button type="button" onClick={() => onProductClick(matchedProduct)}
              className={cls("mt-5 w-full p-3 rounded-2xl flex items-center gap-3 text-left active:scale-[0.99] transition",
                dark ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50",
                "border", dark ? "border-gray-700" : "border-gray-100")}>
              {content}
            </button>
          ) : (
            <div className={cls("mt-5 p-3 rounded-2xl flex items-center gap-3", dark ? "bg-gray-800" : "bg-white")}>
              {content}
            </div>
          );
        })()}

        {/* Comments */}
        <div className="mt-6">
          <h3 className={cls("text-sm font-extrabold mb-3", dark ? "text-white" : "text-gray-900")}>댓글 {comments.length}</h3>
          {comments.length === 0 && (
            <div className={cls("rounded-2xl py-8 px-4 text-center border-2 border-dashed", dark ? "border-gray-700 bg-gray-800/40" : "border-gray-200 bg-gray-50")}>
              <MessageCircle size={28} strokeWidth={1.8} className={cls("mx-auto mb-2", dark ? "text-gray-600" : "text-gray-400")}/>
              <p className={cls("text-xs font-bold", dark ? "text-gray-300" : "text-gray-700")}>아직 댓글이 없어요</p>
              <p className={cls("text-[11px] mt-1", dark ? "text-gray-500" : "text-gray-500")}>첫 댓글을 남겨보세요</p>
            </div>
          )}
          <div className="space-y-3">
            {comments.filter((c) => !c.parentId).map((c) => {
              const replies = comments.filter((x) => x.parentId === c.id);
              const isExpanded = expandedReplies[c.id];
              const visibleReplies = isExpanded ? replies : replies.slice(0, 1);
              const hiddenCount = replies.length - 1;
              const isMyComment = user && c.author === user.nickname;
              return (
                <div key={c.id} ref={(el) => { commentRefs.current[c.id] = el; }}>
                  <div className="flex gap-2.5 group">
                    <button onClick={() => onUserClick({ author: c.author, avatar: c.avatar, authorId: c.authorId })} className="active:scale-90 transition shrink-0">
                      <Avatar id={c.avatar} size={14} className="w-8 h-8"/>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <button onClick={() => onUserClick({ author: c.author, avatar: c.avatar, authorId: c.authorId })} className={cls("text-xs font-bold active:opacity-60", dark ? "text-white" : "text-gray-900")}>{c.author}</button>
                        {isMyComment && (
                          <span className={cls("text-[10px] font-bold px-1.5 py-0.5 rounded-full", dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-600")}>내 댓글</span>
                        )}
                        <p className={cls("text-xs font-normal opacity-70", dark ? "text-gray-400" : "text-gray-600")}>{formatRelativeTime(c.createdAt, c.time)}</p>
                      </div>
                      <p className={cls("text-xs mt-0.5", dark ? "text-gray-300" : "text-gray-700")}>
                        <MentionText text={c.text} dark={dark} onMentionClick={(name) => onUserClick && onUserClick({ author: name, avatar: "" })}/>
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <button onClick={() => setReplyTo({ id: c.id, author: c.author, isReply: false })}
                          className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", dark ? "text-emerald-400" : "text-emerald-600")}>
                          답글 달기 <span className="text-[10px]">&#8629;</span>
                          {replies.length > 0 && <span className={cls("ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]", dark ? "bg-emerald-900/40" : "bg-emerald-50")}>{replies.length}</span>}
                        </button>
                        <button onClick={() => toggleCommentLike && toggleCommentLike(r.id, c.id)}
                          className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", (c.likedBy || []).some((k) => k === user?.id || k === user?.nickname) ? "text-rose-500" : dark ? "text-gray-400" : "text-gray-500")}>
                          <Heart size={11} className={(c.likedBy || []).some((k) => k === user?.id || k === user?.nickname) ? "fill-rose-500" : ""}/>
                          {(c.likedBy || []).length > 0 && <span>{(c.likedBy || []).length}</span>}
                        </button>
                        {user && c.author !== user.nickname && (
                          <button onClick={() => openReportSheet("comment", c.id)}
                            className={cls("text-xs font-bold active:opacity-60", dark ? "text-gray-600" : "text-gray-400")}>
                            신고
                          </button>
                        )}
                      </div>
                    </div>
                    {isMyComment && (
                      <button onClick={() => deleteComment && deleteComment(r.id, c.id)} aria-label="댓글 삭제"
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
                                <span className={cls("text-[10px] font-bold px-1.5 py-0.5 rounded-full", dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-600")}>내 댓글</span>
                              )}
                              <p className={cls("text-xs font-normal opacity-70", dark ? "text-gray-400" : "text-gray-600")}>{formatRelativeTime(reply.createdAt, reply.time)}</p>
                            </div>
                            <p className={cls("text-xs mt-0.5", dark ? "text-gray-300" : "text-gray-700")}>
                              {reply.mentionTo && (
                                <button onClick={() => onUserClick && onUserClick({ author: reply.mentionTo, avatar: "" })}
                                  className={cls("font-bold mr-1 active:opacity-60", dark ? "text-emerald-400" : "text-emerald-600")}>
                                  @{reply.mentionTo}
                                </button>
                              )}
                              <MentionText text={reply.text} dark={dark} onMentionClick={(name) => onUserClick && onUserClick({ author: name, avatar: "" })}/>
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <button onClick={() => setReplyTo({ id: c.id, author: reply.author, isReply: true })}
                                className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", dark ? "text-emerald-400" : "text-emerald-600")}>
                                답글 달기 <span className="text-[10px]">&#8629;</span>
                              </button>
                              <button onClick={() => toggleCommentLike && toggleCommentLike(r.id, reply.id)}
                                className={cls("text-xs font-bold inline-flex items-center gap-1 active:opacity-60", (reply.likedBy || []).some((k) => k === user?.id || k === user?.nickname) ? "text-rose-500" : dark ? "text-gray-400" : "text-gray-500")}>
                                <Heart size={10} className={(reply.likedBy || []).some((k) => k === user?.id || k === user?.nickname) ? "fill-rose-500" : ""}/>
                                {(reply.likedBy || []).length > 0 && <span>{(reply.likedBy || []).length}</span>}
                              </button>
                              {user && reply.author !== user.nickname && (
                                <button onClick={() => openReportSheet("comment", reply.id)}
                                  className={cls("text-xs font-bold active:opacity-60", dark ? "text-gray-600" : "text-gray-400")}>
                                  신고
                                </button>
                              )}
                            </div>
                          </div>
                          {isMyReply && (
                            <button onClick={() => deleteComment && deleteComment(r.id, reply.id)} aria-label="답글 삭제"
                              className={cls("w-7 h-7 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center shrink-0 active:scale-90", dark ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400")}>
                              <X size={12}/>
                            </button>
                          )}
                        </div>
                        );
                      })}
                      {!isExpanded && hiddenCount > 0 && (
                        <button onClick={() => setExpandedReplies((prev) => ({ ...prev, [c.id]: true }))}
                          className={cls("text-xs font-bold inline-flex items-center gap-1 pl-1 active:opacity-60", dark ? "text-emerald-400" : "text-emerald-600")}>
                          <span className="text-[10px]">&#8629;</span> 답글 {hiddenCount}개 더보기
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
            <div className={cls("mt-3 px-3 py-2.5 rounded-xl flex items-center justify-between text-xs animate-pulse", dark ? "bg-emerald-800/40 text-emerald-200 ring-1 ring-emerald-700/50" : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200")}>
              <span className="inline-flex items-center gap-1.5"><span className="text-sm">&#8629;</span> <span className="font-black">@{replyTo.author}</span>에게 답글 작성 중</span>
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
            <img src={zoomedImg} alt="" decoding="async" className="max-w-none w-full h-auto" style={{ touchAction: "pinch-zoom" }} onClick={(e) => e.stopPropagation()}/>
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
const UserProfileScreen = ({ author, avatar, userId, reviews, currentUser, isFollowing, onToggleFollow, onClose, onOpen, dark }) => {
  const [exiting, close] = useExit(onClose);
  const userData = SEED_USERS[author];
  const seedReviews = userData ? userData.reviewIds.map((id) => SEED_REVIEWS.find((r) => r.id === id)).filter(Boolean) : [];
  const userReviews = reviews.filter((r) => r.author === author);
  const allReviews = [...userReviews, ...seedReviews];
  const finalAvatar = avatar || userData?.avatar || "";
  const isMe = currentUser && currentUser.nickname === author;
  const canFollow = !!userId && !isMe && !!currentUser;

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

          {canFollow && (
            <button onClick={() => onToggleFollow()}
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
                  <Card r={r} onOpen={(x) => { close(); setTimeout(() => onOpen(x), 280); }} isFav={false} toggleFav={() => {}} dark={dark}/>
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
    <div className={cls("fixed inset-0 z-50 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-end", exiting ? "" : "animate-fade-in")}>
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
                <img src={photo} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover"/>
              </div>
            )}
            <div className={cls("p-4 rounded-2xl", dark ? "bg-gray-800" : "bg-gray-50")}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={cls("text-sm font-black", dark ? "text-white" : "text-gray-900")}>
                    {editMode ? "직접 수정" : "AI 분석 결과"}
                  </p>
                  {result.isFallback && !editMode && (
                    <p className={cls("text-[10px] mt-0.5", dark ? "text-amber-400" : "text-amber-600")}>AI 분석 실패 — 추천 식단으로 대체했어요. 직접 수정해주세요</p>
                  )}
                  {result.source === "vision" && !editMode && (
                    <p className={cls("text-[10px] mt-0.5", dark ? "text-emerald-400" : "text-emerald-600")}>사진 분석 결과예요. 맞지 않으면 수정해주세요</p>
                  )}
                </div>
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
      <div className={cls("relative w-full rounded-t-3xl p-6 shadow-2xl pb-safe", dark ? "bg-gray-900" : "bg-white", exiting ? "animate-slide-down" : "animate-slide-up")}>
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
        <button onClick={close} aria-label="뒤로"><ArrowLeft size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>변화 그래프</p>
        <button onClick={handleSaveImage} aria-label="이미지 저장" className="text-emerald-500"><Download size={20}/></button>
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
    aiDailyReport(totalCal, totalBurned, completedMissions, totalMissions, challenge?.targetCalories || 2000)
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
                <MissionIcon iconKey={m.icon} size={16} className="text-emerald-500"/>
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
            className={cls("py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white active:scale-[0.98] transition",
              !canSave && "opacity-50 cursor-not-allowed")}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

const ChallengeMainScreen = ({ challenge, setChallenge, dailyLogs, setDailyLogs, inbodyRecords, setInbodyRecords, anonPosts, setAnonPosts, onClose, dark }) => {
  // setToast 는 Context 에서 구독 — prop drilling 제거
  const { setToast: onShowToast } = useAppContext();
  const [exiting, close] = useExit(onClose);
  const [subTab, setSubTab] = useState("today");
  const [mealModal, setMealModal] = useState(null);
  const [exerciseModal, setExerciseModal] = useState(false);
  const [inbodyOpen, setInbodyOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [anonOpen, setAnonOpen] = useState(false);
  const [missionEditOpen, setMissionEditOpen] = useState(false);
  const [missionToast, setMissionToast] = useState("");

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
    <div className={cls("fixed inset-0 z-40 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
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
                      <stop offset="0%" stopColor="#10b981"/>
                      <stop offset="100%" stopColor="#f59e0b"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>D+{dayNum}</p>
                  <p className={cls("text-2xl font-black", dark ? "text-white" : "text-gray-900")}>{Math.round(progress * 100)}%</p>
                  <p className={cls("text-[10px]", dark ? "text-gray-400" : "text-gray-500")}>{dayNum}/{CHALLENGE_DAYS}일</p>
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
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={cls("text-sm font-black truncate", dark ? "text-white" : "text-gray-900")}>
                      Week {weekNum}: {weekMissions.title}
                    </p>
                    {hasCustomThisWeek && (
                      <span className={cls("text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0",
                        dark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-100 text-emerald-700")}>
                        내 미션
                      </span>
                    )}
                  </div>
                  <p className={cls("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>
                    오늘의 미션 {completedCount}/{weekMissions.missions.length}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setMissionEditOpen(true)} aria-label="미션 편집"
                    className={cls("w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition",
                      dark ? "bg-gray-700 text-gray-300 hover:text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900")}>
                    <PenLine size={14}/>
                  </button>
                  <div className={cls("px-2.5 py-1 rounded-full text-xs font-black", completedCount === weekMissions.missions.length ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : dark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500")}>
                    {completedCount === weekMissions.missions.length ? "완료!" : `${Math.round((completedCount / weekMissions.missions.length) * 100)}%`}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {weekMissions.missions.map((m) => {
                  const done = todayLog.completedMissions.includes(m.id);
                  return (
                    <button key={m.id} onClick={() => toggleMission(m.id)}
                      className={cls("w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition active:scale-[0.98]",
                        done ? dark ? "bg-emerald-900/30" : "bg-emerald-50" : dark ? "bg-gray-700/50" : "bg-gray-50")}>
                      <div className={cls("w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                        done ? "border-emerald-500 bg-emerald-500 scale-110" : dark ? "border-gray-600" : "border-gray-300")}>
                        {done && <Check size={14} className="text-white"/>}
                      </div>
                      <MissionIcon iconKey={m.icon} size={14} className={cls("shrink-0 mt-1.5", done ? "text-emerald-500" : dark ? "text-gray-400" : "text-gray-500")}/>
                      <span className={cls("text-sm font-bold flex-1 min-w-0 break-words leading-snug", done ? "line-through opacity-60" : "", dark ? "text-white" : "text-gray-900")}>
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
                          <img src={meal.photo} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover"/>
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
                      {!meal && <Plus size={16} className={dark ? "text-gray-400" : "text-gray-500"}/>}
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
            <Icon size={20} className={subTab === k ? "text-emerald-500" : dark ? "text-gray-400" : "text-gray-500"}/>
            <span className={cls("text-[10px] font-bold", subTab === k ? "text-emerald-500" : dark ? "text-gray-400" : "text-gray-500")}>{label}</span>
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
      <Suspense fallback={null}>{inbodyOpen && <InbodyScreen records={inbodyRecords} onAdd={(r) => setInbodyRecords((prev) => [...prev, r])} onClose={() => setInbodyOpen(false)} dark={dark}/>}</Suspense>
      {graphOpen && <ChallengeGraphScreen challenge={challenge} dailyLogs={dailyLogs} inbodyRecords={inbodyRecords} onClose={() => setGraphOpen(false)} dark={dark}/>}
      <Suspense fallback={null}>{anonOpen && <AnonCommunityScreen challenge={challenge} onClose={() => setAnonOpen(false)} dark={dark} anonPosts={anonPosts} onAddPost={(p) => setAnonPosts((prev) => [...prev, p])} getChallengeDay={getChallengeDay}/>}</Suspense>
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
        <ChevronRight size={18} className={dark ? "text-gray-400" : "text-gray-500"}/>
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
        <ChevronRight size={18} className={dark ? "text-gray-400" : "text-gray-500"}/>
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
          <span className={cls("text-xs", dark ? "text-gray-400" : "text-gray-500")}>/ {CHALLENGE_DAYS}일</span>
        </div>
        <div className={cls("w-full h-1.5 rounded-full mt-1.5 overflow-hidden", dark ? "bg-gray-700" : "bg-gray-100")}>
          <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }}/>
        </div>
        <p className={cls("text-xs mt-1.5 font-bold", dark ? "text-gray-400" : "text-gray-500")}>
          오늘 미션 {missionsDone}/{missionsTotal} · Week {weekNum}: {weekMissions.title}
        </p>
      </div>
      <ChevronRight size={18} className={dark ? "text-gray-400" : "text-gray-500"}/>
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
    <div className={cls("fixed inset-0 z-40 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-end", exiting ? "" : "animate-fade-in")}>
      <div className={cls("absolute inset-0 bg-black/50", exiting ? "animate-fade-out" : "")} onClick={close}/>
      <div className={cls("relative w-full rounded-t-3xl p-6 shadow-2xl pb-safe", dark ? "bg-gray-900" : "bg-white", exiting ? "animate-slide-down" : "animate-slide-up")}>
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
          {canFollow && (
            <button onClick={() => onToggleFollow()}
              className={cls("flex-1 py-3 rounded-2xl text-sm font-black transition active:scale-95 inline-flex items-center justify-center gap-1.5",
                isFollowing
                  ? dark ? "bg-gray-800 text-gray-300 border border-gray-700" : "bg-gray-100 text-gray-700"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md")}>
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
            className={cls("w-full mt-3 py-2 text-xs font-bold active:opacity-60", isBlocked ? "text-emerald-500" : "text-rose-500")}>
            {isBlocked ? "차단 해제" : "이 사용자 차단하기"}
          </button>
        )}
      </div>
    </div>
  );
};

// ---------- APP ----------
function AppInner() {
  const [tab, setTab] = useState("home");
  // 게시 직후 하이라이트할 리뷰 ID — 1.8초 후 자동 해제
  const [highlightId, setHighlightId] = useState(null);
  // toast: null | { msg: string, type: "info"|"success"|"error" }
  // setToast 는 string 또는 { msg, type } 를 받는다 (string 은 자동으로 type 추론)
  const [toast, setToastRaw] = useState(null);
  const setToast = useCallback((input) => {
    if (input === "" || input == null) { setToastRaw(null); return; }
    if (typeof input === "string") {
      // 메시지 내용으로 type 자동 추론 — 명백한 에러 키워드만. 모호어(차단/없어요)는 info 유지.
      const isError = /실패|오류했|에러|다시 시도|네트워크를 확인|지원하지 않|허용해주세요|차단돼/.test(input);
      setToastRaw({ msg: input, type: isError ? "error" : "info" });
    } else {
      setToastRaw({ msg: input.msg, type: input.type || "info" });
    }
  }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToastRaw(null), 2200); return () => clearTimeout(t); } }, [toast]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab]);

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
  }, [tab, setToast]);

  const nav = useNavStack();
  const [search, setSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [compose, setCompose] = useState(false);
  const [composeProduct, setComposeProduct] = useState(null);
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
    const local = { id: Date.now() + Math.random(), text, time: "방금", read: false, ...extra };
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

  // --- 인증 (Supabase 우선, 실패 시 로컬 폴백) ---
  const [user, setUserRaw] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // user를 설정할 때 로컬에도 저장 (폴백용)
  const setUser = (u) => {
    setUserRaw(u);
    try { if (u) localStorage.setItem("waylog:user", JSON.stringify(u)); else localStorage.removeItem("waylog:user"); } catch {}
  };

  // 세션 한 번당 profile 은 한 번만 fetch (토큰 리프레시 때마다 재요청 방지)
  const profileCacheRef = useRef({ userId: null, avatar: "" });
  const buildUserFromSession = async (session) => {
    const meta = session.user.user_metadata || {};
    let avatar = "";
    if (profileCacheRef.current.userId === session.user.id) {
      avatar = profileCacheRef.current.avatar;
    } else {
      try {
        const { data: profile } = await supabaseAuth.getProfile(session.user.id);
        if (profile?.avatar_url) avatar = profile.avatar_url;
      } catch {}
      profileCacheRef.current = { userId: session.user.id, avatar };
    }
    return { id: session.user.id, email: session.user.email, nickname: meta.nickname || session.user.email.split("@")[0], avatar, joinedAt: session.user.created_at };
  };

  useEffect(() => {
    let cancelled = false;
    const loadLocal = () => {
      try { const saved = localStorage.getItem("waylog:user"); if (saved) setUserRaw(JSON.parse(saved)); } catch {}
    };
    if (!supabase) {
      loadLocal();
      setAuthLoading(false);
      return;
    }

    // 손상된 세션 데이터 정리
    const cleanupCorruptedSession = async () => {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {}
      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith('sb-') || key.startsWith('waylog-auth')) {
            localStorage.removeItem(key);
          }
        }
      } catch {}
    };

    // getSession을 재시도 (네트워크 플레이크에 대비한 지수 백오프 3회)
    const fetchSessionWithRetry = async () => {
      const delays = [0, 500, 1500];
      for (let i = 0; i < delays.length; i++) {
        if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            // 세션 데이터 손상 — 정리 후 재시도
            await cleanupCorruptedSession();
            continue;
          }
          return data?.session || null;
        } catch { /* 재시도 */ }
      }
      // 모든 재시도 실패 시 세션 데이터 정리 후 null 반환
      await cleanupCorruptedSession();
      return null;
    };

    (async () => {
      try {
        const session = await fetchSessionWithRetry();
        if (cancelled) return;
        if (session?.user) {
          setUser(await buildUserFromSession(session));
        } else {
          loadLocal();
        }
      } catch {
        if (!cancelled) {
          await cleanupCorruptedSession();
          loadLocal();
        }
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
            return;
          }
          if (session?.user) {
            setUser(await buildUserFromSession(session));
            if (event === "SIGNED_IN") {
              setAuthOpen(false);
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

  // --- 취향/무드/리뷰/댓글 ---
  const [taste, setTaste] = useStoredState("waylog:taste", { cats: {}, tags: {} });
  const [moods, setMoods] = useStoredState("waylog:moods", {});
  const [userReviews, setUserReviews] = useState([]);
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

  useEffect(() => {
    if (authLoading) return;
    setReviewsLoading(true);
    setReviewsHasMore(true);
    reviewsCursorRef.current = null;
    (async () => {
      const { data, error } = await supabaseReviews.fetchPage({ limit: 30 });
      if (!error && Array.isArray(data)) {
        const mapped = data.map(mapReviewRow);
        setUserReviews(mapped);
        if (mapped.length > 0) reviewsCursorRef.current = mapped[mapped.length - 1].createdAt;
        if (mapped.length < 30) setReviewsHasMore(false);
      }
      setReviewsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

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
            read: !!n.read, time: new Date(n.created_at).toLocaleDateString(),
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
  const [community, setCommunity] = useStoredState("waylog:community", [
    { id: 1, author: "건강한엄마", avatar: "flower", time: "방금 전", content: "오늘 퀸 Ti 웍으로 처음 무수분 요리 도전! 양배추가 이렇게 달았나 싶을 정도예요.", likes: 12, comments: 5, liked: false },
    { id: 2, author: "라떼러버", avatar: "coffee", time: "1시간 전", content: "까페드다몬 아메리카노 진짜 미쳤다… 사무실에서 마실 인스턴트인데 산미가 살아있어요.", likes: 24, comments: 8, liked: false },
    { id: 3, author: "다이어터김", avatar: "leaf", time: "3시간 전", content: "푸로틴 + 화이버 비츠 조합 두 달째인데 -4kg 찍었어요. 식단 일지 공유 원하시는 분?", likes: 47, comments: 19, liked: false },
    { id: 4, author: "요가맘", avatar: "feather", time: "어제", content: "라벤더 에센셜 오일 디퓨징하면서 명상하면 정말 깊게 잠들어요.", likes: 18, comments: 6, liked: false },
  ]);
  // 커뮤니티 댓글: { [postId]: [{ id, author, avatar, authorId, text, time, createdAt, parentId, mentionTo, likedBy }] }
  const [communityComments, setCommunityComments] = useStoredState("waylog:communityComments", {});

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
  const [profileUser, setProfileUser] = useState(null);
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
  const openUser = (u) => setSelectedUser(u && {
    author: u.author,
    avatar: u.avatar || "",
    userId: u.userId || u.authorId || null,
  });

  // (targetUserId: uuid, targetNickname: string) — UUID 기반.
  // 시드 author 처럼 user_id 가 없으면 진입점에서 호출 자체를 차단해야 한다.
  const toggleFollow = async (targetUserId, targetNickname = "") => {
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
    const label = targetNickname || "사용자";
    setToast(wasFollowing ? `${label}님 팔로우를 취소했어요` : `${label}님을 팔로우했어요`);
  };

  // 모달 상태 추적 (풀 투 리프레시 비활성화용)
  useEffect(() => {
    modalOpenRef.current = !!(nav.stack.length || search || compose || authOpen || profileOpen || settingsOpen || onboardingOpen || selectedUser || profileUser || challengeStartOpen || challengeMainOpen);
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
    const seen = new Set(userReviews.map((r) => r.id));
    const seeds = SEED_REVIEWS.filter((r) => !seen.has(r.id));
    let list = [...userReviews, ...seeds].filter((r) => !blocked.has(r.author));
    if (refreshKey > 0) list = [...list].sort(() => Math.random() - 0.5);
    return list;
  }, [userReviews, blocked, refreshKey]);

  // ---------- Challenge State ----------
  // localStorage가 오프라인/미로그인 캐시 역할을 하고, 로그인 시 Supabase와 양방향 동기화.
  const [challenge, setChallenge] = useStoredState("waylog:challenge", null);
  const [challengeDailyLogs, setChallengeDailyLogs] = useStoredState("waylog:challengeLogs", {});
  const [challengeInbody, setChallengeInbody] = useStoredState("waylog:challengeInbody", []);
  const [challengeAnonPosts, setChallengeAnonPosts] = useStoredState("waylog:challengeAnonPosts", []);
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

  const setChallengeAnonPostsSync = (updater) => {
    setChallengeAnonPosts((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (supabase && user?.id && Array.isArray(next)) {
        const prevIds = new Set(prev.map((p) => p.id));
        const added = next.filter((p) => !prevIds.has(p.id));
        added.forEach((post) => {
          supabaseChallenges.addAnonPost({
            user_id: user.id,
            anon_id: post.anonId || challenge?.anonId || "익명",
            content: post.content,
            day_num: post.dayNum || null,
          }).then(({ data: saved }) => {
            if (saved?.id && saved.id !== post.id) {
              setChallengeAnonPosts((cur) => cur.map((p) => p.id === post.id ? { ...p, id: saved.id } : p));
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
        const { data: anon } = await supabaseChallenges.fetchAnonPosts(100);
        if (Array.isArray(anon) && anon.length) {
          setChallengeAnonPosts(anon.map((p) => ({
            id: p.id, anonId: p.anon_id, content: p.content, dayNum: p.day_num, time: p.created_at,
          })));
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

    // Supabase 동기화
    if (user) {
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
      }
    }
  };

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

  const openDetail = (r) => {
    nav.push({ type: "detail", payload: r });
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
  };
  const back = () => nav.pop();

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
    // 실제 Supabase 인증 세션이 있는지 검증. 로컬 폴백 모드(user.id 가 Date.now())일 때는
    // storage 업로드가 RLS 에 의해 거부됨 → 사용자에게 재로그인 안내.
    const { data: { session } = {} } = await supabase.auth.getSession();
    if (!session?.user?.id || session.user.id !== user.id) {
      console.warn("[upload] no active supabase session — user is in local fallback mode", { localUserId: user.id, sessionUserId: session?.user?.id });
      setToast("Supabase 세션이 없어요. 로그아웃 후 다시 로그인해주세요");
      return mediaItems.map((m) => ({ id: m.id, type: m.type, url: m.url, duration: m.duration }));
    }
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
    try {
      // 텍스트 필드 sanitize (제어문자 제거 + 길이 제한)
      data = {
        ...data,
        title: sanitizeInline(data.title, { maxLength: 200 }),
        body: sanitizeText(data.body, { maxLength: 5000 }),
        product: sanitizeInline(data.product, { maxLength: 200 }),
        category: sanitizeInline(data.category, { maxLength: 40 }),
        tags: (data.tags || []).map((t) => sanitizeInline(t, { maxLength: 40 })).filter(Boolean),
      };
      // 미디어 업로드 (base64 → Supabase Storage URL)
      const uploadedMedia = await uploadMedia(data.media || []);
      const firstImgUrl = uploadedMedia.find((m) => m.type === "image")?.url || "";

      if (data.id) {
        // 수정 모드 (로컬)
        setUserReviews((prev) => prev.map((r) => r.id === data.id ? {
          ...r,
          title: data.title, body: data.body, product: data.product,
          products: data.products || [],
          media: uploadedMedia,
          tags: data.tags.length ? data.tags : ["내웨이로그"],
          category: data.category,
          img: firstImgUrl || data.img || "",
        } : r));
        // Supabase 수정 (서버 UUID인 경우만)
        if (user && typeof data.id === "string") {
          supabaseReviews.update(data.id, {
            title: data.title, content: data.body, category: data.category,
            tags: data.tags.length ? data.tags : ["내웨이로그"],
            product_name: data.product, media: uploadedMedia,
          }).catch(() => {});
        }
        setTimeout(() => setToast("웨이로그가 수정됐어요"), 280);
        return true;
      }

      // 새 리뷰
      const localR = {
        id: Date.now(),
        img: firstImgUrl || data.img || "",
        title: data.title, body: data.body, product: data.product,
        products: data.products || [],
        media: uploadedMedia,
        tags: data.tags.length ? data.tags : ["내웨이로그"],
        category: data.category, views: 0, likes: 0,
        date: new Date().toISOString().slice(0, 10),
        author: user?.nickname || "나",
        authorAvatar: user?.avatar || "",
      };
      setUserReviews((prev) => [localR, ...prev]);

      // Supabase 저장
      if (user) {
        const { data: created, error: createErr } = await supabaseReviews.create({
          user_id: user.id,
          title: data.title, content: data.body, category: data.category,
          tags: data.tags.length ? data.tags : ["내웨이로그"],
          product_name: data.product, media: uploadedMedia,
        });
        if (createErr || !created?.id) {
          // 서버 저장 실패 → 로컬 롤백
          setUserReviews((prev) => prev.filter((r) => r.id !== localR.id));
          setToast("서버 저장에 실패했어요. 다시 시도해주세요");
          return false;
        }
        // 서버 ID로 로컬 ID 업데이트 (중복 방지)
        setUserReviews((prev) => prev.map((r) => r.id === localR.id ? { ...r, id: created.id } : r));
      }

      setTimeout(() => {
        setTab("feed");
        setToast("웨이로그가 등록됐어요");
        // 게시 직후: 피드의 내 글로 부드럽게 스크롤 + 1.8초간 ring 하이라이트
        setHighlightId(localR.id);
        setTimeout(() => {
          document.querySelector(`[data-rid="${localR.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 350);
        setTimeout(() => setHighlightId(null), 1800);
      }, 280);
      return true;
    } catch (err) {
      setToast("등록 실패. 다시 시도해주세요");
      return false;
    }
  };

  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const deleteReview = async (id) => {
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
  };

  const addComment = async (rid, text, parentId = null, mentionTo = null) => {
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
      id: localId, author: user.nickname, avatar: user.avatar,
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
    return true;
  };

  const toggleCommentLike = async (rid, cid) => {
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
  };

  const deleteComment = (rid, cid) => {
    setCommentsMap((prev) => ({
      ...prev,
      [rid]: (prev[rid] || []).filter((c) => c.id !== cid),
    }));
    if (supabase && typeof cid === "string") supabaseComments.delete(cid).catch(() => {});
    setToast("댓글이 삭제됐어요");
  };

  const clearAllData = async () => {
    setFavsArr([]); setMoods({}); setUserReviews([]); setCommentsMap({});
    setTaste({ cats: {}, tags: {} }); setNotifications([]); setRecents([]);
    setFollowingArr([]); setBlockedArr([]);
    setToast("모든 데이터가 삭제됐어요");
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
    setFavsArr([]); setMoods({}); setTaste({ cats: {}, tags: {} });
    setFollowingArr([]); setBlockedArr([]); setNotifications([]);
    setChallenge(null); setChallengeDailyLogs({}); setChallengeInbody([]); setChallengeAnonPosts([]);
    setRecents([]);
    // 재로그인 시 서버 hydration 을 다시 타도록 플래그 리셋
    moodsNotifsHydratedRef.current = false;
    challengeHydratedRef.current = false;
    profileCacheRef.current = { userId: null, avatar: "" };
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

  // 커뮤니티 댓글 추가 — parentId 지정 시 답글, 깊이 2+ 이면 상위로 클램프
  const addCommunityComment = (postId, text, parentId = null, mentionTo = null) => {
    if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return false; }
    const clean = sanitizeText(text, { maxLength: 500 }).trim();
    if (!clean) return false;
    const existing = communityComments[postId] || [];
    if (parentId != null) {
      const parent = existing.find((c) => c.id === parentId);
      if (!parent) parentId = null;
      else if (parent.parentId != null) parentId = parent.parentId;
    }
    const newComment = {
      id: Date.now(),
      author: user.nickname,
      avatar: user.avatar,
      authorId: user.id,
      text: clean,
      time: "방금",
      createdAt: new Date().toISOString(),
      parentId,
      mentionTo: mentionTo ? sanitizeInline(mentionTo, { maxLength: 60 }) : null,
      likedBy: [],
    };
    setCommunityComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), newComment] }));
    setCommunity((prev) => prev.map((p) => p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p));
    return true;
  };

  const deleteCommunityComment = (postId, commentId) => {
    setCommunityComments((prev) => {
      const list = prev[postId] || [];
      const filtered = list.filter((c) => c.id !== commentId && c.parentId !== commentId);
      const removed = list.length - filtered.length;
      if (removed > 0) {
        setCommunity((pp) => pp.map((p) => p.id === postId ? { ...p, comments: Math.max(0, (p.comments || 0) - removed) } : p));
      }
      return { ...prev, [postId]: filtered };
    });
  };

  const toggleCommunityCommentLike = (postId, commentId) => {
    if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return; }
    const key = user.id || user.nickname;
    setCommunityComments((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).map((c) => {
        if (c.id !== commentId) return c;
        const liked = (c.likedBy || []).some((k) => k === key);
        return { ...c, likedBy: liked ? (c.likedBy || []).filter((k) => k !== key) : [...(c.likedBy || []), key] };
      }),
    }));
  };

  const screens = {
    home: <HomeScreen reviews={reviews} onOpen={openDetail} favs={favs} toggleFav={toggleFav} dark={dark} taste={taste} moods={moods} user={user} tg={tg} onPrimary={() => requireAuth(() => setCompose(true))} refreshKey={refreshKey}
      challenge={challenge} dailyLogs={challengeDailyLogs}
      onChallengeStart={() => requireAuth(() => setChallengeStartOpen(true))}
      onChallengeOpen={() => setChallengeMainOpen(true)}
      onChallengeResult={() => setChallengeMainOpen(true)}
      onProductClick={setSelectedCatalogProduct}/>,
    feed: <FeedScreen reviews={reviews} onOpen={openDetail} favs={favs} toggleFav={toggleFav} dark={dark} onCompose={() => setCompose(true)} following={following} user={user} loading={reviewsLoading} onLoadMore={loadMoreReviews} hasMore={reviewsHasMore} loadingMore={reviewsLoadingMore} highlightId={highlightId} />,
    fav: <FavScreen reviews={reviews} onOpen={openDetail} favs={favs} toggleFav={toggleFav} dark={dark} moods={moods} setMoods={setMoodsWithBonus} onBrowse={() => setTab("home")} onProductClick={setSelectedCatalogProduct}/>,
    comm: <CommunityScreen dark={dark} posts={community} onLike={likePost} onUserClick={openUser}
      user={user}
      onAddPost={addCommunityPost}
      onRequireAuth={() => { setAuthOpen(true); setToast("로그인이 필요해요"); }}
      comments={communityComments}
      onAddComment={addCommunityComment}
      onDeleteComment={deleteCommunityComment}
      onToggleCommentLike={toggleCommunityCommentLike}
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

  // 앱 전역 Context — 화면들이 useAppContext 로 구독.
  // setter 들은 안정적이므로 deps 에서 제외 (user/dark 가 실제 변동 요인).
  // requireAuth 는 user 변경 시 재계산 필요.
  const appCtx = useMemo(() => ({
    user, dark, supabase,
    setToast, setAuthOpen, setTab,
    requireAuth: (fn) => {
      if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return; }
      fn();
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, dark]);

  return (
    <AppProvider value={appCtx}>
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
              className={cls("text-emerald-500", refreshing && "animate-spin")}
              style={{ transform: refreshing ? undefined : `rotate(${pullY * 4}deg)`, transition: "transform 0.1s" }}/>
          </div>
        </div>
      )}
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
                  if (supabase && user?.id) supabaseNotifs.markAllRead(user.id).catch(() => {});
                }
              }}
              aria-label={unreadCount > 0 ? `알림 ${unreadCount}개` : "알림"}
              className={cls("p-2 rounded-full relative", dark ? "hover:bg-gray-800" : "hover:bg-gray-100")}>
                <Bell size={18} className={dark ? "text-gray-300" : "text-gray-700"}/>
                {unreadCount > 0 && (
                  <span className={cls("absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 bg-rose-500 rounded-full text-[10px] font-black text-white flex items-center justify-center leading-none ring-2 tabular-nums",
                    dark ? "ring-gray-900" : "ring-white")}>
                    {unreadCount > 99 ? "99+" : unreadCount}
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
                          className={cls("text-xs font-bold active:opacity-60 transition", armClearNotif ? "text-rose-500" : dark ? "text-gray-400" : "text-gray-500")}>
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

      {/* 탭 전환 시 살짝 fade-in — tab key 로 remount 트리거하지 않도록 wrapper 만 애니 */}
      <div key={tab} className="animate-fade-in">{screens[tab]}</div>

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

      {/* Toast — type 별 색 분기 (info: 검정, success: emerald, error: rose) */}
      {toast && (
        <div className="fixed inset-x-0 bottom-44 z-40 flex justify-center pointer-events-none px-4">
          <div className={cls("text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl animate-toast inline-flex items-center gap-1.5",
            toast.type === "error" ? "bg-rose-600/95" :
            toast.type === "success" ? "bg-emerald-600/95" :
            "bg-gray-900/95")}>
            {toast.type === "error" && <X size={12} className="shrink-0"/>}
            {toast.type === "success" && <Check size={12} className="shrink-0"/>}
            {toast.msg}
          </div>
        </div>
      )}

      {/* Detail stack */}
      {nav.stack.map((s, i) => s.type === "detail" && (
        <DetailScreen key={`${s.payload.id}-${i}`} r={s.payload} onBack={back} onOpen={openDetail}
          reviews={reviews} favs={favs} toggleFav={toggleFav} dark={dark}
          comments={(commentsMap[s.payload.id] || []).filter((c) => !blocked.has(c.author))} addComment={addComment} deleteComment={deleteComment} toggleCommentLike={toggleCommentLike} user={user}
          deleting={deletingReviewId === s.payload.id}
          onEdit={(r) => { setEditingReview(r); back(); setTimeout(() => setCompose(true), 280); }}
          onDelete={async (r) => { const ok = await deleteReview(r.id); if (ok) back(); }}
          onReport={(targetType = "review", targetId = s.payload.id, reason = "inappropriate") => {
            if (!user) { setAuthOpen(true); setToast("로그인이 필요해요"); return; }
            supabaseReports.create({ reporterId: user.id, targetType, targetId, reason })
              .then(({ error }) => setToast(error ? "신고 접수 실패. 잠시 후 다시 시도해주세요" : "신고가 접수됐어요. 검토 후 조치할게요"))
              .catch(() => setToast("신고 접수 실패"));
          }}
          onHashtagClick={(tag) => { back(); setTimeout(() => { setSearchQ(tag); setSearch(true); }, 280); }}
          onProductClick={setSelectedCatalogProduct}
          onUserClick={openUser}
          following={following}
          onToggleFollow={toggleFollow}/>
      ))}
      {search && <SearchScreen reviews={reviews} onOpen={openDetail} favs={favs} toggleFav={toggleFav} dark={dark} onClose={() => setSearch(false)} recents={recents} addRecent={addRecent} removeRecent={removeRecent} clearRecents={clearRecents} q={searchQ} setQ={setSearchQ} onProductClick={setSelectedCatalogProduct}/>}
      <Suspense fallback={null}>{compose && <ComposeScreen onClose={() => { setCompose(false); setEditingReview(null); setComposeProduct(null); }} onSubmit={submitReview} dark={dark} editing={editingReview} prefillProduct={composeProduct}/>}</Suspense>
      <Suspense fallback={null}>{authOpen && <AuthScreen onClose={() => setAuthOpen(false)} onAuth={(u) => {
        setUser(u);
        setToast(`${u.nickname}님 환영해요`);
        setNotifications((prev) => [
          { id: Date.now(), text: `${u.nickname}님, 웨이로그에 오신 것을 환영해요!`, time: "방금", read: false },
          { id: Date.now()+1, text: "첫 웨이로그를 작성하면 추천이 더 정교해져요", time: "방금", read: false },
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
        onOpenProfile={(u) => setProfileUser(u)}
        isFollowing={!!selectedUser.userId && following.has(selectedUser.userId)}
        onToggleFollow={() => toggleFollow(selectedUser.userId, selectedUser.author)}
        isBlocked={blocked.has(selectedUser.author)}
        onToggleBlock={toggleBlock}
        currentUser={user}
        dark={dark}/>}
      {profileUser && <UserProfileScreen author={profileUser.author} avatar={profileUser.avatar}
        userId={profileUser.userId}
        reviews={reviews} currentUser={user}
        isFollowing={!!profileUser.userId && following.has(profileUser.userId)}
        onToggleFollow={() => toggleFollow(profileUser.userId, profileUser.author)}
        onClose={() => setProfileUser(null)} onOpen={openDetail} dark={dark}/>}

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
        />
      )}

      {challengeMainOpen && challenge && <ChallengeMainScreen
        challenge={challenge}
        setChallenge={setChallenge}
        dailyLogs={challengeDailyLogs}
        setDailyLogs={setChallengeDailyLogsSync}
        inbodyRecords={challengeInbody}
        setInbodyRecords={setChallengeInbodySync}
        anonPosts={challengeAnonPosts}
        setAnonPosts={setChallengeAnonPostsSync}
        onClose={() => setChallengeMainOpen(false)}
        dark={dark}/>}

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
                    active ? "text-emerald-500" : dark ? "text-gray-400" : "text-gray-500")}/>
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
    setToast, setAuthOpen: () => {}, setTab: () => {},
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


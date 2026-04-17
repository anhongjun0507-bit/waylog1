import { useState, useEffect, useMemo, useRef } from "react";
import {
  Camera, Check, PenLine, Plus, RefreshCw, Search, X
} from "lucide-react";
import { cls } from "../utils/ui.js";
import { useExit, useDebouncedValue, useStoredState } from "../hooks.js";
import { BASE, CATEGORIES, PRODUCTS } from "../constants.js";
import { useCatalog, useCatalogLoading } from "../catalog.js";
import { ProductImage } from "../components/index.js";

const TagChipInput = ({ tags, setTags, dark }) => {
  const [draft, setDraft] = useState("");
  const list = (tags || "").split(/[\s,]+/).filter(Boolean);

  const add = (raw) => {
    const cleaned = raw.replace(/[#\s,]+/g, "").slice(0, 20);
    if (!cleaned) return;
    if (list.includes(cleaned)) { setDraft(""); return; }
    if (list.length >= 8) { setDraft(""); return; }
    setTags([...list, cleaned].join(" "));
    setDraft("");
  };
  const remove = (t) => setTags(list.filter((x) => x !== t).join(" "));

  return (
    <div className={cls("border-b pb-2", dark ? "border-gray-700" : "border-gray-200")}>
      <div className="flex flex-wrap items-center gap-1.5">
        {list.map((t) => (
          <button key={t} type="button" onClick={() => remove(t)}
            className={cls("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold active:scale-95 transition",
              dark ? "bg-emerald-900/40 text-emerald-300 hover:bg-rose-900/40 hover:text-rose-300"
                   : "bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700")}>
            #{t}
            <X size={11} className="opacity-70"/>
          </button>
        ))}
        <input value={draft}
          onChange={(e) => {
            const v = e.target.value;
            // 쉼표 입력 시 자동 추가
            if (v.includes(",")) { v.split(",").forEach((p) => add(p)); return; }
            setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); add(draft); }
            else if (e.key === "Backspace" && !draft && list.length > 0) { remove(list[list.length - 1]); }
          }}
          onBlur={() => add(draft)}
          placeholder={list.length === 0 ? "#태그 입력 후 Enter (예: 다이어트)" : list.length >= 8 ? "최대 8개" : "추가"}
          maxLength={20}
          disabled={list.length >= 8}
          className={cls("flex-1 min-w-[80px] text-sm bg-transparent outline-none py-1",
            dark ? "text-white placeholder-gray-600" : "text-gray-900 placeholder-gray-400")}/>
      </div>
    </div>
  );
};

const ComposeScreen = ({ onClose, onSubmit, dark, editing, prefillProduct }) => {
  const [exiting, close] = useExit(onClose);
  const [title, setTitle, titleLoaded] = useStoredState("waylog:draft:compose:title", "");
  const [body, setBody, bodyLoaded] = useStoredState("waylog:draft:compose:body", "");
  const [tags, setTags, tagsLoaded] = useStoredState("waylog:draft:compose:tags", "");
  const [category, setCategory, catLoaded] = useStoredState("waylog:draft:compose:category", "");
  const [mediaItems, setMediaItems] = useState([]);
  const [selectedProducts, setSelectedProducts, prodLoaded] = useStoredState("waylog:draft:compose:products", []);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [pickerCat, setPickerCat] = useState(category || "all");
  const [error, setError] = useState("");
  const [confirmClearDraft, setConfirmClearDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 드래프트 복구 안내 — 수정 모드가 아니고, 저장된 drafts 가 있으면 한 번 노출.
  // 모든 useStoredState 가 IDB 로부터 로드 완료된 이후에만 체크 (타이머 대신).
  const [restorePrompt, setRestorePrompt] = useState(false);
  const restoreCheckedRef = useRef(false);
  const allLoaded = titleLoaded && bodyLoaded && tagsLoaded && catLoaded && prodLoaded;
  useEffect(() => {
    if (restoreCheckedRef.current || editing || !allLoaded) return;
    restoreCheckedRef.current = true;
    const hasDraft = !!(title?.trim() || body?.trim() || tags?.trim() || (selectedProducts?.length));
    if (hasDraft) setRestorePrompt(true);
    // IDB 로드 완료 시 1회만 검사 — title/body 등을 deps 에 넣으면 사용자 타이핑마다 재실행됨
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, allLoaded]);
  const discardDraft = async () => {
    // 로컬 state 뿐 아니라 IDB 에 저장된 draft 키도 함께 제거 (누적 방지)
    setTitle(""); setBody(""); setTags(""); setCategory("");
    setSelectedProducts([]); setMediaItems([]);
    setRestorePrompt(false);
    try {
      await Promise.all([
        window.storage?.delete("waylog:draft:compose:title"),
        window.storage?.delete("waylog:draft:compose:body"),
        window.storage?.delete("waylog:draft:compose:tags"),
        window.storage?.delete("waylog:draft:compose:category"),
        window.storage?.delete("waylog:draft:compose:products"),
      ]);
    } catch {}
  };

  // 수정 모드 prefill — editing.id 바뀔 때만 trigger (객체 참조 변경은 무시)
  useEffect(() => {
    if (editing) {
      setTitle(editing.title || "");
      setBody(editing.body || "");
      setTags((editing.tags || []).join(" "));
      setCategory(editing.category || "food");
      setMediaItems(editing.media || []);
      setSelectedProducts(editing.products || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

  // prefillProduct — 제품 상세에서 "리뷰 쓰기" 진입 시 해당 제품 자동 선택.
  // 사용자가 직접 수정한 selectedProducts 를 deps 에 넣으면 덮어써버리므로 prefillProduct.id 만 감시.
  useEffect(() => {
    if (prefillProduct && !editing) {
      if (!selectedProducts.find((x) => x.id === prefillProduct.id)) {
        setSelectedProducts((prev) => prev.length < 3 ? [...prev, prefillProduct] : prev);
      }
      if (prefillProduct.category && !category) setCategory(prefillProduct.category);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillProduct?.id]);

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
      // mediaItems는 useState로 관리되므로 localStorage 삭제 불필요
      await window.storage?.delete("waylog:draft:compose:products");
    } catch {}
  };

  const resizeImage = (file, maxSize = 1600, quality = 0.85) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      // window.Image — lucide-react 의 Image 아이콘이 모듈 스코프에서 전역 Image 를 가림
      const img = new window.Image();
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
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        canvas.toBlob((blob) => resolve({ dataUrl, blob: blob || null }), "image/jpeg", quality);
      };
      img.onerror = () => resolve({ dataUrl: reader.result, blob: null });
      img.src = reader.result;
    };
    reader.onerror = () => resolve({ dataUrl: null, blob: null });
    reader.readAsDataURL(file);
  });

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError("");
    const remaining = 10 - mediaItems.length;
    if (files.length > remaining) {
      setError(`최대 10개까지 업로드 가능해요 (${remaining}개 남음)`);
      e.target.value = "";
      return;
    }
    const newItems = [];
    let skippedUnsupported = 0;
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) { skippedUnsupported++; continue; }
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
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
        if (!url) { setError(`${file.name}: 파일을 읽지 못했어요`); continue; }
        newItems.push({ id: Date.now() + Math.random(), type: "video", url, duration: Math.round(duration), file });
      } else {
        let dataUrl, blob;
        try {
          ({ dataUrl, blob } = await resizeImage(file, 1600, 0.85));
        } catch (err) {
          setError(`${file.name}: 이미지 처리 실패`);
          continue;
        }
        // resizeImage 가 실패해도 원본 파일로 fallback
        if (!dataUrl) {
          const fallback = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
          if (!fallback) { setError(`${file.name}: 파일을 읽지 못했어요`); continue; }
          dataUrl = fallback;
        }
        newItems.push({ id: Date.now() + Math.random(), type: "image", url: dataUrl, file: blob || file });
      }
    }
    if (skippedUnsupported > 0 && newItems.length === 0) {
      setError("이미지 또는 동영상 파일만 업로드할 수 있어요");
    }
    if (newItems.length > 0) setMediaItems((prev) => [...prev, ...newItems]);
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

  const composeCatalog = useCatalog();
  const composeCatalogLoading = useCatalogLoading();
  const dProductQuery = useDebouncedValue(productQuery, 180);
  const filteredProducts = useMemo(() => {
    const source = composeCatalog && composeCatalog.length > 0 ? composeCatalog : PRODUCTS;
    let items = source;
    if (pickerCat && pickerCat !== "all") {
      items = items.filter((p) => p && p.category === pickerCat);
    }
    const q = dProductQuery.trim().toLowerCase();
    if (q) {
      items = items.filter((p) => {
        const name = (p?.name || "").toLowerCase();
        const brand = (p?.brand || "").toLowerCase();
        const tags = Array.isArray(p?.tags) ? p.tags.join(" ").toLowerCase() : "";
        return name.includes(q) || brand.includes(q) || tags.includes(q);
      });
    }
    // 검색어 없을 땐 너무 길지 않게 60개로 제한 (성능 + UX)
    return q ? items.slice(0, 200) : items.slice(0, 60);
  }, [dProductQuery, pickerCat, composeCatalog]);

  return (
    <div className={cls("fixed inset-0 z-40 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col pt-safe pb-safe", exiting ? "animate-slide-down" : "animate-slide-up", dark ? "bg-gray-900" : "bg-gray-50")}>
      <div className={cls("flex items-center justify-between p-4 border-b", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
        <button onClick={close} aria-label="닫기"><X size={22} className={dark ? "text-white" : "text-gray-700"}/></button>
        <div className="flex flex-col items-center">
          <p className={cls("text-sm font-bold", dark ? "text-white" : "text-gray-900")}>{isEditMode ? "웨이로그 수정" : "새 웨이로그"}</p>
          {!isEditMode && (title || body || tags || selectedProducts.length > 0) && (
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
        <button disabled={!valid || submitting}
          onClick={async () => {
            setSubmitting(true);
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
            setSubmitting(false);
            if (ok !== false) {
              if (!isEditMode) clearDraft();
              close();
            }
          }}
          className={cls("text-sm font-bold inline-flex items-center gap-1", submitting ? "opacity-50" : valid ? "text-emerald-500" : dark ? "text-gray-600" : "text-gray-300")}>
          {submitting ? <><RefreshCw size={14} className="animate-spin"/> 저장 중</> : isEditMode ? "수정 완료" : "등록"}
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
            <span className={cls("text-xs font-bold tabular-nums", dark ? "text-gray-400" : "text-gray-500")}>{mediaItems.length}/10</span>
          </div>
          <div className="grid grid-cols-4 lg:grid-cols-6 gap-2">
            {mediaItems.map((m) => (
              <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-200 group">
                {m.type === "image" ? (
                  <img src={m.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover"/>
                ) : (
                  <>
                    <video src={m.url} className="w-full h-full object-cover" muted/>
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                        <div className="w-0 h-0 border-l-[8px] border-l-gray-900 border-y-[6px] border-y-transparent ml-0.5"/>
                      </div>
                    </div>
                    <span className="absolute bottom-1 right-1 text-xs font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">{m.duration}s</span>
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
                <Camera size={20} className={dark ? "text-gray-400" : "text-gray-500"}/>
                <span className={cls("text-xs font-bold mt-1", dark ? "text-gray-400" : "text-gray-500")}>추가</span>
                <input type="file" accept="image/*,video/*" multiple onChange={handleMediaUpload}
                  className="absolute w-px h-px opacity-0 overflow-hidden -m-px p-0 border-0"/>
              </label>
            )}
          </div>
          <p className={cls("text-xs mt-2 opacity-70", dark ? "text-gray-500" : "text-gray-500")}>
            사진/동영상 최대 10개 · 임시저장에는 포함되지 않아요
          </p>
        </div>

        {/* 제품 선택 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className={cls("text-xs font-bold", dark ? "text-gray-300" : "text-gray-700")}>
              제품 <span className={cls("font-normal opacity-70", dark ? "text-gray-400" : "text-gray-500")}>(선택)</span>
            </p>
            <span className={cls("text-xs font-bold tabular-nums", dark ? "text-gray-400" : "text-gray-500")}>{selectedProducts.length}/3</span>
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
              setPickerCat(category || "all"); setProductQuery(""); setProductPickerOpen(true);
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
        <TagChipInput tags={tags} setTags={setTags} dark={dark}/>

        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
      </div>

      {/* 드래프트 복구 안내 */}
      {restorePrompt && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setRestorePrompt(false)}/>
          <div className={cls("relative w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-slide-up", dark ? "bg-gray-900" : "bg-white")}>
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <PenLine size={24} className="text-emerald-500"/>
            </div>
            <p className={cls("text-base font-black text-center", dark ? "text-white" : "text-gray-900")}>이어서 쓰시겠어요?</p>
            <p className={cls("text-xs text-center mt-2 opacity-70", dark ? "text-gray-400" : "text-gray-600")}>이전에 작성하다가 중단한 내용이 남아 있어요.</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { discardDraft(); }}
                className={cls("flex-1 py-3 rounded-2xl font-bold text-sm border", dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600")}>새로 쓰기</button>
              <button onClick={() => setRestorePrompt(false)}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-sm">이어 쓰기</button>
            </div>
          </div>
        </div>
      )}

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
          <div className={cls("relative w-full rounded-t-3xl px-5 pt-3 pb-safe-plus max-h-[85%] flex flex-col animate-slide-up", dark ? "bg-gray-900" : "bg-white")}>
            <div className={cls("w-12 h-1 rounded-full mx-auto mb-3 shrink-0", dark ? "bg-gray-700" : "bg-gray-300")}/>
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="min-w-0">
                <p className={cls("text-base font-black", dark ? "text-white" : "text-gray-900")}>제품 선택</p>
                {productQuery.trim() ? (
                  <p className={cls("text-xs font-bold mt-0.5", dark ? "text-emerald-400" : "text-emerald-600")}>
                    전체 제품에서 찾는 중
                  </p>
                ) : pickerCat && pickerCat !== "all" && CATEGORIES[pickerCat] ? (
                  <p className={cls("text-xs font-bold mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>
                    {CATEGORIES[pickerCat].label} 카테고리
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cls("text-xs font-bold", dark ? "text-gray-400" : "text-gray-500")}>최대 3개 ({selectedProducts.length}/3)</span>
                <button onClick={() => setProductPickerOpen(false)}
                  className={cls("w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition", dark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200")}>
                  <X size={14} className={dark ? "text-gray-400" : "text-gray-600"}/>
                </button>
              </div>
            </div>
            <div className={cls("flex items-center gap-2 px-3 py-2 rounded-full mb-2 shrink-0", dark ? "bg-gray-800" : "bg-gray-100")}>
              <Search size={14} className={dark ? "text-gray-400" : "text-gray-500"}/>
              <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="제품명 · 브랜드 · 태그 검색"
                className={cls("flex-1 min-w-0 text-sm bg-transparent outline-none", dark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400")}/>
              {productQuery && (
                <button onClick={() => setProductQuery("")} aria-label="검색어 지우기"
                  className={cls("w-5 h-5 rounded-full flex items-center justify-center shrink-0", dark ? "bg-gray-700" : "bg-gray-300")}>
                  <X size={11} className="text-white"/>
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto mb-3 pb-1 scrollbar-hide shrink-0" style={{ scrollbarWidth: "none" }}>
              {[{ key: "all", label: "전체" }, ...Object.entries(CATEGORIES).map(([k, v]) => ({ key: k, label: v.label }))].map((c) => (
                <button key={c.key} onClick={() => { setPickerCat(c.key); setProductQuery(""); }}
                  className={cls("shrink-0 px-3 py-1 rounded-full text-xs font-bold transition",
                    pickerCat === c.key
                      ? "bg-emerald-500 text-white"
                      : dark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500")}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              {composeCatalogLoading && filteredProducts.length === 0 ? (
                <div className={cls("text-center py-10", dark ? "text-gray-400" : "text-gray-500")}>
                  <RefreshCw size={28} strokeWidth={1.5} className="mx-auto mb-2 animate-spin opacity-40"/>
                  <p className="text-xs">제품 카탈로그를 불러오는 중…</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className={cls("text-center py-10", dark ? "text-gray-400" : "text-gray-500")}>
                  <Search size={32} strokeWidth={1.5} className="mx-auto mb-2 opacity-40"/>
                  <p className="text-xs">검색 결과가 없어요</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((p) => {
                    const selected = !!selectedProducts.find((x) => x.id === p.id);
                    const imgSrc = p.imageUrl || (p.img ? `${BASE}${p.img}` : null);
                    return (
                      <button key={p.id} onClick={() => toggleProduct(p)}
                        className={cls("w-full flex items-center gap-3 p-2.5 rounded-2xl transition active:scale-[0.98] text-left",
                          selected
                            ? dark ? "bg-emerald-900/40 ring-2 ring-emerald-500" : "bg-emerald-50 ring-2 ring-emerald-500"
                            : dark ? "bg-gray-800/60 hover:bg-gray-800" : "bg-white hover:bg-gray-50 border border-gray-100")}>
                        <div className={cls("w-16 h-16 rounded-xl shrink-0 overflow-hidden flex items-center justify-center", dark ? "bg-gray-900" : "bg-gray-50")}>
                          <ProductImage
                            src={imgSrc}
                            alt={p.name}
                            className="max-w-full max-h-full object-contain p-1"
                            iconSize={24}
                            fallbackGradient={CATEGORIES[p.category]?.color || "from-gray-300 to-gray-400"}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          {p.brand && (
                            <p className={cls("text-xs font-bold mb-0.5 truncate", dark ? "text-emerald-400" : "text-emerald-600")}>{p.brand}</p>
                          )}
                          <p className={cls("text-xs font-bold line-clamp-2 leading-tight", dark ? "text-white" : "text-gray-900")}>{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={cls("text-xs font-bold px-1.5 py-0.5 rounded-full", CATEGORIES[p.category]?.[dark ? "dchip" : "chip"] || (dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-500"))}>
                              {CATEGORIES[p.category]?.label || "기타"}
                            </span>
                            {typeof p.price === "number" && p.price > 0 && (
                              <span className={cls("text-xs font-semibold opacity-70", dark ? "text-gray-400" : "text-gray-500")}>
                                {p.price.toLocaleString()}원
                              </span>
                            )}
                          </div>
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



export default ComposeScreen;

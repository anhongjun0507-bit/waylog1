// 외부 의존성 없이 canvas로 이미지 리사이즈 + JPEG 재인코딩.
// 재인코딩 자체가 원본 EXIF(위치/카메라) 를 제거하므로 프라이버시 보호도 겸한다.

const DEFAULTS = {
  maxDimension: 1600,  // 장변 기준 픽셀
  quality: 0.82,       // JPEG 품질
  mimeType: "image/jpeg",
  // 원본이 이미 작고 가벼우면 압축 스킵 (예: 1MB 미만 + 장변 1600이하)
  // 단 stripExif=true 이면 크기와 무관하게 재인코딩해 EXIF/GPS 메타데이터를 제거한다.
  skipIfSmallerThan: 1024 * 1024,
  stripExif: true,     // 프라이버시: 항상 EXIF 제거
};

/**
 * 이미지 File/Blob 을 리사이즈 + 재인코딩해 Blob 으로 반환.
 * 실패 시 원본을 그대로 반환한다 (사용자 업로드 흐름이 끊기지 않도록).
 *
 * @param {File|Blob} input
 * @param {Partial<typeof DEFAULTS>} opts
 * @returns {Promise<Blob>}
 */
export async function compressImage(input, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  if (!(input instanceof Blob)) return input;
  if (!input.type || !input.type.startsWith("image/")) return input;
  // GIF/WebP 애니메이션이나 너무 작으면 스킵
  if (input.type === "image/gif") return input;

  try {
    const bitmap = await loadBitmap(input);
    if (!bitmap) return input;

    // ImageBitmap 은 width/height, HTMLImageElement 는 naturalWidth/naturalHeight
    const w0 = bitmap.naturalWidth || bitmap.width;
    const h0 = bitmap.naturalHeight || bitmap.height;
    const scale = Math.min(1, cfg.maxDimension / Math.max(w0, h0));
    const w = Math.round(w0 * scale);
    const h = Math.round(h0 * scale);

    // 원본이 작고 파일도 작으면 압축 자체는 불필요. 단 stripExif=true 이면
    // EXIF 제거를 위해 JPEG 재인코딩은 반드시 수행.
    if (scale === 1 && input.size < cfg.skipIfSmallerThan && !cfg.stripExif) {
      bitmap.close && bitmap.close();
      return input;
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return input;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close && bitmap.close();

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), cfg.mimeType, cfg.quality);
    });
    if (!blob) return input;
    // 재인코딩 결과가 원본보다 크면 원본 사용
    return blob.size < input.size ? blob : input;
  } catch (e) {
    console.warn("이미지 압축 실패, 원본 사용:", e);
    return input;
  }
}

async function loadBitmap(blob) {
  // 최신 브라우저: createImageBitmap이 빠르고 EXIF 방향도 해석
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      // fallthrough
    }
  }
  // 폴백: <img>로 디코딩 (HTMLImageElement는 drawImage가 직접 그릴 수 있음)
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      // width/height getter만 맞추면 호출부에서 그대로 drawImage 가능
      Object.defineProperty(img, "close", { value: () => URL.revokeObjectURL(url) });
      resolve(img);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

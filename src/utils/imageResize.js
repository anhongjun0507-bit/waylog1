// OCR/Vision 업로드용 이미지 압축. Edge Function body 한도(~6MB) 대응 + 네트워크 절감.
// max 1024px (긴 변 기준) 리사이즈 + JPEG 80% — Vision 추론에 충분한 해상도이며 base64 후에도 한도 안.

export async function compressFileForOCR(file, maxSize = 1024, quality = 0.8) {
  if (!file) throw new Error("file_missing");
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("read_failed"));
    reader.readAsDataURL(file);
  });
  return compressDataUrlForOCR(dataUrl, maxSize, quality);
}

export async function compressDataUrlForOCR(dataUrl, maxSize = 1024, quality = 0.8) {
  if (!dataUrl) throw new Error("data_missing");
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width >= height) {
          height = Math.round((height / width) * maxSize);
          width = maxSize;
        } else {
          width = Math.round((width / height) * maxSize);
          height = maxSize;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas_unavailable")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      try { resolve(canvas.toDataURL("image/jpeg", quality)); }
      catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("decode_failed"));
    img.src = dataUrl;
  });
}

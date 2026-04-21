#!/usr/bin/env node
// Android 앱 아이콘 + adaptive icon + 스플래시 PNG 를 SVG 에서 자동 생성.
// 이 스크립트는 resources/*.svg 를 읽어 android/app/src/main/res/ 아래 적절한
// mipmap-*, drawable-* 디렉터리에 배치한다.
//
// 의존: sharp
// 실행: node scripts/generate-android-icons.mjs

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RES = path.join(ROOT, "android/app/src/main/res");
const RESOURCES = path.join(ROOT, "resources");

const MIPMAP_SIZES = [
  { dir: "mipmap-mdpi", size: 48 },
  { dir: "mipmap-hdpi", size: 72 },
  { dir: "mipmap-xhdpi", size: 96 },
  { dir: "mipmap-xxhdpi", size: 144 },
  { dir: "mipmap-xxxhdpi", size: 192 },
];

// Adaptive icon foreground/background (API 26+): 108dp 단위
// mdpi=108, hdpi=162, xhdpi=216, xxhdpi=324, xxxhdpi=432
const ADAPTIVE_SIZES = [
  { dir: "mipmap-mdpi", size: 108 },
  { dir: "mipmap-hdpi", size: 162 },
  { dir: "mipmap-xhdpi", size: 216 },
  { dir: "mipmap-xxhdpi", size: 324 },
  { dir: "mipmap-xxxhdpi", size: 432 },
];

// 스플래시 (가로/세로 다양한 사이즈)
const SPLASH_SIZES = [
  { dir: "drawable-port-mdpi", w: 320, h: 480 },
  { dir: "drawable-port-hdpi", w: 480, h: 800 },
  { dir: "drawable-port-xhdpi", w: 720, h: 1280 },
  { dir: "drawable-port-xxhdpi", w: 960, h: 1600 },
  { dir: "drawable-port-xxxhdpi", w: 1280, h: 1920 },
  { dir: "drawable-land-mdpi", w: 480, h: 320 },
  { dir: "drawable-land-hdpi", w: 800, h: 480 },
  { dir: "drawable-land-xhdpi", w: 1280, h: 720 },
  { dir: "drawable-land-xxhdpi", w: 1600, h: 960 },
  { dir: "drawable-land-xxxhdpi", w: 1920, h: 1280 },
];

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

async function genLegacyIcon() {
  const svg = fs.readFileSync(path.join(RESOURCES, "icon-only.svg"));
  for (const { dir, size } of MIPMAP_SIZES) {
    const out = path.join(RES, dir);
    ensureDir(out);
    await sharp(svg).resize(size, size).png().toFile(path.join(out, "ic_launcher.png"));
    await sharp(svg).resize(size, size).png().toFile(path.join(out, "ic_launcher_round.png"));
  }
  console.log("✔ ic_launcher + ic_launcher_round (5 sizes × 2)");
}

async function genAdaptiveIcon() {
  const fg = fs.readFileSync(path.join(RESOURCES, "icon-foreground.svg"));
  const bg = fs.readFileSync(path.join(RESOURCES, "icon-background.svg"));
  for (const { dir, size } of ADAPTIVE_SIZES) {
    const out = path.join(RES, dir);
    ensureDir(out);
    await sharp(fg).resize(size, size).png().toFile(path.join(out, "ic_launcher_foreground.png"));
    await sharp(bg).resize(size, size).png().toFile(path.join(out, "ic_launcher_background.png"));
  }
  // adaptive XML 정의 (mipmap-anydpi-v26)
  const anydpi = path.join(RES, "mipmap-anydpi-v26");
  ensureDir(anydpi);
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anydpi, "ic_launcher.xml"), xml);
  fs.writeFileSync(path.join(anydpi, "ic_launcher_round.xml"), xml);
  console.log("✔ adaptive icon (API 26+, 5 sizes)");
}

async function genSplash() {
  const svg = fs.readFileSync(path.join(RESOURCES, "splash.svg"));
  for (const { dir, w, h } of SPLASH_SIZES) {
    const out = path.join(RES, dir);
    ensureDir(out);
    // 스플래시는 중앙 크롭보다 배경 유지가 중요 → fit:cover 로 중앙 크롭
    await sharp(svg).resize(w, h, { fit: "cover" }).png().toFile(path.join(out, "splash.png"));
  }
  console.log("✔ splash (10 sizes)");
}

async function genPlayStoreIcon() {
  // Play Store 메타데이터용 512×512
  const svg = fs.readFileSync(path.join(RESOURCES, "icon-only.svg"));
  await sharp(svg).resize(512, 512).png()
    .toFile(path.join(RESOURCES, "playstore-icon-512.png"));
  // 피처 그래픽 (1024×500) — 배경 + 왼쪽 아이콘 + 오른쪽 텍스트
  const feature = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#338FD6"/>
      <stop offset="100%" stop-color="#0071CE"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <g transform="translate(80, 130) scale(0.235)">
    <rect width="1024" height="1024" rx="232" fill="white" opacity="0.15"/>
    <path d="M 280 760 Q 380 620, 480 620 T 744 380"
          stroke="white" stroke-width="40" fill="none" stroke-linecap="round"/>
    <circle cx="280" cy="760" r="50" fill="white"/>
    <circle cx="512" cy="540" r="50" fill="white"/>
    <circle cx="744" cy="380" r="64" fill="white"/>
  </g>
  <text x="380" y="230" font-family="-apple-system, sans-serif" font-size="78" font-weight="900" fill="white">웨이로그</text>
  <text x="380" y="290" font-family="-apple-system, sans-serif" font-size="34" font-weight="700" fill="white" opacity="0.9">나만의 라이프스타일 다이어리</text>
  <text x="380" y="370" font-family="-apple-system, sans-serif" font-size="22" font-weight="500" fill="white" opacity="0.7">매일의 제품 후기 · 시그니처 카드 · 8주 챌린지</text>
</svg>
`;
  await sharp(Buffer.from(feature)).resize(1024, 500).png()
    .toFile(path.join(RESOURCES, "playstore-feature-1024x500.png"));
  console.log("✔ Play Store assets (512 icon + 1024×500 feature)");
}

(async () => {
  try {
    await genLegacyIcon();
    await genAdaptiveIcon();
    await genSplash();
    await genPlayStoreIcon();
    console.log("\n✅ 모든 아이콘/스플래시 생성 완료");
    console.log("   Play Store 용 자산: resources/playstore-*.png");
  } catch (e) {
    console.error("생성 실패:", e);
    process.exit(1);
  }
})();

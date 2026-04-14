import { useState, useEffect } from "react";

// 518개 제품 카탈로그(~256KB)를 동적 import로 초기 번들에서 분리.
// - 모듈 최초 사용 시 1회만 load, 이후 동일 Promise 재사용.
// - 컴포넌트는 useCatalog() 로 구독 (로드 전에는 빈 배열 반환).

let _cache = null;       // 로드 완료된 배열
let _promise = null;     // 진행 중 Promise

export function loadCatalog() {
  if (_cache) return Promise.resolve(_cache);
  if (!_promise) {
    _promise = import("./data/products.json")
      .then((mod) => {
        _cache = mod.default || mod;
        return _cache;
      })
      .catch((e) => {
        _promise = null;
        console.warn("catalog load 실패:", e);
        return [];
      });
  }
  return _promise;
}

// 즉시 접근이 필요한 곳(예: JSX 내부)에서 사용. 아직 로드 전이면 빈 배열.
export function getCatalogSync() {
  return _cache || [];
}

// 로드 상태를 구독하는 모듈 수준 subscriber 셋.
// 한 번만 loadCatalog 호출되고, 여러 훅(useCatalog/useCatalogLoading)이 함께 공유.
const _catalogSubs = new Set();
const _notifySubs = () => _catalogSubs.forEach((cb) => cb());
const _kickoffLoad = () => {
  if (_cache) return;
  loadCatalog().then(() => _notifySubs());
};

function useCatalogSub() {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((x) => x + 1);
    _catalogSubs.add(cb);
    _kickoffLoad();
    return () => { _catalogSubs.delete(cb); };
  }, []);
}

// React 훅 — 로드 완료 시 rerender 트리거.
export function useCatalog() {
  useCatalogSub();
  return _cache || [];
}

// 로딩 상태만 필요한 곳 (예: "로드 중…" 표시)
export function useCatalogLoading() {
  useCatalogSub();
  return !_cache;
}

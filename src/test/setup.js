import "@testing-library/jest-dom/vitest";

// localStorage 스텁 (jsdom 기본 제공하지만 일부 환경에서 필요)
if (!globalThis.localStorage) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
}

// window.storage 는 테스트에서 storage-shim.js import 로 설정되게 둔다.
// (이전에 여기서 stub 을 설치하면 shim 이 건너뛰어지고 prod 와 다른 동작이 됨)

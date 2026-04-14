// window.storage 구현 — IndexedDB 기반 (무의존)
//
// 이전 구현은 localStorage 래핑이어서 (1) 동기 I/O 가 메인 스레드를 점유하고
// (2) 용량이 도메인당 약 5MB 로 제한된다. IndexedDB 로 옮기면
//  - 용량: 브라우저별 수백 MB~수 GB
//  - 비동기 I/O 로 메인 스레드 해방
//  - 이미지/드래프트 등 큰 페이로드 저장 가능
//
// 동일한 async API (get/set/delete/list) 를 유지하므로 호출측(App.jsx) 수정 불필요.
// IndexedDB 가 사용 불가한 환경(예: 일부 시크릿 모드)에서는 localStorage 로 자동 폴백.

if (typeof window !== "undefined" && !window.storage) {
  const DB_NAME = "waylog";
  const DB_VERSION = 1;
  const STORE = "kv";

  let dbPromise = null;
  let useFallback = false;

  // 내부 유틸은 함수 선언 대신 const expression 으로 — lint no-inner-declarations 통과
  const openDB = () => {
    if (useFallback) return Promise.reject(new Error("idb_unavailable"));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          useFallback = true;
          reject(req.error);
        };
      } catch (e) {
        useFallback = true;
        reject(e);
      }
    });
    return dbPromise;
  };

  const tx = (mode, fn) => openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    try { result = fn(store); }
    catch (e) { reject(e); return; }
    t.oncomplete = () => resolve(result);
    t.onabort = t.onerror = () => reject(t.error);
  }));

  // ----- localStorage 폴백 -----
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) {
    if (e?.name === "QuotaExceededError") alert("저장 공간이 부족해요. 일부 데이터를 정리해주세요.");
    return false;
  } };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch {} };
  const lsKeys = () => {
    const keys = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k) keys.push(k); } } catch {}
    return keys;
  };

  window.storage = {
    async get(key) {
      try {
        const value = await tx("readonly", (s) => new Promise((resolve, reject) => {
          const r = s.get(key);
          r.onsuccess = () => resolve(r.result ?? null);
          r.onerror = () => reject(r.error);
        }));
        if (value === null || value === undefined) return null;
        return { key, value, shared: false };
      } catch {
        const v = lsGet(key);
        return v === null ? null : { key, value: v, shared: false };
      }
    },
    async set(key, value, shared = false) {
      const stringValue = typeof value === "string" ? value : JSON.stringify(value);
      try {
        await tx("readwrite", (s) => { s.put(stringValue, key); });
        return { key, value: stringValue, shared };
      } catch (e) {
        if (e?.name === "QuotaExceededError") alert("저장 공간이 부족해요. 일부 데이터를 정리해주세요.");
        if (lsSet(key, stringValue)) return { key, value: stringValue, shared };
        return null;
      }
    },
    async delete(key, shared = false) {
      try {
        await tx("readwrite", (s) => { s.delete(key); });
      } catch {
        lsDel(key);
      }
      return { key, deleted: true, shared };
    },
    async list(prefix = "", shared = false) {
      try {
        const keys = await tx("readonly", (s) => new Promise((resolve, reject) => {
          const out = [];
          const r = s.openKeyCursor();
          r.onsuccess = () => {
            const cur = r.result;
            if (!cur) { resolve(out); return; }
            const k = String(cur.key);
            if (!prefix || k.startsWith(prefix)) out.push(k);
            cur.continue();
          };
          r.onerror = () => reject(r.error);
        }));
        return { keys, prefix, shared };
      } catch {
        return { keys: lsKeys().filter((k) => !prefix || k.startsWith(prefix)), prefix, shared };
      }
    },
  };
}

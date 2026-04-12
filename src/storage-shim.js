// window.storage 폴리필 - localStorage 기반
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    async get(key) {
      try {
        const value = localStorage.getItem(key);
        if (value === null) return null;
        return { key, value, shared: false };
      } catch (e) {
        console.error('storage.get error:', e);
        return null;
      }
    },
    async set(key, value, shared = false) {
      try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringValue);
        return { key, value: stringValue, shared };
      } catch (e) {
        console.error('storage.set error:', e);
        if (e.name === 'QuotaExceededError') {
          alert('저장 공간이 부족해요. 일부 데이터를 정리해주세요.');
        }
        return null;
      }
    },
    async delete(key, shared = false) {
      try {
        localStorage.removeItem(key);
        return { key, deleted: true, shared };
      } catch (e) {
        console.error('storage.delete error:', e);
        return null;
      }
    },
    async list(prefix = '', shared = false) {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            keys.push(key);
          }
        }
        return { keys, prefix, shared };
      } catch (e) {
        console.error('storage.list error:', e);
        return null;
      }
    }
  };
}

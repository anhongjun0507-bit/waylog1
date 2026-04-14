import { describe, it, expect, beforeEach } from "vitest";
import "./storage-shim.js";

// jsdom 은 기본적으로 IndexedDB 가 없다. storage-shim 이 localStorage 폴백으로 동작하는지 확인.
describe("window.storage polyfill (localStorage fallback)", () => {
  beforeEach(() => { try { localStorage.clear(); } catch {} });

  it("set/get round-trip", async () => {
    await window.storage.set("key", "value");
    const r = await window.storage.get("key");
    expect(r?.value).toBe("value");
  });

  it("set non-string auto-stringifies", async () => {
    await window.storage.set("obj", { a: 1, b: [2, 3] });
    const r = await window.storage.get("obj");
    expect(JSON.parse(r.value)).toEqual({ a: 1, b: [2, 3] });
  });

  it("get missing returns null", async () => {
    const r = await window.storage.get("missing-key-xyz");
    expect(r).toBeNull();
  });

  it("delete removes the key", async () => {
    await window.storage.set("tmp", "v");
    await window.storage.delete("tmp");
    const r = await window.storage.get("tmp");
    expect(r).toBeNull();
  });

  it("list filters by prefix", async () => {
    await window.storage.set("waylog:a", "1");
    await window.storage.set("waylog:b", "2");
    await window.storage.set("other:c", "3");
    const r = await window.storage.list("waylog:");
    expect(r.keys.sort()).toEqual(["waylog:a", "waylog:b"]);
  });
});

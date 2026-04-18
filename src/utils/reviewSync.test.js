import { describe, it, expect, beforeEach } from "vitest";
import "../storage-shim.js";
import {
  pendingReviewsKey,
  pendingEditsKey,
  clearLegacyPendingKey,
  filterStalePending,
  filterStaleEdits,
  savePendingEdit,
  removePendingEdit,
  LEGACY_PENDING_KEY,
  PENDING_REVIEW_TTL_MS,
} from "./reviewSync.js";

describe("pendingReviewsKey / pendingEditsKey", () => {
  it("scopes by user id", () => {
    expect(pendingReviewsKey("abc")).toBe("waylog:pendingReviews:abc");
    expect(pendingEditsKey("abc")).toBe("waylog:pendingEdits:abc");
  });
  it("falls back to 'anon' for null/undefined/empty", () => {
    expect(pendingReviewsKey(null)).toBe("waylog:pendingReviews:anon");
    expect(pendingReviewsKey(undefined)).toBe("waylog:pendingReviews:anon");
    expect(pendingReviewsKey("")).toBe("waylog:pendingReviews:anon");
    expect(pendingEditsKey(null)).toBe("waylog:pendingEdits:anon");
  });
});

describe("filterStalePending", () => {
  const NOW = 1_700_000_000_000;

  it("returns empty for non-array input", () => {
    expect(filterStalePending(null, NOW)).toEqual([]);
    expect(filterStalePending(undefined, NOW)).toEqual([]);
    expect(filterStalePending({}, NOW)).toEqual([]);
  });

  it("keeps items whose id (timestamp) is within TTL", () => {
    const fresh = { id: NOW - 1_000_000 };
    expect(filterStalePending([fresh], NOW)).toEqual([fresh]);
  });

  it("drops items whose id is older than TTL", () => {
    const stale = { id: NOW - PENDING_REVIEW_TTL_MS - 1 };
    expect(filterStalePending([stale], NOW)).toEqual([]);
  });

  it("drops items with non-numeric or zero id", () => {
    expect(filterStalePending([{ id: "x" }], NOW)).toEqual([]);
    expect(filterStalePending([{ id: 0 }], NOW)).toEqual([]);
    expect(filterStalePending([{}], NOW)).toEqual([]);
  });

  it("mixes fresh and stale correctly", () => {
    const fresh = { id: NOW - 1000, title: "keep" };
    const stale = { id: NOW - PENDING_REVIEW_TTL_MS - 1000, title: "drop" };
    expect(filterStalePending([fresh, stale], NOW)).toEqual([fresh]);
  });
});

describe("filterStaleEdits", () => {
  const NOW = 1_700_000_000_000;

  it("returns empty for non-object input", () => {
    expect(filterStaleEdits(null, NOW)).toEqual({});
    expect(filterStaleEdits(123, NOW)).toEqual({});
    expect(filterStaleEdits([], NOW)).toEqual({});
  });

  it("keeps entries with recent savedAt", () => {
    const edits = { r1: { title: "t", savedAt: NOW - 1000 } };
    expect(filterStaleEdits(edits, NOW)).toEqual(edits);
  });

  it("drops entries older than TTL", () => {
    const edits = { r1: { title: "t", savedAt: NOW - PENDING_REVIEW_TTL_MS - 1 } };
    expect(filterStaleEdits(edits, NOW)).toEqual({});
  });

  it("drops entries without savedAt", () => {
    expect(filterStaleEdits({ r1: { title: "no ts" } }, NOW)).toEqual({});
    expect(filterStaleEdits({ r1: { savedAt: "str" } }, NOW)).toEqual({});
  });

  it("mixes fresh and stale correctly", () => {
    const edits = {
      keep: { title: "k", savedAt: NOW - 10_000 },
      drop: { title: "d", savedAt: NOW - PENDING_REVIEW_TTL_MS - 10_000 },
    };
    expect(filterStaleEdits(edits, NOW)).toEqual({ keep: edits.keep });
  });
});

describe("savePendingEdit / removePendingEdit roundtrip", () => {
  beforeEach(() => { try { localStorage.clear(); } catch {} });
  const uid = "user-alpha";

  it("saves edit and stamps savedAt", async () => {
    await savePendingEdit(uid, "review-1", { title: "T", content: "body" });
    const raw = await window.storage.get(pendingEditsKey(uid));
    const parsed = JSON.parse(raw.value);
    expect(parsed["review-1"].title).toBe("T");
    expect(parsed["review-1"].content).toBe("body");
    expect(typeof parsed["review-1"].savedAt).toBe("number");
  });

  it("overwrites existing entry for same reviewId", async () => {
    await savePendingEdit(uid, "r", { title: "A" });
    await savePendingEdit(uid, "r", { title: "B" });
    const raw = await window.storage.get(pendingEditsKey(uid));
    const parsed = JSON.parse(raw.value);
    expect(parsed["r"].title).toBe("B");
  });

  it("remove deletes one entry, keeps others", async () => {
    await savePendingEdit(uid, "r1", { title: "A" });
    await savePendingEdit(uid, "r2", { title: "B" });
    await removePendingEdit(uid, "r1");
    const raw = await window.storage.get(pendingEditsKey(uid));
    const parsed = JSON.parse(raw.value);
    expect(Object.keys(parsed)).toEqual(["r2"]);
    expect(parsed["r2"].title).toBe("B");
  });

  it("remove deletes entire key when last entry removed", async () => {
    await savePendingEdit(uid, "r1", { title: "A" });
    await removePendingEdit(uid, "r1");
    const raw = await window.storage.get(pendingEditsKey(uid));
    expect(raw).toBeNull();
  });

  it("remove is no-op when key/entry missing", async () => {
    await expect(removePendingEdit("nobody", "nothing")).resolves.toBeUndefined();
    await savePendingEdit(uid, "r1", { title: "A" });
    await expect(removePendingEdit(uid, "nonexistent")).resolves.toBeUndefined();
    const raw = await window.storage.get(pendingEditsKey(uid));
    expect(JSON.parse(raw.value)["r1"].title).toBe("A");
  });

  it("isolates by user id (key scoping)", async () => {
    await savePendingEdit("user-a", "r1", { title: "A" });
    await savePendingEdit("user-b", "r1", { title: "B" });
    const rawA = await window.storage.get(pendingEditsKey("user-a"));
    const rawB = await window.storage.get(pendingEditsKey("user-b"));
    expect(JSON.parse(rawA.value)["r1"].title).toBe("A");
    expect(JSON.parse(rawB.value)["r1"].title).toBe("B");
  });
});

describe("clearLegacyPendingKey", () => {
  beforeEach(() => { try { localStorage.clear(); } catch {} });

  it("deletes the legacy global key", async () => {
    await window.storage.set(LEGACY_PENDING_KEY, JSON.stringify([{ id: 1 }]));
    await clearLegacyPendingKey();
    const raw = await window.storage.get(LEGACY_PENDING_KEY);
    expect(raw).toBeNull();
  });

  it("no-op when legacy key doesn't exist", async () => {
    await expect(clearLegacyPendingKey()).resolves.toBeUndefined();
  });

  it("does NOT touch per-user keys", async () => {
    await window.storage.set(LEGACY_PENDING_KEY, JSON.stringify([{ id: 1 }]));
    await savePendingEdit("user-x", "r1", { title: "keep" });
    await clearLegacyPendingKey();
    const legacy = await window.storage.get(LEGACY_PENDING_KEY);
    const perUser = await window.storage.get(pendingEditsKey("user-x"));
    expect(legacy).toBeNull();
    expect(JSON.parse(perUser.value)["r1"].title).toBe("keep");
  });
});

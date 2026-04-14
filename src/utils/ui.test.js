import { describe, it, expect } from "vitest";
import { cls, formatRelativeTime } from "./ui.js";

describe("cls", () => {
  it("joins truthy strings with space", () => {
    expect(cls("a", "b", "c")).toBe("a b c");
  });
  it("filters out falsy values", () => {
    expect(cls("a", false, null, undefined, "", "b")).toBe("a b");
  });
  it("returns empty string when all falsy", () => {
    expect(cls(null, undefined, false)).toBe("");
  });
});

describe("formatRelativeTime", () => {
  const now = Date.now();
  it("returns fallback for empty", () => {
    expect(formatRelativeTime(null, "-")).toBe("-");
  });
  it("방금 for < 60s", () => {
    expect(formatRelativeTime(now - 5_000)).toBe("방금");
  });
  it("N분 전 for minutes", () => {
    expect(formatRelativeTime(now - 5 * 60_000)).toBe("5분 전");
  });
  it("N시간 전 for hours", () => {
    expect(formatRelativeTime(now - 3 * 3600_000)).toBe("3시간 전");
  });
  it("N일 전 for days", () => {
    expect(formatRelativeTime(now - 2 * 86400_000)).toBe("2일 전");
  });
  it("N주 전 for weeks", () => {
    expect(formatRelativeTime(now - 10 * 86400_000)).toMatch(/주 전$/);
  });
});

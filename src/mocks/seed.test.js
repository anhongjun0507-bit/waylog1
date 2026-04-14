import { describe, it, expect } from "vitest";
import { SEED_REVIEWS, SEED_COMMENTS, isSeedReviewId } from "./seed.js";

describe("SEED_REVIEWS ID normalization", () => {
  it("all seed reviews have negative IDs (collision-safe)", () => {
    SEED_REVIEWS.forEach((r) => {
      expect(typeof r.id).toBe("number");
      expect(r.id).toBeLessThan(0);
    });
  });
  it("isSeedReviewId correctly identifies seed IDs", () => {
    expect(isSeedReviewId(-142)).toBe(true);
    expect(isSeedReviewId(Date.now())).toBe(false);
    expect(isSeedReviewId("uuid-string")).toBe(false);
    expect(isSeedReviewId(null)).toBe(false);
  });
  it("SEED_COMMENTS keys are aligned to seed review IDs", () => {
    Object.keys(SEED_COMMENTS).forEach((k) => {
      // Keys stringified from negative numbers
      expect(Number(k)).toBeLessThan(0);
    });
  });
});

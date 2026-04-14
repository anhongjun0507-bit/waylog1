import { describe, it, expect } from "vitest";
import { sanitizeUrl, sanitizeImageUrl, sanitizeText, sanitizeInline } from "./sanitize.js";

describe("sanitizeUrl", () => {
  it("allows http/https URLs", () => {
    expect(sanitizeUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(sanitizeUrl("http://example.com/")).toBe("http://example.com/");
  });
  it("blocks javascript: protocol", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
  });
  it("blocks vbscript: and data: (non-image) by default", () => {
    expect(sanitizeUrl("vbscript:msgbox")).toBe("");
    expect(sanitizeUrl("data:text/html,<script>")).toBe("");
  });
  it("allows data:image only when opted-in", () => {
    expect(sanitizeImageUrl("data:image/png;base64,aaa")).toBe("data:image/png;base64,aaa");
    expect(sanitizeUrl("data:image/png;base64,aaa")).toBe("");
  });
  it("allows relative paths", () => {
    expect(sanitizeUrl("/local/img.png")).toBe("/local/img.png");
    expect(sanitizeUrl("#section")).toBe("#section");
  });
  it("returns empty string for invalid or non-strings", () => {
    expect(sanitizeUrl(null)).toBe("");
    expect(sanitizeUrl(undefined)).toBe("");
    expect(sanitizeUrl("")).toBe("");
    expect(sanitizeUrl("not a url")).toBe("");
  });
});

describe("sanitizeText", () => {
  it("strips zero-width and control characters", () => {
    expect(sanitizeText("a\u200Bb\u0001c")).toBe("abc");
  });
  it("preserves tabs, newlines, CR (explicitly allowed)", () => {
    expect(sanitizeText("a\tb\nc\rd")).toBe("a\tb\nc\rd");
  });
  it("truncates to maxLength", () => {
    expect(sanitizeText("x".repeat(10), { maxLength: 5 })).toBe("xxxxx");
  });
  it("non-strings → empty string", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
    expect(sanitizeText(123)).toBe("");
  });
});

describe("sanitizeInline", () => {
  it("collapses whitespace into single spaces", () => {
    expect(sanitizeInline("a\n b\tc")).toBe("a  b c");
  });
  it("trims leading/trailing", () => {
    expect(sanitizeInline("  hi  ")).toBe("hi");
  });
});

import { describe, it, expect } from "vitest";
import { isValidEmail, isValidPassword, isValidNickname } from "./AuthScreen.jsx";

describe("isValidEmail", () => {
  it("accepts standard emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user.name+tag@sub.example.co.kr")).toBe(true);
  });
  it("trims surrounding whitespace", () => {
    expect(isValidEmail("  user@example.com  ")).toBe(true);
  });
  it("rejects malformed emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("no@domain")).toBe(false);
    expect(isValidEmail("@missing-local.com")).toBe(false);
    expect(isValidEmail("has space@x.com")).toBe(false);
    expect(isValidEmail("double@@at.com")).toBe(false);
  });
  it("rejects non-string", () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
  });
});

describe("isValidPassword", () => {
  it("requires 8+ chars with letter and digit", () => {
    expect(isValidPassword("abc12345")).toBe(true);
    expect(isValidPassword("Password1")).toBe(true);
    expect(isValidPassword("A1234567")).toBe(true);
  });
  it("rejects less than 8 chars", () => {
    expect(isValidPassword("abc123")).toBe(false);
    expect(isValidPassword("a1b2c3d")).toBe(false);
  });
  it("rejects no-letter", () => {
    expect(isValidPassword("12345678")).toBe(false);
  });
  it("rejects no-digit", () => {
    expect(isValidPassword("abcdefgh")).toBe(false);
    expect(isValidPassword("Password")).toBe(false);
  });
  it("rejects non-string", () => {
    expect(isValidPassword(null)).toBe(false);
    expect(isValidPassword(undefined)).toBe(false);
    expect(isValidPassword(12345678)).toBe(false);
  });
  it("allows special chars (not required but accepted)", () => {
    expect(isValidPassword("abc123!@#")).toBe(true);
    expect(isValidPassword("p@ssw0rd")).toBe(true);
  });
});

describe("isValidNickname", () => {
  it("accepts 2-12 char names", () => {
    expect(isValidNickname("지영")).toBe(true);
    expect(isValidNickname("a".repeat(12))).toBe(true);
    expect(isValidNickname("ab")).toBe(true);
  });
  it("trims whitespace before checking length", () => {
    expect(isValidNickname("  ab  ")).toBe(true);
    expect(isValidNickname("  a  ")).toBe(false); // trimmed to 1 char
  });
  it("rejects too short/long", () => {
    expect(isValidNickname("a")).toBe(false);
    expect(isValidNickname("")).toBe(false);
    expect(isValidNickname("a".repeat(13))).toBe(false);
  });
  it("rejects non-string", () => {
    expect(isValidNickname(null)).toBe(false);
    expect(isValidNickname(undefined)).toBe(false);
    expect(isValidNickname(123)).toBe(false);
  });
});

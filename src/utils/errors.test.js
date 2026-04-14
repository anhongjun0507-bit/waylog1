import { describe, it, expect } from "vitest";
import { friendlyError } from "./errors.js";

describe("friendlyError", () => {
  it("maps network errors", () => {
    expect(friendlyError({ message: "Failed to fetch" })).toMatch(/네트워크/);
    expect(friendlyError({ message: "NetworkError when attempting..." })).toMatch(/네트워크/);
  });
  it("maps invalid credentials", () => {
    expect(friendlyError({ message: "Invalid login credentials" })).toMatch(/이메일 또는 비밀번호/);
  });
  it("maps already registered", () => {
    expect(friendlyError({ message: "User already registered" })).toMatch(/이미 가입/);
  });
  it("passes through Korean messages unchanged", () => {
    expect(friendlyError({ message: "닉네임은 2자 이상이어야 해요" })).toMatch(/닉네임/);
  });
  it("returns fallback for unknown/empty", () => {
    expect(friendlyError(null)).toMatch(/잠시 후/);
    expect(friendlyError({ message: "" })).toMatch(/잠시 후/);
  });
});

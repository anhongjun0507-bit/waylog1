import { describe, it, expect } from "vitest";
import { extractMentions, tokenizeMentions } from "./mentions.js";

describe("extractMentions", () => {
  it("returns empty for empty/invalid", () => {
    expect(extractMentions("")).toEqual([]);
    expect(extractMentions(null)).toEqual([]);
  });
  it("parses basic @mention", () => {
    expect(extractMentions("hi @alice")).toEqual(["alice"]);
  });
  it("parses Korean mention", () => {
    expect(extractMentions("@요리초보 좋아요")).toEqual(["요리초보"]);
  });
  it("dedupes repeats", () => {
    expect(extractMentions("@a @a @b")).toEqual(["a", "b"]);
  });
  it("stops at punctuation", () => {
    expect(extractMentions("ping @alice, 안녕")).toEqual(["alice"]);
  });
});

describe("tokenizeMentions", () => {
  it("splits text and mentions", () => {
    const tokens = tokenizeMentions("안녕 @철수 반가워");
    expect(tokens).toEqual([
      { type: "text", text: "안녕 " },
      { type: "mention", name: "철수" },
      { type: "text", text: " 반가워" },
    ]);
  });
});

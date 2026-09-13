import { describe, expect, it } from "vitest";
import { normalize, wordBoundaryRegex } from "./normalize";

describe("normalize", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalize("Donald  Trump!!")).toBe("donald trump");
  });
  it("collapses whitespace", () => {
    expect(normalize("  a   b  ")).toBe("a b");
  });
  it("NFKC folds unicode compatibility", () => {
    expect(normalize("ｄｏｎａｌｄ")).toBe("donald");
  });
  it("handles hyphens as separators", () => {
    expect(normalize("Donald-Trump")).toBe("donald trump");
  });
  it("empty in → empty out", () => {
    expect(normalize("")).toBe("");
  });
});

describe("wordBoundaryRegex", () => {
  const rx = wordBoundaryRegex("trump");
  it("matches standalone token", () => {
    expect(rx.test(normalize("Donald Trump won"))).toBe(true);
  });
  it("no match on substring", () => {
    expect(rx.test(normalize("trumpet festival"))).toBe(false);
  });
  it("matches at start", () => {
    expect(rx.test(normalize("trump today"))).toBe(true);
  });
  it("matches at end", () => {
    expect(rx.test(normalize("about trump"))).toBe(true);
  });
});

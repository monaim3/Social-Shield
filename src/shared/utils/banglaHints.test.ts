import { describe, expect, it } from "vitest";
import { isLatinName, suggestBanglaVariants } from "./banglaHints";

describe("suggestBanglaVariants", () => {
  it("Rashed Khan → 2 variants (khan has 2 spellings)", () => {
    const v = suggestBanglaVariants("Rashed Khan");
    expect(v).toContain("রাশেদ খান");
    expect(v).toContain("রাশেদ খাঁন");
    expect(v.length).toBe(2);
  });

  it("Md. Rashed Khan → still catches the pattern (dot stripped)", () => {
    const v = suggestBanglaVariants("Md. Rashed Khan");
    expect(v.length).toBeGreaterThan(0);
    expect(v[0]).toContain("রাশেদ");
    expect(v[0]).toContain("খান");
  });

  it("caps output at requested max", () => {
    // Ahmed × Rahman: Ahmed=2 forms, Rahman=2 → 4 combos, cap=3
    const v = suggestBanglaVariants("Ahmed Rahman", 3);
    expect(v.length).toBe(3);
  });

  it("empty input → []", () => {
    expect(suggestBanglaVariants("")).toEqual([]);
  });

  it("all unknown parts → [] (never garbage suggestions)", () => {
    expect(suggestBanglaVariants("Zzz Qqq")).toEqual([]);
  });

  it("mixed known + unknown → keeps unknown as-is", () => {
    const v = suggestBanglaVariants("Rashed Xylophone");
    expect(v[0]).toContain("রাশেদ");
    expect(v[0]).toContain("xylophone");
  });

  it("case insensitive", () => {
    const v = suggestBanglaVariants("RASHED KHAN");
    expect(v).toContain("রাশেদ খান");
  });

  it("no duplicates in output", () => {
    const v = suggestBanglaVariants("Ahmed Ahmed");
    const set = new Set(v);
    expect(set.size).toBe(v.length);
  });
});

describe("isLatinName", () => {
  it("true for English", () => {
    expect(isLatinName("Rashed Khan")).toBe(true);
  });
  it("false for pure Bangla", () => {
    expect(isLatinName("রাশেদ খান")).toBe(false);
  });
  it("true for mixed", () => {
    expect(isLatinName("রাশেদ Khan")).toBe(true);
  });
  it("false for empty", () => {
    expect(isLatinName("")).toBe(false);
  });
});

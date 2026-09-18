import { describe, expect, it } from "vitest";
import { nameVariants, normalize, stripBanglaVariations, wordBoundaryRegex } from "./normalize";

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

describe("stripBanglaVariations", () => {
  it("removes chandrabindu (ঁ)", () => {
    expect(stripBanglaVariations("খাঁন")).toBe("খান");
  });
  it("removes anusvara (ং)", () => {
    expect(stripBanglaVariations("বাংলা")).toBe("বালা");
  });
  it("leaves plain text unchanged", () => {
    expect(stripBanglaVariations("rashed khan")).toBe("rashed khan");
  });
});

describe("nameVariants", () => {
  it("includes concatenated form for multi-word English name", () => {
    const v = nameVariants("Rashed Khan");
    expect(v).toContain("rashed khan");
    expect(v).toContain("rashedkhan");
  });
  it("includes Bangla stripped form when name has chandrabindu", () => {
    const v = nameVariants("রাশেদ খাঁন");
    expect(v).toContain("রাশেদ খাঁন");
    expect(v).toContain("রাশেদ খান");
    expect(v).toContain("রাশেদখাঁন");
    expect(v).toContain("রাশেদখান");
  });
  it("single-word name yields one variant", () => {
    expect(nameVariants("Elon")).toEqual(["elon"]);
  });
  it("empty in → empty out", () => {
    expect(nameVariants("")).toEqual([]);
  });
});

describe("hashtag / Bangla-variant matching via wordBoundaryRegex + nameVariants", () => {
  const hasAny = (hay: string, term: string) => {
    const normHay = normalize(hay);
    const stripped = stripBanglaVariations(normHay);
    return nameVariants(term).some((v) => {
      const re = wordBoundaryRegex(v);
      return re.test(normHay) || (stripped !== normHay && re.test(stripped));
    });
  };

  it("matches hashtag concat: '#RashedKhan' vs 'Rashed Khan'", () => {
    expect(hasAny("#RashedKhan tonight", "Rashed Khan")).toBe(true);
  });
  it("matches bare concat: 'RashedKhan' vs 'Rashed Khan'", () => {
    expect(hasAny("RashedKhan won", "Rashed Khan")).toBe(true);
  });
  it("matches chandrabindu variant: 'রাশেদ খাঁন' vs 'রাশেদ খান'", () => {
    expect(hasAny("আজ রাশেদ খাঁন বললেন", "রাশেদ খান")).toBe(true);
  });
  it("matches reverse: needle has chandrabindu, hay doesn't", () => {
    expect(hasAny("রাশেদ খান বললেন", "রাশেদ খাঁন")).toBe(true);
  });
  it("no false positive: 'trumpet' vs 'trump'", () => {
    expect(hasAny("trumpet festival", "trump")).toBe(false);
  });
});

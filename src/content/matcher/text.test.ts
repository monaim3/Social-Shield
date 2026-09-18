import { describe, expect, it } from "vitest";
import { matchContextText, matchIdentityText, matchProfileText, prepareText } from "./text";
import type { BlockProfile } from "@shared/types/profile";
import {
  DEFAULT_CONTEXT_SIGNALS,
  DEFAULT_DETECTION_MODE,
  DEFAULT_PROFILE_SETTINGS,
  DEFAULT_THRESHOLDS,
} from "@shared/constants";

function profile(overrides: Partial<BlockProfile>): BlockProfile {
  return {
    id: "p1",
    name: "Rashed Khan",
    aliases: ["Md. Rashed Khan", "RK"],
    contextSignals: { ...DEFAULT_CONTEXT_SIGNALS, keywords: ["politician"], phrases: ["press conference"] },
    referenceImages: [],
    enabled: true,
    settings: DEFAULT_PROFILE_SETTINGS,
    thresholds: DEFAULT_THRESHOLDS,
    detectionMode: DEFAULT_DETECTION_MODE,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("matchIdentityText", () => {
  it("matches primary name", () => {
    const hits = matchIdentityText(profile({}), prepareText("Rashed Khan gave a speech."));
    expect(hits.some((h) => h.reason === "name" && h.category === "identity")).toBe(true);
  });

  it("matches alias", () => {
    const hits = matchIdentityText(profile({}), prepareText("RK posted again."));
    expect(hits.some((h) => h.reason === "alias" && h.term === "RK")).toBe(true);
  });

  it("returns empty when text matching disabled", () => {
    const hits = matchIdentityText(
      profile({ settings: { ...DEFAULT_PROFILE_SETTINGS, textMatching: false } }),
      prepareText("Rashed Khan"),
    );
    expect(hits.length).toBe(0);
  });

  it("no false positive on substring", () => {
    const hits = matchIdentityText(profile({ name: "Trump" }), prepareText("trumpet lesson"));
    expect(hits.length).toBe(0);
  });

  it("catches hashtag concatenation (#RashedKhan)", () => {
    const hits = matchIdentityText(profile({}), prepareText("Update from #RashedKhan today"));
    expect(hits.some((h) => h.reason === "name")).toBe(true);
  });

  it("catches Bangla chandrabindu variant (খাঁন vs খান)", () => {
    const p = profile({ name: "রাশেদ খান", aliases: [] });
    const hits = matchIdentityText(p, prepareText("আজ রাশেদ খাঁন বললেন"));
    expect(hits.some((h) => h.reason === "name")).toBe(true);
  });

  it("catches reverse: needle has chandrabindu, hay doesn't", () => {
    const p = profile({ name: "রাশেদ খাঁন", aliases: [] });
    const hits = matchIdentityText(p, prepareText("রাশেদ খান আজ বললেন"));
    expect(hits.some((h) => h.reason === "name")).toBe(true);
  });
});

describe("matchContextText", () => {
  it("matches keyword as whole word", () => {
    const hits = matchContextText(profile({}), prepareText("The politician spoke today."));
    expect(hits.some((h) => h.reason === "keyword" && h.category === "context")).toBe(true);
  });

  it("matches phrase as substring", () => {
    const hits = matchContextText(profile({}), prepareText("Held a press conference tuesday."));
    expect(hits.some((h) => h.reason === "phrase" && h.term === "press conference")).toBe(true);
  });

  it("no partial keyword unless opted in", () => {
    const p = profile({ contextSignals: { ...DEFAULT_CONTEXT_SIGNALS, keywords: ["vote"] } });
    expect(matchContextText(p, prepareText("voter turnout")).length).toBe(0);
    expect(matchContextText(p, prepareText("voter turnout"), true).some((h) => h.reason === "keywordPartial")).toBe(true);
  });

  it("returns empty when keyword matching disabled", () => {
    const p = profile({ settings: { ...DEFAULT_PROFILE_SETTINGS, keywordMatching: false } });
    expect(matchContextText(p, prepareText("politician press conference")).length).toBe(0);
  });
});

describe("matchProfileText (combined)", () => {
  it("combines identity + context hits", () => {
    const hits = matchProfileText(profile({}), prepareText("Rashed Khan, the politician."));
    const cats = hits.map((h) => h.category);
    expect(cats).toContain("identity");
    expect(cats).toContain("context");
  });
});

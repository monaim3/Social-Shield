import { describe, expect, it } from "vitest";
import { decide, evaluate, computeSignals } from "./decision";
import type { BlockProfile, DetectionMode } from "@shared/types/profile";
import type { MatchHit } from "@shared/types/match";
import {
  DEFAULT_CONTEXT_SIGNALS,
  DEFAULT_PROFILE_SETTINGS,
  DEFAULT_THRESHOLDS,
  SCORE_WEIGHTS,
} from "@shared/constants";

function mkProfile(mode: DetectionMode, threshold = 50): BlockProfile {
  return {
    id: "p1",
    name: "Rashed Khan",
    aliases: [],
    contextSignals: { ...DEFAULT_CONTEXT_SIGNALS },
    referenceImages: [],
    enabled: true,
    settings: DEFAULT_PROFILE_SETTINGS,
    thresholds: { ...DEFAULT_THRESHOLDS, overall: threshold },
    detectionMode: mode,
    createdAt: 0,
    updatedAt: 0,
  };
}

const nameHit: MatchHit = { reason: "name", category: "identity", score: SCORE_WEIGHTS.name };
const kwHit: MatchHit = { reason: "keyword", category: "context", score: SCORE_WEIGHTS.keyword };
const phraseHit: MatchHit = { reason: "phrase", category: "context", score: SCORE_WEIGHTS.phrase };
const imgHit: MatchHit = { reason: "image", category: "visual", score: SCORE_WEIGHTS.image };
const faceHit: MatchHit = { reason: "face", category: "visual", score: SCORE_WEIGHTS.face };
const ocrHit: MatchHit = { reason: "ocr", category: "ocr", score: SCORE_WEIGHTS.ocr };

describe("computeSignals", () => {
  it("flags every category that appears", () => {
    const s = computeSignals([nameHit, kwHit, imgHit, ocrHit]);
    expect(s).toEqual({ identity: true, context: true, visual: true, ocr: true });
  });
  it("empty hits → no signals", () => {
    expect(computeSignals([])).toEqual({
      identity: false,
      context: false,
      visual: false,
      ocr: false,
    });
  });
});

describe("decide — Balanced (default)", () => {
  const M: DetectionMode = "balanced";
  const T = 50;

  it("name alone → ambiguous (core spec requirement)", () => {
    const s = computeSignals([nameHit]);
    expect(decide(M, s, nameHit.score, T)).toBe("ambiguous");
  });

  it("name + context keyword → match", () => {
    const s = computeSignals([nameHit, kwHit]);
    expect(decide(M, s, nameHit.score + kwHit.score, T)).toBe("match");
  });

  it("image alone → match (strong visual)", () => {
    expect(decide(M, computeSignals([imgHit]), imgHit.score, T)).toBe("match");
  });

  it("face alone → match", () => {
    expect(decide(M, computeSignals([faceHit]), faceHit.score, T)).toBe("match");
  });

  it("context only → ambiguous", () => {
    expect(decide(M, computeSignals([kwHit]), kwHit.score, T)).toBe("ambiguous");
  });

  it("no signals → no_match", () => {
    expect(decide(M, computeSignals([]), 0, T)).toBe("no_match");
  });
});

describe("decide — Strict", () => {
  const M: DetectionMode = "strict";
  const T = 50;

  it("name + image → match", () => {
    expect(decide(M, computeSignals([nameHit, imgHit]), nameHit.score + imgHit.score, T)).toBe("match");
  });

  it("name + context (no visual) → ambiguous OR match depending on score/threshold", () => {
    // name + keyword score = 30 + 15 = 45 < 50 → ambiguous
    expect(decide(M, computeSignals([nameHit, kwHit]), nameHit.score + kwHit.score, T)).toBe("ambiguous");
    // name + phrase score = 30 + 20 = 50 >= 50 → match
    expect(decide(M, computeSignals([nameHit, phraseHit]), nameHit.score + phraseHit.score, T)).toBe("match");
  });

  it("image alone (no identity) → ambiguous", () => {
    expect(decide(M, computeSignals([imgHit]), imgHit.score, T)).toBe("ambiguous");
  });

  it("name alone → ambiguous", () => {
    expect(decide(M, computeSignals([nameHit]), nameHit.score, T)).toBe("ambiguous");
  });

  it("name + OCR → match", () => {
    expect(decide(M, computeSignals([nameHit, ocrHit]), nameHit.score + ocrHit.score, T)).toBe("match");
  });
});

describe("decide — Aggressive (legacy)", () => {
  const M: DetectionMode = "aggressive";
  const T = 50; // default threshold

  it("name alone → match (identity signal counts even under numeric threshold)", () => {
    // name weight (30) < threshold (50) but aggressive treats any identity signal as a match.
    expect(decide(M, computeSignals([nameHit]), nameHit.score, T)).toBe("match");
  });

  it("keyword alone → match", () => {
    expect(decide(M, computeSignals([kwHit]), kwHit.score, T)).toBe("match");
  });

  it("image/face always → match", () => {
    expect(decide(M, computeSignals([imgHit]), imgHit.score, T)).toBe("match");
    expect(decide(M, computeSignals([faceHit]), faceHit.score, T)).toBe("match");
  });
});

describe("evaluate", () => {
  it("dedupes identical reason+term keeping max score", () => {
    const p = mkProfile("balanced", 50);
    const r = evaluate(p, [
      { reason: "keyword", category: "context", score: 10, term: "vote" },
      { reason: "keyword", category: "context", score: 15, term: "vote" },
    ]);
    expect(r.hits.length).toBe(1);
    expect(r.score).toBe(15);
  });

  it("returns full MatchResult with signals + decision", () => {
    const p = mkProfile("balanced", 50);
    const r = evaluate(p, [nameHit, kwHit]);
    expect(r.decision).toBe("match");
    expect(r.signals.identity).toBe(true);
    expect(r.signals.context).toBe(true);
    expect(r.profileId).toBe("p1");
  });
});

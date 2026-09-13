export type MatchReason =
  | "name"
  | "alias"
  | "keyword"
  | "keywordPartial"
  | "phrase"
  | "ocr"
  | "image"
  | "face"
  | "context";

/**
 * Category a hit belongs to. Used to derive the signal-based decision.
 * - identity: name / alias — insufficient alone in Balanced / Strict modes
 * - context: keyword / phrase — disambiguates same-name people
 * - visual: image / face — strongest evidence
 * - ocr: name text found inside an image
 */
export type SignalCategory = "identity" | "context" | "visual" | "ocr";

export type MatchDecision = "match" | "no_match" | "ambiguous";

export interface MatchHit {
  reason: MatchReason;
  category: SignalCategory;
  score: number;
  term?: string;
  detail?: string;
}

export interface MatchSignals {
  identity: boolean;
  context: boolean;
  visual: boolean;
  ocr: boolean;
}

export interface MatchResult {
  decision: MatchDecision;
  score: number;
  hits: MatchHit[];
  signals: MatchSignals;
  profileId?: string;
  profileName?: string;
}

export function categoryFor(reason: MatchReason): SignalCategory {
  switch (reason) {
    case "name":
    case "alias":
      return "identity";
    case "keyword":
    case "keywordPartial":
    case "phrase":
    case "context":
      return "context";
    case "image":
    case "face":
      return "visual";
    case "ocr":
      return "ocr";
  }
}

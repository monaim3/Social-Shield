import type { BlockProfile } from "@shared/types/profile";
import type { MatchHit } from "@shared/types/match";
import { SCORE_WEIGHTS } from "@shared/constants";
import { normalize, wordBoundaryRegex } from "@shared/utils/normalize";

export interface TextMatchInput {
  normalized: string;
  raw: string;
}

export function prepareText(raw: string): TextMatchInput {
  return { raw, normalized: normalize(raw) };
}

/** Matches only identity signals (name + aliases). */
export function matchIdentityText(profile: BlockProfile, input: TextMatchInput): MatchHit[] {
  const hits: MatchHit[] = [];
  if (!input.normalized || !profile.settings.textMatching) return hits;

  if (containsAsWord(input.normalized, profile.name)) {
    hits.push({ reason: "name", category: "identity", score: SCORE_WEIGHTS.name, term: profile.name });
  }
  for (const alias of profile.aliases) {
    if (!alias) continue;
    if (containsAsWord(input.normalized, alias)) {
      hits.push({ reason: "alias", category: "identity", score: SCORE_WEIGHTS.alias, term: alias });
    }
  }
  return hits;
}

/** Matches only context signals (keywords + phrases). */
export function matchContextText(
  profile: BlockProfile,
  input: TextMatchInput,
  allowPartialKeyword = false,
): MatchHit[] {
  const hits: MatchHit[] = [];
  if (!input.normalized || !profile.settings.keywordMatching) return hits;

  for (const kw of profile.contextSignals.keywords) {
    if (!kw) continue;
    if (containsAsWord(input.normalized, kw)) {
      hits.push({ reason: "keyword", category: "context", score: SCORE_WEIGHTS.keyword, term: kw });
    } else if (allowPartialKeyword && containsSubstring(input.normalized, kw)) {
      hits.push({
        reason: "keywordPartial",
        category: "context",
        score: SCORE_WEIGHTS.keywordPartial,
        term: kw,
      });
    }
  }

  for (const phrase of profile.contextSignals.phrases) {
    if (!phrase) continue;
    if (containsSubstring(input.normalized, phrase)) {
      hits.push({ reason: "phrase", category: "context", score: SCORE_WEIGHTS.phrase, term: phrase });
    }
  }

  return hits;
}

/** Convenience: identity + context together. */
export function matchProfileText(
  profile: BlockProfile,
  input: TextMatchInput,
  allowPartialKeyword = false,
): MatchHit[] {
  return [
    ...matchIdentityText(profile, input),
    ...matchContextText(profile, input, allowPartialKeyword),
  ];
}

function containsAsWord(haystackNorm: string, needle: string): boolean {
  const n = normalize(needle);
  if (!n) return false;
  return wordBoundaryRegex(n).test(haystackNorm);
}

function containsSubstring(haystackNorm: string, needle: string): boolean {
  const n = normalize(needle);
  if (!n) return false;
  return haystackNorm.includes(n);
}

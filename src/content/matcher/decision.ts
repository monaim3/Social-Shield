import type { BlockProfile, DetectionMode } from "@shared/types/profile";
import type { MatchDecision, MatchHit, MatchResult, MatchSignals } from "@shared/types/match";

/**
 * Signal-based decision rules.
 *
 * Core principle: a name like "Rashed Khan" belongs to many people. Matching
 * it alone is NOT enough evidence in Balanced or Strict modes. Multiple
 * independent signals — identity + context, or a visual match — must line up
 * before we hide a post.
 */

export function computeSignals(hits: MatchHit[]): MatchSignals {
  const s: MatchSignals = { identity: false, context: false, visual: false, ocr: false };
  for (const h of hits) {
    s[h.category] = true;
  }
  return s;
}

export function anySignal(s: MatchSignals): boolean {
  return s.identity || s.context || s.visual || s.ocr;
}

export function decide(
  mode: DetectionMode,
  signals: MatchSignals,
  score: number,
  threshold: number,
): MatchDecision {
  if (!anySignal(signals)) return "no_match";

  switch (mode) {
    case "strict":
      return decideStrict(signals, score, threshold);
    case "balanced":
      return decideBalanced(signals, score, threshold);
    case "aggressive":
      return decideAggressive(signals, score, threshold);
  }
}

/**
 * Strict — require visual evidence, OR identity + strong non-identity backup.
 * Never trust identity alone. Prefer false negatives over false positives.
 */
function decideStrict(s: MatchSignals, score: number, threshold: number): MatchDecision {
  if (s.visual && (s.identity || s.context || s.ocr)) return "match";
  if (s.identity && s.ocr) return "match";
  if (s.identity && s.context && score >= threshold) return "match";
  if (s.identity || s.context || s.visual || s.ocr) return "ambiguous";
  return "no_match";
}

/**
 * Balanced (default) — allow identity + one non-identity signal; strong visual alone hides.
 * Identity-only or context-only is ambiguous.
 */
function decideBalanced(s: MatchSignals, score: number, threshold: number): MatchDecision {
  if (s.visual) return "match";
  if (s.identity && (s.context || s.ocr)) return "match";
  if (s.context && s.ocr) return "match";
  if (score >= threshold && countSignals(s) >= 2) return "match";
  if (s.identity || s.context || s.ocr) return "ambiguous";
  return "no_match";
}

/**
 * Aggressive — legacy behavior. Any real signal hides. Explicitly warned in
 * UI as false-positive-prone. Score threshold only gates weak partial hits.
 */
function decideAggressive(s: MatchSignals, score: number, threshold: number): MatchDecision {
  if (s.visual || s.ocr) return "match";
  if (s.identity || s.context) return "match";
  if (score >= threshold) return "match";
  if (anySignal(s)) return "ambiguous";
  return "no_match";
}

function countSignals(s: MatchSignals): number {
  let n = 0;
  if (s.identity) n++;
  if (s.context) n++;
  if (s.visual) n++;
  if (s.ocr) n++;
  return n;
}

export function evaluate(profile: BlockProfile, hits: MatchHit[]): MatchResult {
  // Dedupe identical hits keeping max score.
  const uniqueByKey = new Map<string, MatchHit>();
  for (const h of hits) {
    const key = `${h.reason}:${h.term ?? ""}`;
    const existing = uniqueByKey.get(key);
    if (!existing || existing.score < h.score) uniqueByKey.set(key, h);
  }
  const uniq = Array.from(uniqueByKey.values());
  const score = uniq.reduce((a, h) => a + h.score, 0);
  const signals = computeSignals(uniq);
  const decision = decide(profile.detectionMode, signals, score, profile.thresholds.overall);
  return {
    decision,
    score,
    hits: uniq,
    signals,
    profileId: profile.id,
    profileName: profile.name,
  };
}

import type { BlockProfile, GlobalSettings } from "@shared/types/profile";
import type { MatchHit, MatchResult } from "@shared/types/match";
import { matchContextText, matchIdentityText, prepareText } from "./text";
import { evaluate } from "./decision";
import { buildReferenceIndex, runImageMatching, type ReferenceHashIndex } from "./image";
import { buildFaceReferenceIndex, runFaceMatching } from "./face";
import type { FaceReference } from "@/ai/face/match";
import { recognizeImage } from "@/ai/ocr/service";
import { SCORE_WEIGHTS, ASYNC_CANDIDATE_MAX_IMAGES } from "@shared/constants";
import { log } from "@shared/utils/logger";

export interface PostSignals {
  text: string;
  images?: HTMLImageElement[];
}

export class MatchEngine {
  private referenceIndex: ReferenceHashIndex[] = [];
  private faceIndex: FaceReference[] = [];

  constructor(
    private profiles: BlockProfile[],
    private settings: GlobalSettings,
  ) {
    this.rebuildIndex();
  }

  setProfiles(p: BlockProfile[]): void {
    this.profiles = p;
    this.rebuildIndex();
  }

  setSettings(s: GlobalSettings): void {
    this.settings = s;
  }

  private rebuildIndex(): void {
    this.referenceIndex = buildReferenceIndex(this.profiles);
    this.faceIndex = buildFaceReferenceIndex(this.profiles);
  }

  /**
   * Synchronous text pass. Every profile is evaluated; the strongest result
   * across all profiles is returned. Decision may be "ambiguous" — callers
   * decide whether to hide on ambiguity via settings.hideAmbiguous.
   */
  evaluateText(signals: PostSignals): MatchResult | null {
    if (!this.settings.enabled) return null;
    if (!this.profiles.length) return null;

    const allowPartial = this.settings.processingLevel === "aggressive";
    const input = prepareText(signals.text);

    let best: MatchResult | null = null;
    for (const profile of this.profiles) {
      if (!profile.enabled) continue;
      const hits = [
        ...matchIdentityText(profile, input),
        ...matchContextText(profile, input, allowPartial),
      ];
      if (!hits.length) continue;
      const result = evaluate(profile, hits);
      if (result.decision === "no_match") continue;
      if (!best || rank(result) > rank(best)) best = result;
    }
    return best;
  }

  hasAsyncChecks(): boolean {
    if (!this.settings.enabled) return false;
    if (this.settings.detection.image && this.referenceIndex.length) return true;
    if (this.settings.detection.face && this.faceIndex.length) return true;
    if (this.settings.detection.ocr) {
      return this.profiles.some((p) => p.enabled && p.settings.ocrMatching);
    }
    return false;
  }

  /**
   * Async pass. Collects visual + OCR hits and re-evaluates alongside the sync
   * text hits so that identity+visual combinations trigger a "match" in
   * Balanced/Strict modes.
   */
  async evaluateAsync(signals: PostSignals): Promise<MatchResult | null> {
    if (!this.settings.enabled) return null;

    const allowPartial = this.settings.processingLevel === "aggressive";
    const input = prepareText(signals.text);

    // Per-profile async hit collection.
    const asyncHitsByProfile = new Map<string, MatchHit[]>();

    // --- Image similarity ---
    if (
      this.settings.detection.image &&
      this.referenceIndex.length &&
      signals.images?.length
    ) {
      try {
        const imgResult = await runImageMatching({
          images: signals.images,
          references: this.referenceIndex,
          threshold: this.settings.imageMatch.hammingThreshold,
          maxImages: ASYNC_CANDIDATE_MAX_IMAGES,
        });
        if (imgResult) push(asyncHitsByProfile, imgResult.profileId, imgResult.hit);
      } catch (e) {
        log.debug("image matcher error", e);
      }
    }

    // --- Face similarity ---
    if (
      this.settings.detection.face &&
      this.faceIndex.length &&
      signals.images?.length
    ) {
      try {
        const faceResult = await runFaceMatching({
          images: signals.images,
          references: this.faceIndex,
          threshold: this.settings.face.similarityThreshold,
          maxImages: ASYNC_CANDIDATE_MAX_IMAGES,
        });
        if (faceResult) push(asyncHitsByProfile, faceResult.profileId, faceResult.hit);
      } catch (e) {
        log.debug("face matcher error", e);
      }
    }

    // --- OCR ---
    if (this.settings.detection.ocr && signals.images?.length) {
      const ocrProfiles = this.profiles.filter((p) => p.enabled && p.settings.ocrMatching);
      if (ocrProfiles.length) {
        const texts = await this.runOcr(signals.images);
        if (texts.length) {
          const combined = texts.join(" \n ");
          const ocrInput = prepareText(combined);
          for (const profile of ocrProfiles) {
            // Identity terms found in OCR-recognized text are the whole point of OCR.
            const idHits = matchIdentityText(profile, ocrInput);
            for (const h of idHits) {
              push(asyncHitsByProfile, profile.id, {
                reason: "ocr",
                category: "ocr",
                score: SCORE_WEIGHTS.ocr,
                term: h.term,
                detail: `via OCR: ${h.reason}`,
              });
            }
          }
        }
      }
    }

    // Combine sync text hits + async hits per profile, evaluate, pick best.
    let best: MatchResult | null = null;
    for (const profile of this.profiles) {
      if (!profile.enabled) continue;
      const textHits = [
        ...matchIdentityText(profile, input),
        ...matchContextText(profile, input, allowPartial),
      ];
      const asyncHits = asyncHitsByProfile.get(profile.id) ?? [];
      if (!textHits.length && !asyncHits.length) continue;
      const result = evaluate(profile, [...textHits, ...asyncHits]);
      if (result.decision === "no_match") continue;
      if (!best || rank(result) > rank(best)) best = result;
    }
    return best;
  }

  private async runOcr(images: HTMLImageElement[]): Promise<string[]> {
    const slice = images.slice(0, ASYNC_CANDIDATE_MAX_IMAGES);
    const out: string[] = [];
    for (const img of slice) {
      try {
        const t = await recognizeImage(img, {
          maxImageDimension: this.settings.ocr.maxImageDimension,
        });
        if (t) out.push(t);
      } catch (e) {
        log.debug("ocr recognize failed", e);
      }
    }
    return out;
  }
}

/** "match" > "ambiguous" > "no_match"; ties broken by score. */
function rank(r: MatchResult): number {
  const base = r.decision === "match" ? 20000 : r.decision === "ambiguous" ? 10000 : 0;
  return base + r.score;
}

function push(map: Map<string, MatchHit[]>, key: string, hit: MatchHit): void {
  const list = map.get(key);
  if (list) list.push(hit);
  else map.set(key, [hit]);
}

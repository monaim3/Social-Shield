import type { BlockProfile } from "@shared/types/profile";
import type { MatchHit } from "@shared/types/match";
import { SCORE_WEIGHTS, ASYNC_CANDIDATE_MAX_IMAGES } from "@shared/constants";
import { extractFaceDescriptors, initFaceModels } from "@/ai/face/service";
import { matchBestFace, type FaceReference } from "@/ai/face/match";
import { log } from "@shared/utils/logger";

export interface FaceMatchInput {
  images: HTMLImageElement[];
  references: FaceReference[];
  threshold: number;
  maxImages: number;
}

export interface FaceMatchResult {
  profileId: string;
  hit: MatchHit;
}

export function buildFaceReferenceIndex(profiles: BlockProfile[]): FaceReference[] {
  const out: FaceReference[] = [];
  for (const p of profiles) {
    if (!p.enabled || !p.settings.faceMatching) continue;
    for (const r of p.referenceImages) {
      if (r.embedding && r.embedding.length > 0) {
        out.push({ embedding: r.embedding, profileId: p.id, refImageId: r.id });
      }
    }
  }
  return out;
}

export async function runFaceMatching(input: FaceMatchInput): Promise<FaceMatchResult | null> {
  if (!input.references.length || !input.images.length) return null;
  const ready = await initFaceModels();
  if (!ready) return null;

  const slice = input.images.slice(0, input.maxImages || ASYNC_CANDIDATE_MAX_IMAGES);
  for (const img of slice) {
    if (!img.complete || img.naturalWidth === 0) continue;
    try {
      const faces = await extractFaceDescriptors({ source: img });
      for (const face of faces) {
        const hit = matchBestFace(face.descriptor, input.references, input.threshold);
        if (hit) {
          return {
            profileId: hit.profileId,
            hit: {
              reason: "face",
              category: "visual",
              score: SCORE_WEIGHTS.face,
              detail: `sim=${hit.similarity.toFixed(3)}`,
            },
          };
        }
      }
    } catch (e) {
      log.debug("face extract failed", e);
    }
  }
  return null;
}

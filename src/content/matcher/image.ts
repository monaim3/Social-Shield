import type { BlockProfile } from "@shared/types/profile";
import type { MatchHit } from "@shared/types/match";
import { SCORE_WEIGHTS, IMAGE_HASH_CACHE_MAX } from "@shared/constants";
import { hammingDistance, type PHash } from "@/ai/image/phash";
import { computePHashViaWorker } from "@/ai/image/pipeline";
import { log } from "@shared/utils/logger";

export interface ReferenceHashIndex {
  hash: PHash;
  profileId: string;
  refImageId: string;
}

/** LRU-ish cache keyed by image src. Trimmed when it grows past the cap. */
const hashCache = new Map<string, PHash | null>();

function cacheGet(key: string): PHash | null | undefined {
  const v = hashCache.get(key);
  if (v !== undefined) {
    hashCache.delete(key);
    hashCache.set(key, v);
  }
  return v;
}

function cacheSet(key: string, value: PHash | null): void {
  hashCache.set(key, value);
  if (hashCache.size > IMAGE_HASH_CACHE_MAX) {
    const first = hashCache.keys().next().value;
    if (first !== undefined) hashCache.delete(first);
  }
}

export function buildReferenceIndex(profiles: BlockProfile[]): ReferenceHashIndex[] {
  const out: ReferenceHashIndex[] = [];
  for (const p of profiles) {
    if (!p.enabled || !p.settings.imageMatching) continue;
    for (const r of p.referenceImages) {
      if (r.perceptualHash) out.push({ hash: r.perceptualHash, profileId: p.id, refImageId: r.id });
    }
  }
  return out;
}

export async function hashImageElement(img: HTMLImageElement): Promise<PHash | null> {
  const key = img.currentSrc || img.src;
  if (!key) return null;
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  try {
    // Prefer loading the actual <img> directly — same-origin or CORS-clean will work.
    if (img.complete && img.naturalWidth > 0) {
      const hash = await computePHashViaWorker(img);
      cacheSet(key, hash);
      return hash;
    }
    // Fall back to fetch (needs host permission on the image origin).
    const hash = await computePHashViaWorker(key);
    cacheSet(key, hash);
    return hash;
  } catch (e) {
    log.debug("hashImage failed", key, e);
    cacheSet(key, null);
    return null;
  }
}

export function matchAgainstReferences(
  postHash: PHash,
  refs: ReferenceHashIndex[],
  threshold: number,
): { profileId: string; distance: number; refImageId: string } | null {
  let best: { profileId: string; distance: number; refImageId: string } | null = null;
  for (const ref of refs) {
    const d = hammingDistance(postHash, ref.hash);
    if (d <= threshold && (!best || d < best.distance)) {
      best = { profileId: ref.profileId, distance: d, refImageId: ref.refImageId };
    }
  }
  return best;
}

export interface ImageMatchInput {
  images: HTMLImageElement[];
  references: ReferenceHashIndex[];
  threshold: number;
  maxImages: number;
}

export interface ImageMatchResult {
  profileId: string;
  hit: MatchHit;
}

export async function runImageMatching(input: ImageMatchInput): Promise<ImageMatchResult | null> {
  if (!input.references.length || !input.images.length) return null;
  const list = input.images.slice(0, input.maxImages);
  for (const img of list) {
    const hash = await hashImageElement(img);
    if (!hash) continue;
    const hit = matchAgainstReferences(hash, input.references, input.threshold);
    if (hit) {
      return {
        profileId: hit.profileId,
        hit: {
          reason: "image",
          category: "visual",
          score: SCORE_WEIGHTS.image,
          detail: `distance=${hit.distance}`,
        },
      };
    }
  }
  return null;
}

/** Test hook. */
export function _clearHashCache(): void {
  hashCache.clear();
}

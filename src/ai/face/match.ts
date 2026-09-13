/**
 * Face similarity via cosine similarity between L2-normalized 128-d descriptors.
 *
 * face-api descriptors are already ~L2-normalized; cosine ≈ dot product.
 * A cosine of 1.0 = identical direction, 0.0 = orthogonal.
 * Empirically: same-person pairs > 0.60, different-person pairs < 0.40.
 */

export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * face-api convention uses Euclidean distance with threshold ~0.6.
 * Provided for reference; we use cosine everywhere else.
 */
export function euclideanDistance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

export interface FaceReference {
  embedding: number[];
  profileId: string;
  refImageId: string;
}

export interface FaceMatchHit {
  profileId: string;
  refImageId: string;
  similarity: number;
}

export function matchBestFace(
  postEmbedding: ArrayLike<number>,
  refs: FaceReference[],
  threshold: number,
): FaceMatchHit | null {
  let best: FaceMatchHit | null = null;
  for (const ref of refs) {
    const sim = cosineSimilarity(postEmbedding, ref.embedding);
    if (sim >= threshold && (!best || sim > best.similarity)) {
      best = { profileId: ref.profileId, refImageId: ref.refImageId, similarity: sim };
    }
  }
  return best;
}

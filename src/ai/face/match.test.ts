import { describe, expect, it } from "vitest";
import { cosineSimilarity, euclideanDistance, matchBestFace, type FaceReference } from "./match";

const v = (arr: number[]) => arr;

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity(v([1, 2, 3]), v([1, 2, 3]))).toBeCloseTo(1);
  });
  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity(v([1, 0]), v([-1, 0]))).toBeCloseTo(-1);
  });
  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity(v([1, 0]), v([0, 1]))).toBeCloseTo(0);
  });
  it("returns 0 on length mismatch", () => {
    expect(cosineSimilarity(v([1, 2]), v([1]))).toBe(0);
  });
  it("returns 0 for zero vector", () => {
    expect(cosineSimilarity(v([0, 0]), v([1, 0]))).toBe(0);
  });
});

describe("euclideanDistance", () => {
  it("0 for identical", () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });
  it("basic case", () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
  });
});

describe("matchBestFace", () => {
  const refs: FaceReference[] = [
    { embedding: [1, 0, 0], profileId: "p1", refImageId: "r1" },
    { embedding: [0, 1, 0], profileId: "p2", refImageId: "r2" },
  ];

  it("returns highest-similarity match above threshold", () => {
    const hit = matchBestFace([0.9, 0.1, 0], refs, 0.6);
    expect(hit?.profileId).toBe("p1");
    expect(hit?.similarity).toBeGreaterThan(0.9);
  });

  it("returns null when below threshold", () => {
    expect(matchBestFace([0.5, 0.5, 0.7], refs, 0.9)).toBeNull();
  });

  it("picks best among multiple candidates", () => {
    const hit = matchBestFace([0.5, 0.5, 0], refs, 0.5);
    // Both refs have sim ~0.707; ties → first match wins.
    expect(hit).not.toBeNull();
    expect(["p1", "p2"]).toContain(hit?.profileId);
  });
});

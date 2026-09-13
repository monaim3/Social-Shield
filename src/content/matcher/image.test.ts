import { describe, expect, it } from "vitest";
import { buildReferenceIndex, matchAgainstReferences } from "./image";
import type { BlockProfile } from "@shared/types/profile";
import {
  DEFAULT_CONTEXT_SIGNALS,
  DEFAULT_DETECTION_MODE,
  DEFAULT_PROFILE_SETTINGS,
  DEFAULT_THRESHOLDS,
} from "@shared/constants";

function makeProfile(over: Partial<BlockProfile>): BlockProfile {
  return {
    id: "p1",
    name: "X",
    aliases: [],
    contextSignals: { ...DEFAULT_CONTEXT_SIGNALS },
    referenceImages: [],
    enabled: true,
    settings: { ...DEFAULT_PROFILE_SETTINGS, imageMatching: true },
    thresholds: DEFAULT_THRESHOLDS,
    detectionMode: DEFAULT_DETECTION_MODE,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

describe("buildReferenceIndex", () => {
  it("collects hashes from image-enabled profiles only", () => {
    const idx = buildReferenceIndex([
      makeProfile({
        id: "p1",
        referenceImages: [
          { id: "r1", profileId: "p1", mime: "image/png", size: 1, createdAt: 0, perceptualHash: "aaaa" },
          { id: "r2", profileId: "p1", mime: "image/png", size: 1, createdAt: 0 }, // no hash
        ],
      }),
      makeProfile({
        id: "p2",
        settings: { ...DEFAULT_PROFILE_SETTINGS, imageMatching: false },
        referenceImages: [
          { id: "r3", profileId: "p2", mime: "image/png", size: 1, createdAt: 0, perceptualHash: "bbbb" },
        ],
      }),
    ]);
    expect(idx).toHaveLength(1);
    expect(idx[0]).toMatchObject({ hash: "aaaa", profileId: "p1", refImageId: "r1" });
  });

  it("skips disabled profiles", () => {
    const idx = buildReferenceIndex([
      makeProfile({
        enabled: false,
        referenceImages: [{ id: "r1", profileId: "p1", mime: "image/png", size: 1, createdAt: 0, perceptualHash: "aaaa" }],
      }),
    ]);
    expect(idx).toHaveLength(0);
  });
});

describe("matchAgainstReferences", () => {
  const refs = [
    { hash: "ffffffffffffffff", profileId: "p1", refImageId: "r1" },
    { hash: "0000000000000000", profileId: "p2", refImageId: "r2" },
  ];

  it("returns match when within threshold", () => {
    const hit = matchAgainstReferences("fffffffffffffffe", refs, 5);
    expect(hit).toMatchObject({ profileId: "p1", distance: 1 });
  });

  it("null when outside threshold", () => {
    expect(matchAgainstReferences("f0f0f0f0f0f0f0f0", refs, 5)).toBeNull();
  });

  it("picks nearest reference", () => {
    const hit = matchAgainstReferences("00000000000000ff", refs, 20);
    expect(hit?.profileId).toBe("p2");
  });
});

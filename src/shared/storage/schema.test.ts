import { describe, expect, it } from "vitest";
import { ensureProfileV2, migrateProfileV1toV2 } from "./schema";

describe("migrateProfileV1toV2", () => {
  it("single-signal (name only) → aggressive to preserve prior hide behavior", () => {
    const v2 = migrateProfileV1toV2({
      id: "p1",
      name: "Rashed Khan",
      aliases: [],
      keywords: [],
      referenceImages: [],
    });
    expect(v2.detectionMode).toBe("aggressive");
    expect(v2.contextSignals).toEqual({ keywords: [], phrases: [] });
  });

  it("multi-signal (name + keywords) → balanced", () => {
    const v2 = migrateProfileV1toV2({
      id: "p1",
      name: "Rashed Khan",
      aliases: ["RK"],
      keywords: ["politician"],
      referenceImages: [],
    });
    expect(v2.detectionMode).toBe("balanced");
    expect(v2.contextSignals.keywords).toEqual(["politician"]);
  });

  it("multi-signal (name + ref image) → balanced", () => {
    const v2 = migrateProfileV1toV2({
      id: "p1",
      name: "X",
      keywords: [],
      referenceImages: [{ id: "r1" } as unknown as never],
    });
    expect(v2.detectionMode).toBe("balanced");
  });

  it("moves v1 keywords into contextSignals.keywords", () => {
    const v2 = migrateProfileV1toV2({
      id: "p1",
      name: "X",
      keywords: ["a", "b"],
    });
    expect(v2.contextSignals.keywords).toEqual(["a", "b"]);
    expect(v2.contextSignals.phrases).toEqual([]);
  });

  it("preserves aliases", () => {
    const v2 = migrateProfileV1toV2({
      id: "p1",
      name: "X",
      aliases: ["Y", "Z"],
    });
    expect(v2.aliases).toEqual(["Y", "Z"]);
  });
});

describe("ensureProfileV2", () => {
  it("returns v2 profile as-is", () => {
    const v2 = {
      id: "p1",
      name: "X",
      aliases: [],
      contextSignals: { keywords: [], phrases: [] },
      referenceImages: [],
      enabled: true,
      settings: {
        textMatching: true,
        keywordMatching: true,
        ocrMatching: false,
        imageMatching: false,
        faceMatching: false,
      },
      thresholds: { overall: 50, image: 70, face: 75 },
      detectionMode: "balanced" as const,
      createdAt: 0,
      updatedAt: 0,
    };
    expect(ensureProfileV2(v2).detectionMode).toBe("balanced");
  });

  it("migrates a v1-looking profile", () => {
    const v1 = { id: "p1", name: "X", keywords: ["k"] };
    const v2 = ensureProfileV2(v1);
    expect(v2.contextSignals.keywords).toEqual(["k"]);
    expect(v2.detectionMode).toBe("balanced"); // has a signal
  });
});

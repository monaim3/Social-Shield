// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { attachBinaries, buildExport, mergeProfiles, parseImport, restoreBinaries } from "./importExport";
import { ImagesDB } from "./imagesDB";
import {
  DEFAULT_CONTEXT_SIGNALS,
  DEFAULT_DETECTION_MODE,
  DEFAULT_PROFILE_SETTINGS,
  DEFAULT_THRESHOLDS,
} from "../constants";
import type { BlockProfile } from "../types/profile";

function p(id: string, name = id): BlockProfile {
  return {
    id,
    name,
    aliases: [],
    contextSignals: { ...DEFAULT_CONTEXT_SIGNALS },
    referenceImages: [
      {
        id: "r1",
        profileId: id,
        name: "ref",
        mime: "image/png",
        size: 1024,
        createdAt: 0,
        perceptualHash: "abc",
        thumbnail: "data:...",
        embedding: [1, 2],
      },
    ],
    enabled: true,
    settings: DEFAULT_PROFILE_SETTINGS,
    thresholds: DEFAULT_THRESHOLDS,
    detectionMode: DEFAULT_DETECTION_MODE,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("buildExport", () => {
  it("strips binary image fields", () => {
    const b = buildExport([p("1")]);
    const ri = b.profiles[0].referenceImages[0];
    expect(ri.id).toBe("r1");
    expect(ri.perceptualHash).toBe("abc");
    expect((ri as unknown as { thumbnail?: string }).thumbnail).toBeUndefined();
    expect((ri as unknown as { embedding?: number[] }).embedding).toBeUndefined();
  });

  it("includes settings only when requested", () => {
    const s = { enabled: true } as unknown as import("../types/profile").GlobalSettings;
    expect(buildExport([], s, false).settings).toBeUndefined();
    expect(buildExport([], s, true).settings).toBeDefined();
  });
});

describe("parseImport", () => {
  it("rejects invalid JSON", () => {
    const r = parseImport("not json");
    expect(r.ok).toBe(false);
  });
  it("rejects wrong format tag", () => {
    const r = parseImport(JSON.stringify({ format: "other", version: 1, profiles: [] }));
    expect(r.ok).toBe(false);
  });
  it("accepts valid bundle", () => {
    const bundle = buildExport([p("a")]);
    const r = parseImport(JSON.stringify(bundle));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bundle.profiles).toHaveLength(1);
  });
});

describe("attachBinaries + restoreBinaries", () => {
  beforeEach(async () => {
    await ImagesDB._reset();
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase("socialshield");
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  });

  it("round-trips profile binaries through export/import", async () => {
    const profile = p("prof1");
    const blob = new Blob(["hello"], { type: "image/png" });
    await ImagesDB.put({
      id: profile.referenceImages[0].id,
      profileId: profile.id,
      mime: "image/png",
      size: blob.size,
      createdAt: 0,
      perceptualHash: "abc",
      blob,
    });

    const bundle = buildExport([profile]);
    const withBinaries = await attachBinaries(bundle, [profile]);
    expect(withBinaries.binaries).toHaveLength(1);
    expect(withBinaries.binaries?.[0].base64).toBeTruthy();

    // Wipe and restore.
    await ImagesDB.delete(profile.referenceImages[0].id);
    const written = await restoreBinaries(withBinaries);
    expect(written).toBe(1);
    const restored = await ImagesDB.get(profile.referenceImages[0].id);
    expect(restored?.mime).toBe("image/png");
    expect(restored?.perceptualHash).toBe("abc");
  });

  it("no-op when bundle has no binaries", async () => {
    const bundle = buildExport([p("x")]);
    const restored = await restoreBinaries(bundle);
    expect(restored).toBe(0);
  });
});

describe("mergeProfiles", () => {
  it("replace strategy overwrites", () => {
    const out = mergeProfiles([p("a")], [p("b")], "replace");
    expect(out.map((x) => x.id)).toEqual(["b"]);
  });
  it("merge strategy dedupes by id, incoming wins", () => {
    const existing = [p("a", "old"), p("b")];
    const incoming = [p("a", "new"), p("c")];
    const out = mergeProfiles(existing, incoming, "merge");
    expect(out).toHaveLength(3);
    expect(out.find((x) => x.id === "a")?.name).toBe("new");
  });
});

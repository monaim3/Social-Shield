import { describe, expect, it } from "vitest";
import { StorageService } from "./StorageService";
import { DEFAULT_SETTINGS, SCHEMA_VERSION, STORAGE_KEYS } from "../constants";

describe("StorageService", () => {
  it("initializes with defaults on first run", async () => {
    // reset internal init flag
    (StorageService as unknown as { initialized: boolean }).initialized = false;
    await StorageService.init();
    const raw = await chrome.storage.local.get([
      STORAGE_KEYS.version,
      STORAGE_KEYS.profiles,
      STORAGE_KEYS.settings,
    ]);
    expect(raw[STORAGE_KEYS.version]).toBe(SCHEMA_VERSION);
    expect(raw[STORAGE_KEYS.profiles]).toEqual([]);
    expect(raw[STORAGE_KEYS.settings]).toEqual(DEFAULT_SETTINGS);
  });

  it("saves and reads profiles", async () => {
    (StorageService as unknown as { initialized: boolean }).initialized = false;
    await StorageService.init();
    await StorageService.saveProfiles([
      {
        id: "p1",
        name: "test",
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
        thresholds: { image: 70, face: 75, overall: 60 },
        detectionMode: "balanced",
        createdAt: 0,
        updatedAt: 0,
      },
    ]);
    const list = await StorageService.getProfiles();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("test");
  });
});

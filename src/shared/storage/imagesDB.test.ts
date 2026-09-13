import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { ImagesDB } from "./imagesDB";

beforeEach(async () => {
  await ImagesDB._reset();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase("socialshield");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

describe("ImagesDB", () => {
  it("put + get round-trips a reference image", async () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    await ImagesDB.put({
      id: "r1",
      profileId: "p1",
      name: "test.png",
      mime: "image/png",
      size: blob.size,
      createdAt: 0,
      perceptualHash: "abcdef0123456789",
      blob,
    });
    const got = await ImagesDB.get("r1");
    expect(got?.id).toBe("r1");
    expect(got?.perceptualHash).toBe("abcdef0123456789");
    expect(got?.mime).toBe("image/png");
    expect(got?.blob).toBeDefined();
  });

  it("byProfile returns only that profile's images", async () => {
    const blob = new Blob(["x"]);
    await ImagesDB.put({ id: "a", profileId: "p1", mime: "image/png", size: 1, createdAt: 0, blob });
    await ImagesDB.put({ id: "b", profileId: "p1", mime: "image/png", size: 1, createdAt: 0, blob });
    await ImagesDB.put({ id: "c", profileId: "p2", mime: "image/png", size: 1, createdAt: 0, blob });
    const p1 = await ImagesDB.byProfile("p1");
    expect(p1.map((r) => r.id).sort()).toEqual(["a", "b"]);
  });

  it("deleteByProfile removes all images for a profile", async () => {
    const blob = new Blob(["x"]);
    await ImagesDB.put({ id: "a", profileId: "p1", mime: "image/png", size: 1, createdAt: 0, blob });
    await ImagesDB.put({ id: "b", profileId: "p1", mime: "image/png", size: 1, createdAt: 0, blob });
    await ImagesDB.deleteByProfile("p1");
    expect(await ImagesDB.byProfile("p1")).toEqual([]);
  });
});

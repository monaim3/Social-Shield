import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { HistoryDB, todayKey, dayKeyOffset, type MatchEvent } from "./historyDB";

const NOW = new Date("2026-03-15T10:00:00Z");

function ev(id: string, overrides: Partial<MatchEvent> = {}): MatchEvent {
  return {
    id,
    profileId: "p1",
    profileName: "P1",
    reason: "name",
    platform: "facebook",
    day: todayKey(NOW),
    createdAt: NOW.getTime(),
    ...overrides,
  };
}

beforeEach(async () => {
  await HistoryDB._reset();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase("socialshield-history");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

describe("HistoryDB", () => {
  it("record + count", async () => {
    await HistoryDB.record(ev("a"));
    expect(await HistoryDB.count()).toBe(1);
  });

  it("recordMany batches into a single tx", async () => {
    await HistoryDB.recordMany([ev("a"), ev("b"), ev("c")]);
    expect(await HistoryDB.count()).toBe(3);
  });

  it("sinceDay returns only recent events", async () => {
    await HistoryDB.recordMany([
      ev("old", { day: dayKeyOffset(60, NOW) }),
      ev("mid", { day: dayKeyOffset(10, NOW) }),
      ev("new", { day: dayKeyOffset(1, NOW) }),
    ]);
    const cutoff = dayKeyOffset(30, NOW);
    const got = await HistoryDB.sinceDay(cutoff);
    expect(got.map((e) => e.id).sort()).toEqual(["mid", "new"]);
  });

  it("pruneOlderThan removes older events", async () => {
    await HistoryDB.recordMany([
      ev("old1", { day: "2020-01-01" }),
      ev("old2", { day: "2020-06-01" }),
      ev("keep", { day: "2026-03-15" }),
    ]);
    const removed = await HistoryDB.pruneOlderThan("2025-01-01");
    expect(removed).toBe(2);
    expect(await HistoryDB.count()).toBe(1);
  });

  it("clearAll empties store", async () => {
    await HistoryDB.recordMany([ev("a"), ev("b")]);
    await HistoryDB.clearAll();
    expect(await HistoryDB.count()).toBe(0);
  });
});

describe("todayKey / dayKeyOffset", () => {
  it("formats YYYY-MM-DD zero-padded", () => {
    expect(todayKey(new Date("2026-01-05T15:00:00"))).toBe("2026-01-05");
    expect(todayKey(new Date("2026-12-31T15:00:00"))).toBe("2026-12-31");
  });
  it("dayKeyOffset subtracts days correctly", () => {
    const ref = new Date("2026-03-15T15:00:00");
    expect(dayKeyOffset(0, ref)).toBe("2026-03-15");
    expect(dayKeyOffset(14, ref)).toBe("2026-03-01");
    expect(dayKeyOffset(30, ref)).toBe("2026-02-13");
  });
});

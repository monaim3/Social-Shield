import { describe, expect, it } from "vitest";
import { aggregate, topN } from "./aggregate";
import type { MatchEvent } from "../storage/historyDB";

function ev(o: Partial<MatchEvent>): MatchEvent {
  return {
    id: Math.random().toString(),
    profileId: "p1",
    profileName: "P1",
    reason: "name",
    platform: "facebook",
    day: "2026-03-15",
    createdAt: 0,
    ...o,
  };
}

describe("aggregate", () => {
  it("empty input → zero totals", () => {
    const s = aggregate([]);
    expect(s.total).toBe(0);
    expect(s.byReason.name).toBe(0);
    expect(s.byPlatform.facebook).toBe(0);
  });

  it("counts by dimension", () => {
    const s = aggregate([
      ev({ profileId: "a", profileName: "A", reason: "name", platform: "facebook", day: "2026-03-15" }),
      ev({ profileId: "a", profileName: "A", reason: "keyword", platform: "x", day: "2026-03-15" }),
      ev({ profileId: "b", profileName: "B", reason: "image", platform: "youtube", day: "2026-03-14" }),
    ]);
    expect(s.total).toBe(3);
    expect(s.byProfile["a"].count).toBe(2);
    expect(s.byProfile["b"].count).toBe(1);
    expect(s.byReason.name).toBe(1);
    expect(s.byReason.keyword).toBe(1);
    expect(s.byReason.image).toBe(1);
    expect(s.byPlatform.facebook).toBe(1);
    expect(s.byPlatform.x).toBe(1);
    expect(s.byPlatform.youtube).toBe(1);
    expect(s.byDay["2026-03-15"]).toBe(2);
    expect(s.byDay["2026-03-14"]).toBe(1);
  });

  it("carries latest profileName seen", () => {
    const s = aggregate([
      ev({ profileId: "x", profileName: "Old" }),
      ev({ profileId: "x", profileName: "New" }),
    ]);
    expect(s.byProfile["x"].name).toBe("New");
  });
});

describe("topN", () => {
  it("returns highest N by value", () => {
    const out = topN({ a: 1, b: 5, c: 3, d: 4 }, (n) => n, 2);
    expect(out.map(([k]) => k)).toEqual(["b", "d"]);
  });
});

import type { MatchEvent } from "../storage/historyDB";
import type { MatchReason } from "../types/match";
import type { PlatformKey } from "@/content/platforms/registry";

export interface HistoryStats {
  total: number;
  byProfile: Record<string, { name: string; count: number }>;
  byReason: Record<MatchReason, number>;
  byPlatform: Record<PlatformKey, number>;
  byDay: Record<string, number>;
}

const EMPTY_REASONS: Record<MatchReason, number> = {
  name: 0,
  alias: 0,
  keyword: 0,
  keywordPartial: 0,
  phrase: 0,
  ocr: 0,
  image: 0,
  face: 0,
  context: 0,
};

const EMPTY_PLATFORMS: Record<PlatformKey, number> = {
  facebook: 0,
  x: 0,
  youtube: 0,
  instagram: 0,
};

export function aggregate(events: MatchEvent[]): HistoryStats {
  const stats: HistoryStats = {
    total: events.length,
    byProfile: {},
    byReason: { ...EMPTY_REASONS },
    byPlatform: { ...EMPTY_PLATFORMS },
    byDay: {},
  };
  for (const e of events) {
    const p = stats.byProfile[e.profileId] ?? { name: e.profileName, count: 0 };
    p.count++;
    p.name = e.profileName;
    stats.byProfile[e.profileId] = p;
    stats.byReason[e.reason] = (stats.byReason[e.reason] ?? 0) + 1;
    stats.byPlatform[e.platform] = (stats.byPlatform[e.platform] ?? 0) + 1;
    stats.byDay[e.day] = (stats.byDay[e.day] ?? 0) + 1;
  }
  return stats;
}

export function topN<T>(record: Record<string, T>, valueFn: (v: T) => number, n = 5): Array<[string, T]> {
  return Object.entries(record)
    .sort(([, a], [, b]) => valueFn(b) - valueFn(a))
    .slice(0, n);
}

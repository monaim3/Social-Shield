import { useEffect, useState, useCallback } from "react";
import { HistoryDB, dayKeyOffset } from "@shared/storage/historyDB";
import { aggregate, topN, type HistoryStats } from "@shared/history/aggregate";
import type { GlobalSettings } from "@shared/types/profile";

type Range = 1 | 7 | 30;

interface Props {
  settings: GlobalSettings;
  onUpdateSettings: (patch: Partial<GlobalSettings>) => Promise<void>;
}

export default function HistoryPanel({ settings, onUpdateSettings }: Props) {
  const [range, setRange] = useState<Range>(7);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const cutoff = dayKeyOffset(range - 1);
      const events = await HistoryDB.sinceDay(cutoff);
      setStats(aggregate(events));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function clearAll() {
    if (!confirm("Delete all match history?")) return;
    await HistoryDB.clearAll();
    await reload();
  }

  const total = stats?.total ?? 0;
  const platformRows = stats
    ? topN(stats.byPlatform, (v) => v, 4).filter(([, v]) => v > 0)
    : [];
  const reasonRows = stats
    ? topN(stats.byReason, (v) => v, 8).filter(([, v]) => v > 0)
    : [];
  const profileRows = stats
    ? topN(stats.byProfile, (v) => v.count, 10).filter(([, v]) => v.count > 0)
    : [];

  return (
    <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Match History</h2>
        <div className="flex items-center gap-2 text-sm">
          <RangeBtn cur={range} val={1} onClick={setRange}>
            Today
          </RangeBtn>
          <RangeBtn cur={range} val={7} onClick={setRange}>
            7 days
          </RangeBtn>
          <RangeBtn cur={range} val={30} onClick={setRange}>
            30 days
          </RangeBtn>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.history.enabled}
            onChange={(e) =>
              void onUpdateSettings({
                history: { ...settings.history, enabled: e.target.checked },
              })
            }
          />
          Record match events
        </label>
        <label className="text-sm flex items-center gap-2">
          Retention:
          <select
            value={settings.history.retentionDays}
            onChange={(e) =>
              void onUpdateSettings({
                history: {
                  ...settings.history,
                  retentionDays: Number(e.target.value),
                },
              })
            }
            className="border border-slate-200 rounded px-2 py-1 text-sm"
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </label>
        <button
          onClick={() => void clearAll()}
          className="text-xs px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 ml-auto"
        >
          Clear history
        </button>
      </div>

      <div className="text-xs text-slate-500">
        Stored locally in IndexedDB. Records profile / reason / platform / day only —
        no URLs, no post content.
      </div>

      {loading ? (
        <div className="text-sm text-slate-500 py-8 text-center">Loading…</div>
      ) : total === 0 ? (
        <div className="text-sm text-slate-500 py-8 text-center border border-dashed rounded">
          No matches in this range.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="text-3xl font-bold">{total.toLocaleString()} <span className="text-sm font-normal text-slate-500">hidden</span></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Breakdown title="By platform" rows={platformRows.map(([k, v]) => [k, v as number])} total={total} />
            <Breakdown title="By reason" rows={reasonRows.map(([k, v]) => [k, v as number])} total={total} />
            <Breakdown
              title="Top profiles"
              rows={profileRows.map(([, v]) => {
                const p = v as { name: string; count: number };
                return [p.name, p.count];
              })}
              total={total}
            />
          </div>

          {stats && Object.keys(stats.byDay).length > 1 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">By day</h3>
              <DayBars byDay={stats.byDay} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function RangeBtn({
  cur,
  val,
  onClick,
  children,
}: {
  cur: Range;
  val: Range;
  onClick: (v: Range) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onClick(val)}
      className={`px-2 py-1 rounded ${
        cur === val ? "bg-brand text-white" : "border border-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Breakdown({ title, rows, total }: { title: string; rows: Array<[string, number]>; total: number }) {
  if (!rows.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <ul className="space-y-1.5">
        {rows.map(([label, count]) => (
          <li key={label} className="text-xs">
            <div className="flex justify-between">
              <span className="truncate">{label}</span>
              <span className="font-mono text-slate-500">{count}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded mt-0.5">
              <div
                className="h-1.5 bg-brand rounded"
                style={{ width: `${Math.max(4, (count / total) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DayBars({ byDay }: { byDay: Record<string, number> }) {
  const days = Object.keys(byDay).sort();
  const max = Math.max(1, ...Object.values(byDay));
  return (
    <div className="flex items-end gap-1 h-24">
      {days.map((d) => (
        <div key={d} className="flex-1 flex flex-col items-center gap-1" title={`${d}: ${byDay[d]}`}>
          <div
            className="w-full bg-brand rounded-t"
            style={{ height: `${(byDay[d] / max) * 100}%`, minHeight: 2 }}
          />
          <div className="text-[9px] text-slate-500 font-mono">{d.slice(5)}</div>
        </div>
      ))}
    </div>
  );
}

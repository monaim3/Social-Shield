import { useEffect, useState } from "react";
import { usePopupStore } from "../store";
import { HistoryDB, todayKey } from "@shared/storage/historyDB";

interface Props {
  onManageProfiles: () => void;
  onOpenSettings: () => void;
}

export default function Dashboard({ onManageProfiles, onOpenSettings }: Props) {
  const settings = usePopupStore((s) => s.settings);
  const profiles = usePopupStore((s) => s.profiles);
  const updateSettings = usePopupStore((s) => s.updateSettings);
  const enabledCount = profiles.filter((p) => p.enabled).length;
  const [todayCount, setTodayCount] = useState<number | null>(null);

  useEffect(() => {
    let cancel = false;
    HistoryDB.sinceDay(todayKey())
      .then((events) => {
        if (!cancel) setTodayCount(events.length);
      })
      .catch(() => {
        if (!cancel) setTodayCount(0);
      });
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div className="p-4 space-y-4">
      <section className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
        <div>
          <div className="text-xs text-slate-500">Protection</div>
          <div className="font-semibold">{settings.enabled ? "ON" : "OFF"}</div>
        </div>
        <button
          onClick={() => updateSettings({ enabled: !settings.enabled })}
          className={`px-3 py-1.5 text-xs rounded font-semibold ${
            settings.enabled ? "bg-red-100 text-red-700" : "bg-brand text-white"
          }`}
        >
          {settings.enabled ? "Disable" : "Enable"}
        </button>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <section className="p-3 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Blocked Profiles</div>
          <div className="text-2xl font-bold">{enabledCount}</div>
          <div className="text-xs text-slate-400">{profiles.length} total</div>
        </section>
        <section className="p-3 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Hidden today</div>
          <div className="text-2xl font-bold">{todayCount ?? "—"}</div>
          <div className="text-xs text-slate-400">
            {settings.history.enabled ? "aggregate only" : "logging off"}
          </div>
        </section>
      </div>

      <section className="p-3 rounded-lg border border-slate-200 space-y-1.5 text-sm">
        <PlatformRow name="Facebook" active={settings.platforms.facebook} />
        <PlatformRow name="X" active={settings.platforms.x} />
        <PlatformRow name="YouTube" active={settings.platforms.youtube} />
        <PlatformRow name="Instagram" active={settings.platforms.instagram} />
      </section>

      <div className="flex flex-col gap-2">
        <button
          onClick={onManageProfiles}
          className="w-full py-2 rounded bg-brand text-white text-sm font-semibold hover:bg-brand-dark"
        >
          Manage Block List
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full py-2 rounded border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
        >
          Settings
        </button>
      </div>
    </div>
  );
}

function PlatformRow({ name, active }: { name: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{name}</span>
      <span className={`text-xs ${active ? "text-emerald-600" : "text-slate-400"}`}>
        {active ? "● Active" : "○ Off"}
      </span>
    </div>
  );
}

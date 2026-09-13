import { usePopupStore } from "../store";
import type { HideMode, ProcessingLevel } from "@shared/types/profile";

export default function SettingsPage() {
  const settings = usePopupStore((s) => s.settings);
  const updateSettings = usePopupStore((s) => s.updateSettings);

  return (
    <div className="p-4 space-y-4 text-sm">
      <Section title="General">
        <Row
          label="Enable extension"
          right={
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => updateSettings({ enabled: e.target.checked })}
            />
          }
        />
        <Row
          label="Hide ambiguous matches"
          right={
            <input
              type="checkbox"
              checked={settings.hideAmbiguous}
              onChange={(e) => updateSettings({ hideAmbiguous: e.target.checked })}
            />
          }
        />
        <Row
          label="Debug mode"
          right={
            <input
              type="checkbox"
              checked={settings.debug}
              onChange={(e) => updateSettings({ debug: e.target.checked })}
            />
          }
        />
      </Section>

      <Section title="Hide behavior">
        <select
          className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
          value={settings.hideMode}
          onChange={(e) => updateSettings({ hideMode: e.target.value as HideMode })}
        >
          <option value="collapse">Collapse with placeholder (default)</option>
          <option value="hide">Hide completely</option>
          <option value="blur">Blur content</option>
        </select>
      </Section>

      <Section title="Performance">
        <select
          className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
          value={settings.processingLevel}
          onChange={(e) =>
            updateSettings({ processingLevel: e.target.value as ProcessingLevel })
          }
        >
          <option value="low">Low</option>
          <option value="balanced">Balanced (default)</option>
          <option value="aggressive">Aggressive (partial keyword match)</option>
        </select>
      </Section>

      <Section title="Platforms">
        {(["facebook", "x", "youtube", "instagram"] as const).map((p) => (
          <PlatformToggle
            key={p}
            name={p.charAt(0).toUpperCase() + p.slice(1)}
            checked={settings.platforms[p]}
            onChange={(v) =>
              updateSettings({ platforms: { ...settings.platforms, [p]: v } })
            }
          />
        ))}
      </Section>

      <button
        onClick={() => chrome.runtime.openOptionsPage()}
        className="w-full py-2 rounded border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
      >
        Open full Options page (import/export)
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{title}</h3>
      <div className="p-3 rounded border border-slate-200 space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      {right}
    </div>
  );
}

function PlatformToggle({
  name,
  checked,
  onChange,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between">
      <span>{name}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

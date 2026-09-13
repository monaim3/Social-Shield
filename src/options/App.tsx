import { useEffect, useRef, useState } from "react";
import { usePopupStore } from "@/popup/store";
import type { DetectionMode, HideMode, ProcessingLevel } from "@shared/types/profile";
import {
  DEFAULT_CONTEXT_SIGNALS,
  DEFAULT_DETECTION_MODE,
  DEFAULT_PROFILE_SETTINGS,
  DEFAULT_THRESHOLDS,
} from "@shared/constants";
import { StorageService } from "@shared/storage/StorageService";
import {
  attachBinaries,
  buildExport,
  mergeProfiles,
  parseImport,
  restoreBinaries,
  type MergeStrategy,
} from "@shared/storage/importExport";
import ReferenceImageManager from "./components/ReferenceImageManager";
import HistoryPanel from "./components/HistoryPanel";

export default function App() {
  const init = usePopupStore((s) => s.init);
  const loading = usePopupStore((s) => s.loading);
  const profiles = usePopupStore((s) => s.profiles);
  const settings = usePopupStore((s) => s.settings);
  const updateSettings = usePopupStore((s) => s.updateSettings);
  const createProfile = usePopupStore((s) => s.createProfile);
  const updateProfile = usePopupStore((s) => s.updateProfile);
  const deleteProfile = usePopupStore((s) => s.deleteProfile);
  const toggleProfile = usePopupStore((s) => s.toggleProfile);

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  if (loading) {
    return <div className="p-8 text-slate-500">Loading…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand">SocialShield</h1>
          <p className="text-sm text-slate-500">Manage block profiles and settings.</p>
        </div>
        <a
          href="src/popup/index.html"
          className="text-xs text-slate-400 hover:text-brand"
          target="_blank"
          rel="noreferrer"
        >
          open popup
        </a>
      </header>

      <SettingsPanel settings={settings} updateSettings={updateSettings} />

      <ProfilesPanel
        profiles={profiles}
        editingId={editingId}
        onEdit={setEditingId}
        onAdd={() => setEditingId("__new__")}
        onDelete={(id) => void deleteProfile(id)}
        onToggle={(id) => void toggleProfile(id)}
      />

      {editingId && (
        <EditorModal
          key={editingId}
          profileId={editingId === "__new__" ? null : editingId}
          onCancel={() => setEditingId(null)}
          onSave={async (patch) => {
            if (editingId === "__new__") await createProfile(patch);
            else await updateProfile(editingId, patch);
            setEditingId(null);
          }}
        />
      )}

      <HistoryPanel settings={settings} onUpdateSettings={updateSettings} />

      <ImportExportPanel />
    </div>
  );
}

function SettingsPanel({
  settings,
  updateSettings,
}: {
  settings: ReturnType<typeof usePopupStore.getState>["settings"];
  updateSettings: ReturnType<typeof usePopupStore.getState>["updateSettings"];
}) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
      <h2 className="text-lg font-semibold">Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Enable extension</span>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => void updateSettings({ enabled: e.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Hide ambiguous matches</span>
            <input
              type="checkbox"
              checked={settings.hideAmbiguous}
              onChange={(e) => void updateSettings({ hideAmbiguous: e.target.checked })}
            />
          </label>
          <p className="text-xs text-slate-500 -mt-1">
            An ambiguous match = an identity signal fired but no context / image / face
            evidence. Off by default (may match the wrong person with the same name).
          </p>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Debug mode</span>
            <input
              type="checkbox"
              checked={settings.debug}
              onChange={(e) => void updateSettings({ debug: e.target.checked })}
            />
          </label>

          <div>
            <label className="block text-sm font-medium mb-1">Hide behavior</label>
            <select
              className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
              value={settings.hideMode}
              onChange={(e) => void updateSettings({ hideMode: e.target.value as HideMode })}
            >
              <option value="collapse">Collapse with placeholder</option>
              <option value="hide">Hide completely</option>
              <option value="blur">Blur</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Processing level</label>
            <select
              className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
              value={settings.processingLevel}
              onChange={(e) =>
                void updateSettings({ processingLevel: e.target.value as ProcessingLevel })
              }
            >
              <option value="low">Low</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive (partial keyword)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Platforms</div>
          {(["facebook", "x", "youtube", "instagram"] as const).map((p) => (
            <label key={p} className="flex items-center justify-between text-sm">
              <span className="capitalize">{p}</span>
              <input
                type="checkbox"
                checked={settings.platforms[p]}
                onChange={(e) =>
                  void updateSettings({
                    platforms: { ...settings.platforms, [p]: e.target.checked },
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <h3 className="text-sm font-semibold">Detection</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          {(["text", "keyword", "image", "ocr", "face"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.detection[k]}
                onChange={(e) =>
                  void updateSettings({
                    detection: { ...settings.detection, [k]: e.target.checked },
                  })
                }
              />
              <span>{k}</span>
            </label>
          ))}
        </div>

        <label className="block text-sm">
          Face similarity — min cosine: {settings.face.similarityThreshold.toFixed(2)}
          <input
            type="range"
            min={0.4}
            max={0.95}
            step={0.01}
            value={settings.face.similarityThreshold}
            onChange={(e) =>
              void updateSettings({
                face: { similarityThreshold: Number(e.target.value) },
              })
            }
            className="w-full"
          />
          <span className="text-xs text-slate-500">
            Higher = stricter (0.60 default; &lt; 0.50 = false-positive risk).
          </span>
        </label>

        <label className="block text-sm">
          Image similarity — max Hamming distance: {settings.imageMatch.hammingThreshold}
          <input
            type="range"
            min={0}
            max={32}
            step={1}
            value={settings.imageMatch.hammingThreshold}
            onChange={(e) =>
              void updateSettings({
                imageMatch: { hammingThreshold: Number(e.target.value) },
              })
            }
            className="w-full"
          />
          <span className="text-xs text-slate-500">
            Lower = stricter (0 = identical, 10 ≈ visually similar).
          </span>
        </label>
      </div>

      <div className="border-t pt-4 space-y-2 bg-emerald-50 -mx-6 px-6 pb-4">
        <h3 className="text-sm font-semibold text-emerald-900">OCR (fully local)</h3>
        <p className="text-xs text-emerald-900">
          Worker script, WebAssembly core, and English language model (~12&nbsp;MB) are
          bundled inside the extension and loaded from
          <code className="mx-1 px-1 bg-emerald-100 rounded">chrome-extension://…/tesseract/</code>.
          No CDN, no network round-trip. Image bytes never leave the browser.
        </p>
        <label className="block text-xs text-emerald-900">
          Max OCR input dimension: {settings.ocr.maxImageDimension}px
          <input
            type="range"
            min={200}
            max={1600}
            step={100}
            value={settings.ocr.maxImageDimension}
            onChange={(e) =>
              void updateSettings({
                ocr: {
                  ...settings.ocr,
                  maxImageDimension: Number(e.target.value),
                },
              })
            }
            className="w-full"
          />
        </label>
      </div>
    </section>
  );
}

function ProfilesPanel({
  profiles,
  editingId,
  onEdit,
  onAdd,
  onDelete,
  onToggle,
}: {
  profiles: ReturnType<typeof usePopupStore.getState>["profiles"];
  editingId: string | null;
  onEdit: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Blocked Profiles ({profiles.length})</h2>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 text-sm rounded bg-brand text-white font-semibold hover:bg-brand-dark"
        >
          + Add Profile
        </button>
      </div>
      {profiles.length === 0 ? (
        <div className="text-sm text-slate-500 py-6 text-center border border-dashed rounded">
          No profiles yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`p-4 border rounded-lg ${editingId === p.id ? "border-brand" : "border-slate-200"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.aliases.length} aliases · {p.contextSignals.keywords.length} kw ·{" "}
                    {p.contextSignals.phrases.length} phrases · {p.referenceImages.length} imgs
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400 mt-0.5">
                    mode: {p.detectionMode}
                  </div>
                </div>
                <span className={`text-xs ${p.enabled ? "text-emerald-600" : "text-slate-400"}`}>
                  {p.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <button
                  onClick={() => onEdit(p.id)}
                  className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => onToggle(p.id)}
                  className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                >
                  {p.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${p.name}"?`)) onDelete(p.id);
                  }}
                  className="px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EditorModal({
  profileId,
  onCancel,
  onSave,
}: {
  profileId: string | null;
  onCancel: () => void;
  onSave: (patch: Parameters<ReturnType<typeof usePopupStore.getState>["createProfile"]>[0]) => Promise<void>;
}) {
  const profiles = usePopupStore((s) => s.profiles);
  const existing = profiles.find((p) => p.id === profileId) ?? null;

  const [name, setName] = useState(existing?.name ?? "");
  const [aliases, setAliases] = useState((existing?.aliases ?? []).join("\n"));
  const [keywords, setKeywords] = useState(
    (existing?.contextSignals.keywords ?? []).join("\n"),
  );
  const [phrases, setPhrases] = useState(
    (existing?.contextSignals.phrases ?? []).join("\n"),
  );
  const [mode, setMode] = useState<DetectionMode>(existing?.detectionMode ?? DEFAULT_DETECTION_MODE);
  const [threshold, setThreshold] = useState(existing?.thresholds.overall ?? DEFAULT_THRESHOLDS.overall);
  const [textOn, setTextOn] = useState(existing?.settings.textMatching ?? true);
  const [kwOn, setKwOn] = useState(existing?.settings.keywordMatching ?? true);
  const [imgOn, setImgOn] = useState(existing?.settings.imageMatching ?? false);
  const [ocrOn, setOcrOn] = useState(existing?.settings.ocrMatching ?? false);
  const [faceOn, setFaceOn] = useState(existing?.settings.faceMatching ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  async function submit() {
    if (!name.trim()) return alert("Name required");
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        aliases: splitLines(aliases),
        contextSignals: {
          ...DEFAULT_CONTEXT_SIGNALS,
          keywords: splitLines(keywords),
          phrases: splitLines(phrases),
        },
        settings: {
          ...DEFAULT_PROFILE_SETTINGS,
          textMatching: textOn,
          keywordMatching: kwOn,
          imageMatching: imgOn,
          ocrMatching: ocrOn,
          faceMatching: faceOn,
        },
        thresholds: { ...DEFAULT_THRESHOLDS, overall: threshold },
        detectionMode: mode,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold">{existing ? "Edit Profile" : "Add Profile"}</h3>

        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-2">
          Names alone may match multiple people. Add reference images and context keywords to improve accuracy.
        </p>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Person identity
          </legend>
          <Field label="Primary name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Alternative names / aliases (one per line)">
            <textarea
              className="input min-h-[70px]"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Context signals
          </legend>
          <Field label="Keywords (one per line)">
            <textarea
              className="input min-h-[70px]"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </Field>
          <Field label="Phrases (multi-word, substring match)">
            <textarea
              className="input min-h-[50px]"
              value={phrases}
              onChange={(e) => setPhrases(e.target.value)}
              placeholder="press conference&#10;campaign trail"
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-1">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Detection mode
          </legend>
          {(["strict", "balanced", "aggressive"] as const).map((m) => (
            <label
              key={m}
              className={`flex items-start gap-2 text-xs p-2 rounded border cursor-pointer ${
                mode === m ? "border-brand bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="detection-mode"
                checked={mode === m}
                onChange={() => setMode(m)}
                className="mt-0.5"
              />
              <span>
                <b className="capitalize">{m}</b> —{" "}
                {m === "strict"
                  ? "requires visual evidence or identity + strong context; safest"
                  : m === "balanced"
                    ? "identity + context/visual triggers hide; name alone stays visible (default)"
                    : "name alone can hide; may catch unrelated people with the same name"}
              </span>
            </label>
          ))}
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={textOn} onChange={(e) => setTextOn(e.target.checked)} />
            Text (name/alias)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={kwOn} onChange={(e) => setKwOn(e.target.checked)} />
            Keywords
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={imgOn} onChange={(e) => setImgOn(e.target.checked)} />
            Image similarity (needs reference images)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ocrOn} onChange={(e) => setOcrOn(e.target.checked)} />
            OCR (text inside images)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={faceOn} onChange={(e) => setFaceOn(e.target.checked)} />
            Face similarity (needs face embeddings)
          </label>
        </div>

        {existing && (
          <div className="border-t pt-4">
            <ReferenceImageManager profile={existing} />
          </div>
        )}
        {!existing && (
          <div className="text-xs text-slate-400 border-t pt-3">
            Save profile first, then re-open to add reference images.
          </div>
        )}

        <Field label={`Threshold — ${threshold}`}>
          <input
            type="range"
            min={20}
            max={200}
            step={10}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded border border-slate-200">
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={() => void submit()}
            className="px-3 py-1.5 rounded bg-brand text-white font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <style>{`
          .input { width:100%; padding:6px 10px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; outline:none; }
          .input:focus { border-color:#4f46e5; box-shadow:0 0 0 2px #c7d2fe; }
        `}</style>
      </div>
    </div>
  );
}

function ImportExportPanel() {
  const profiles = usePopupStore((s) => s.profiles);
  const settings = usePopupStore((s) => s.settings);
  const [includeSettings, setIncludeSettings] = useState(false);
  const [includeBlobs, setIncludeBlobs] = useState(false);
  const [strategy, setStrategy] = useState<MergeStrategy>("merge");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function doExport() {
    setBusy(true);
    setStatus(null);
    try {
      let bundle = buildExport(profiles, settings, includeSettings);
      if (includeBlobs) bundle = await attachBinaries(bundle, profiles);
      const blob = new Blob([JSON.stringify(bundle)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `socialshield-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const kb = (blob.size / 1024).toFixed(0);
      setStatus(
        `Exported ${bundle.profiles.length} profile(s)${
          includeBlobs ? `, ${bundle.binaries?.length ?? 0} blob(s)` : ""
        }. File ~${kb} KB.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function doImport(file: File) {
    setStatus(null);
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = parseImport(text);
      if (!parsed.ok) {
        setStatus(`Import failed: ${parsed.error}`);
        return;
      }
      const merged = mergeProfiles(profiles, parsed.bundle.profiles, strategy);
      await StorageService.saveProfiles(merged);
      if (includeSettings && parsed.bundle.settings) {
        await StorageService.saveSettings(parsed.bundle.settings);
      }
      const blobsRestored = await restoreBinaries(parsed.bundle);
      setStatus(
        `Imported ${parsed.bundle.profiles.length} profile(s) (${strategy}). Now ${merged.length} total. Restored ${blobsRestored} blob(s).`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
      <h2 className="text-lg font-semibold">Import / Export</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Export</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeSettings}
              onChange={(e) => setIncludeSettings(e.target.checked)}
            />
            Include global settings
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeBlobs}
              onChange={(e) => setIncludeBlobs(e.target.checked)}
            />
            Include reference-image blobs (base64, larger file)
          </label>
          <div className="text-xs text-slate-500">
            Without blobs, hashes + embeddings still transfer — matching keeps working.
          </div>
          <button
            onClick={() => void doExport()}
            disabled={busy}
            className="px-3 py-1.5 rounded bg-brand text-white text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Working…" : "Download JSON"}
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Import</h3>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Merge strategy</label>
            <select
              className="border border-slate-200 rounded px-2 py-1 text-sm"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as MergeStrategy)}
            >
              <option value="merge">Merge (by id)</option>
              <option value="replace">Replace all</option>
            </select>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 rounded border border-slate-300 text-sm font-semibold hover:bg-slate-50"
          >
            Choose JSON file…
          </button>
        </div>
      </div>

      {status && <div className="text-sm text-slate-600 pt-2 border-t">{status}</div>}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function splitLines(s: string): string[] {
  return s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

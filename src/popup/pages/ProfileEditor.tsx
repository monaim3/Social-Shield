import { useMemo, useState } from "react";
import { usePopupStore } from "../store";
import {
  DEFAULT_CONTEXT_SIGNALS,
  DEFAULT_DETECTION_MODE,
  DEFAULT_PROFILE_SETTINGS,
  DEFAULT_THRESHOLDS,
} from "@shared/constants";
import type { DetectionMode } from "@shared/types/profile";
import ReferenceImageManager from "@/options/components/ReferenceImageManager";

interface Props {
  profileId: string | null;
  onDone: () => void;
}

export default function ProfileEditor({ profileId, onDone }: Props) {
  const profiles = usePopupStore((s) => s.profiles);
  const create = usePopupStore((s) => s.createProfile);
  const update = usePopupStore((s) => s.updateProfile);

  const existing = useMemo(
    () => profiles.find((p) => p.id === profileId) ?? null,
    [profiles, profileId],
  );

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

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      alert("Name required.");
      return;
    }
    setSaving(true);
    try {
      const patch = {
        name: trimmed,
        aliases: splitLines(aliases),
        contextSignals: {
          ...DEFAULT_CONTEXT_SIGNALS,
          keywords: splitLines(keywords),
          phrases: splitLines(phrases),
        },
        settings: {
          ...(existing?.settings ?? DEFAULT_PROFILE_SETTINGS),
          textMatching: textOn,
          keywordMatching: kwOn,
          imageMatching: imgOn,
          ocrMatching: ocrOn,
          faceMatching: faceOn,
        },
        thresholds: {
          ...(existing?.thresholds ?? DEFAULT_THRESHOLDS),
          overall: threshold,
        },
        detectionMode: mode,
      };
      if (existing) await update(existing.id, patch);
      else await create(patch);
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4 text-sm">
      <h2 className="font-semibold">{existing ? "Edit Profile" : "Add Profile"}</h2>

      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
        Names alone may match multiple people. Add reference images and context
        keywords to improve detection accuracy.
      </p>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          Person identity
        </legend>
        <Field label="Primary name">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rashed Khan"
          />
        </Field>
        <Field label="Alternative names / aliases (one per line)">
          <textarea
            className="input min-h-[60px]"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="Md. Rashed Khan&#10;Rashed"
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          Context signals
        </legend>
        <Field label="Keywords (one per line)">
          <textarea
            className="input min-h-[60px]"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="politician&#10;Bangladesh"
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
        <ModeRadio value="strict" cur={mode} onChange={setMode}>
          <b>Strict</b> — requires visual evidence or identity + strong context. Fewer hides, fewer false positives.
        </ModeRadio>
        <ModeRadio value="balanced" cur={mode} onChange={setMode}>
          <b>Balanced</b> (default) — identity + context/visual triggers a hide. Name alone stays visible.
        </ModeRadio>
        <ModeRadio value="aggressive" cur={mode} onChange={setMode}>
          <b>Aggressive</b> — name alone can hide. Warning: may hide unrelated people with the same name.
        </ModeRadio>
      </fieldset>

      <fieldset className="space-y-1">
        <legend className="text-xs text-slate-500 mb-1">Matching sources</legend>
        <Toggle label="Text (name / alias)" checked={textOn} onChange={setTextOn} />
        <Toggle label="Context keywords / phrases" checked={kwOn} onChange={setKwOn} />
        <Toggle label="Image similarity (needs reference images)" checked={imgOn} onChange={setImgOn} />
        <Toggle label="OCR (text inside images)" checked={ocrOn} onChange={setOcrOn} />
        <Toggle label="Face similarity (needs face embeddings)" checked={faceOn} onChange={setFaceOn} />
      </fieldset>

      {existing ? (
        <fieldset className="space-y-1 border-t pt-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Reference images
          </legend>
          <ReferenceImageManager profile={existing} />
        </fieldset>
      ) : (
        <div className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded p-2">
          Save profile first, then reopen to upload reference images.
        </div>
      )}

      <Field label={`Overall threshold — ${threshold} (used mainly in Aggressive mode)`}>
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

      <div className="flex gap-2 pt-2">
        <button
          onClick={onDone}
          className="flex-1 py-2 rounded border border-slate-200 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          disabled={saving}
          onClick={() => void save()}
          className="flex-1 py-2 rounded bg-brand text-white font-semibold disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid rgb(226 232 240);
          border-radius: 6px;
          font-size: 13px;
          outline: none;
        }
        .input:focus {
          border-color: rgb(79 70 229);
          box-shadow: 0 0 0 2px rgb(199 210 254);
        }
      `}</style>
    </div>
  );
}

function splitLines(s: string): string[] {
  return s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function ModeRadio({
  value,
  cur,
  onChange,
  children,
}: {
  value: DetectionMode;
  cur: DetectionMode;
  onChange: (v: DetectionMode) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex items-start gap-2 text-xs p-2 rounded border cursor-pointer ${
        cur === value ? "border-brand bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
      }`}
    >
      <input
        type="radio"
        name="detection-mode"
        checked={cur === value}
        onChange={() => onChange(value)}
        className="mt-0.5"
      />
      <span>{children}</span>
    </label>
  );
}

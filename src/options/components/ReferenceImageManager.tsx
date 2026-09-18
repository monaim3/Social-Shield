import { useRef, useState } from "react";
import type { BlockProfile } from "@shared/types/profile";
import { addReferenceImageFile, removeReferenceImage } from "@/popup/refImages";

interface Props {
  profile: BlockProfile;
}

export default function ReferenceImageManager({ profile }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [lastToast, setLastToast] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [expandMultiFace, setExpandMultiFace] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | File[] | null) {
    if (!files || (files as FileList).length === 0) return;
    setBusy(true);
    setError(null);
    setLastToast(null);
    try {
      const list = Array.from(files as ArrayLike<File>).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (!list.length) {
        setError("No image files detected.");
        return;
      }
      let totalFaces = 0;
      let totalExtras = 0;
      for (let i = 0; i < list.length; i++) {
        setProgress(`Processing ${i + 1}/${list.length} (hashing + face detect…)`);
        const res = await addReferenceImageFile(profile.id, list[i], { expandMultiFace });
        totalFaces += res.faceCount;
        totalExtras += res.extras.length;
      }
      const parts = [`${list.length} image${list.length === 1 ? "" : "s"} added`];
      if (totalFaces > 0) parts.push(`${totalFaces} face${totalFaces === 1 ? "" : "s"} detected`);
      if (totalExtras > 0) parts.push(`+${totalExtras} extra face reference${totalExtras === 1 ? "" : "s"}`);
      setLastToast(parts.join(" · "));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(id: string) {
    setBusy(true);
    try {
      await removeReferenceImage(profile.id, id);
    } finally {
      setBusy(false);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragOver) setDragOver(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Only clear when leaving the outer container, not children.
    if (e.currentTarget === e.target) setDragOver(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    if (dt.files && dt.files.length) {
      void handleFiles(dt.files);
    }
  }

  return (
    <div
      className={`space-y-2 rounded p-2 transition-colors ${
        dragOver ? "bg-indigo-50 ring-2 ring-brand ring-inset" : ""
      }`}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Reference images ({profile.referenceImages.length})
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="text-xs px-2 py-1 rounded bg-brand text-white font-semibold disabled:opacity-60"
        >
          {busy ? "Working…" : "Upload images"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}
      {progress && <div className="text-xs text-slate-500">{progress}</div>}
      {lastToast && (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
          {lastToast}
        </div>
      )}
      <label className="flex items-start gap-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded p-2">
        <input
          type="checkbox"
          checked={expandMultiFace}
          onChange={(e) => setExpandMultiFace(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <b>Auto-extract every face</b> from group photos. One interview / panel
          screenshot becomes N face references (one per person visible), each
          with its own cropped thumbnail.
        </span>
      </label>
      <div className="text-[11px] text-slate-500 leading-snug">
        Face descriptor is extracted on upload (~6.5 MB models load on first
        image, then cached). The <b>face</b> badge below means a face was
        detected and stored. Flip on <b>Face similarity</b> in Matching sources
        above to use it — no re-upload needed.
      </div>

      {profile.referenceImages.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full text-xs py-6 text-center border-2 border-dashed rounded transition-colors ${
            dragOver
              ? "border-brand text-brand"
              : "border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-500"
          }`}
        >
          {dragOver ? "Drop images to upload" : "Drag & drop images here, or click to browse"}
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {profile.referenceImages.map((r) => (
            <div key={r.id} className="relative border border-slate-200 rounded overflow-hidden group">
              {r.thumbnail ? (
                <img src={r.thumbnail} alt={r.name} className="w-full h-20 object-cover" />
              ) : (
                <div className="w-full h-20 bg-slate-100 text-xs text-slate-400 flex items-center justify-center">
                  no preview
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                {r.name ?? r.id}
              </div>
              <button
                onClick={() => void handleRemove(r.id)}
                className="absolute top-1 right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
              {r.perceptualHash && (
                <div className="absolute top-1 left-1 bg-black/50 text-white text-[9px] font-mono px-1 rounded">
                  {r.perceptualHash.slice(0, 6)}
                </div>
              )}
              {r.embedding && r.embedding.length > 0 && (
                <div className="absolute top-1 right-6 bg-emerald-600 text-white text-[9px] px-1 rounded" title="Face embedding stored">
                  face
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {profile.referenceImages.length > 0 && (
        <div
          className={`text-[11px] text-center py-2 border border-dashed rounded transition-colors ${
            dragOver ? "border-brand text-brand bg-indigo-50" : "border-slate-200 text-slate-400"
          }`}
        >
          {dragOver ? "Drop to add more" : "Drop more images anywhere in this panel"}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Blobs stored locally in IndexedDB. Perceptual hash (aHash) is computed browser-side
        and used to detect visually similar images on supported sites.
      </p>
    </div>
  );
}

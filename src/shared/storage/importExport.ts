import type { BlockProfile, GlobalSettings } from "@shared/types/profile";
import { SCHEMA_VERSION } from "@shared/constants";
import { ImagesDB, type StoredReferenceImage } from "./imagesDB";
import { ensureProfileV2, ensureSettings } from "./schema";

export interface BinaryImagePayload {
  id: string;
  profileId: string;
  mime: string;
  base64: string;
}

export interface ExportBundle {
  format: "socialshield-export";
  version: number;
  exportedAt: number;
  profiles: BlockProfile[];
  settings?: GlobalSettings;
  /** Base64 blobs — only present when user opts in. May be large. */
  binaries?: BinaryImagePayload[];
}

export function buildExport(
  profiles: BlockProfile[],
  settings?: GlobalSettings,
  includeSettings = false,
): ExportBundle {
  return {
    format: "socialshield-export",
    version: SCHEMA_VERSION,
    exportedAt: Date.now(),
    profiles: profiles.map(stripBinaryImageFields),
    ...(includeSettings && settings ? { settings } : {}),
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Extends an export bundle with base64-encoded reference-image blobs from IDB. */
export async function attachBinaries(
  bundle: ExportBundle,
  profiles: BlockProfile[],
): Promise<ExportBundle> {
  const wanted = new Set<string>();
  for (const p of profiles) for (const r of p.referenceImages) wanted.add(r.id);
  const all = await ImagesDB.all();
  const payload: BinaryImagePayload[] = [];
  for (const rec of all) {
    if (!wanted.has(rec.id)) continue;
    payload.push({
      id: rec.id,
      profileId: rec.profileId,
      mime: rec.mime,
      base64: await blobToBase64(rec.blob),
    });
  }
  return { ...bundle, binaries: payload };
}

/** Writes binaries from an imported bundle back into IDB. */
export async function restoreBinaries(bundle: ExportBundle): Promise<number> {
  if (!bundle.binaries?.length) return 0;
  // Cross-reference to the incoming profiles so we get name/hash/embedding.
  const metaById = new Map<string, BlockProfile["referenceImages"][number]>();
  for (const p of bundle.profiles) for (const r of p.referenceImages) metaById.set(r.id, r);

  let written = 0;
  for (const b of bundle.binaries) {
    const meta = metaById.get(b.id);
    if (!meta) continue;
    const stored: StoredReferenceImage = {
      id: b.id,
      profileId: b.profileId,
      name: meta.name,
      mime: b.mime || meta.mime,
      size: meta.size,
      createdAt: meta.createdAt,
      perceptualHash: meta.perceptualHash,
      thumbnail: meta.thumbnail,
      embedding: meta.embedding,
      blob: base64ToBlob(b.base64, b.mime || meta.mime),
    };
    await ImagesDB.put(stored);
    written++;
  }
  return written;
}

function stripBinaryImageFields(p: BlockProfile): BlockProfile {
  // Reference-image blobs live only in IndexedDB. Thumbnails and embeddings
  // are stripped to keep exports small and portable — hashes are enough to
  // preserve match behavior on re-import.
  return {
    ...p,
    referenceImages: p.referenceImages.map((ri) => ({
      id: ri.id,
      profileId: ri.profileId,
      name: ri.name,
      mime: ri.mime,
      size: ri.size,
      createdAt: ri.createdAt,
      perceptualHash: ri.perceptualHash,
    })),
  };
}

export interface ParsedImport {
  ok: true;
  bundle: ExportBundle;
}
export interface ImportError {
  ok: false;
  error: string;
}

export function parseImport(text: string): ParsedImport | ImportError {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }
  if (!raw || typeof raw !== "object") return { ok: false, error: "Not an object." };
  const b = raw as Partial<ExportBundle>;
  if (b.format !== "socialshield-export") return { ok: false, error: "Wrong format tag." };
  if (typeof b.version !== "number") return { ok: false, error: "Missing version." };
  if (!Array.isArray(b.profiles)) return { ok: false, error: "profiles is not an array." };
  // Migrate v1 profiles/settings inline so callers always see the current shape.
  const migrated: ExportBundle = {
    ...(b as ExportBundle),
    profiles: (b.profiles as unknown[]).map((p) => ensureProfileV2(p)),
    settings: b.settings ? ensureSettings(b.settings) : undefined,
    version: SCHEMA_VERSION,
  };
  return { ok: true, bundle: migrated };
}

export type MergeStrategy = "replace" | "merge";

export function mergeProfiles(
  existing: BlockProfile[],
  incoming: BlockProfile[],
  strategy: MergeStrategy,
): BlockProfile[] {
  if (strategy === "replace") return incoming;
  const byId = new Map<string, BlockProfile>();
  for (const p of existing) byId.set(p.id, p);
  for (const p of incoming) byId.set(p.id, p);
  return Array.from(byId.values());
}

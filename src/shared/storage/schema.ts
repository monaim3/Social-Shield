import {
  DEFAULT_CONTEXT_SIGNALS,
  DEFAULT_DETECTION_MODE,
  DEFAULT_PROFILE_SETTINGS,
  DEFAULT_SETTINGS,
  DEFAULT_THRESHOLDS,
  SCHEMA_VERSION,
} from "../constants";
import type { BlockProfile, GlobalSettings } from "../types/profile";

/**
 * v1 profile shape (pre-identity/context split). Kept as a type so migration
 * code can be strict about its input.
 */
interface V1Profile {
  id: string;
  name: string;
  aliases?: string[];
  keywords?: string[];
  referenceImages?: unknown[];
  enabled?: boolean;
  settings?: Partial<import("../types/profile").ProfileSettings>;
  thresholds?: Partial<import("../types/profile").ProfileThresholds> & { text?: number };
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Retrofit rule: a v1 profile is "single-signal" if it relies only on name/aliases
 * (no keywords, no reference images). To preserve prior hide behavior for these,
 * they migrate to `aggressive` mode. Profiles that already carry multiple signal
 * types migrate to `balanced` (the new safer default).
 */
export function migrateProfileV1toV2(p: V1Profile): BlockProfile {
  const keywords = Array.isArray(p.keywords) ? p.keywords.filter(Boolean) : [];
  const referenceImages = Array.isArray(p.referenceImages) ? (p.referenceImages as BlockProfile["referenceImages"]) : [];
  const singleSignal = keywords.length === 0 && referenceImages.length === 0;

  const thresholds = {
    overall: p.thresholds?.overall ?? DEFAULT_THRESHOLDS.overall,
    image: p.thresholds?.image ?? DEFAULT_THRESHOLDS.image,
    face: p.thresholds?.face ?? DEFAULT_THRESHOLDS.face,
  };

  return {
    id: p.id,
    name: p.name,
    aliases: Array.isArray(p.aliases) ? p.aliases.filter(Boolean) : [],
    contextSignals: { ...DEFAULT_CONTEXT_SIGNALS, keywords },
    referenceImages,
    enabled: p.enabled ?? true,
    settings: { ...DEFAULT_PROFILE_SETTINGS, ...(p.settings ?? {}) },
    thresholds,
    detectionMode: singleSignal ? "aggressive" : DEFAULT_DETECTION_MODE,
    createdAt: p.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
}

/** Normalizes a possibly-v1 profile in place, returning a strict v2 shape. */
export function ensureProfileV2(p: unknown): BlockProfile {
  if (!p || typeof p !== "object") throw new Error("invalid profile");
  const anyP = p as Record<string, unknown> & Partial<BlockProfile>;
  if (
    typeof anyP.detectionMode === "string" &&
    anyP.contextSignals &&
    typeof (anyP.contextSignals as ContextSignalsLike).keywords !== "undefined"
  ) {
    return anyP as BlockProfile;
  }
  return migrateProfileV1toV2(anyP as V1Profile);
}

type ContextSignalsLike = { keywords: unknown };

export function ensureSettings(s: unknown): GlobalSettings {
  const base: GlobalSettings = { ...DEFAULT_SETTINGS };
  if (!s || typeof s !== "object") return base;
  return {
    ...base,
    ...(s as Partial<GlobalSettings>),
    platforms: { ...base.platforms, ...((s as Partial<GlobalSettings>).platforms ?? {}) },
    detection: { ...base.detection, ...((s as Partial<GlobalSettings>).detection ?? {}) },
    imageMatch: { ...base.imageMatch, ...((s as Partial<GlobalSettings>).imageMatch ?? {}) },
    ocr: { ...base.ocr, ...((s as Partial<GlobalSettings>).ocr ?? {}) },
    face: { ...base.face, ...((s as Partial<GlobalSettings>).face ?? {}) },
    history: { ...base.history, ...((s as Partial<GlobalSettings>).history ?? {}) },
  };
}

export interface MigrationResult {
  profiles: BlockProfile[];
  settings: GlobalSettings;
  migratedCount: number;
  fromVersion: number;
}

export function migrate(
  rawProfiles: unknown,
  rawSettings: unknown,
  storedVersion: number,
): MigrationResult {
  const profiles = Array.isArray(rawProfiles)
    ? rawProfiles.map((p) => ensureProfileV2(p))
    : [];
  const settings = ensureSettings(rawSettings);
  return {
    profiles,
    settings,
    migratedCount: profiles.length,
    fromVersion: storedVersion || 0,
  };
}

export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSION;

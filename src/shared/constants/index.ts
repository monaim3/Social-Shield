import type {
  ContextSignals,
  DetectionMode,
  GlobalSettings,
  ProfileSettings,
  ProfileThresholds,
} from "../types/profile";

/** Bumped in v2 for the identity/context split + detectionMode migration. */
export const SCHEMA_VERSION = 2;

export const STORAGE_KEYS = {
  version: "ss:schemaVersion",
  profiles: "ss:profiles",
  settings: "ss:settings",
} as const;

/**
 * Per-signal weights. Numbers reflect: visual > ocr > identity > context per hit,
 * but the decision engine still requires COMBINATIONS in Balanced / Strict —
 * these weights only drive the threshold in Aggressive mode.
 */
export const SCORE_WEIGHTS = {
  name: 30,
  alias: 25,
  keyword: 15,
  keywordPartial: 8,
  phrase: 20,
  ocr: 30,
  image: 50,
  face: 70,
} as const;

export const DEFAULT_THRESHOLDS: ProfileThresholds = {
  overall: 50,
  image: 70,
  face: 75,
};

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  textMatching: true,
  keywordMatching: true,
  ocrMatching: false,
  imageMatching: false,
  faceMatching: false,
};

export const DEFAULT_CONTEXT_SIGNALS: ContextSignals = {
  keywords: [],
  phrases: [],
};

export const DEFAULT_DETECTION_MODE: DetectionMode = "balanced";

export const DEFAULT_SETTINGS: GlobalSettings = {
  enabled: true,
  darkMode: false,
  hideMode: "collapse",
  processingLevel: "balanced",
  hideAmbiguous: false,
  platforms: { facebook: true, x: true, youtube: true, instagram: true },
  detection: { text: true, keyword: true, ocr: false, image: true, face: false },
  imageMatch: { hammingThreshold: 10 },
  ocr: { consent: false, maxImageDimension: 800 },
  face: { similarityThreshold: 0.6 },
  history: { enabled: true, retentionDays: 30 },
  debug: false,
};

export const OBSERVER_DEBOUNCE_MS = 150;
export const MAX_PROCESSING_BATCH = 30;
export const IMAGE_HASH_CACHE_MAX = 500;
export const OCR_CACHE_MAX = 200;
export const ASYNC_CANDIDATE_MAX_IMAGES = 4;

export const PLACEHOLDER_CLASS = "socialshield-placeholder";
export const HIDDEN_ATTR = "data-socialshield-hidden";
export const SEEN_ATTR = "data-socialshield-seen";

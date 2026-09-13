export interface ReferenceImage {
  id: string;
  profileId: string;
  name?: string;
  mime: string;
  size: number;
  createdAt: number;
  thumbnail?: string;
  perceptualHash?: string;
  embedding?: number[];
}

export interface ProfileSettings {
  textMatching: boolean;
  keywordMatching: boolean;
  ocrMatching: boolean;
  imageMatching: boolean;
  faceMatching: boolean;
}

export interface ProfileThresholds {
  overall: number;
  image: number;
  face: number;
}

/**
 * Context signals live separately from identity signals (name/aliases).
 *
 * A name like "Rashed Khan" belongs to many people; matching it alone should
 * NEVER be treated as identifying the intended person. Context signals
 * (keywords + longer phrases) are what disambiguate two people who share the
 * same name.
 */
export interface ContextSignals {
  keywords: string[];
  phrases: string[];
}

export type DetectionMode = "strict" | "balanced" | "aggressive";

export interface BlockProfile {
  id: string;
  /** Primary display name. Also used as an identity signal. */
  name: string;
  /** Alternative spellings, nicknames, transliterations. Identity signals. */
  aliases: string[];
  /** Context signals — help disambiguate people who share a name. */
  contextSignals: ContextSignals;
  referenceImages: ReferenceImage[];
  enabled: boolean;
  settings: ProfileSettings;
  thresholds: ProfileThresholds;
  detectionMode: DetectionMode;
  createdAt: number;
  updatedAt: number;
}

export type HideMode = "collapse" | "hide" | "blur" | "placeholder";
export type ProcessingLevel = "low" | "balanced" | "aggressive";

export interface GlobalSettings {
  enabled: boolean;
  darkMode: boolean;
  hideMode: HideMode;
  processingLevel: ProcessingLevel;
  /** Also hide posts whose match decision is "ambiguous". Default false. */
  hideAmbiguous: boolean;
  platforms: {
    facebook: boolean;
    x: boolean;
    youtube: boolean;
    instagram: boolean;
  };
  detection: {
    text: boolean;
    keyword: boolean;
    ocr: boolean;
    image: boolean;
    face: boolean;
  };
  imageMatch: {
    hammingThreshold: number;
  };
  ocr: {
    consent: boolean; // legacy; local OCR now, always effectively true
    maxImageDimension: number;
  };
  face: {
    similarityThreshold: number;
  };
  history: {
    enabled: boolean;
    retentionDays: number;
  };
  debug: boolean;
}

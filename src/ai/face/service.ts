import { log } from "@shared/utils/logger";

/**
 * Face detection + 128-d descriptor extraction using @vladmandic/face-api.
 *
 * Runtime: main thread. Models are served from the extension itself
 * (chrome.runtime.getURL('models/face/')), so no network round-trip after
 * the first fetch. All processing is local.
 */

let facePromise: Promise<typeof import("@vladmandic/face-api") | null> | null = null;
let loadedModels = false;
let loadingModels: Promise<boolean> | null = null;

async function loadFaceApi(): Promise<typeof import("@vladmandic/face-api") | null> {
  if (facePromise) return facePromise;
  facePromise = (async () => {
    try {
      const mod = await import("@vladmandic/face-api");
      return mod;
    } catch (e) {
      log.error("face-api import failed", e);
      return null;
    }
  })();
  return facePromise;
}

function modelsBase(): string {
  try {
    return chrome.runtime.getURL("models/face/");
  } catch {
    // Content script prior to full runtime — fall back to relative.
    return "/models/face/";
  }
}

export async function initFaceModels(): Promise<boolean> {
  if (loadedModels) return true;
  if (loadingModels) return loadingModels;
  loadingModels = (async () => {
    const face = await loadFaceApi();
    if (!face) return false;
    try {
      const base = modelsBase();
      await Promise.all([
        face.nets.tinyFaceDetector.loadFromUri(base),
        face.nets.faceLandmark68TinyNet.loadFromUri(base),
        face.nets.faceRecognitionNet.loadFromUri(base),
      ]);
      loadedModels = true;
      log.info("face models loaded");
      return true;
    } catch (e) {
      log.error("face model load failed", e);
      return false;
    } finally {
      loadingModels = null;
    }
  })();
  return loadingModels;
}

export interface DescriptorInput {
  /** Any renderable source: HTMLImageElement / HTMLCanvasElement / ImageBitmap / Blob. */
  source: HTMLImageElement | HTMLCanvasElement | ImageBitmap | Blob;
  /** Return only the highest-confidence face. Default true. */
  singleFace?: boolean;
}

export interface FaceDescriptor {
  descriptor: Float32Array;
  score: number;
}

const detectorOptions = (): unknown => {
  // 320 input size = smaller & faster; good enough for feed thumbnails.
  return { inputSize: 320, scoreThreshold: 0.4 };
};

async function toDrawable(
  source: DescriptorInput["source"],
): Promise<HTMLImageElement | HTMLCanvasElement | ImageBitmap> {
  if (source instanceof Blob) return createImageBitmap(source);
  return source;
}

export async function extractFaceDescriptors(
  input: DescriptorInput,
): Promise<FaceDescriptor[]> {
  const ok = await initFaceModels();
  if (!ok) return [];
  const face = await loadFaceApi();
  if (!face) return [];

  const drawable = await toDrawable(input.source);
  try {
    const opts = new face.TinyFaceDetectorOptions(detectorOptions() as never);
    const chain = face
      .detectAllFaces(drawable as unknown as HTMLImageElement, opts)
      .withFaceLandmarks(true)
      .withFaceDescriptors();
    const results = await chain;
    return results.map((r) => ({
      descriptor: r.descriptor,
      score: r.detection.score,
    }));
  } catch (e) {
    log.debug("face detect failed", e);
    return [];
  } finally {
    if (drawable && "close" in drawable && typeof drawable.close === "function") {
      (drawable as ImageBitmap).close();
    }
  }
}

export async function extractSingleFace(
  input: DescriptorInput,
): Promise<FaceDescriptor | null> {
  const all = await extractFaceDescriptors(input);
  if (!all.length) return null;
  return all.reduce((best, cur) => (cur.score > best.score ? cur : best));
}

/** Serialize a Float32Array descriptor to a plain array for storage. */
export function descriptorToArray(d: Float32Array): number[] {
  return Array.from(d);
}

export function descriptorFromArray(a: number[]): Float32Array {
  return Float32Array.from(a);
}

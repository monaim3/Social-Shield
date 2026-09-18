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

export interface FaceWithCrop extends FaceDescriptor {
  /** Base64 data URL of the cropped face region (image/png). */
  cropDataUrl: string;
  /** Detected bounding box in source-image px. */
  box: { x: number; y: number; width: number; height: number };
}

/**
 * Detect every face in the source image, return each with its 128-d descriptor
 * AND a cropped-face thumbnail (data URL). Used by the reference-image upload
 * flow: one group photo → N face references, one per person.
 *
 * `cropMaxDim` clamps the thumbnail's largest side (default 96 px).
 * `padPct` grows the crop box on each side (default 0.15 = 15% padding).
 */
export async function extractAllFacesWithCrops(
  input: DescriptorInput,
  cropMaxDim = 96,
  padPct = 0.15,
): Promise<FaceWithCrop[]> {
  const ok = await initFaceModels();
  if (!ok) return [];
  const face = await loadFaceApi();
  if (!face) return [];

  const drawable = await toDrawable(input.source);
  const src = drawable as unknown as HTMLImageElement & { width: number; height: number };
  const sourceW = "width" in src ? src.width : 0;
  const sourceH = "height" in src ? src.height : 0;
  if (!sourceW || !sourceH) return [];

  try {
    const opts = new face.TinyFaceDetectorOptions(detectorOptions() as never);
    const results = await face
      .detectAllFaces(drawable as unknown as HTMLImageElement, opts)
      .withFaceLandmarks(true)
      .withFaceDescriptors();

    return results.map((r) => {
      const box = r.detection.box;
      const pad = Math.min(box.width, box.height) * padPct;
      const cx = Math.max(0, Math.floor(box.x - pad));
      const cy = Math.max(0, Math.floor(box.y - pad));
      const cw = Math.min(sourceW - cx, Math.floor(box.width + pad * 2));
      const ch = Math.min(sourceH - cy, Math.floor(box.height + pad * 2));

      // Scale so the largest side = cropMaxDim.
      const scale = Math.min(1, cropMaxDim / Math.max(cw, ch));
      const dw = Math.max(1, Math.round(cw * scale));
      const dh = Math.max(1, Math.round(ch * scale));

      const canvas = document.createElement("canvas");
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext("2d");
      let dataUrl = "";
      if (ctx) {
        ctx.drawImage(src as unknown as CanvasImageSource, cx, cy, cw, ch, 0, 0, dw, dh);
        try {
          dataUrl = canvas.toDataURL("image/png");
        } catch {
          /* CORS-taint or blank canvas — leave dataUrl empty */
        }
      }
      return {
        descriptor: r.descriptor,
        score: r.detection.score,
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        cropDataUrl: dataUrl,
      };
    });
  } catch (e) {
    log.debug("multi-face extract failed", e);
    return [];
  } finally {
    if (drawable && "close" in drawable && typeof drawable.close === "function") {
      (drawable as ImageBitmap).close();
    }
  }
}

/** Serialize a Float32Array descriptor to a plain array for storage. */
export function descriptorToArray(d: Float32Array): number[] {
  return Array.from(d);
}

export function descriptorFromArray(a: number[]): Float32Array {
  return Float32Array.from(a);
}

import { OCR_CACHE_MAX } from "@shared/constants";
import { log } from "@shared/utils/logger";

/**
 * OCR service — tesseract.js scheduler with a single reusable worker.
 *
 * Privacy: worker script, WebAssembly core, and eng.traineddata are all
 * bundled inside the extension and served via chrome.runtime.getURL(...).
 * No CDN calls; recognition runs entirely on-device.
 */

type TesseractWorker = {
  recognize: (image: unknown) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<void>;
};

let workerPromise: Promise<TesseractWorker | null> | null = null;
const inFlight = new Map<string, Promise<string | null>>();
const cache = new Map<string, string | null>();

export interface OcrOptions {
  maxImageDimension: number;
}

function extBase(sub: string): string {
  try {
    return chrome.runtime.getURL(`tesseract/${sub}`);
  } catch {
    return `/tesseract/${sub}`;
  }
}

async function loadWorker(): Promise<TesseractWorker | null> {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    try {
      // Dynamic import so tesseract.js isn't in the initial content-script bundle.
      const mod = await import("tesseract.js");
      const worker = await mod.createWorker("eng", 1, {
        // All assets served locally from the extension.
        workerPath: extBase("worker.min.js"),
        corePath: extBase(""), // directory; tesseract picks the right variant
        langPath: extBase(""), // dir containing eng.traineddata.gz
        cacheMethod: "none",   // no IndexedDB cache needed — files are local
        logger: () => undefined,
        errorHandler: (e: unknown) => log.warn("tesseract error", e),
      });
      return worker as unknown as TesseractWorker;
    } catch (e) {
      log.error("tesseract load failed", e);
      return null;
    }
  })();
  return workerPromise;
}

function cacheGet(key: string): string | null | undefined {
  const v = cache.get(key);
  if (v !== undefined) {
    cache.delete(key);
    cache.set(key, v);
  }
  return v;
}

function cacheSet(key: string, value: string | null): void {
  cache.set(key, value);
  if (cache.size > OCR_CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
}

async function toDownscaledBlob(img: HTMLImageElement, maxDim: number): Promise<Blob | null> {
  try {
    if (!img.complete || img.naturalWidth === 0) return null;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(w, h)
        : Object.assign(document.createElement("canvas"), { width: w, height: h });
    const ctx = (canvas.getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null);
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    if ("convertToBlob" in canvas) {
      return await canvas.convertToBlob({ type: "image/png" });
    }
    return await new Promise<Blob | null>((resolve) => {
      (canvas as HTMLCanvasElement).toBlob((b) => resolve(b), "image/png");
    });
  } catch (e) {
    log.debug("toDownscaledBlob failed", e);
    return null;
  }
}

export async function recognizeImage(
  img: HTMLImageElement,
  opts: OcrOptions,
): Promise<string | null> {
  const key = img.currentSrc || img.src;
  if (!key) return null;

  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const worker = await loadWorker();
      if (!worker) return null;
      const blob = await toDownscaledBlob(img, opts.maxImageDimension);
      if (!blob) return null;
      const { data } = await worker.recognize(blob);
      const text = (data?.text ?? "").trim();
      cacheSet(key, text);
      return text;
    } catch (e) {
      log.debug("ocr recognize failed", e);
      cacheSet(key, null);
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

export async function terminateOcr(): Promise<void> {
  if (!workerPromise) return;
  const w = await workerPromise;
  workerPromise = null;
  cache.clear();
  inFlight.clear();
  try {
    await w?.terminate();
  } catch {
    /* ignore */
  }
}

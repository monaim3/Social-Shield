/**
 * Perceptual (average) hash — 64-bit aHash.
 *
 *   1. Downscale to 8x8.
 *   2. Convert to grayscale (Rec. 601 luma).
 *   3. Compute mean.
 *   4. Bit_i = 1 if pixel_i >= mean, else 0.
 *   5. Encode as 16-char hex.
 *
 * Distance between two hashes = Hamming distance (count of differing bits).
 * Identical images → 0. Cropped/resized/recompressed → typically ≤ 10.
 */

export type PHash = string;

const HEX = "0123456789abcdef";

export function aHashFromGrayscale(pixels: ArrayLike<number>): PHash {
  if (pixels.length !== 64) throw new Error(`aHash requires 64 pixels, got ${pixels.length}`);
  let sum = 0;
  for (let i = 0; i < 64; i++) sum += pixels[i];
  const mean = sum / 64;
  let hex = "";
  for (let nibble = 0; nibble < 16; nibble++) {
    let v = 0;
    for (let b = 0; b < 4; b++) {
      const idx = nibble * 4 + b;
      if (pixels[idx] >= mean) v |= 1 << (3 - b);
    }
    hex += HEX[v];
  }
  return hex;
}

export function hammingDistance(a: PHash, b: PHash): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const av = parseInt(a[i], 16);
    const bv = parseInt(b[i], 16);
    let x = av ^ bv;
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}

/**
 * Browser-only: hash from any drawable source (blob / img / bitmap / URL).
 * Requires a live document/canvas; not usable in Node tests.
 */
export async function computePHashFromSource(
  source: Blob | HTMLImageElement | ImageBitmap | string,
): Promise<PHash> {
  const bitmap = await toBitmap(source);
  try {
    const gray = drawToGrayscale8x8(bitmap);
    return aHashFromGrayscale(gray);
  } finally {
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
  }
}

async function toBitmap(source: Blob | HTMLImageElement | ImageBitmap | string): Promise<ImageBitmap> {
  if (typeof source === "string") {
    const res = await fetch(source, { credentials: "omit", mode: "cors" });
    if (!res.ok) throw new Error(`fetch ${source} → ${res.status}`);
    return await createImageBitmap(await res.blob());
  }
  if (source instanceof Blob) return createImageBitmap(source);
  if ("close" in source) return source as ImageBitmap;
  // HTMLImageElement — must be loaded and same-origin or CORS-safe.
  return createImageBitmap(source as HTMLImageElement);
}

export function drawToGrayscale8x8(bitmap: ImageBitmap): Uint8Array {
  const canvas = createCanvas(8, 8);
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(bitmap, 0, 0, 8, 8);
  const { data } = ctx.getImageData(0, 0, 8, 8);
  const out = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    out[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return out;
}

function createCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

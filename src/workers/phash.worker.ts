/// <reference lib="webworker" />
import { aHashFromGrayscale, drawToGrayscale8x8 } from "@/ai/image/phash";

export interface PhashRequest {
  id: number;
  bitmap: ImageBitmap;
}
export interface PhashResponse {
  id: number;
  ok: boolean;
  hash?: string;
  error?: string;
}

self.onmessage = (evt: MessageEvent<PhashRequest>) => {
  const { id, bitmap } = evt.data;
  try {
    const gray = drawToGrayscale8x8(bitmap);
    const hash = aHashFromGrayscale(gray);
    (self as unknown as { postMessage: (m: PhashResponse) => void }).postMessage({
      id,
      ok: true,
      hash,
    });
  } catch (e) {
    (self as unknown as { postMessage: (m: PhashResponse) => void }).postMessage({
      id,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  } finally {
    try {
      bitmap.close();
    } catch {
      /* ignore */
    }
  }
};

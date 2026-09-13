export async function makeThumbnailDataUrl(
  blob: Blob,
  maxDim = 96,
  mime = "image/jpeg",
  quality = 0.8,
): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d ctx");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL(mime, quality);
  } finally {
    bitmap.close?.();
  }
}

#!/usr/bin/env node
// Downloads Tesseract eng.traineddata.gz into public/tesseract/.
// The tesseract worker + wasm cores are copied from node_modules by
// vite-plugin-static-copy at build time — this script only fetches the
// language model, which is not shipped inside the npm packages.
//
// Run: `pnpm setup:ocr` (skipped if the file already exists).

import { mkdir, writeFile, access, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "tesseract");
const OUT_FILE = join(OUT_DIR, "eng.traineddata.gz");
const URL =
  "https://tessdata.projectnaptha.com/4.0.0_best/eng.traineddata.gz";
// Alternate mirror (LSTM-only, faster): "https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0_fast/eng.traineddata.gz"

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  if (await exists(OUT_FILE)) {
    const s = await stat(OUT_FILE);
    console.log(`✓ eng.traineddata.gz already present (${(s.size / 1024 / 1024).toFixed(1)} MB)`);
    return;
  }
  console.log(`↓ ${URL}`);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`${URL} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(OUT_FILE, buf);
  console.log(`✓ ${OUT_FILE} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

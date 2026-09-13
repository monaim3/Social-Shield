#!/usr/bin/env node
// Copies @vladmandic/face-api model files from node_modules to public/models/face/.
// The models ship inside the npm package, so no network round-trip is needed.
// Run: `pnpm setup:models` (also fine to run repeatedly — existing files are skipped).

import { mkdir, copyFile, access, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "models", "face");
const SRC_DIR = join(__dirname, "..", "node_modules", "@vladmandic", "face-api", "model");

// Tiny stack keeps bundle to ~6.5 MB.
const KEEP = new Set([
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model.bin",
  "face_landmark_68_tiny_model-weights_manifest.json",
  "face_landmark_68_tiny_model.bin",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model.bin",
]);

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(SRC_DIR))) {
    console.error(`Model source dir missing: ${SRC_DIR}`);
    console.error("Run `pnpm install` first.");
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });
  const files = await readdir(SRC_DIR);
  let copied = 0;
  let skipped = 0;
  for (const name of files) {
    if (!KEEP.has(name)) continue;
    const src = join(SRC_DIR, name);
    const dst = join(OUT_DIR, name);
    if (await exists(dst)) {
      skipped++;
      continue;
    }
    await copyFile(src, dst);
    const s = await stat(dst);
    console.log(`✓ ${name} (${(s.size / 1024).toFixed(0)} KB)`);
    copied++;
  }
  console.log(`\nDone. Copied ${copied}, skipped ${skipped}. Output: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

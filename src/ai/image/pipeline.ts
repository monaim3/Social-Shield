import { log } from "@shared/utils/logger";
import type { PhashRequest, PhashResponse } from "@/workers/phash.worker";
import { computePHashFromSource, type PHash } from "./phash";

/**
 * Worker-backed phash pipeline with main-thread fallback.
 *
 * The worker offloads canvas + grayscale + hashing to a background thread,
 * keeping the feed's scroll thread responsive. If the worker fails to spawn
 * (dev-mode HMR quirks, CSP), the pipeline transparently falls back to
 * computing on the main thread.
 */

let worker: Worker | null = null;
let workerBroken = false;
let nextId = 1;
const pending = new Map<number, { resolve: (h: string) => void; reject: (e: unknown) => void }>();

function getWorker(): Worker | null {
  if (workerBroken) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("../../workers/phash.worker.ts", import.meta.url), {
      type: "module",
      name: "socialshield-phash",
    });
    worker.onmessage = (evt: MessageEvent<PhashResponse>) => {
      const p = pending.get(evt.data.id);
      if (!p) return;
      pending.delete(evt.data.id);
      if (evt.data.ok && evt.data.hash) p.resolve(evt.data.hash);
      else p.reject(new Error(evt.data.error ?? "phash worker error"));
    };
    worker.onerror = (e) => {
      log.warn("phash worker error, falling back to main thread", e.message);
      workerBroken = true;
      worker?.terminate();
      worker = null;
      pending.forEach(({ reject }) => reject(new Error("worker crashed")));
      pending.clear();
    };
    return worker;
  } catch (e) {
    log.warn("phash worker unavailable, using main thread", e);
    workerBroken = true;
    return null;
  }
}

export async function computePHashViaWorker(source: Blob | HTMLImageElement | string): Promise<PHash> {
  const w = getWorker();
  if (!w) return computePHashFromSource(source);

  const bitmap = await toBitmap(source);
  const id = nextId++;
  return new Promise<PHash>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      const req: PhashRequest = { id, bitmap };
      w.postMessage(req, [bitmap]);
    } catch (e) {
      pending.delete(id);
      reject(e);
    }
  }).catch(async (e) => {
    log.debug("worker phash failed, retry on main", e);
    return computePHashFromSource(source);
  });
}

async function toBitmap(source: Blob | HTMLImageElement | string): Promise<ImageBitmap> {
  if (typeof source === "string") {
    const res = await fetch(source, { credentials: "omit", mode: "cors" });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    return await createImageBitmap(await res.blob());
  }
  if (source instanceof Blob) return createImageBitmap(source);
  return createImageBitmap(source);
}

export function terminatePipeline(): void {
  worker?.terminate();
  worker = null;
  workerBroken = false;
  pending.forEach(({ reject }) => reject(new Error("terminated")));
  pending.clear();
}

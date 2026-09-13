import type { MatchReason } from "@shared/types/match";
import type { PlatformKey } from "@/content/platforms/registry";

/**
 * Match history — aggregate-only IndexedDB store.
 *
 * We record ONE event per hide: profileId, reason, platform, and the day
 * bucket (YYYY-MM-DD, local time). Deliberately absent: URLs, post
 * content, image data, or anything derivable from browsing history.
 *
 * Retention is time-bounded (default 30 days); older events are pruned
 * lazily on write.
 */

export interface MatchEvent {
  id: string;
  profileId: string;
  profileName: string;
  reason: MatchReason;
  platform: PlatformKey;
  day: string; // YYYY-MM-DD (local)
  createdAt: number;
}

const DB_NAME = "socialshield-history";
const DB_VERSION = 1;
const STORE = "matchEvents";

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("day", "day", { unique: false });
        store.createIndex("profileId", "profileId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readStore(): Promise<IDBObjectStore> {
  const db = await open();
  return db.transaction(STORE, "readonly").objectStore(STORE);
}

async function writeStore(): Promise<IDBObjectStore> {
  const db = await open();
  return db.transaction(STORE, "readwrite").objectStore(STORE);
}

export const HistoryDB = {
  async record(event: MatchEvent): Promise<void> {
    const store = await writeStore();
    await wrap(store.put(event));
  },

  async recordMany(events: MatchEvent[]): Promise<void> {
    if (!events.length) return;
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, "readwrite");
      const s = t.objectStore(STORE);
      for (const e of events) s.put(e);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  },

  async all(): Promise<MatchEvent[]> {
    const store = await readStore();
    return wrap<MatchEvent[]>(store.getAll());
  },

  async sinceDay(dayInclusive: string): Promise<MatchEvent[]> {
    const store = await readStore();
    const idx = store.index("day");
    const range = IDBKeyRange.lowerBound(dayInclusive);
    return wrap<MatchEvent[]>(idx.getAll(range));
  },

  async pruneOlderThan(dayExclusive: string): Promise<number> {
    const db = await open();
    return new Promise<number>((resolve, reject) => {
      const t = db.transaction(STORE, "readwrite");
      const idx = t.objectStore(STORE).index("day");
      const range = IDBKeyRange.upperBound(dayExclusive, true);
      const cursorReq = idx.openCursor(range);
      let deleted = 0;
      cursorReq.onsuccess = () => {
        const cur = cursorReq.result;
        if (!cur) return;
        cur.delete();
        deleted++;
        cur.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
      t.oncomplete = () => resolve(deleted);
      t.onerror = () => reject(t.error);
    });
  },

  async clearAll(): Promise<void> {
    const store = await writeStore();
    await wrap(store.clear());
  },

  async count(): Promise<number> {
    const store = await readStore();
    return wrap<number>(store.count());
  },

  async _reset(): Promise<void> {
    if (dbPromise) {
      try {
        const db = await dbPromise;
        db.close();
      } catch {
        /* ignore */
      }
      dbPromise = null;
    }
  },
};

/** YYYY-MM-DD in local time, month/day zero-padded. */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** N-days-ago day key (0 = today). */
export function dayKeyOffset(n: number, ref: Date = new Date()): string {
  const d = new Date(ref);
  d.setDate(d.getDate() - n);
  return todayKey(d);
}

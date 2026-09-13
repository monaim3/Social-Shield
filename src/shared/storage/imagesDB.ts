import type { ReferenceImage } from "@shared/types/profile";

/**
 * IndexedDB store for reference-image binaries and their perceptual hashes.
 * chrome.storage.local has a 5MB quota and hits performance walls on binary
 * blobs; IndexedDB is the correct target.
 */

const DB_NAME = "socialshield";
const DB_VERSION = 1;
const STORE = "referenceImages";

export interface StoredReferenceImage extends ReferenceImage {
  blob: Blob;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("profileId", "profileId", { unique: false });
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

export const ImagesDB = {
  async put(image: StoredReferenceImage): Promise<void> {
    const store = await writeStore();
    await wrap(store.put(image));
  },

  async get(id: string): Promise<StoredReferenceImage | undefined> {
    const store = await readStore();
    return wrap<StoredReferenceImage | undefined>(store.get(id));
  },

  async delete(id: string): Promise<void> {
    const store = await writeStore();
    await wrap(store.delete(id));
  },

  async byProfile(profileId: string): Promise<StoredReferenceImage[]> {
    const store = await readStore();
    const idx = store.index("profileId");
    return wrap<StoredReferenceImage[]>(idx.getAll(profileId));
  },

  async all(): Promise<StoredReferenceImage[]> {
    const store = await readStore();
    return wrap<StoredReferenceImage[]>(store.getAll());
  },

  async deleteByProfile(profileId: string): Promise<void> {
    const list = await this.byProfile(profileId);
    await Promise.all(list.map((r) => this.delete(r.id)));
  },

  /** Test hook — closes any open connection and resets the module-level promise. */
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

/** Strip the blob before returning a shape safe for chrome.storage/message channels. */
export function stripBlob(r: StoredReferenceImage): ReferenceImage {
  const { blob: _blob, ...rest } = r;
  void _blob;
  return rest;
}

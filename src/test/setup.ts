import "@testing-library/jest-dom";

interface FakeArea {
  get: (keys: string | string[] | Record<string, unknown> | null) => Promise<Record<string, unknown>>;
  set: (obj: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
  clear: () => Promise<void>;
}

const store = new Map<string, unknown>();

const fakeArea: FakeArea = {
  async get(keys) {
    if (keys === null || keys === undefined) {
      return Object.fromEntries(store);
    }
    const out: Record<string, unknown> = {};
    const list =
      typeof keys === "string"
        ? [keys]
        : Array.isArray(keys)
          ? keys
          : Object.keys(keys);
    for (const k of list) {
      if (store.has(k)) out[k] = store.get(k);
      else if (!Array.isArray(keys) && typeof keys === "object" && keys)
        out[k] = (keys as Record<string, unknown>)[k];
    }
    return out;
  },
  async set(obj) {
    for (const [k, v] of Object.entries(obj)) store.set(k, v);
  },
  async remove(keys) {
    (Array.isArray(keys) ? keys : [keys]).forEach((k) => store.delete(k));
  },
  async clear() {
    store.clear();
  },
};

const listeners: Array<(changes: unknown, area: string) => void> = [];

(globalThis as unknown as { chrome: unknown }).chrome = {
  storage: {
    local: fakeArea,
    onChanged: {
      addListener: (l: (c: unknown, a: string) => void) => listeners.push(l),
      removeListener: () => undefined,
    },
  },
  runtime: {
    id: "test",
    lastError: null,
    sendMessage: () => undefined,
    onMessage: { addListener: () => undefined },
    onInstalled: { addListener: () => undefined },
    onStartup: { addListener: () => undefined },
  },
  tabs: { query: async () => [], sendMessage: async () => undefined },
};

// Reset per test.
beforeEach(async () => {
  await fakeArea.clear();
});

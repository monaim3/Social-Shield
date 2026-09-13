import { DEFAULT_SETTINGS, SCHEMA_VERSION, STORAGE_KEYS } from "../constants";
import type { BlockProfile, GlobalSettings } from "../types/profile";
import { ensureProfileV2, ensureSettings, migrate } from "./schema";

type Changes = { [key: string]: chrome.storage.StorageChange };
type Listener = (state: { profiles: BlockProfile[]; settings: GlobalSettings }) => void;

const area = (): chrome.storage.LocalStorageArea => chrome.storage.local;

export class StorageService {
  private static listeners = new Set<Listener>();
  private static initialized = false;

  static async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    const raw = await area().get([
      STORAGE_KEYS.version,
      STORAGE_KEYS.profiles,
      STORAGE_KEYS.settings,
    ]);
    const storedVersion = typeof raw[STORAGE_KEYS.version] === "number" ? (raw[STORAGE_KEYS.version] as number) : 0;
    if (storedVersion !== SCHEMA_VERSION) {
      const result = migrate(raw[STORAGE_KEYS.profiles], raw[STORAGE_KEYS.settings], storedVersion);
      await area().set({
        [STORAGE_KEYS.version]: SCHEMA_VERSION,
        [STORAGE_KEYS.profiles]: result.profiles,
        [STORAGE_KEYS.settings]: result.settings,
      });
    }
    chrome.storage.onChanged.addListener(this.onChanged);
  }

  private static onChanged = async (changes: Changes, areaName: string): Promise<void> => {
    if (areaName !== "local") return;
    if (!(STORAGE_KEYS.profiles in changes) && !(STORAGE_KEYS.settings in changes)) return;
    const state = await StorageService.getState();
    StorageService.listeners.forEach((l) => {
      try {
        l(state);
      } catch (e) {
        console.error("[SocialShield] listener error", e);
      }
    });
  };

  static async getState(): Promise<{ profiles: BlockProfile[]; settings: GlobalSettings }> {
    const raw = await area().get([STORAGE_KEYS.profiles, STORAGE_KEYS.settings]);
    const profiles = Array.isArray(raw[STORAGE_KEYS.profiles])
      ? (raw[STORAGE_KEYS.profiles] as unknown[]).map((p) => ensureProfileV2(p))
      : [];
    const settings = ensureSettings(raw[STORAGE_KEYS.settings]) ?? DEFAULT_SETTINGS;
    return { profiles, settings };
  }

  static async getProfiles(): Promise<BlockProfile[]> {
    const raw = await area().get(STORAGE_KEYS.profiles);
    const list = raw[STORAGE_KEYS.profiles];
    return Array.isArray(list) ? (list as unknown[]).map((p) => ensureProfileV2(p)) : [];
  }

  static async saveProfiles(profiles: BlockProfile[]): Promise<void> {
    await area().set({ [STORAGE_KEYS.profiles]: profiles });
  }

  static async getSettings(): Promise<GlobalSettings> {
    const raw = await area().get(STORAGE_KEYS.settings);
    return ensureSettings(raw[STORAGE_KEYS.settings]);
  }

  static async saveSettings(settings: GlobalSettings): Promise<void> {
    await area().set({ [STORAGE_KEYS.settings]: settings });
  }

  static subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

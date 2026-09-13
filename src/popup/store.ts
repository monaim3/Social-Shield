import { create } from "zustand";
import { StorageService } from "@shared/storage/StorageService";
import type { BlockProfile, GlobalSettings } from "@shared/types/profile";
import {
  DEFAULT_CONTEXT_SIGNALS,
  DEFAULT_DETECTION_MODE,
  DEFAULT_PROFILE_SETTINGS,
  DEFAULT_SETTINGS,
  DEFAULT_THRESHOLDS,
} from "@shared/constants";
import { uid } from "@shared/utils/id";

interface PopupState {
  profiles: BlockProfile[];
  settings: GlobalSettings;
  loading: boolean;
  init: () => Promise<void>;
  createProfile: (partial: Partial<BlockProfile>) => Promise<BlockProfile>;
  updateProfile: (id: string, patch: Partial<BlockProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  toggleProfile: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<GlobalSettings>) => Promise<void>;
}

export const usePopupStore = create<PopupState>((set, get) => ({
  profiles: [],
  settings: DEFAULT_SETTINGS,
  loading: true,

  async init() {
    await StorageService.init();
    const state = await StorageService.getState();
    set({ profiles: state.profiles, settings: state.settings, loading: false });
    StorageService.subscribe((s) => set({ profiles: s.profiles, settings: s.settings }));
  },

  async createProfile(partial) {
    const now = Date.now();
    const profile: BlockProfile = {
      id: uid(),
      name: partial.name?.trim() ?? "Untitled",
      aliases: partial.aliases ?? [],
      contextSignals: { ...DEFAULT_CONTEXT_SIGNALS, ...(partial.contextSignals ?? {}) },
      referenceImages: [],
      enabled: true,
      settings: { ...DEFAULT_PROFILE_SETTINGS, ...partial.settings },
      thresholds: { ...DEFAULT_THRESHOLDS, ...partial.thresholds },
      detectionMode: partial.detectionMode ?? DEFAULT_DETECTION_MODE,
      createdAt: now,
      updatedAt: now,
    };
    const next = [...get().profiles, profile];
    await StorageService.saveProfiles(next);
    set({ profiles: next });
    return profile;
  },

  async updateProfile(id, patch) {
    const next = get().profiles.map((p) =>
      p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
    );
    await StorageService.saveProfiles(next);
    set({ profiles: next });
  },

  async deleteProfile(id) {
    const next = get().profiles.filter((p) => p.id !== id);
    await StorageService.saveProfiles(next);
    set({ profiles: next });
  },

  async toggleProfile(id) {
    const p = get().profiles.find((x) => x.id === id);
    if (!p) return;
    await get().updateProfile(id, { enabled: !p.enabled });
  },

  async updateSettings(patch) {
    const next = { ...get().settings, ...patch };
    await StorageService.saveSettings(next);
    set({ settings: next });
  },
}));

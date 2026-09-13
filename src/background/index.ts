import { StorageService } from "@shared/storage/StorageService";
import { HistoryDB, todayKey, dayKeyOffset } from "@shared/storage/historyDB";
import { MSG, type ExtMessage, type GetStateReply } from "@shared/types/message";
import { uid } from "@shared/utils/id";
import { log } from "@shared/utils/logger";

const BROADCAST_URLS = [
  "*://*.facebook.com/*",
  "*://*.x.com/*",
  "*://*.twitter.com/*",
  "*://*.youtube.com/*",
  "*://*.instagram.com/*",
];

async function broadcast(msg: ExtMessage): Promise<void> {
  const tabs = await chrome.tabs.query({ url: BROADCAST_URLS });
  await Promise.all(
    tabs.map((t) =>
      t.id != null
        ? chrome.tabs.sendMessage(t.id, msg).catch(() => undefined)
        : undefined,
    ),
  );
}

chrome.runtime.onInstalled.addListener(async () => {
  await StorageService.init();
  log.info("installed");
});

chrome.runtime.onStartup.addListener(async () => {
  await StorageService.init();
});

StorageService.subscribe((state) => {
  void broadcast({ type: MSG.PROFILES_UPDATED, profiles: state.profiles });
  void broadcast({ type: MSG.SETTINGS_UPDATED, settings: state.settings });
});

let lastPruneDay = "";

async function handleRecord(msg: Extract<ExtMessage, { type: typeof MSG.RECORD_MATCH }>): Promise<void> {
  const settings = await StorageService.getSettings();
  if (!settings.history.enabled) return;
  const today = todayKey();
  await HistoryDB.record({
    id: uid("m"),
    profileId: msg.profileId,
    profileName: msg.profileName,
    reason: msg.reason,
    platform: msg.platform,
    day: today,
    createdAt: Date.now(),
  });
  if (lastPruneDay !== today) {
    lastPruneDay = today;
    const cutoff = dayKeyOffset(settings.history.retentionDays);
    await HistoryDB.pruneOlderThan(cutoff).catch(() => undefined);
  }
}

chrome.runtime.onMessage.addListener((msg: ExtMessage, _sender, sendResponse) => {
  if (msg?.type === MSG.GET_STATE) {
    StorageService.getState()
      .then((state) => sendResponse(state satisfies GetStateReply))
      .catch(() => sendResponse({ profiles: [], settings: null }));
    return true;
  }
  if (msg?.type === MSG.RECORD_MATCH) {
    handleRecord(msg).catch((e) => log.debug("record failed", e));
    // Fire-and-forget — no reply needed.
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === MSG.PING) {
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

void StorageService.init();

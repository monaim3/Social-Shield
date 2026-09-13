import { MSG, type ExtMessage, type GetStateReply } from "@shared/types/message";
import type { BlockProfile, GlobalSettings } from "@shared/types/profile";
import type { MatchResult } from "@shared/types/match";
import { DEFAULT_SETTINGS, MAX_PROCESSING_BATCH } from "@shared/constants";
import { log, setDebug } from "@shared/utils/logger";
import { detectPlatform, pickAdapter, type PlatformKey } from "./platforms/registry";
import type { PlatformAdapter } from "./platforms/base";
import { MatchEngine } from "./matcher/engine";
import { FeedObserver } from "./observer/mutation";

let profiles: BlockProfile[] = [];
let settings: GlobalSettings = DEFAULT_SETTINGS;
let adapter: PlatformAdapter | null = null;
let engine: MatchEngine | null = null;
let observer: FeedObserver | null = null;
let platform: PlatformKey | null = null;
let asyncObserver: IntersectionObserver | null = null;
const asyncQueued = new WeakSet<HTMLElement>();

async function bootstrap(): Promise<void> {
  platform = detectPlatform();
  if (!platform) return;

  try {
    const state = await requestState();
    profiles = state.profiles;
    settings = state.settings;
    setDebug(settings.debug);
  } catch {
    profiles = [];
    settings = DEFAULT_SETTINGS;
  }

  if (!isPlatformEnabled(platform, settings)) {
    log.debug("platform gated off", platform);
    return;
  }

  adapter = pickAdapter({ hideMode: () => settings.hideMode });
  if (!adapter || !adapter.isSupported()) return;

  engine = new MatchEngine(profiles, settings);
  asyncObserver = new IntersectionObserver(handleIntersect, { rootMargin: "200px" });

  observer = new FeedObserver(document.body, processRoots, restartAfterNav);
  observer.start();
  log.info("content script active on", adapter.name);
}

function isPlatformEnabled(key: PlatformKey, s: GlobalSettings): boolean {
  return s.enabled && s.platforms[key];
}

function requestState(): Promise<GetStateReply> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ type: MSG.GET_STATE }, (reply: GetStateReply) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(reply);
      });
    } catch (e) {
      reject(e);
    }
  });
}

function processRoots(roots: Element[]): void {
  if (!adapter || !engine) return;
  const posts = adapter.findPosts(roots);
  if (!posts.length) return;

  const batches = chunk(posts, MAX_PROCESSING_BATCH);
  for (const batch of batches) {
    for (const post of batch) {
      try {
        const text = adapter.extractText(post);
        const result = engine.evaluateText({ text });
        if (shouldHide(result)) {
          adapter.hidePost(post, result!);
          reportMatch(result!);
          log.debug("hide (text)", result);
          continue;
        }
        // Not a hide-worthy text result yet. If there are async checks pending,
        // queue the post so image / face / OCR can still promote it to "match".
        maybeQueueAsync(post);
      } catch (e) {
        log.error("post error", e);
      }
    }
  }
}

function shouldHide(result: MatchResult | null): boolean {
  if (!result) return false;
  if (result.decision === "match") return true;
  if (result.decision === "ambiguous" && settings.hideAmbiguous) return true;
  return false;
}

function reportMatch(result: MatchResult): void {
  if (!settings.history.enabled) return;
  if (!platform || !result.profileId) return;
  // Use the highest-weight hit's reason as the classifier for history.
  const top = result.hits.reduce((a, b) => (a.score >= b.score ? a : b), result.hits[0]);
  const reason = top?.reason;
  if (!reason) return;
  try {
    chrome.runtime.sendMessage({
      type: MSG.RECORD_MATCH,
      profileId: result.profileId,
      profileName: result.profileName ?? "unknown",
      reason,
      platform,
    });
  } catch {
    /* SW may be asleep; next hide will re-attempt */
  }
}

function maybeQueueAsync(post: HTMLElement): void {
  if (!engine || !adapter || !engine.hasAsyncChecks()) return;
  if (asyncQueued.has(post)) return;
  asyncQueued.add(post);
  asyncObserver?.observe(post);
}

function handleIntersect(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const post = entry.target as HTMLElement;
    asyncObserver?.unobserve(post);
    void runAsyncCheck(post);
  }
}

async function runAsyncCheck(post: HTMLElement): Promise<void> {
  if (!engine || !adapter) return;
  try {
    const images = adapter.extractImages?.(post) ?? [];
    if (!images.length) return;
    const text = adapter.extractText(post);
    const result = await engine.evaluateAsync({ text, images });
    if (shouldHide(result)) {
      adapter.hidePost(post, result!);
      reportMatch(result!);
      log.debug("hide (async)", result);
    }
  } catch (e) {
    log.error("async post error", e);
  }
}

function restartAfterNav(): void {
  log.debug("navigation, refresh");
  processRoots([document.body]);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function teardown(): void {
  observer?.stop();
  observer = null;
  asyncObserver?.disconnect();
  asyncObserver = null;
  adapter = null;
  engine = null;
}

async function reboot(): Promise<void> {
  teardown();
  await bootstrap();
}

chrome.runtime.onMessage.addListener((msg: ExtMessage) => {
  if (msg?.type === MSG.PROFILES_UPDATED) {
    profiles = msg.profiles;
    if (engine) {
      engine.setProfiles(profiles);
      processRoots([document.body]);
    }
  } else if (msg?.type === MSG.SETTINGS_UPDATED) {
    const prev = settings;
    settings = msg.settings;
    setDebug(settings.debug);
    const wasOn = platform ? isPlatformEnabled(platform, prev) : false;
    const isOn = platform ? isPlatformEnabled(platform, settings) : false;
    if (wasOn !== isOn) {
      void reboot();
      return;
    }
    if (engine) {
      engine.setSettings(settings);
      processRoots([document.body]);
    }
  }
});

void bootstrap();
window.addEventListener("beforeunload", teardown);

// YouTube uses custom elements (ytd-*). Home / search / watch-sidebar / shorts each use different tags.
export const YT_POST_SELECTORS: readonly string[] = [
  "ytd-rich-item-renderer",                     // home grid
  "ytd-rich-grid-media",                         // home grid inner
  "ytd-video-renderer",                          // search results
  "ytd-compact-video-renderer",                  // watch page sidebar
  "ytd-compact-radio-renderer",                  // sidebar mix
  "ytd-grid-video-renderer",                     // channel grid (legacy)
  "ytd-reel-item-renderer",                      // shorts shelf (older)
  // Note: ytm-shorts-lockup-view-model is nested INSIDE -v2. Match outer only
  // to avoid double-hiding the same visible card.
  "ytm-shorts-lockup-view-model-v2",             // shorts lockup (current)
  "yt-lockup-view-model",                        // generic v2 lockup (search)
  "ytd-reel-video-renderer",                     // fullscreen shorts player card
  "ytd-shelf-renderer",                          // topic shelves
  "ytd-radio-renderer",                          // playlists / mixes in search
  // Shorts opened as detail page (URL /shorts/{id})
  "ytd-shorts",
  "yt-shorts-player-video-view-model",
  "ytd-reel-video-in-sequence-renderer",
  // Individual short cell inside a reel shelf (do NOT match the outer shelf
  // itself — one matching short would collapse the entire shelf).
  "ytm-shorts-video-cell",
];

export const YT_TEXT_SKIP_SELECTORS: readonly string[] = [
  "script",
  "style",
  "yt-icon",
  "svg",
];

export function isYouTubeHost(hostname: string = location.hostname): boolean {
  return /(^|\.)youtube\.com$/.test(hostname);
}

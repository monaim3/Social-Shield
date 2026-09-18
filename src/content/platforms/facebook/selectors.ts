// Facebook DOM shifts often. Layered candidates. Add more here without touching adapter logic.
export const FB_POST_SELECTORS: readonly string[] = [
  '[role="article"]',
  '[data-pagelet^="FeedUnit"]',
  '[data-pagelet="Reels"] [role="article"]',
  // Search-results video cards
  '[data-pagelet^="SearchResults"] [role="article"]',
  '[data-pagelet^="SearchResults"] div[data-visualcompletion="ignore-dynamic"] > div',
  // Watch page + reels standalone
  '[data-pagelet^="VideoChaining"]',
  '[data-pagelet^="ReelViewer"]',
  // Legacy video cards
  'div[data-testid="post_container"]',
  // Search results 2026 shape: message div is the anchor. Hiding this
  // collapses the caption/text; author + reactions remain visible but empty.
  // Better than nothing while FB obfuscates outer wrappers.
  'div[data-ad-preview="message"]',
  'div[data-ad-comet-preview="message"]',
];

// Elements to skip while extracting text to reduce noise.
export const FB_TEXT_SKIP_SELECTORS: readonly string[] = [
  '[aria-hidden="true"]',
  "script",
  "style",
  "noscript",
  '[role="button"] svg',
];

export function isFacebookHost(hostname: string = location.hostname): boolean {
  return /(^|\.)facebook\.com$/.test(hostname);
}

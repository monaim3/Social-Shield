// Instagram — feed uses <article>, explore uses <a href="/p/…">, reels use tab panels.
export const IG_POST_SELECTORS: readonly string[] = [
  "article",
  'div[role="dialog"] article',
  'a[href^="/p/"]',
  'a[href^="/reel/"]',
];

export const IG_TEXT_SKIP_SELECTORS: readonly string[] = [
  "script",
  "style",
  "svg",
];

export function isInstagramHost(hostname: string = location.hostname): boolean {
  return /(^|\.)instagram\.com$/.test(hostname);
}

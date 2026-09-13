// X (Twitter) — tweets have data-testid="tweet"; timeline cells add a layer.
export const X_POST_SELECTORS: readonly string[] = [
  'article[data-testid="tweet"]',
  'div[data-testid="cellInnerDiv"] article',
];

export const X_TEXT_SKIP_SELECTORS: readonly string[] = [
  "script",
  "style",
  "svg",
];

export function isXHost(hostname: string = location.hostname): boolean {
  return /(^|\.)(x|twitter)\.com$/.test(hostname);
}

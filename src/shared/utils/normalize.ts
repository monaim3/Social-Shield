const PUNCT_RE = /[\p{P}\p{S}]+/gu;
const WS_RE = /\s+/g;

export function normalize(input: string): string {
  if (!input) return "";
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(PUNCT_RE, " ")
    .replace(WS_RE, " ")
    .trim();
}

export function normalizeLoose(input: string): string {
  if (!input) return "";
  return input.normalize("NFKC").toLowerCase().replace(WS_RE, " ").trim();
}

const RE_ESCAPE = /[.*+?^${}()|[\]\\]/g;
export function escapeRegex(s: string): string {
  return s.replace(RE_ESCAPE, "\\$&");
}

export function wordBoundaryRegex(term: string): RegExp {
  const t = escapeRegex(term.trim());
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${t}(?:[^\\p{L}\\p{N}]|$)`, "iu");
}

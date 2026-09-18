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

/**
 * Strip Bangla graphemes that vary between spellings but represent the same
 * word to native readers:
 *   ঁ (U+0981 chandrabindu, nasalization)
 *   ং (U+0982 anusvara)
 *   ঃ (U+0983 visarga)
 *   ় (U+09BC nukta)
 * So "খাঁন" and "খান" compare equal; "রাশেদ" always matches regardless of
 * these optional marks around it.
 */
export function stripBanglaVariations(s: string): string {
  return s.replace(/[ঁংঃ়]/g, "");
}

/**
 * Generate match variants for an identity term.
 * - strict: as-typed after normalize
 * - stripped: Bangla-variation-insensitive (only if different from strict)
 * - concat: whitespace collapsed to catch hashtags ("Rashed Khan" → "rashedkhan"
 *   matches "#rashedkhan" or "RashedKhan" as a word-boundary hit)
 * - stripped+concat: both applied
 * Empty and duplicate variants are removed.
 */
export function nameVariants(term: string): string[] {
  const strict = normalize(term);
  if (!strict) return [];
  const out = new Set<string>([strict]);
  const stripped = stripBanglaVariations(strict);
  if (stripped) out.add(stripped);
  const concat = strict.replace(/\s+/g, "");
  if (concat) out.add(concat);
  const strippedConcat = stripped.replace(/\s+/g, "");
  if (strippedConcat) out.add(strippedConcat);
  return Array.from(out);
}

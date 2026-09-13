import { SEEN_ATTR } from "@shared/constants";

export function findByAny(roots: Element[], selector: string): HTMLElement[] {
  const found = new Set<HTMLElement>();
  for (const root of roots) {
    if (!(root instanceof Element)) continue;
    if (root.matches?.(selector)) found.add(root as HTMLElement);
    root.querySelectorAll?.<HTMLElement>(selector).forEach((el) => found.add(el));
  }
  return Array.from(found);
}

export function filterUnseen(elements: HTMLElement[]): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const el of elements) {
    if (el.hasAttribute(SEEN_ATTR)) continue;
    el.setAttribute(SEEN_ATTR, "1");
    out.push(el);
  }
  return out;
}

export function collectText(
  post: HTMLElement,
  opts: { skipSelector?: string; includeAlt?: boolean; includeAria?: boolean } = {},
): string {
  const { skipSelector, includeAlt = true, includeAria = true } = opts;
  const clone = post.cloneNode(true) as HTMLElement;
  if (skipSelector) clone.querySelectorAll(skipSelector).forEach((n) => n.remove());
  const parts: string[] = [clone.innerText || clone.textContent || ""];
  if (includeAria) {
    post.querySelectorAll<HTMLElement>("[aria-label]").forEach((el) => {
      const v = el.getAttribute("aria-label");
      if (v) parts.push(v);
    });
  }
  if (includeAlt) {
    post.querySelectorAll<HTMLImageElement>("img[alt]").forEach((img) => {
      if (img.alt) parts.push(img.alt);
    });
  }
  return parts.join(" \n ");
}

export function findAncestor(el: Element, selector: string, maxDepth = 8): HTMLElement | null {
  let cur: Element | null = el;
  let depth = 0;
  while (cur && depth < maxDepth) {
    if (cur.matches?.(selector)) return cur as HTMLElement;
    cur = cur.parentElement;
    depth++;
  }
  return null;
}

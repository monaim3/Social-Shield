import type { MatchResult } from "@shared/types/match";
import type { HideMode } from "@shared/types/profile";
import { HIDDEN_ATTR, PLACEHOLDER_CLASS } from "@shared/constants";

const ORIGINAL_DISPLAY = "data-socialshield-orig-display";

export function hidePost(post: HTMLElement, result: MatchResult, mode: HideMode): void {
  if (post.hasAttribute(HIDDEN_ATTR)) return;
  post.setAttribute(HIDDEN_ATTR, "1");

  if (mode === "hide") {
    post.setAttribute(ORIGINAL_DISPLAY, post.style.display || "");
    post.style.setProperty("display", "none", "important");
    return;
  }

  if (mode === "blur") {
    post.style.setProperty("filter", "blur(18px)", "important");
    post.style.setProperty("pointer-events", "none", "important");
    return;
  }

  const placeholder = buildPlaceholder(result, () => restorePost(post));

  Array.from(post.children).forEach((c) => {
    (c as HTMLElement).style.setProperty("display", "none", "important");
  });
  post.appendChild(placeholder);
}

export function restorePost(post: HTMLElement): void {
  post.removeAttribute(HIDDEN_ATTR);
  post.style.removeProperty("filter");
  post.style.removeProperty("pointer-events");
  const orig = post.getAttribute(ORIGINAL_DISPLAY);
  if (orig !== null) {
    post.style.display = orig;
    post.removeAttribute(ORIGINAL_DISPLAY);
  } else {
    post.style.removeProperty("display");
  }
  Array.from(post.querySelectorAll<HTMLElement>(`.${PLACEHOLDER_CLASS}`)).forEach((n) => n.remove());
  Array.from(post.children).forEach((c) => {
    (c as HTMLElement).style.removeProperty("display");
  });
}

function buildPlaceholder(result: MatchResult, onShow: () => void): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = PLACEHOLDER_CLASS;
  Object.assign(wrap.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "14px 16px",
    margin: "8px 0",
    borderRadius: "10px",
    background:
      result.decision === "ambiguous"
        ? "linear-gradient(135deg,#fefce8,#fef3c7)"
        : "linear-gradient(135deg,#eef2ff,#f5f3ff)",
    border:
      result.decision === "ambiguous" ? "1px solid #fde68a" : "1px solid #c7d2fe",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    fontSize: "13px",
    color: result.decision === "ambiguous" ? "#854d0e" : "#3730a3",
  } satisfies Partial<CSSStyleDeclaration>);

  const info = document.createElement("div");
  const signalStr = [
    result.signals.identity ? "identity" : null,
    result.signals.context ? "context" : null,
    result.signals.visual ? "visual" : null,
    result.signals.ocr ? "ocr" : null,
  ]
    .filter(Boolean)
    .join(" + ");
  const label = result.decision === "ambiguous" ? "ambiguous" : "hidden";
  info.innerHTML = `<strong>SocialShield</strong> ${label}: <em>${escape(
    result.profileName ?? "match",
  )}</em> · ${escape(signalStr || "match")}`;
  wrap.appendChild(info);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Show";
  Object.assign(btn.style, {
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #4f46e5",
    background: "#4f46e5",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "600",
  } satisfies Partial<CSSStyleDeclaration>);
  btn.addEventListener("click", onShow, { once: true });
  wrap.appendChild(btn);
  return wrap;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

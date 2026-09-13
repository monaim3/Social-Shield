import type { PlatformAdapter } from "../base";
import type { MatchResult } from "@shared/types/match";
import type { HideMode } from "@shared/types/profile";
import { collectText, filterUnseen, findByAny } from "../shared";
import { hidePost as doHide, restorePost as doRestore } from "@/content/hider/placeholder";
import { IG_POST_SELECTORS, IG_TEXT_SKIP_SELECTORS, isInstagramHost } from "./selectors";

interface Options {
  hideMode: () => HideMode;
}

export function createInstagramAdapter(opts: Options): PlatformAdapter {
  const selector = IG_POST_SELECTORS.join(", ");
  const skipSelector = IG_TEXT_SKIP_SELECTORS.join(", ");

  return {
    name: "instagram",
    isSupported: () => isInstagramHost(),

    findPosts(roots) {
      return filterUnseen(findByAny(roots, selector));
    },

    extractText(post) {
      const parts: string[] = [];
      // Username link
      post.querySelectorAll<HTMLAnchorElement>('a[role="link"]').forEach((a) => {
        const t = a.textContent?.trim();
        if (t && t.length < 60) parts.push(t);
      });
      // Caption span (h1 often used for reels)
      post.querySelectorAll<HTMLElement>("h1, h2, span").forEach((el) => {
        const t = el.textContent;
        if (t && t.length > 3 && t.length < 500) parts.push(t);
      });
      // Alt text — IG generates descriptive alts.
      post.querySelectorAll<HTMLImageElement>("img[alt]").forEach((img) => {
        if (img.alt) parts.push(img.alt);
      });
      // Generic fallback.
      parts.push(collectText(post, { skipSelector, includeAria: true, includeAlt: false }));
      return parts.join(" \n ");
    },

    extractImages(post) {
      return Array.from(post.querySelectorAll<HTMLImageElement>("img"));
    },

    hidePost(post, result: MatchResult) {
      doHide(post, result, opts.hideMode());
    },

    restorePost(post) {
      doRestore(post);
    },
  };
}

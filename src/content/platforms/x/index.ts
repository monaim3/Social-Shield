import type { PlatformAdapter } from "../base";
import type { MatchResult } from "@shared/types/match";
import type { HideMode } from "@shared/types/profile";
import { collectText, filterUnseen, findByAny, findAncestor } from "../shared";
import { hidePost as doHide, restorePost as doRestore } from "@/content/hider/placeholder";
import { X_POST_SELECTORS, X_TEXT_SKIP_SELECTORS, isXHost } from "./selectors";

interface Options {
  hideMode: () => HideMode;
}

export function createXAdapter(opts: Options): PlatformAdapter {
  const selector = X_POST_SELECTORS.join(", ");
  const skipSelector = X_TEXT_SKIP_SELECTORS.join(", ");

  return {
    name: "x",
    isSupported: () => isXHost(),

    findPosts(roots) {
      // Prefer the enclosing cellInnerDiv so collapsing hides margin/borders cleanly.
      const raw = findByAny(roots, selector);
      const cells: HTMLElement[] = [];
      for (const el of raw) {
        const cell = findAncestor(el, 'div[data-testid="cellInnerDiv"]', 6) ?? el;
        cells.push(cell);
      }
      return filterUnseen(cells);
    },

    extractText(post) {
      const parts: string[] = [];
      const tweetText = post.querySelector<HTMLElement>('div[data-testid="tweetText"]');
      if (tweetText) parts.push(tweetText.innerText || tweetText.textContent || "");

      const userName = post.querySelector<HTMLElement>('div[data-testid="User-Name"]');
      if (userName) parts.push(userName.innerText || userName.textContent || "");

      // Quoted tweet inside.
      post.querySelectorAll<HTMLElement>('div[data-testid="tweetText"]').forEach((n) => {
        parts.push(n.innerText || n.textContent || "");
      });

      parts.push(collectText(post, { skipSelector, includeAria: true, includeAlt: true }));
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

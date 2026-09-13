import type { PlatformAdapter } from "../base";
import type { MatchResult } from "@shared/types/match";
import { FB_POST_SELECTORS, FB_TEXT_SKIP_SELECTORS, isFacebookHost } from "./selectors";
import { hidePost as doHide, restorePost as doRestore } from "@/content/hider/placeholder";
import type { HideMode } from "@shared/types/profile";
import { collectText, filterUnseen, findByAny } from "../shared";

interface FacebookAdapterOptions {
  hideMode: () => HideMode;
}

export function createFacebookAdapter(opts: FacebookAdapterOptions): PlatformAdapter {
  const selector = FB_POST_SELECTORS.join(", ");
  const skipSelector = FB_TEXT_SKIP_SELECTORS.join(", ");

  return {
    name: "facebook",
    isSupported: () => isFacebookHost(),

    findPosts(roots) {
      return filterUnseen(findByAny(roots, selector));
    },

    extractText(post) {
      return collectText(post, { skipSelector, includeAlt: true, includeAria: true });
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

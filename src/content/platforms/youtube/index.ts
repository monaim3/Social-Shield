import type { PlatformAdapter } from "../base";
import type { MatchResult } from "@shared/types/match";
import type { HideMode } from "@shared/types/profile";
import { collectText, filterUnseen, findByAny } from "../shared";
import { hidePost as doHide, restorePost as doRestore } from "@/content/hider/placeholder";
import { YT_POST_SELECTORS, YT_TEXT_SKIP_SELECTORS, isYouTubeHost } from "./selectors";

interface Options {
  hideMode: () => HideMode;
}

export function createYouTubeAdapter(opts: Options): PlatformAdapter {
  const selector = YT_POST_SELECTORS.join(", ");
  const skipSelector = YT_TEXT_SKIP_SELECTORS.join(", ");

  return {
    name: "youtube",
    isSupported: () => isYouTubeHost(),

    findPosts(roots) {
      return filterUnseen(findByAny(roots, selector));
    },

    extractText(post) {
      const parts: string[] = [];
      // Title
      const titleEl =
        post.querySelector<HTMLElement>("#video-title") ||
        post.querySelector<HTMLElement>("yt-formatted-string#video-title") ||
        post.querySelector<HTMLElement>('a[title]');
      if (titleEl) {
        parts.push(titleEl.getAttribute("title") ?? "");
        parts.push(titleEl.textContent ?? "");
      }
      // Channel name
      const channelEl =
        post.querySelector<HTMLElement>("ytd-channel-name #text") ||
        post.querySelector<HTMLElement>("#channel-name") ||
        post.querySelector<HTMLElement>("#byline");
      if (channelEl) parts.push(channelEl.textContent ?? "");
      // Description snippet (search)
      const descEl = post.querySelector<HTMLElement>(".metadata-snippet-text, #description-text");
      if (descEl) parts.push(descEl.textContent ?? "");
      // Fallback general text + alt/aria.
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

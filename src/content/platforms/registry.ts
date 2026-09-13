import type { PlatformAdapter } from "./base";
import type { HideMode } from "@shared/types/profile";
import { createFacebookAdapter } from "./facebook";
import { isFacebookHost } from "./facebook/selectors";
import { createYouTubeAdapter } from "./youtube";
import { isYouTubeHost } from "./youtube/selectors";
import { createXAdapter } from "./x";
import { isXHost } from "./x/selectors";
import { createInstagramAdapter } from "./instagram";
import { isInstagramHost } from "./instagram/selectors";

export type PlatformKey = "facebook" | "x" | "youtube" | "instagram";

export interface AdapterCtx {
  hideMode: () => HideMode;
}

export function detectPlatform(): PlatformKey | null {
  if (isFacebookHost()) return "facebook";
  if (isYouTubeHost()) return "youtube";
  if (isXHost()) return "x";
  if (isInstagramHost()) return "instagram";
  return null;
}

export function pickAdapter(ctx: AdapterCtx): PlatformAdapter | null {
  const key = detectPlatform();
  switch (key) {
    case "facebook":
      return createFacebookAdapter({ hideMode: ctx.hideMode });
    case "youtube":
      return createYouTubeAdapter({ hideMode: ctx.hideMode });
    case "x":
      return createXAdapter({ hideMode: ctx.hideMode });
    case "instagram":
      return createInstagramAdapter({ hideMode: ctx.hideMode });
    default:
      return null;
  }
}

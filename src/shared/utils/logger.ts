let debugEnabled = false;

export function setDebug(v: boolean): void {
  debugEnabled = v;
}

export const log = {
  debug: (...a: unknown[]) => {
    if (debugEnabled) console.debug("[SocialShield]", ...a);
  },
  info: (...a: unknown[]) => console.info("[SocialShield]", ...a),
  warn: (...a: unknown[]) => console.warn("[SocialShield]", ...a),
  error: (...a: unknown[]) => console.error("[SocialShield]", ...a),
};

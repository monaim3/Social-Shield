import { OBSERVER_DEBOUNCE_MS } from "@shared/constants";

export type ProcessFn = (roots: Element[]) => void;

export class FeedObserver {
  private mo?: MutationObserver;
  private timer?: number;
  private pending = new Set<Element>();
  private urlPoll?: number;
  private lastUrl = location.href;

  constructor(
    private root: Node,
    private process: ProcessFn,
    private onNavigate: () => void,
  ) {}

  start(): void {
    this.mo = new MutationObserver((records) => this.enqueue(records));
    this.mo.observe(this.root, { childList: true, subtree: true });
    this.hookHistory();
    this.urlPoll = window.setInterval(() => this.checkUrl(), 500);
    // Initial pass.
    this.process([this.root as Element]);
  }

  stop(): void {
    this.mo?.disconnect();
    if (this.timer) window.clearTimeout(this.timer);
    if (this.urlPoll) window.clearInterval(this.urlPoll);
  }

  private enqueue(records: MutationRecord[]): void {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n.nodeType === Node.ELEMENT_NODE) this.pending.add(n as Element);
      });
    }
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.flush(), OBSERVER_DEBOUNCE_MS);
  }

  private flush(): void {
    if (!this.pending.size) return;
    const batch = Array.from(this.pending);
    this.pending.clear();
    const run = () => this.safeProcess(batch);
    if ("requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(run);
    } else {
      run();
    }
  }

  private safeProcess(batch: Element[]): void {
    try {
      this.process(batch);
    } catch (e) {
      console.error("[SocialShield] process error", e);
    }
  }

  private hookHistory(): void {
    const wrap = (key: "pushState" | "replaceState") => {
      const orig = history[key].bind(history);
      history[key] = ((state: unknown, unused: string, url?: string | URL | null) => {
        const ret = orig(state, unused, url);
        window.dispatchEvent(new Event("socialshield:locationchange"));
        return ret;
      }) as History[typeof key];
    };
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", () => this.checkUrl());
    window.addEventListener("socialshield:locationchange", () => this.checkUrl());
  }

  private checkUrl(): void {
    if (location.href === this.lastUrl) return;
    this.lastUrl = location.href;
    this.onNavigate();
  }
}

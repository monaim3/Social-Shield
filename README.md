# SocialShield

Universal social-media block-list browser extension. Hide unwanted content
using custom names, aliases, keywords, and (Phase 3+) reference images / OCR /
face similarity. Local-first — nothing leaves the browser.

**Latest (identity/context split):** Everything above + **per-profile detection mode** (strict / balanced / aggressive), **three-state match decision** (match / ambiguous / no_match), **identity vs context signals** split. Name-only matches now stay visible by default — a name like "Rashed Khan" applies to many people, so hiding needs identity + context, or a visual/OCR signal. Existing profiles auto-migrate: single-signal ones move to `aggressive` mode to preserve prior behavior; multi-signal ones move to `balanced`.

---

## Features (through Phase 2)

- Manifest V3 Chrome extension (Vite + React + TypeScript)
- Block-profile CRUD in popup **and** full Options page
- Global settings: on/off, hide-mode (collapse/hide/blur), processing level, debug, per-platform toggles
- **Platform adapters:** Facebook, X (Twitter), YouTube (home/search/watch/shorts), Instagram (feed/explore/reels)
- Shared adapter helpers keep per-platform files small
- Per-platform gating — content script skips when settings toggle a platform off
- Case/unicode/punctuation-normalized text matcher with word-boundary
- Weighted scoring (name +100 / alias +80 / keyword +60 / partial +30)
- MutationObserver + WeakSet dedupe + debounced idle-callback processing
- SPA navigation hook (`pushState` / `popstate` / URL poll)
- Reversible hide — click **Show** to restore original DOM
- Live profile/setting updates without page reload (SW → tabs broadcast to all supported hosts)
- **JSON import/export** with merge or replace strategy (reference-image binaries stripped on export)
- **Reference-image upload** (multi-file, thumbnail grid, delete) in Options → per-profile aHash computed browser-side
- **IndexedDB** binary store for image blobs; chrome.storage.local carries only metadata + 16-hex hash
- **Async match pipeline** — text pass runs first (sync); if it misses and any profile has image/OCR/face enabled, the post is IntersectionObserver-gated and hashed/OCR'd/face-embedded only when visible
- **OCR** (opt-in per profile) via tesseract.js — worker + WASM core + eng.traineddata all bundled locally in the extension, no CDN, no network
- **Face similarity** via @vladmandic/face-api — tiny detector + 68-landmark tiny + 128-d recognition, models served locally from the extension bundle (no network)
- **Web Worker** for perceptual hashing — canvas + grayscale + aHash run off the main thread
- **Match history** — aggregate-only IndexedDB store (profile / reason / platform / day). No URLs, no content. Retention 7 / 30 / 90 days
- **History dashboard** — top platforms, top reasons, top profiles, per-day bars, clear-all button
- **Popup today count** — quick "hidden today" tile alongside profile count
- **Backup/restore v2** — export can optionally include reference-image blobs as base64; restore rewrites them to IndexedDB
- **Options polish** — Esc closes modal, click backdrop to close, modal scrolls when tall
- 68 unit tests (normalize, matcher, scorer, storage, import/export, phash, image matcher, imagesDB, face cosine, historyDB, aggregate)

## Architecture

```
popup (React)  ──►  chrome.storage.local  ◄──  background SW
                          │                        │
                          └──► storage change ─────┘
                                      │
                                      ▼
                     broadcast to Facebook tabs
                                      │
                                      ▼
                        content script (per platform)
                       ┌────────────┬─────────────┐
                       ▼            ▼             ▼
                 MutationObserver  MatchEngine  Adapter.hide
```

Folder layout: [src/](src/)

## Install (dev)

```bash
pnpm install
pnpm setup:all     # face models (~6.5 MB, copies from node_modules) + eng.traineddata.gz (~12 MB, downloaded)
pnpm build
```

Or run them individually: `pnpm setup:models` / `pnpm setup:ocr`. Both are idempotent — existing files are skipped. Only `setup:ocr` needs network.

Then in Chrome / Edge:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder in this repo

For live-reload dev:

```bash
pnpm dev
```

Load the same `dist/` folder — CRXJS HMR keeps popup + content script in sync.

## Testing the extension end-to-end

1. Load `dist/` in Chrome.
2. Open the SocialShield popup → **Profiles** → **+ Add**.
3. Name: `Elon Musk`. Add a keyword like `Tesla`. Save.
4. Open `facebook.com`. Any post containing "Elon Musk" or "Tesla" (as
   whole words in visible text, alt text, or aria-labels) collapses into a
   placeholder with a **Show** button.
5. Toggle **Debug mode** in Settings → open DevTools console on facebook.com
   → see `[SocialShield] hide { ... }` logs.

## Unit tests

```bash
pnpm test
pnpm test:watch
```

## Detection scope (Phase 1)

- Text nodes inside posts
- `aria-label` on interactive elements (often carries names)
- `img[alt]` values

Image content, OCR-text-inside-images, video thumbnails, face similarity
= **not yet** — Phase 3–4.

## Privacy

- All storage is `chrome.storage.local`. Nothing sent off-device.
- No external network requests.
- Reference-image handling (Phase 3+) will use IndexedDB and run locally.

## Detection is probabilistic

SocialShield **hides content when detection thinks it likely matches** a
blocked profile. Names get misspelled, images get edited, platforms change
DOM — expect occasional misses and false positives. Tune per-profile
threshold in the editor.

## Roadmap

| Phase | Scope |
|-------|-------|
| 1 ✅ | Facebook + text matching |
| 2 ✅ | X / YouTube / Instagram adapters, options page, import/export |
| 3 ✅ | OCR (opt-in tesseract.js), perceptual image hash (aHash), IndexedDB, async pipeline |
| 4 ✅ | Face similarity (@vladmandic/face-api), face embedding cache, Web Worker for phash |
| 4b ✅ | Local OCR bundling — tesseract worker + wasm + eng.traineddata all served from extension |
| 5 ✅ | Match history + analytics dashboard, backup/restore with blobs, UI polish |

## Adding a platform adapter

Implement [`PlatformAdapter`](src/content/platforms/base.ts):

```ts
export interface PlatformAdapter {
  name: string;
  isSupported(): boolean;
  findPosts(roots: Element[]): HTMLElement[];
  extractText(post: HTMLElement): string;
  extractImages?(post: HTMLElement): HTMLImageElement[];
  hidePost(post: HTMLElement, result: MatchResult): void;
  restorePost(post: HTMLElement): void;
}
```

Register it in [src/content/platforms/registry.ts](src/content/platforms/registry.ts)
and add the host to `manifest.ts` `content_scripts.matches` + `host_permissions`.

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Vite dev server with CRXJS HMR |
| `pnpm build` | Type-check + production build to `dist/` |
| `pnpm test` | Vitest run |
| `pnpm lint` | ESLint on `src/` |
| `pnpm format` | Prettier write |

## License

MIT (add LICENSE file as needed).

import type { MatchResult } from "@shared/types/match";

export interface PlatformAdapter {
  name: string;
  isSupported(): boolean;
  findPosts(roots: Element[]): HTMLElement[];
  extractText(post: HTMLElement): string;
  extractImages?(post: HTMLElement): HTMLImageElement[];
  hidePost(post: HTMLElement, result: MatchResult): void;
  restorePost(post: HTMLElement): void;
}

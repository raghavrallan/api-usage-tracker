import { openaiProvider } from "./openai";
import { anthropicProvider } from "./anthropic";
import { googleProvider } from "./google";
import type { ProviderAdapter } from "./types";

export const providers: Record<string, ProviderAdapter> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
};

export function getProvider(platform: string): ProviderAdapter {
  const p = providers[platform];
  if (!p) throw new Error(`Unknown platform: ${platform}`);
  return p;
}

export type { ProviderAdapter } from "./types";

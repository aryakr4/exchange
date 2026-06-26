import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";

/** Returns a client only when the key is configured; null disables the AI feature. */
export function createAnthropicClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

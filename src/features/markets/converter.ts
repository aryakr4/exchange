import "server-only";

import { unstable_cache } from "next/cache";

import { fetchUsdQuotes } from "@/lib/exchange-rates/client";
import type { UsdQuotes } from "@/lib/exchange-rates/types";

import { CONVERTER_CODES } from "./currencies";

export interface ConverterRates {
  /** USD-based quotes: { MXN: 17.62, INR: 83.4, ... }. USD is implicitly 1. */
  quotes: UsdQuotes;
  /** ISO timestamp of the upstream market reading. */
  fetchedAt: string;
}

/**
 * USD quotes for every converter currency, in ONE upstream call, cached and
 * shared across all visitors. The client converter derives every pair from
 * this table locally, so switching currencies or typing an amount costs no
 * further API quota — the same one-call-serves-everyone shape the cron uses.
 *
 * Revalidated every 6 hours. Returns null if the upstream fetch fails so the
 * page can degrade gracefully instead of throwing.
 */
export const getConverterRates = unstable_cache(
  async (): Promise<ConverterRates | null> => {
    try {
      const { quotes, fetchedAt } = await fetchUsdQuotes(CONVERTER_CODES);
      return { quotes, fetchedAt: fetchedAt.toISOString() };
    } catch (error) {
      console.error(
        "[converter] failed to fetch USD quotes:",
        error instanceof Error ? error.message : "unknown error"
      );
      return null;
    }
  },
  ["converter-rates"],
  { revalidate: 21600, tags: ["converter-rates"] }
);

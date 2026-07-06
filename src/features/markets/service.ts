import "server-only";

import { unstable_cache } from "next/cache";

import { getMultipleRates, saveDailyRates } from "@/lib/exchange-rates";
import { createAdminClient } from "@/lib/supabase/admin";

import { FEATURED_CORRIDORS, featuredPairs } from "./corridors";

/**
 * Featured-markets data layer.
 *
 * WRITE (`refreshFeaturedMarkets`) runs once a day from the cron route: one
 * upstream API call fetches every featured corridor and persists it into
 * `daily_rates` — the same table the alert pipeline uses.
 *
 * READ (`getFeaturedMarkets`) is what the public markets page and landing
 * ticker call. It reads only from the database (zero upstream quota, cached
 * for 30 min), so page traffic can never burn the API allowance. It uses the
 * admin client because `daily_rates` intentionally has no RLS policies; the
 * data is non-sensitive public market data and this read stays on the server,
 * so no key ever reaches the browser.
 */

/** One direction of daily movement for a corridor. */
export type MarketDirection = "up" | "down" | "flat";

export interface MarketSnapshot {
  from: string;
  to: string;
  label: string;
  rate: number;
  /** Previous stored day's rate, if we have one, for the movement arrow. */
  previousRate: number | null;
  direction: MarketDirection;
  /** UTC calendar date (YYYY-MM-DD) of the latest rate. */
  rateDate: string;
}

export interface FeaturedMarkets {
  markets: MarketSnapshot[];
  /** ISO timestamp of the most recent rate across all corridors, or null. */
  updatedAt: string | null;
}

/**
 * Fetch every featured corridor in one API call and persist it. Returns the
 * number of corridors stored. Callers should treat a throw as non-fatal —
 * market-data freshness must never fail the daily cron.
 */
export async function refreshFeaturedMarkets(): Promise<number> {
  const { rates } = await getMultipleRates(featuredPairs());
  await saveDailyRates(rates);
  return rates.length;
}

const pairKey = (from: string, to: string) => `${from}->${to}`;

/**
 * Latest snapshot for each featured corridor, read from `daily_rates` and
 * cached for 30 minutes. Corridors with no stored rate yet are omitted, so a
 * brand-new deployment (before the first cron run) returns an empty list —
 * callers fall back to illustrative data.
 */
export const getFeaturedMarkets = unstable_cache(
  async (): Promise<FeaturedMarkets> => {
    const supabase = createAdminClient();

    // A short window is enough to find the latest + previous stored day for
    // each corridor without scanning history.
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 8);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("daily_rates")
      .select("base_currency, quote_currency, rate, rate_date, fetched_at")
      .gte("rate_date", cutoffDate)
      .order("rate_date", { ascending: false });

    if (error) {
      console.error("[markets] failed to read daily_rates:", error.message);
      return { markets: [], updatedAt: null };
    }

    // Group rows by corridor, newest first (query is already date-desc).
    const rowsByPair = new Map<
      string,
      { rate: number; rate_date: string; fetched_at: string }[]
    >();
    for (const row of data ?? []) {
      const key = pairKey(row.base_currency, row.quote_currency);
      const list = rowsByPair.get(key) ?? [];
      list.push(row);
      rowsByPair.set(key, list);
    }

    const markets: MarketSnapshot[] = [];
    let updatedAt: string | null = null;

    for (const corridor of FEATURED_CORRIDORS) {
      const rows = rowsByPair.get(pairKey(corridor.from, corridor.to));
      if (!rows || rows.length === 0) continue;

      const latest = rows[0];
      const previous = rows[1] ?? null;
      const previousRate = previous ? previous.rate : null;

      let direction: MarketDirection = "flat";
      if (previousRate !== null) {
        if (latest.rate > previousRate) direction = "up";
        else if (latest.rate < previousRate) direction = "down";
      }

      markets.push({
        from: corridor.from,
        to: corridor.to,
        label: corridor.label,
        rate: latest.rate,
        previousRate,
        direction,
        rateDate: latest.rate_date,
      });

      if (!updatedAt || latest.fetched_at > updatedAt) {
        updatedAt = latest.fetched_at;
      }
    }

    return { markets, updatedAt };
  },
  ["featured-markets"],
  { revalidate: 1800, tags: ["featured-markets"] }
);

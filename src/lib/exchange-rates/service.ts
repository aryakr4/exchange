import "server-only";

import { ExchangeRateError, fetchUsdQuotes } from "@/lib/exchange-rates/client";
import type {
  FetchedRate,
  RatePair,
  UsdQuotes,
} from "@/lib/exchange-rates/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Derive a cross rate from USD-based quotes:
 *
 *   rate(A → B) = (USD → B) / (USD → A)
 *
 * Pure function, exported for unit testing. Throws if either leg is
 * missing or non-positive — a silently wrong rate is worse than no rate.
 */
export function computeCrossRate(
  quotes: UsdQuotes,
  from: string,
  to: string
): number {
  const usdTo = (code: string): number | undefined =>
    code === "USD" ? 1 : quotes[code];

  const fromLeg = usdTo(from);
  const toLeg = usdTo(to);

  if (!fromLeg || fromLeg <= 0) {
    throw new ExchangeRateError(`No USD quote for ${from}`);
  }
  if (!toLeg || toLeg <= 0) {
    throw new ExchangeRateError(`No USD quote for ${to}`);
  }

  return toLeg / fromLeg;
}

/** numeric(18,8) in the DB — round once here so JS float noise never lands. */
function toDbPrecision(rate: number): number {
  return Number(rate.toFixed(8));
}

/** Latest rate for a single pair (one API call). */
export async function getLatestRate(
  from: string,
  to: string
): Promise<FetchedRate> {
  const { quotes, fetchedAt } = await fetchUsdQuotes([from, to]);
  return {
    base: from,
    quote: to,
    rate: toDbPrecision(computeCrossRate(quotes, from, to)),
    fetchedAt,
  };
}

export interface MultipleRatesResult {
  rates: FetchedRate[];
  /** Pairs that could not be resolved (e.g. currency missing upstream). */
  failedPairs: RatePair[];
  fetchedAt: Date;
}

/**
 * Latest rates for many pairs in ONE API call: the union of all involved
 * currencies is fetched as USD quotes, then each pair is derived locally.
 * A pair whose currency is missing upstream is reported in failedPairs
 * rather than failing the whole batch — one bad pair must not stop the
 * cron from evaluating everyone else's alerts.
 */
export async function getMultipleRates(
  pairs: RatePair[]
): Promise<MultipleRatesResult> {
  if (pairs.length === 0) {
    return { rates: [], failedPairs: [], fetchedAt: new Date() };
  }

  const currencies = pairs.flatMap((pair) => [pair.from, pair.to]);
  const { quotes, fetchedAt } = await fetchUsdQuotes(currencies);

  const rates: FetchedRate[] = [];
  const failedPairs: RatePair[] = [];

  for (const pair of pairs) {
    try {
      rates.push({
        base: pair.from,
        quote: pair.to,
        rate: toDbPrecision(computeCrossRate(quotes, pair.from, pair.to)),
        fetchedAt,
      });
    } catch (error) {
      console.warn(
        `[exchange-rates] skipping pair ${pair.from}->${pair.to}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
      failedPairs.push(pair);
    }
  }

  return { rates, failedPairs, fetchedAt };
}

/** UTC calendar date (YYYY-MM-DD) a fetch belongs to. */
function rateDateOf(fetchedAt: Date): string {
  return fetchedAt.toISOString().slice(0, 10);
}

/**
 * Persist rates idempotently: upserting on (base, quote, rate_date) means a
 * duplicate cron run refreshes today's rows instead of duplicating them.
 * Service-role client — daily_rates has no user policies by design.
 */
export async function saveDailyRates(rates: FetchedRate[]): Promise<void> {
  if (rates.length === 0) return;

  const supabase = createAdminClient();
  const { error } = await supabase.from("daily_rates").upsert(
    rates.map((rate) => ({
      base_currency: rate.base,
      quote_currency: rate.quote,
      rate: rate.rate,
      rate_date: rateDateOf(rate.fetchedAt),
      fetched_at: rate.fetchedAt.toISOString(),
    })),
    { onConflict: "base_currency,quote_currency,rate_date" }
  );

  if (error) {
    console.error("[exchange-rates] failed to save daily rates:", error.message);
    throw new ExchangeRateError(`Failed to save rates: ${error.message}`);
  }

  console.info(`[exchange-rates] saved ${rates.length} daily rate(s)`);
}

/** Persist a single rate (same idempotent upsert). */
export async function saveDailyRate(rate: FetchedRate): Promise<void> {
  await saveDailyRates([rate]);
}

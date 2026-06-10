import "server-only";

import { z } from "zod";

import { env } from "@/lib/env";
import type { UsdQuotes } from "@/lib/exchange-rates/types";

/**
 * Low-level exchangerate.host client.
 *
 * The free tier only supports USD as the source currency, so this client
 * exposes exactly one operation: fetch USD-based quotes for a set of
 * currencies in a single /live call. Cross rates are derived in the
 * service layer — one API request per cron run, regardless of how many
 * alerts exist.
 */

const API_BASE_URL = "https://api.exchangerate.host";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

export class ExchangeRateError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "ExchangeRateError";
  }
}

/** Runtime-validated API response — a typed `as` cast would trust the network. */
const liveResponseSchema = z.union([
  z.object({
    success: z.literal(true),
    timestamp: z.number(),
    source: z.string(),
    quotes: z.record(z.string(), z.number()),
  }),
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.number(),
      type: z.string().optional(),
      info: z.string().optional(),
    }),
  }),
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface UsdQuotesResult {
  quotes: UsdQuotes;
  /** Market timestamp reported by the API. */
  fetchedAt: Date;
}

/**
 * Fetch USD→{currencies} quotes with timeout, bounded retry, and logging.
 *
 * Retries (with exponential backoff + jitter) only on transient failures:
 * network errors, timeouts, HTTP 5xx, and 429. API-level errors (bad key,
 * quota exhausted, invalid currency) fail immediately — retrying can't fix
 * them and would burn quota.
 */
export async function fetchUsdQuotes(
  currencies: string[]
): Promise<UsdQuotesResult> {
  const wanted = [...new Set(currencies.filter((code) => code !== "USD"))];
  if (wanted.length === 0) {
    throw new ExchangeRateError("No non-USD currencies requested");
  }

  const url = new URL("/live", API_BASE_URL);
  url.searchParams.set("access_key", env.EXCHANGERATE_API_KEY);
  url.searchParams.set("source", "USD");
  url.searchParams.set("currencies", wanted.join(","));

  let lastError: ExchangeRateError = new ExchangeRateError("Not attempted");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const startedAt = Date.now();
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new ExchangeRateError(
          `HTTP ${response.status} from exchangerate.host`,
          response.status >= 500 || response.status === 429
        );
      }

      const parsed = liveResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new ExchangeRateError("Unexpected response shape from API");
      }

      if (!parsed.data.success) {
        const { code, info } = parsed.data.error;
        throw new ExchangeRateError(
          `API error ${code}: ${info ?? "no details"}`
        );
      }

      // Normalize "USDEUR" keys to plain "EUR".
      const quotes: UsdQuotes = {};
      for (const [key, value] of Object.entries(parsed.data.quotes)) {
        quotes[key.replace(/^USD/, "")] = value;
      }

      console.info(
        `[exchange-rates] fetched ${Object.keys(quotes).length} USD quotes in ${
          Date.now() - startedAt
        }ms (attempt ${attempt}/${MAX_ATTEMPTS})`
      );

      return {
        quotes,
        fetchedAt: new Date(parsed.data.timestamp * 1000),
      };
    } catch (error) {
      lastError =
        error instanceof ExchangeRateError
          ? error
          : new ExchangeRateError(
              // fetch() network failures and AbortSignal timeouts land here
              error instanceof Error ? error.message : "Unknown fetch error",
              true
            );

      if (!lastError.retryable || attempt === MAX_ATTEMPTS) {
        console.error(
          `[exchange-rates] giving up after attempt ${attempt}/${MAX_ATTEMPTS}: ${lastError.message}`
        );
        throw lastError;
      }

      const delay =
        RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 250;
      console.warn(
        `[exchange-rates] attempt ${attempt}/${MAX_ATTEMPTS} failed (${lastError.message}), retrying in ${Math.round(delay)}ms`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

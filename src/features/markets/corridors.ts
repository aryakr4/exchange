import type { RatePair } from "@/lib/exchange-rates";

/**
 * A remittance corridor shown on the public markets page and landing ticker.
 * `from` is the sender's currency, `to` the recipient's — the direction a
 * migrant worker actually sends money.
 */
export interface Corridor {
  from: string;
  to: string;
  /** Display label, e.g. "USD → MXN". */
  label: string;
}

/**
 * The featured set. Every corridor here resolves from a SINGLE USD-based
 * quote fetch (cross rates are derived), so refreshing all of them costs one
 * upstream API call — the same frugality the cron pipeline is built around.
 *
 * Chosen to mirror the largest real remittance corridors (US/UK/EU/Canada/
 * Australia senders → the top recipient countries).
 */
export const FEATURED_CORRIDORS: Corridor[] = [
  { from: "USD", to: "MXN", label: "USD → MXN" },
  { from: "USD", to: "INR", label: "USD → INR" },
  { from: "USD", to: "PHP", label: "USD → PHP" },
  { from: "GBP", to: "INR", label: "GBP → INR" },
  { from: "USD", to: "NGN", label: "USD → NGN" },
  { from: "EUR", to: "PHP", label: "EUR → PHP" },
  { from: "USD", to: "VND", label: "USD → VND" },
  { from: "CAD", to: "INR", label: "CAD → INR" },
  { from: "USD", to: "KES", label: "USD → KES" },
  { from: "AUD", to: "PHP", label: "AUD → PHP" },
];

/** The corridors as plain rate pairs for the exchange-rate service. */
export function featuredPairs(): RatePair[] {
  return FEATURED_CORRIDORS.map(({ from, to }) => ({ from, to }));
}

/**
 * Format a rate for display, scaling precision to magnitude the way the
 * corridors naturally read: thousands get grouping (24,350), hundreds one
 * decimal (105.8), the rest two (17.62), sub-unit four.
 */
export function formatRate(rate: number): string {
  if (rate >= 1000)
    return Math.round(rate).toLocaleString("en-US");
  if (rate >= 100) return rate.toFixed(1);
  if (rate >= 1) return rate.toFixed(2);
  return rate.toFixed(4);
}

/** A currency pair to evaluate, e.g. { from: "EUR", to: "GBP" }. */
export interface RatePair {
  from: string;
  to: string;
}

/**
 * USD-based quotes as returned by exchangerate.host, normalized to plain
 * codes: { EUR: 0.9231, GBP: 0.7891, ... } meaning 1 USD = 0.9231 EUR.
 */
export type UsdQuotes = Record<string, number>;

/** A resolved rate for one pair, ready to evaluate and persist. */
export interface FetchedRate {
  base: string;
  quote: string;
  rate: number;
  /** Market timestamp reported by the API. */
  fetchedAt: Date;
}

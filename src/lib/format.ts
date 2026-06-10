/** Formatting helpers for rates, currency pairs, and dates. */

/**
 * Format a rate with sensible precision: 4 decimals for typical FX values,
 * trimmed of trailing zeros, expanded for very small rates so they don't
 * collapse to "0.0000".
 */
export function formatRate(rate: number): string {
  if (!Number.isFinite(rate)) return "—";
  const decimals = Math.abs(rate) >= 0.01 ? 4 : 8;
  return rate
    .toFixed(decimals)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

/** "USD → EUR" */
export function formatPair(from: string, to: string): string {
  return `${from} → ${to}`;
}

/**
 * Deterministic date formatting (fixed locale + UTC) so server-rendered
 * output never depends on the machine's locale or timezone.
 */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoDate));
}

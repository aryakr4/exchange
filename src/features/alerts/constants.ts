import type { AlertCondition } from "@/types";

/** Human labels + comparison glyphs for alert conditions. */
export const CONDITION_LABELS: Record<
  AlertCondition,
  { label: string; symbol: string; sentence: string }
> = {
  greater_than: { label: "Above", symbol: "≥", sentence: "rises to at least" },
  less_than: { label: "Below", symbol: "≤", sentence: "falls to at most" },
};

/**
 * ISO-4217 codes offered in the alert form. The Zod schema validates against
 * this list, so the UI select and server validation can never drift apart.
 */
export const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "INR", name: "Indian Rupee" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Złoty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "ZAR", name: "South African Rand" },
  { code: "KRW", name: "South Korean Won" },
  { code: "THB", name: "Thai Baht" },
  { code: "AED", name: "UAE Dirham" },
  { code: "TRY", name: "Turkish Lira" },
] as const;

export const SUPPORTED_CURRENCY_CODES = SUPPORTED_CURRENCIES.map(
  (currency) => currency.code
);

export type SupportedCurrencyCode =
  (typeof SUPPORTED_CURRENCIES)[number]["code"];

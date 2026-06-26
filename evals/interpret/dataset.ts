import type { Expected } from "./score";

export interface GoldenCase {
  id: string;
  category: string;
  /** Plain-language input a real user might type. */
  input: string;
  expected: Expected;
  /** Optional note on what makes this case interesting. */
  note?: string;
}

/**
 * Golden set for the plain-English → structured-alert mapping.
 *
 * Coverage is weighted toward the remittance audience the feature is built for:
 * messy, indirect, and multilingual phrasings — not just clean "USD to EUR"
 * commands. Each case asserts only what the *parse* should produce; live-rate
 * grounding is evaluated separately by the unit suite.
 */
export const GOLDEN_CASES: GoldenCase[] = [
  // --- direct: explicit pair + number ---------------------------------------
  {
    id: "direct-usd-eur-above",
    category: "direct",
    input: "Tell me when USD to EUR goes above 0.95",
    expected: { kind: "concrete", from: "USD", to: "EUR", condition: "greater_than", target: 0.95 },
  },
  {
    id: "direct-gbp-usd-below",
    category: "direct",
    input: "Email me if GBP/USD drops below 1.20",
    expected: { kind: "concrete", from: "GBP", to: "USD", condition: "less_than", target: 1.2 },
  },
  {
    id: "direct-eur-jpy-symbol",
    category: "direct",
    input: "alert when 1 EUR ≥ 170 JPY",
    expected: { kind: "concrete", from: "EUR", to: "JPY", condition: "greater_than", target: 170 },
  },
  {
    id: "direct-usd-inr-at-least",
    category: "direct",
    input: "Notify me when a dollar is worth at least 85 rupees",
    expected: { kind: "concrete", from: "USD", to: "INR", condition: "greater_than", target: 85 },
  },

  // --- remittance: sending money home, "stronger dollar" = more for family --
  {
    id: "remit-usd-mxn-stronger",
    category: "remittance",
    input: "I send money to my mom in Mexico. Let me know when the dollar gets stronger so she gets more pesos.",
    expected: { kind: "concrete", from: "USD", to: "MXN", condition: "greater_than" },
    note: "stronger USD → notify when 1 USD buys MORE MXN → greater_than",
  },
  {
    id: "remit-usd-php-target",
    category: "remittance",
    input: "I wire dollars to my family in the Philippines — ping me when one dollar gets me 60 pesos or more",
    expected: { kind: "concrete", from: "USD", to: "PHP", condition: "greater_than", target: 60 },
  },
  {
    id: "remit-usd-ngn-better",
    category: "remittance",
    input: "Want to send the most naira possible back home to Nigeria — tell me when it's a good time",
    expected: { kind: "concrete", from: "USD", to: "NGN", condition: "greater_than" },
  },
  {
    id: "remit-gbp-inr-family",
    category: "remittance",
    input: "I'm in London sending pounds to my parents in India, alert me when the rate is better for them",
    expected: { kind: "concrete", from: "GBP", to: "INR", condition: "greater_than" },
  },
  {
    id: "remit-usd-vnd-cheaper",
    category: "remittance",
    input: "let me know when it's cheaper to send money from the US to Vietnam",
    expected: { kind: "concrete", from: "USD", to: "VND", condition: "greater_than" },
    note: "'cheaper to send' = more recipient currency per USD = greater_than",
  },

  // --- no_number: a direction but no explicit target ------------------------
  {
    id: "nonum-usd-eur-better",
    category: "no_number",
    input: "let me know when it's a better time to change dollars to euros",
    expected: { kind: "concrete", from: "USD", to: "EUR", condition: "greater_than" },
  },
  {
    id: "nonum-cad-usd-more",
    category: "no_number",
    input: "tell me when my Canadian dollars buy more US dollars",
    expected: { kind: "concrete", from: "CAD", to: "USD", condition: "greater_than" },
  },
  {
    id: "nonum-usd-krw-watch",
    category: "no_number",
    input: "keep an eye on dollars to Korean won for me and say when it's good",
    expected: { kind: "concrete", from: "USD", to: "KRW", condition: "greater_than" },
  },

  // --- direction: the from/to mapping is the thing under test ---------------
  {
    id: "dir-eur-usd-weaker",
    category: "direction",
    input: "I hold euros and want to buy dollars — alert me when the euro is strong against the dollar",
    expected: { kind: "concrete", from: "EUR", to: "USD", condition: "greater_than" },
  },
  {
    id: "dir-usd-jpy-falls",
    category: "direction",
    input: "warn me if the yen gets expensive, I pay suppliers in Japan in dollars",
    expected: { kind: "concrete", from: "USD", to: "JPY", condition: "less_than" },
    note: "yen 'expensive' → fewer JPY per USD → less_than",
  },
  {
    id: "dir-aud-nzd-explicit",
    category: "direction",
    input: "Convert Australian to New Zealand dollars, notify under 1.05",
    expected: { kind: "concrete", from: "AUD", to: "NZD", condition: "less_than", target: 1.05 },
  },

  // --- multilingual: same intent, non-English -------------------------------
  {
    id: "ml-es-usd-mxn",
    category: "multilingual",
    input: "avísame cuando el dólar suba frente al peso mexicano",
    expected: { kind: "concrete", from: "USD", to: "MXN", condition: "greater_than" },
    note: "Spanish: notify when the dollar rises against the Mexican peso",
  },
  {
    id: "ml-fr-eur-usd",
    category: "multilingual",
    input: "préviens-moi quand 1 euro vaut plus de 1,10 dollar",
    expected: { kind: "concrete", from: "EUR", to: "USD", condition: "greater_than", target: 1.1 },
    note: "French, comma decimal: 1 euro worth more than 1.10 dollars",
  },
  {
    id: "ml-pt-brl-usd",
    category: "multilingual",
    input: "me avise quando o real estiver mais forte que o dólar",
    expected: { kind: "concrete", from: "BRL", to: "USD", condition: "greater_than" },
    note: "Portuguese: notify when the real is stronger than the dollar",
  },

  // --- ambiguous: should ask, not guess -------------------------------------
  {
    id: "amb-unsupported-currency",
    category: "ambiguous",
    input: "tell me when the dollar is strong against the Argentine peso",
    expected: { kind: "clarification" },
    note: "ARS is not in the supported list → clarify",
  },
  {
    id: "amb-no-currencies",
    category: "ambiguous",
    input: "let me know when it's a good time to exchange money",
    expected: { kind: "clarification" },
    note: "no currencies named at all → clarify",
  },
];

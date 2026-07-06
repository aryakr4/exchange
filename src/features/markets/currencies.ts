/**
 * Currency display metadata — the country/region, flag, and symbol for each
 * currency the product knows about. Flags make a corridor readable at a glance
 * (🇺🇸 → 🇲🇽 reads faster than "USD → MXN"); the country name lets people search
 * the converter by where the money is going ("Mexico") rather than the code.
 * The three-letter code stays the accessible, unambiguous label.
 */
export interface Currency {
  /** ISO 4217 code, e.g. "MXN". */
  code: string;
  /** Country or region the currency belongs to, e.g. "Mexico". */
  country: string;
  /** Country/region flag emoji. */
  flag: string;
  /** Currency symbol, e.g. "₹". */
  symbol: string;
}

/**
 * The currencies offered in the converter, roughly ordered as senders first
 * (USD/EUR/GBP/CAD/AUD and other majors) then the largest remittance
 * recipients. Every code here is fetched in a single daily USD-quote call.
 */
export const CURRENCIES: Currency[] = [
  { code: "USD", country: "United States", flag: "🇺🇸", symbol: "$" },
  { code: "EUR", country: "Eurozone", flag: "🇪🇺", symbol: "€" },
  { code: "GBP", country: "United Kingdom", flag: "🇬🇧", symbol: "£" },
  { code: "CAD", country: "Canada", flag: "🇨🇦", symbol: "$" },
  { code: "AUD", country: "Australia", flag: "🇦🇺", symbol: "$" },
  { code: "JPY", country: "Japan", flag: "🇯🇵", symbol: "¥" },
  { code: "CHF", country: "Switzerland", flag: "🇨🇭", symbol: "Fr" },
  { code: "CNY", country: "China", flag: "🇨🇳", symbol: "¥" },
  { code: "SGD", country: "Singapore", flag: "🇸🇬", symbol: "$" },
  { code: "NZD", country: "New Zealand", flag: "🇳🇿", symbol: "$" },
  { code: "AED", country: "United Arab Emirates", flag: "🇦🇪", symbol: "د.إ" },
  { code: "SAR", country: "Saudi Arabia", flag: "🇸🇦", symbol: "﷼" },
  { code: "MXN", country: "Mexico", flag: "🇲🇽", symbol: "$" },
  { code: "BRL", country: "Brazil", flag: "🇧🇷", symbol: "R$" },
  { code: "INR", country: "India", flag: "🇮🇳", symbol: "₹" },
  { code: "PKR", country: "Pakistan", flag: "🇵🇰", symbol: "₨" },
  { code: "BDT", country: "Bangladesh", flag: "🇧🇩", symbol: "৳" },
  { code: "LKR", country: "Sri Lanka", flag: "🇱🇰", symbol: "Rs" },
  { code: "NPR", country: "Nepal", flag: "🇳🇵", symbol: "₨" },
  { code: "PHP", country: "Philippines", flag: "🇵🇭", symbol: "₱" },
  { code: "VND", country: "Vietnam", flag: "🇻🇳", symbol: "₫" },
  { code: "IDR", country: "Indonesia", flag: "🇮🇩", symbol: "Rp" },
  { code: "THB", country: "Thailand", flag: "🇹🇭", symbol: "฿" },
  { code: "MYR", country: "Malaysia", flag: "🇲🇾", symbol: "RM" },
  { code: "NGN", country: "Nigeria", flag: "🇳🇬", symbol: "₦" },
  { code: "KES", country: "Kenya", flag: "🇰🇪", symbol: "KSh" },
  { code: "GHS", country: "Ghana", flag: "🇬🇭", symbol: "₵" },
  { code: "ZAR", country: "South Africa", flag: "🇿🇦", symbol: "R" },
  { code: "EGP", country: "Egypt", flag: "🇪🇬", symbol: "£" },
  { code: "MAD", country: "Morocco", flag: "🇲🇦", symbol: "DH" },
  { code: "COP", country: "Colombia", flag: "🇨🇴", symbol: "$" },
  { code: "DOP", country: "Dominican Republic", flag: "🇩🇴", symbol: "$" },
];

/** Every currency code the converter wants USD quotes for. */
export const CONVERTER_CODES: string[] = CURRENCIES.map((c) => c.code);

const CURRENCY_BY_CODE: Record<string, Currency> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c])
);

/** Look up full metadata for a currency code, if known. */
export function currencyFor(code: string): Currency | undefined {
  return CURRENCY_BY_CODE[code];
}

/** The flag for a currency code, or an empty string if we don't know it. */
export function flagFor(code: string): string {
  return CURRENCY_BY_CODE[code]?.flag ?? "";
}

/** The symbol for a currency code, falling back to the code itself. */
export function symbolFor(code: string): string {
  return CURRENCY_BY_CODE[code]?.symbol ?? code;
}

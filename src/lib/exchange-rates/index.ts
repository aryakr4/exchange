export { ExchangeRateError } from "@/lib/exchange-rates/client";
export {
  computeCrossRate,
  getLatestRate,
  getMultipleRates,
  saveDailyRate,
  saveDailyRates,
  type MultipleRatesResult,
} from "@/lib/exchange-rates/service";
export type {
  FetchedRate,
  RatePair,
  UsdQuotes,
} from "@/lib/exchange-rates/types";

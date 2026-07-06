"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";

import { CurrencyCombobox } from "@/features/markets/components/currency-combobox";
import { CURRENCIES, symbolFor, type Currency } from "@/features/markets/currencies";
import type { UsdQuotes } from "@/lib/exchange-rates/types";

/** USD-relative value of a code (USD itself is 1). */
function usdValue(quotes: UsdQuotes, code: string): number | undefined {
  return code === "USD" ? 1 : quotes[code];
}

/** rate(from → to) derived from USD quotes, or null if either leg is missing. */
function crossRate(quotes: UsdQuotes, from: string, to: string): number | null {
  const f = usdValue(quotes, from);
  const t = usdValue(quotes, to);
  if (!f || !t || f <= 0 || t <= 0) return null;
  return t / f;
}

function formatMoney(value: number): string {
  const maxFractionDigits = value >= 100 ? 2 : value >= 1 ? 4 : 6;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxFractionDigits,
  });
}

function formatUnitRate(rate: number): string {
  const digits = rate >= 100 ? 2 : rate >= 1 ? 4 : 6;
  return rate.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function CurrencyConverter({
  quotes,
  fetchedLabel,
}: {
  quotes: UsdQuotes;
  fetchedLabel: string;
}) {
  // Only offer currencies we actually have a quote for (USD is always valid).
  const options: Currency[] = useMemo(
    () =>
      CURRENCIES.filter(
        (c) => c.code === "USD" || typeof quotes[c.code] === "number"
      ),
    [quotes]
  );

  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");

  const rate = crossRate(quotes, from, to);
  const numericAmount = Number(amount.replace(/,/g, ""));
  const validAmount = Number.isFinite(numericAmount) && numericAmount >= 0;
  const converted = rate !== null && validAmount ? numericAmount * rate : null;

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Exchange-rate converter
        </h2>
        <span className="text-muted-foreground font-mono text-[0.7rem]">
          mid-market
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        {/* From */}
        <div className="space-y-1.5">
          <label
            htmlFor="convert-amount"
            className="text-muted-foreground text-xs font-medium"
          >
            You send
          </label>
          <input
            id="convert-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={!validAmount}
            className="border-input bg-background aria-invalid:border-destructive h-11 w-full rounded-md border px-3 text-base tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          <CurrencyCombobox
            label="From currency"
            value={from}
            onChange={setFrom}
            options={options}
          />
        </div>

        {/* Swap */}
        <div className="flex justify-center sm:pb-[3.25rem]">
          <button
            type="button"
            onClick={swap}
            aria-label="Swap currencies"
            className="hover:bg-accent flex size-10 items-center justify-center rounded-full border transition-colors"
          >
            <ArrowLeftRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* To */}
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-xs font-medium">
            They receive
          </span>
          <div className="bg-muted/40 flex h-11 w-full items-center rounded-md border px-3 text-base font-semibold tabular-nums">
            {converted !== null ? (
              <span>
                <span className="text-muted-foreground mr-1 font-normal">
                  {symbolFor(to)}
                </span>
                {formatMoney(converted)}
              </span>
            ) : (
              <span className="text-muted-foreground font-normal">—</span>
            )}
          </div>
          <CurrencyCombobox
            label="To currency"
            value={to}
            onChange={setTo}
            options={options}
          />
        </div>
      </div>

      <p className="text-muted-foreground mt-4 text-xs">
        {rate !== null ? (
          <>
            1 {from} = <span className="text-foreground font-medium">{formatUnitRate(rate)} {to}</span>{" "}
            · {fetchedLabel} · indicative, before your provider&rsquo;s fees
          </>
        ) : (
          <>Rate unavailable for this pair right now.</>
        )}
      </p>
    </div>
  );
}

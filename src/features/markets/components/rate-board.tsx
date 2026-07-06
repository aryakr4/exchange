import type { MarketDirection } from "@/features/markets/service";
import { CurrencyPair } from "@/features/markets/components/currency-pair";

export interface BoardRow {
  label: string;
  /** Pre-formatted figure, e.g. "17.47". */
  rate: string;
  direction: MarketDirection;
  /** When set, this row is styled as the visitor's own watched alert. */
  watch?: string;
}

function Move({ direction }: { direction: MarketDirection }) {
  if (direction === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-[#4cc79b]">
        <span aria-hidden="true">▲</span>
        <span className="sr-only">sending more today</span>
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-[#8b978f]">
        <span aria-hidden="true">▼</span>
        <span className="sr-only">sending less today</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[#6b766f]">
      <span aria-hidden="true">—</span>
      <span className="sr-only">unchanged</span>
    </span>
  );
}

/**
 * The exchange board — the product's signature. Live corridors rendered the
 * way a bureau-de-change board reads: lit amber figures on a dark surface,
 * jade for the days that favor the sender. Rows reveal in sequence on load.
 */
export function RateBoard({
  rows,
  updatedLabel,
}: {
  rows: BoardRow[];
  updatedLabel: string;
}) {
  return (
    <div className="board-surface overflow-hidden rounded-md border border-[rgb(239_241_234/12%)] shadow-[0_24px_60px_-24px_rgb(15_24_20/60%)]">
      <div className="board-rule flex items-center justify-between border-b px-4 py-2.5 font-mono text-[0.7rem] tracking-wider text-[#a9b3ab] uppercase">
        <span className="flex items-center gap-2">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4cc79b] opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[#4cc79b]" />
          </span>
          Mid-market rates
        </span>
        <span className="text-[#7f8a82]">USD base · daily</span>
      </div>

      <div className="divide-y divide-[rgb(239_241_234/8%)]">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`board-row grid grid-cols-[1fr_auto_2.25rem] items-center gap-3 px-4 py-3 ${
              row.watch
                ? "border-l-2 border-[#35a97d] bg-[rgb(53_169_125/9%)]"
                : "border-l-2 border-transparent"
            }`}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="min-w-0">
              <div className="font-mono text-sm tracking-wide text-[#eff1ea]">
                <CurrencyPair label={row.label} />
              </div>
              {row.watch ? (
                <div className="mt-0.5 font-mono text-[0.7rem] tracking-wide text-[#4cc79b]">
                  {row.watch}
                </div>
              ) : null}
            </div>
            <div className="figure-lit font-mono text-lg font-medium tabular-nums">
              {row.rate}
            </div>
            <div className="text-right font-mono text-sm">
              <Move direction={row.direction} />
            </div>
          </div>
        ))}
      </div>

      <div className="board-rule border-t px-4 py-2.5 font-mono text-[0.7rem] tracking-wider text-[#7f8a82]">
        {updatedLabel}
      </div>
    </div>
  );
}

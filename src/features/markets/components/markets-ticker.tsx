import { CurrencyPair } from "@/features/markets/components/currency-pair";

export interface TickerItem {
  /** e.g. "USD → MXN" */
  pair: string;
  /** Pre-formatted rate, e.g. "17.62". */
  rate: string;
  /** True when the sender's money is buying more today than the prior day. */
  up: boolean;
}

/**
 * The scrolling corridor strip — a slim exchange board across the top of the
 * page. Amber figures on the dark board surface, jade for a favorable day.
 * Pure presentation; renders whatever items it's given (real rates when
 * available, illustrative ones before the first daily run). The list is
 * duplicated so the marquee loops seamlessly.
 */
export function MarketsTicker({ items }: { items: TickerItem[] }) {
  return (
    <div
      className="board-surface relative flex items-stretch overflow-hidden border-b border-[rgb(239_241_234/12%)]"
      aria-hidden="true"
    >
      <span className="board-rule z-10 flex shrink-0 items-center gap-2 border-r bg-[#14201c] px-4 font-mono text-[0.7rem] tracking-[0.18em] text-[#a9b3ab] uppercase">
        <span className="size-1.5 rounded-full bg-[#4cc79b]" />
        Live
      </span>
      <div className="animate-marquee motion-reduce:animate-none flex w-max gap-7 py-2 pl-7 font-mono text-xs">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-2 whitespace-nowrap">
            <CurrencyPair label={item.pair} className="text-[#7f8a82]" />
            <span className="figure-lit tabular-nums">{item.rate}</span>
            <span className={item.up ? "text-[#4cc79b]" : "text-[#8b978f]"}>
              {item.up ? "▲" : "▼"}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatRate } from "@/features/markets/corridors";
import {
  RateBoard,
  type BoardRow,
} from "@/features/markets/components/rate-board";
import { getFeaturedMarkets } from "@/features/markets/service";

export const metadata: Metadata = {
  title: "Live Remittance Rates",
  description:
    "Today's indicative mid-market exchange rates for the largest money-transfer corridors — USD, GBP, EUR, CAD and AUD to Mexico, India, the Philippines and more. Updated daily.",
  alternates: { canonical: "/markets" },
};

// Rates change once a day; cache the rendered page for 30 minutes.
export const revalidate = 1800;

function boardTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function MarketsPage() {
  const { markets, updatedAt } = await getFeaturedMarkets();

  const boardRows: BoardRow[] = markets.map((m) => ({
    label: m.label,
    rate: formatRate(m.rate),
    direction: m.direction,
  }));

  const updatedLabel = updatedAt
    ? `Updated ${boardTime(updatedAt)} UTC · mid-market, before fees`
    : "Awaiting first daily run";

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-x-12 gap-y-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
      <div className="space-y-6">
        <p className="text-brand font-mono text-xs font-medium tracking-[0.22em] uppercase">
          Live board
        </p>
        <h1 className="font-heading text-4xl font-extrabold tracking-[-0.02em] text-balance sm:text-5xl">
          Today&rsquo;s rates for the corridors people send home most.
        </h1>
        <p className="text-muted-foreground max-w-md text-lg leading-relaxed">
          Indicative mid-market rates, refreshed once a day. Read the arrow:{" "}
          <span className="text-brand">▲</span> means a sender&rsquo;s money
          buys more today than the last reading — a better day to send.
        </p>

        <dl className="text-muted-foreground grid max-w-xs grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 font-mono text-xs">
          <dt className="text-brand">▲ sends more</dt>
          <dd>up since last reading</dd>
          <dt>▼ sends less</dt>
          <dd>down since last reading</dd>
          <dt>— flat</dt>
          <dd>no change yet</dd>
        </dl>

        <Button asChild>
          <Link href="/signup">
            Alert me when my corridor is good
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="w-full">
        {boardRows.length === 0 ? (
          <div className="board-surface rounded-md border border-[rgb(239_241_234/12%)] p-12 text-center">
            <p className="font-mono text-sm text-[#eff1ea]">
              Rates are on their way.
            </p>
            <p className="mx-auto mt-2 max-w-xs text-sm text-[#a9b3ab]">
              The featured corridors populate after the first daily rate run.
              Check back shortly.
            </p>
          </div>
        ) : (
          <RateBoard rows={boardRows} updatedLabel={updatedLabel} />
        )}
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatRate } from "@/features/markets/corridors";
import { CurrencyPair } from "@/features/markets/components/currency-pair";
import {
  MarketsTicker,
  type TickerItem,
} from "@/features/markets/components/markets-ticker";
import {
  RateBoard,
  type BoardRow,
} from "@/features/markets/components/rate-board";
import { getFeaturedMarkets } from "@/features/markets/service";

export const metadata: Metadata = {
  title: "Rate Alerts for Sending Money Home",
  description:
    "Sending money to family abroad? Describe your target in plain English and get one email the day the rate turns in your favor — so more reaches home. Free.",
  alternates: { canonical: "/" },
};

// Ticker + board data change at most once a day; re-render at most twice an hour.
export const revalidate = 1800;

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Structured data for Google rich results. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "RateWatch",
  url: appUrl,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Set a target exchange rate for a remittance corridor and get one email the day the rate turns in your favor. Rates are checked once daily.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

/** Illustrative fallback, shown only before the first daily run populates real
 * rates. ▲ = the sender's money is buying more today. */
const FALLBACK_TICKER: TickerItem[] = [
  { pair: "USD → MXN", rate: "17.62", up: true },
  { pair: "USD → INR", rate: "83.41", up: true },
  { pair: "USD → PHP", rate: "56.28", up: false },
  { pair: "GBP → INR", rate: "105.8", up: true },
  { pair: "USD → NGN", rate: "1,481", up: false },
  { pair: "EUR → PHP", rate: "61.04", up: true },
  { pair: "USD → VND", rate: "24,350", up: false },
  { pair: "CAD → INR", rate: "61.22", up: true },
  { pair: "USD → KES", rate: "129.4", up: false },
  { pair: "AUD → PHP", rate: "37.18", up: true },
];

// The hero board leads with the corridor the headline speaks to, marked as a
// worked example: a target set just above today's rate — not yet reached.
const WATCHED_LABEL = "USD → MXN";
const WATCHED_NOTE = "watching · ≥ 17.50";

/** The scale of the problem, in figures we can point at a source for. Both are
 * context, not claims about what RateWatch achieves — the paragraph that
 * follows them draws that line explicitly. */
const FACTS = [
  {
    figure: "$685B",
    body: "sent home by migrant workers in 2024 — more than foreign aid and foreign investment combined.",
    source: "World Bank",
    href: "https://blogs.worldbank.org/en/peoplemove/in-2024--remittance-flows-to-low--and-middle-income-countries-ar",
  },
  {
    figure: "6.36%",
    body: "the average cost of sending $200 across a border. The UN's target for 2030 is 3%.",
    source: "World Bank, Q3 2025",
    href: "https://remittanceprices.worldbank.org/",
  },
];

/** The terms, stated rather than implied. The last two are limits, not features;
 * they belong here precisely because a reader deciding whether to trust this
 * would otherwise have to go looking for them. */
const TERMS = [
  "No fee, and no cut of what you send. We never touch your money.",
  "No ads, and we don't sell your data.",
  "Your alerts are private to your account — enforced in the database, not just the app.",
  "Rates are indicative mid-market values, checked once a day, before your provider's fees.",
  "An informational tool, not financial advice.",
  "Ask us to delete your account and it all goes — alerts, history, address.",
];

/** These three ARE an ordered sequence, so the numbering carries real meaning. */
const STEPS = [
  {
    number: "01",
    title: "Say it in plain English",
    description:
      "“Tell me when my dollars send more pesos to my mom in Mexico.” That's it — we turn your words into an alert.",
  },
  {
    number: "02",
    title: "We watch the rate daily",
    description:
      "RateWatch checks the market once a day and tracks your target. Nothing to open, nothing to refresh.",
  },
  {
    number: "03",
    title: "We email you when to send",
    description:
      "The day the rate turns in your favor, one clear email lands in your inbox. Send then — and more reaches home.",
  },
];

function boardTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function LandingPage() {
  const { markets, updatedAt } = await getFeaturedMarkets();
  const live = markets.length > 0;

  const tickerItems: TickerItem[] = live
    ? markets.map((m) => ({
        pair: m.label,
        rate: formatRate(m.rate),
        up: m.direction !== "down",
      }))
    : FALLBACK_TICKER;

  const wallRows: BoardRow[] = (
    live
      ? markets.slice(0, 8).map((m) => ({
          label: m.label,
          rate: formatRate(m.rate),
          direction: m.direction,
        }))
      : FALLBACK_TICKER.slice(0, 8).map((t) => ({
          label: t.pair,
          rate: t.rate,
          direction: t.up ? ("up" as const) : ("down" as const),
        }))
  ).map((row) =>
    row.label === WATCHED_LABEL ? { ...row, watch: WATCHED_NOTE } : row
  );

  const boardUpdated =
    live && updatedAt
      ? `Board updated ${boardTime(updatedAt)} UTC · mid-market, before fees`
      : "Sample board · live rates update daily";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Corridor ticker — real daily rates once populated, illustrative before
          the first cron run. */}
      <MarketsTicker items={tickerItems} />

      {/* Hero — the board wall. The market fills the space edge to edge; the
          human message is pinned onto it like a note on the counter glass. */}
      <section className="board-surface relative isolate overflow-hidden border-b border-[rgb(239_241_234/12%)]">
        {/* The board itself: live corridors, each label sitting with its
            figure on the right, the ruled lines fading toward the note. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[56%] flex-col justify-center opacity-[0.72] lg:flex [mask-image:linear-gradient(to_right,transparent,#000_40%)]"
        >
          {wallRows.map((row, i) => (
            <div
              key={row.label}
              className={`board-row flex items-center justify-end gap-6 border-t border-[rgb(239_241_234/8%)] px-10 py-[1.15rem] last:border-b ${
                row.watch ? "bg-[rgb(53_169_125/7%)]" : ""
              }`}
              style={{ animationDelay: `${i * 55}ms` }}
            >
              <div className="text-right">
                <div className="font-mono text-sm tracking-wide text-[#9aa39b]">
                  <CurrencyPair label={row.label} />
                </div>
                {row.watch ? (
                  <div className="mt-0.5 font-mono text-[0.7rem] text-[#4cc79b]">
                    {row.watch}
                  </div>
                ) : null}
              </div>
              <div className="figure-banked w-[7ch] text-right font-mono text-[2rem] leading-none font-medium tabular-nums">
                {row.rate}
              </div>
              <div
                className={`w-5 text-center font-mono text-base ${
                  row.direction === "up"
                    ? "text-[#4cc79b]"
                    : row.direction === "down"
                      ? "text-[#8b978f]"
                      : "text-[#6b766f]"
                }`}
              >
                {row.direction === "up" ? "▲" : row.direction === "down" ? "▼" : "—"}
              </div>
            </div>
          ))}
        </div>

        {/* The pinned paper note — warm, human, held against the cold board. */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:flex lg:min-h-[40rem] lg:items-center lg:py-28">
          <div className="max-w-lg rounded-lg bg-[#f3f4ec] p-8 text-[#14201c] shadow-[0_40px_90px_-45px_rgb(0_0_0/85%)] ring-1 ring-black/5 sm:p-10">
            <p className="font-mono text-xs font-medium tracking-[0.22em] text-[#1a6e50] uppercase">
              A free tool for people who send money home
            </p>
            <h1 className="font-heading mt-5 text-[2.6rem] leading-[0.96] font-extrabold tracking-[-0.02em] sm:text-5xl">
              More of it reaches <span className="text-[#1a6e50]">home</span>.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-[#4b554f]">
              Millions of people send part of their wages to family in another
              country. The rate on the day they send decides how much actually
              arrives — and nobody tells them when it&rsquo;s a good day.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-[#4b554f]">
              RateWatch does. One email, when your corridor turns in your
              favor.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Set up a free alert
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Link
                href="/markets"
                className="text-sm font-medium text-[#1a6e50] underline-offset-4 hover:underline"
              >
                or watch the live board →
              </Link>
            </div>
          </div>

          {/* On small screens the wall is hidden, so the board rides along
              beneath the note instead of leaving empty dark space. */}
          <div className="mt-10 lg:hidden">
            <RateBoard rows={wallRows.slice(0, 5)} updatedLabel={boardUpdated} />
          </div>
        </div>

        <p className="pointer-events-none absolute bottom-4 left-4 z-10 font-mono text-[0.7rem] tracking-wide text-[#6b766f] sm:left-6">
          {boardUpdated}
        </p>
      </section>

      {/* Why this exists — the problem at scale, then an honest line about which
          half of it an alert email can actually touch. The figures borrow the
          board's mono so the human half of the page speaks the same language. */}
      <section className="border-t bg-[#e6e8df]">
        <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 lg:py-24">
          <p className="text-brand font-mono text-xs font-medium tracking-[0.22em] uppercase">
            Why this exists
          </p>

          <div className="mt-10 grid gap-10 sm:grid-cols-2 sm:gap-12">
            {FACTS.map((fact) => (
              <div
                key={fact.figure}
                className="border-t-2 border-[#14201c] pt-5"
              >
                <p className="font-mono text-[2.75rem] leading-none font-medium tracking-tight tabular-nums sm:text-[3.25rem]">
                  {fact.figure}
                </p>
                <p className="mt-4 text-base leading-relaxed text-[#3c453f]">
                  {fact.body}
                </p>
                <a
                  href={fact.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground mt-3 inline-block font-mono text-[0.7rem] tracking-wide underline-offset-4 hover:underline"
                >
                  {fact.source} ↗
                </a>
              </div>
            ))}
          </div>

          <p className="mt-14 max-w-2xl border-l-2 border-[#1a6e50] pl-6 text-lg leading-relaxed text-[#3c453f]">
            <strong className="font-semibold text-[#14201c]">
              RateWatch does not fix that fee.
            </strong>{" "}
            No alert email can. What it can do is the other half: the rate
            itself moves week to week, and sending on a good day means more of
            your money lands. That part is free, and it stays free.
          </p>
        </div>
      </section>

      {/* How it works — a genuine three-step sequence. */}
      <section className="border-t">
        <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 lg:py-24">
          <p className="text-brand font-mono text-xs font-medium tracking-[0.22em] uppercase">
            How it works
          </p>
          <h2 className="font-heading mt-3 max-w-xl text-3xl font-bold tracking-tight text-balance sm:text-[2.5rem] sm:leading-[1.05]">
            From one sentence to a well-timed transfer.
          </h2>
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col gap-4">
                <span
                  className="board-surface inline-flex size-10 items-center justify-center rounded-md font-mono text-sm font-medium text-[#eab662]"
                  aria-hidden="true"
                >
                  {step.number}
                </span>
                <h3 className="text-base font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What it costs — the page resolves onto the board's dark surface, but on
          a statement of the terms rather than a push to convert. */}
      <section className="board-surface relative border-t border-[rgb(239_241_234/12%)]">
        <div
          className="absolute inset-x-0 top-0 h-px bg-[#35a97d]/60"
          aria-hidden="true"
        />
        <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6">
          <p className="font-mono text-xs font-medium tracking-[0.22em] text-[#4cc79b] uppercase">
            What it costs
          </p>
          <h2 className="font-heading mt-3 max-w-xl text-3xl font-bold tracking-tight text-[#eff1ea] text-balance sm:text-[2.5rem] sm:leading-[1.05]">
            Nothing. Not nothing for now — nothing.
          </h2>

          <ul className="mt-10 grid max-w-4xl gap-x-10 gap-y-5 text-[0.95rem] leading-relaxed text-[#a9b3ab] sm:grid-cols-2">
            {TERMS.map((term) => (
              <li key={term} className="flex gap-3">
                <Check
                  className="mt-1 size-4 shrink-0 text-[#4cc79b]"
                  aria-hidden="true"
                />
                <span>{term}</span>
              </li>
            ))}
          </ul>

          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Button
              size="lg"
              asChild
              className="bg-[#eff1ea] text-[#14201c] hover:bg-white"
            >
              <Link href="/signup">
                Set up a free alert
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Link
              href="/faq"
              className="text-sm font-medium text-[#a9b3ab] underline-offset-4 hover:text-white hover:underline"
            >
              or read the questions people ask first →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

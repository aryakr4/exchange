import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  MailCheck,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Exchange Rate Alerts by Email",
  description:
    "Set a target exchange rate for any major currency pair and get one email the moment it's reached. Checked daily at 06:00 UTC. Free to use.",
  alternates: { canonical: "/" },
};

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
    "Create exchange-rate alerts and receive an email when a currency pair reaches your target rate. Rates are checked once daily.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

const TICKER_PAIRS = [
  { pair: "EUR / USD", rate: "1.0842", up: true },
  { pair: "USD / JPY", rate: "151.37", up: false },
  { pair: "GBP / USD", rate: "1.2691", up: true },
  { pair: "USD / CHF", rate: "0.9012", up: false },
  { pair: "AUD / USD", rate: "0.6614", up: true },
  { pair: "USD / CAD", rate: "1.3568", up: false },
  { pair: "USD / INR", rate: "83.412", up: true },
  { pair: "EUR / GBP", rate: "0.8543", up: false },
  { pair: "USD / SGD", rate: "1.3402", up: true },
  { pair: "NZD / USD", rate: "0.6087", up: false },
];

const STEPS = [
  {
    number: "01",
    icon: BellRing,
    title: "Set your target",
    description:
      "Pick a currency pair, a target rate, and a direction — above or below.",
  },
  {
    number: "02",
    icon: CalendarClock,
    title: "We check daily",
    description:
      "RateWatch pulls fresh market rates once a day and evaluates every active alert.",
  },
  {
    number: "03",
    icon: MailCheck,
    title: "Get one email",
    description:
      "The moment your target is crossed, one clean email lands in your inbox. No spam, ever.",
  },
];

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Ticker strip */}
      <div
        className="bg-foreground text-background overflow-hidden border-b"
        aria-hidden="true"
      >
        <div className="animate-marquee motion-reduce:animate-none flex w-max gap-8 py-1.5 font-mono text-xs">
          {[...TICKER_PAIRS, ...TICKER_PAIRS].map((item, i) => (
            <span key={i} className="flex items-center gap-2 whitespace-nowrap">
              <span className="opacity-70">{item.pair}</span>
              <span>{item.rate}</span>
              <span
                className={item.up ? "text-blue-400" : "text-neutral-500"}
              >
                {item.up ? "▲" : "▼"}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:48px_48px] opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid w-full max-w-5xl gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-24">
          <div className="space-y-6">
            <p className="text-brand font-mono text-xs font-semibold tracking-[0.2em] uppercase">
              Checked daily · Emailed once
            </p>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
              Stop refreshing charts.{" "}
              <span className="text-brand">The right rate</span> will find
              you.
            </h1>
            <p className="text-muted-foreground max-w-prose text-lg">
              RateWatch checks your currency pairs every day and sends one
              email the moment your target rate is reached. Set it once,
              then get on with your life.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Create your first alert
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>

          {/* Mock alert + email, overlapping */}
          <div className="relative mx-auto w-full max-w-sm">
            <Card className="relative z-10">
              <CardContent className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">
                    USD → EUR
                  </span>
                  <Badge className="bg-brand text-brand-foreground">
                    Active
                  </Badge>
                </div>
                <div className="font-mono text-3xl font-semibold tracking-tight">
                  ≥ 0.9500
                </div>
                <p className="text-muted-foreground text-sm">
                  Notify me when 1 USD buys at least 0.95 EUR
                </p>
              </CardContent>
            </Card>
            <Card className="bg-foreground text-background relative z-20 -mt-6 ml-10 border-t-2 border-t-[oklch(0.488_0.243_264.376)] shadow-lg">
              <CardContent className="flex items-start gap-3 pt-2">
                <MailCheck
                  className="mt-0.5 size-4 shrink-0 text-blue-400"
                  aria-hidden="true"
                />
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Target reached: USD → EUR</p>
                  <p className="font-mono text-xs opacity-80">
                    0.9512 ≥ 0.9500 · today, 06:00 UTC
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
          <p className="text-brand font-mono text-xs font-semibold tracking-[0.2em] uppercase">
            How it works
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Three steps, then silence until it matters
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-brand font-mono text-sm font-semibold">
                    {step.number}
                  </span>
                  <span className="bg-border h-px flex-1" aria-hidden="true" />
                  <step.icon
                    className="text-muted-foreground size-4"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust note + CTA */}
      <section className="bg-foreground text-background relative border-t">
        <div
          className="bg-brand absolute inset-x-0 top-0 h-0.5"
          aria-hidden="true"
        />
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Watching starts today at{" "}
              <span className="font-mono text-blue-400">06:00 UTC</span>
            </h2>
            <p className="flex items-center gap-2 text-sm opacity-80">
              <ShieldCheck
                className="size-4 text-blue-400"
                aria-hidden="true"
              />
              Your alerts are private to your account — enforced in the
              database, not just the app.
            </p>
          </div>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/signup">
              Get started — it&apos;s free
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

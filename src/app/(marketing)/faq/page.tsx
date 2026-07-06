import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "How RateWatch works: what rates we show, how alerts are triggered, what it costs, and how your data is handled.",
  alternates: { canonical: "/faq" },
};

const FAQS: { question: string; text: string; answer: React.ReactNode }[] = [
  {
    question: "What is RateWatch?",
    text: "RateWatch watches the exchange rate for the corridor you send money along and emails you the day it turns in your favor, so more of what you send reaches home. You set a target once; we do the watching.",
    answer: (
      <p>
        RateWatch watches the exchange rate for the corridor you send money
        along and emails you the day it turns in your favor — so more of what
        you send actually reaches home. You set a target once; we do the
        watching.
      </p>
    ),
  },
  {
    question: "How much does it cost?",
    text: "It's free. RateWatch is an informational tool with no subscription tiers, and we never charge to send you an alert.",
    answer: (
      <p>
        It&rsquo;s free. RateWatch is an informational tool — there are no
        subscription tiers and we never charge to send you an alert.
      </p>
    ),
  },
  {
    question: "Do you actually transfer my money?",
    text: "No. RateWatch never moves money and never touches your bank, wallet, or transfer provider. We only tell you when the rate is good; you make the transfer with whichever provider you already use.",
    answer: (
      <p>
        No. RateWatch never moves money and never touches your bank, wallet, or
        transfer provider. We only tell you <em>when</em> the rate is good — you
        make the transfer with whichever provider you already use.
      </p>
    ),
  },
  {
    question: "Which rates do you show?",
    text: "Indicative mid-market rates: the midpoint banks quote each other, before any fees or margin your transfer provider adds. They're a fair benchmark for timing, not the exact amount you'll receive after fees.",
    answer: (
      <p>
        Indicative <span className="text-foreground">mid-market</span> rates —
        the midpoint banks quote each other, before any fees or margin your
        transfer provider adds. They&rsquo;re a fair benchmark for timing, not
        the exact amount you&rsquo;ll receive after fees.
      </p>
    ),
  },
  {
    question: "How often are rates checked?",
    text: "Once a day. Remittance corridors move slowly, so a daily check is enough to catch a good day without flooding your inbox. Alerts are evaluated right after each daily reading.",
    answer: (
      <p>
        Once a day. Remittance corridors move slowly, so a daily check is enough
        to catch a good day without flooding your inbox. Alerts are evaluated
        right after each daily reading.
      </p>
    ),
  },
  {
    question: "How do the plain-English alerts work?",
    text: "Describe what you want in ordinary words, like \"tell me when my dollars send more pesos to my mom in Mexico,\" and we turn it into a target rate on the right corridor. You can also set the currency pair and target rate manually.",
    answer: (
      <p>
        Describe what you want in ordinary words — &ldquo;tell me when my
        dollars send more pesos to my mom in Mexico&rdquo; — and we turn it into
        a target rate on the right corridor. You can also set the currency pair
        and target rate manually.
      </p>
    ),
  },
  {
    question: "Which corridors are supported?",
    text: "The largest remittance corridors: senders in the US, UK, EU, Canada, and Australia to recipients in Mexico, India, the Philippines, Nigeria, Vietnam, Kenya, and more. See the live board for what's tracked today.",
    answer: (
      <p>
        The largest remittance corridors — senders in the US, UK, EU, Canada,
        and Australia to recipients in Mexico, India, the Philippines, Nigeria,
        Vietnam, Kenya, and more. See the{" "}
        <Link href="/markets" className="text-brand underline underline-offset-4">
          live board
        </Link>{" "}
        for what&rsquo;s tracked today.
      </p>
    ),
  },
  {
    question: "Is my data private?",
    text: "Yes. We collect only your email and the alerts you set, and each account can only ever see its own data, enforced in the database, not just the app. We never sell your data or send marketing email. Read the Privacy Policy for the full detail.",
    answer: (
      <p>
        Yes. We collect only your email and the alerts you set, and each
        account can only ever see its own data — enforced in the database, not
        just the app. We never sell your data or send marketing email. Read the{" "}
        <Link href="/privacy" className="text-brand underline underline-offset-4">
          Privacy Policy
        </Link>{" "}
        for the full detail.
      </p>
    ),
  },
  {
    question: "How do I stop alerts or delete my account?",
    text: "Delete an alert any time from your dashboard and it stops immediately. To remove your account and all its data, email skullsupernatural@gmail.com and we'll remove it within 30 days.",
    answer: (
      <p>
        Delete an alert any time from your dashboard, and it stops immediately.
        To remove your account and all its data, email us at{" "}
        <a
          href="mailto:skullsupernatural@gmail.com"
          className="text-brand underline underline-offset-4"
        >
          skullsupernatural@gmail.com
        </a>{" "}
        and we&rsquo;ll remove it within 30 days.
      </p>
    ),
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.text,
      },
    })),
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="text-brand font-mono text-xs font-semibold tracking-[0.2em] uppercase">
        Help
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Frequently asked questions
      </h1>
      <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">
        The short answers to what people ask most. Still stuck?{" "}
        <Link href="/contact" className="text-brand underline underline-offset-4">
          Get in touch
        </Link>
        .
      </p>
      <div className="bg-brand mt-6 h-px w-12" aria-hidden="true" />

      <div className="mt-10 space-y-8">
        {FAQS.map((faq) => (
          <section key={faq.question} className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {faq.question}
            </h2>
            <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">
              {faq.answer}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

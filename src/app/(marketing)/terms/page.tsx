import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of RateWatch, including the important note that rate alerts are informational and not financial advice.",
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "June 11, 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-brand font-mono text-xs font-semibold tracking-[0.2em] uppercase">
        Legal
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Terms of Service
      </h1>
      <p className="text-muted-foreground mt-2 font-mono text-xs">
        Last updated: {LAST_UPDATED}
      </p>
      <div className="bg-brand mt-6 h-px w-12" aria-hidden="true" />

      <div className="mt-10 space-y-10">
        <Section title="1. The service">
          <p>
            RateWatch lets you create exchange-rate alerts and receive an
            email when a currency pair reaches a target you set. Rates are
            checked once per day using third-party market data. By creating
            an account you agree to these terms.
          </p>
        </Section>

        <Section title="2. Not financial advice">
          <p className="border-brand text-foreground border-l-2 pl-4 font-medium">
            RateWatch is an informational tool. Nothing in the service — no
            alert, email, rate, or content — constitutes financial,
            investment, tax, or trading advice, or a recommendation to
            execute any currency transaction. Make your own decisions and
            consult a qualified professional where appropriate.
          </p>
        </Section>

        <Section title="3. Market data accuracy">
          <p>
            Exchange rates are sourced from third-party providers, checked
            once daily, and may be derived through cross-rate calculation.
            They are indicative mid-market values: they can differ from the
            rates offered by banks, brokers, or money-transfer services, and
            may occasionally be delayed, unavailable, or inaccurate. We make
            no warranty as to the accuracy, completeness, or timeliness of
            any rate.
          </p>
        </Section>

        <Section title="4. Email delivery">
          <p>
            We make reasonable efforts — including automatic retries — to
            deliver alert emails promptly, but email is not a guaranteed
            medium. We are not liable for missed, delayed, or filtered
            notifications, and you should not rely on RateWatch as your sole
            mechanism for time-critical financial decisions.
          </p>
        </Section>

        <Section title="5. Your account">
          <ul className="list-disc space-y-2 pl-5">
            <li>You must provide a valid email address you control.</li>
            <li>
              You are responsible for keeping your password confidential and
              for all activity under your account.
            </li>
            <li>One person per account; don&apos;t share credentials.</li>
          </ul>
        </Section>

        <Section title="6. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              probe, scrape, overload, or disrupt the service or its
              infrastructure;
            </li>
            <li>attempt to access other users&apos; data;</li>
            <li>
              resell or redistribute the service&apos;s data or notifications
              without permission;
            </li>
            <li>use the service for any unlawful purpose.</li>
          </ul>
        </Section>

        <Section title="7. Availability and changes">
          <p>
            The service is provided &quot;as is&quot; and &quot;as
            available&quot;, without warranties of any kind. We may modify,
            suspend, or discontinue features at any time. We may terminate
            accounts that violate these terms.
          </p>
        </Section>

        <Section title="8. Limitation of liability">
          <p>
            To the maximum extent permitted by law, RateWatch shall not be
            liable for any indirect, incidental, consequential, or special
            damages — including trading losses, lost profits, or missed
            opportunities — arising from your use of, or inability to use,
            the service.
          </p>
        </Section>

        <Section title="9. Changes to these terms">
          <p>
            We may update these terms from time to time. Material changes
            will be reflected in the date above; continued use of the
            service after changes take effect constitutes acceptance.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions? Email{" "}
            <a
              href="mailto:legal@ratewatch.app"
              className="text-brand underline underline-offset-4"
            >
              legal@ratewatch.app
            </a>
            . See also our{" "}
            <Link
              href="/privacy"
              className="text-brand underline underline-offset-4"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}

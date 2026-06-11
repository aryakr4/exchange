import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How RateWatch collects, uses, and protects your data: account email, alert settings, and notification history.",
  alternates: { canonical: "/privacy" },
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

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-brand font-mono text-xs font-semibold tracking-[0.2em] uppercase">
        Legal
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Privacy Policy
      </h1>
      <p className="text-muted-foreground mt-2 font-mono text-xs">
        Last updated: {LAST_UPDATED}
      </p>
      <div className="bg-brand mt-6 h-px w-12" aria-hidden="true" />

      <div className="mt-10 space-y-10">
        <Section title="1. What this policy covers">
          <p>
            This policy explains what information RateWatch
            (&quot;we&quot;, &quot;us&quot;) collects when you use our
            exchange-rate alert service, how we use it, and the choices you
            have. It applies to the website and the alert emails we send.
          </p>
        </Section>

        <Section title="2. Information we collect">
          <p>We collect only what the service needs to function:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-foreground font-medium">Account data</span>{" "}
              — your email address and an encrypted password, used to sign
              you in and to deliver alert emails.
            </li>
            <li>
              <span className="text-foreground font-medium">Alert settings</span>{" "}
              — the currency pairs, target rates, and conditions you create.
            </li>
            <li>
              <span className="text-foreground font-medium">
                Notification history
              </span>{" "}
              — a record of which alerts triggered and when, so we never send
              you duplicate emails.
            </li>
          </ul>
          <p>
            We do not collect payment information, browsing analytics
            profiles, or any financial account data. We never see your bank,
            brokerage, or trading accounts.
          </p>
        </Section>

        <Section title="3. How we use your information">
          <ul className="list-disc space-y-2 pl-5">
            <li>To authenticate you and keep your account secure.</li>
            <li>To evaluate your alerts against daily market rates.</li>
            <li>
              To send you the alert emails you asked for — we send no
              marketing email.
            </li>
            <li>To investigate abuse or comply with legal obligations.</li>
          </ul>
        </Section>

        <Section title="4. Who processes your data">
          <p>
            We rely on a small number of infrastructure providers, each
            processing only what their role requires:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-foreground font-medium">Supabase</span> —
              database and authentication hosting.
            </li>
            <li>
              <span className="text-foreground font-medium">Vercel</span> —
              application hosting.
            </li>
            <li>
              <span className="text-foreground font-medium">Resend</span> —
              alert email delivery (they process your email address).
            </li>
            <li>
              <span className="text-foreground font-medium">
                exchangerate.host
              </span>{" "}
              — market data. Your personal data is never sent to them.
            </li>
          </ul>
          <p>We do not sell or rent your personal data to anyone.</p>
        </Section>

        <Section title="5. Data security">
          <p>
            Your data is protected by row-level security in our database —
            each account can only ever read or modify its own records —
            alongside encrypted connections (TLS) everywhere and hashed
            passwords. No method of storage is 100% secure, but isolation is
            enforced at the database layer, not just in application code.
          </p>
        </Section>

        <Section title="6. Data retention and deletion">
          <p>
            We keep your data for as long as your account exists. Deleting an
            alert also deletes its notification history. To delete your
            account and all associated data, contact us at the address below
            and we will remove it within 30 days.
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>
            We use strictly necessary session cookies to keep you signed in.
            We set no advertising or third-party tracking cookies.
          </p>
        </Section>

        <Section title="8. Your rights">
          <p>
            Depending on where you live (e.g. GDPR or CCPA jurisdictions),
            you may have the right to access, correct, export, or delete your
            personal data, and to object to its processing. Contact us to
            exercise any of these rights.
          </p>
        </Section>

        <Section title="9. Changes to this policy">
          <p>
            If we make material changes, we will update the date at the top
            of this page and, for significant changes, notify you by email.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about privacy? Email{" "}
            <a
              href="mailto:privacy@ratewatch.app"
              className="text-brand underline underline-offset-4"
            >
              privacy@ratewatch.app
            </a>
            . See also our{" "}
            <Link href="/terms" className="text-brand underline underline-offset-4">
              Terms of Service
            </Link>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}

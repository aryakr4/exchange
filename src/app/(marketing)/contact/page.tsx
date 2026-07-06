import type { Metadata } from "next";
import Link from "next/link";
import { Mail, HelpCircle, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with RateWatch — questions, feedback, account help, or privacy requests.",
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  {
    icon: Mail,
    title: "Email us",
    body: (
      <>
        General questions, feedback, or account help — write to{" "}
        <a
          href="mailto:skullsupernatural@gmail.com"
          className="text-brand underline underline-offset-4"
        >
          skullsupernatural@gmail.com
        </a>
        . We read every message.
      </>
    ),
  },
  {
    icon: HelpCircle,
    title: "Check the FAQ first",
    body: (
      <>
        Most questions about rates, alerts, and pricing are answered on the{" "}
        <Link href="/faq" className="text-brand underline underline-offset-4">
          FAQ page
        </Link>{" "}
        — it&rsquo;s the fastest way to an answer.
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "Privacy & data requests",
    body: (
      <>
        To access, export, or delete your data, email{" "}
        <a
          href="mailto:skullsupernatural@gmail.com"
          className="text-brand underline underline-offset-4"
        >
          skullsupernatural@gmail.com
        </a>
        . See the{" "}
        <Link href="/privacy" className="text-brand underline underline-offset-4">
          Privacy Policy
        </Link>{" "}
        for your rights.
      </>
    ),
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-brand font-mono text-xs font-semibold tracking-[0.2em] uppercase">
        Contact
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Get in touch
      </h1>
      <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">
        RateWatch is a small, focused tool for people sending money home.
        We&rsquo;d genuinely like to hear from you — whether something&rsquo;s
        broken, confusing, or you just have an idea.
      </p>
      <div className="bg-brand mt-6 h-px w-12" aria-hidden="true" />

      <div className="mt-10 grid gap-4 sm:grid-cols-1">
        {CHANNELS.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex gap-4 rounded-lg border p-5"
          >
            <span
              className="text-brand mt-0.5 shrink-0"
              aria-hidden="true"
            >
              <Icon className="size-5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-base font-semibold tracking-tight">{title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-muted-foreground/70 mt-8 text-xs leading-relaxed">
        We aim to reply within a couple of business days. RateWatch is an
        informational tool, not financial advice, and we can&rsquo;t action
        transfers on your behalf.
      </p>
    </div>
  );
}

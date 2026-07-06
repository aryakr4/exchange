import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-[0.7rem] font-semibold tracking-[0.18em] text-foreground/70 uppercase">
        {title}
      </p>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        {children}
      </Link>
    </li>
  );
}

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="h-0.5 bg-[#35a97d]" aria-hidden="true" />
      <header className="board-surface border-b border-[rgb(239_241_234/12%)] text-[#eff1ea]">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav
            className="flex items-center gap-1 sm:gap-2"
            aria-label="Main"
          >
            <Link
              href="/markets"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-[#c9d0c9] transition-colors hover:text-white"
            >
              Markets
            </Link>
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-[#c9d0c9] transition-colors hover:text-white"
            >
              Log in
            </Link>
            <Button
              size="sm"
              asChild
              className="bg-[#eff1ea] text-[#14201c] hover:bg-white"
            >
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div className="space-y-3">
              <Logo />
              <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
                One email the day your corridor turns in your favor — so more of
                what you send reaches home.
              </p>
            </div>

            <FooterColumn title="Product">
              <FooterLink href="/markets">Live markets</FooterLink>
              <FooterLink href="/signup">Get started</FooterLink>
              <FooterLink href="/login">Log in</FooterLink>
            </FooterColumn>

            <FooterColumn title="Support">
              <FooterLink href="/faq">FAQ</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
            </FooterColumn>

            <FooterColumn title="Legal">
              <FooterLink href="/privacy">Privacy</FooterLink>
              <FooterLink href="/terms">Terms</FooterLink>
            </FooterColumn>
          </div>

          <div className="mt-10 border-t pt-6">
            <p className="text-muted-foreground/70 max-w-3xl text-xs leading-relaxed">
              Rates shown are indicative mid-market values checked once daily,
              before any fees your transfer provider charges. RateWatch is an
              informational tool, not financial advice.
            </p>
            <div className="text-muted-foreground mt-4 flex flex-col items-start justify-between gap-2 text-sm sm:flex-row sm:items-center">
              <p>© {new Date().getFullYear()} RateWatch</p>
              <span className="font-mono text-xs">
                market data · exchangerate.host
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

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
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 sm:px-6">
          <div className="text-muted-foreground flex flex-col items-start justify-between gap-3 text-sm sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} RateWatch</p>
            <nav className="flex items-center gap-4" aria-label="Legal">
              <Link
                href="/privacy"
                className="hover:text-foreground underline-offset-4 hover:underline"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="hover:text-foreground underline-offset-4 hover:underline"
              >
                Terms
              </Link>
              <span className="font-mono text-xs">
                market data · exchangerate.host
              </span>
            </nav>
          </div>
          <p className="text-muted-foreground/70 max-w-3xl text-xs leading-relaxed">
            Rates shown are indicative mid-market values checked once daily,
            before any fees your transfer provider charges. RateWatch is an
            informational tool, not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

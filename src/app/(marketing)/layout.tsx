import Link from "next/link";
import { TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="bg-brand h-1" aria-hidden="true" />
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <TrendingUp className="text-brand size-5" aria-hidden="true" />
            RateWatch
          </Link>
          <nav className="flex items-center gap-2" aria-label="Main">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
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
            Rates are indicative mid-market values checked once daily and are
            not financial advice. RateWatch is an informational tool only.
          </p>
        </div>
      </footer>
    </div>
  );
}

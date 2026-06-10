import Link from "next/link";
import { Fraunces } from "next/font/google";
import { TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${fraunces.variable} flex min-h-svh flex-col`}>
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <TrendingUp className="size-5" aria-hidden="true" />
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
        <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} RateWatch</p>
          <p className="font-mono text-xs">
            market data · exchangerate.host
          </p>
        </div>
      </footer>
    </div>
  );
}

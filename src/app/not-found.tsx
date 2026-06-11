import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="bg-brand h-1" aria-hidden="true" />
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <TrendingUp className="size-5" aria-hidden="true" />
            RateWatch
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6">
          <p className="text-brand font-mono text-xs font-semibold tracking-[0.2em] uppercase">
            Error 404
          </p>
          <h1 className="font-mono text-7xl font-semibold tracking-tight">
            404
          </h1>
          <div className="bg-brand h-px w-12" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              This page doesn&apos;t exist
            </h2>
            <p className="text-muted-foreground text-sm">
              The page you&apos;re looking for was moved, removed, or never
              listed. Your alerts are unaffected.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/">
                Back to home
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

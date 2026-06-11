import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Home, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  // Private surface — keep it out of search results.
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Middleware already gates this route; this is defense in depth so the
  // layout never renders without a verified user even if the matcher drifts.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <div className="bg-brand h-1" aria-hidden="true" />
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <TrendingUp className="text-brand size-5" aria-hidden="true" />
            RateWatch
          </Link>
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <span
              className="text-muted-foreground hidden truncate font-mono text-xs sm:block"
              title={user.email ?? undefined}
            >
              {user.email}
            </span>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <Home className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </Button>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

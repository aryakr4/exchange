import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { confirmUnsubscribe } from "@/features/notifications/actions/unsubscribe";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

/**
 * Renders a confirm button rather than opting out on load: corporate link
 * scanners GET every URL in an inbound email, and a mutating GET would
 * unsubscribe people who never clicked.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string }>;
}) {
  const { token = "", done } = await searchParams;

  async function act() {
    "use server";
    await confirmUnsubscribe(token);
    redirect("/unsubscribe?done=1");
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md items-center px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Email alerts paused</CardTitle>
            <CardDescription>
              We won&apos;t email you about rate alerts anymore. Your alerts are
              still saved — sign in any time to resume them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/login">Sign in to RateWatch</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Stop RateWatch emails?</CardTitle>
          <CardDescription>
            You&apos;ll stop receiving rate-alert email. Your alerts stay saved,
            so you can turn email back on any time from your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <form action={act}>
            <Button type="submit">Unsubscribe</Button>
          </form>
          <Button asChild variant="ghost">
            <Link href="/">Cancel</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

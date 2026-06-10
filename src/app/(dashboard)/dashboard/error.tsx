"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] render error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      <div className="bg-destructive/10 flex size-12 items-center justify-center rounded-full">
        <AlertTriangle
          className="text-destructive size-5"
          aria-hidden="true"
        />
      </div>
      <div className="space-y-1">
        <h2 className="font-medium">Something went wrong</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          We couldn&apos;t load your alerts. This is usually temporary.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}

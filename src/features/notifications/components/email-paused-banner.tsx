"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { resumeEmails } from "@/features/notifications/actions/unsubscribe";
import { Button } from "@/components/ui/button";

export function EmailPausedBanner() {
  const [pending, startTransition] = useTransition();

  function onResume() {
    startTransition(async () => {
      const result = await resumeEmails();
      if (result.success) {
        toast.success("Email alerts resumed.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="border-border bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">Email alerts are paused</p>
        <p className="text-muted-foreground text-sm">
          Your alerts are still being checked — we just aren&apos;t emailing you
          about them.
        </p>
      </div>
      <Button size="sm" onClick={onResume} disabled={pending}>
        {pending ? "Resuming…" : "Resume emails"}
      </Button>
    </div>
  );
}

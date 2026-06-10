import { BellOff } from "lucide-react";

interface AlertsEmptyStateProps {
  /** Slot for the create-alert trigger (wired up in the CRUD phase). */
  action?: React.ReactNode;
}

export function AlertsEmptyState({ action }: AlertsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <BellOff className="text-muted-foreground size-5" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h2 className="font-medium">No alerts yet</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Create your first alert and RateWatch will start checking the rate
          every day at 06:00 UTC.
        </p>
      </div>
      {action}
    </div>
  );
}

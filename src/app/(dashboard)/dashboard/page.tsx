import type { Metadata } from "next";

import { AlertsEmptyState } from "@/features/alerts/components/alerts-empty-state";
import { AlertsTable } from "@/features/alerts/components/alerts-table";
import { CreateAlertDialog } from "@/features/alerts/components/create-alert-dialog";
import { getAlertsForCurrentUser } from "@/features/alerts/services/queries";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const alerts = await getAlertsForCurrentUser();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground text-sm">
            Checked once a day at{" "}
            <span className="font-mono text-xs">06:00 UTC</span>
          </p>
        </div>
        <CreateAlertDialog />
      </div>

      {alerts.length === 0 ? (
        <AlertsEmptyState />
      ) : (
        <AlertsTable alerts={alerts} />
      )}
    </div>
  );
}

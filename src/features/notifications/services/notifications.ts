import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notification persistence — service-role operations used only by the cron
 * pipeline. The unique (alert_id, trigger_date) constraint makes the
 * notification row the idempotency lock: whoever inserts it owns the send.
 */

export interface ClaimNotificationParams {
  alertId: string;
  userId: string;
  rate: number;
  /** UTC calendar date (YYYY-MM-DD) of the rate snapshot. */
  triggerDate: string;
}

/**
 * Atomically claim the right to notify for this alert today.
 *
 * Uses ON CONFLICT DO NOTHING (ignoreDuplicates): if another run — a retry,
 * a duplicate cron invocation, a concurrent execution — already inserted
 * today's row, this returns null and the caller must NOT send.
 */
export async function claimNotification(
  params: ClaimNotificationParams
): Promise<{ id: string } | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .upsert(
      {
        alert_id: params.alertId,
        user_id: params.userId,
        rate: params.rate,
        trigger_date: params.triggerDate,
        email_sent: false,
      },
      { onConflict: "alert_id,trigger_date", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to claim notification: ${error.message}`);
  }

  return data;
}

/** Mark a claimed notification as delivered. */
export async function markNotificationSent(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({ email_sent: true, sent_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to mark notification sent: ${error.message}`);
  }
}

export interface UnsentNotification {
  id: string;
  rate: number;
  trigger_date: string;
  alerts: {
    from_currency: string;
    to_currency: string;
    target_rate: number;
    condition: "greater_than" | "less_than";
  } | null;
  profiles: {
    email: string;
  } | null;
}

/**
 * Notifications whose email never went out (claimed, then the send or the
 * sent-flag update failed). Served by the partial index on email_sent.
 * Bounded so one bad day can't make the next run unbounded.
 */
export async function getUnsentNotifications(
  limit = 100
): Promise<UnsentNotification[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, rate, trigger_date, alerts(from_currency, to_currency, target_rate, condition), profiles(email)"
    )
    .eq("email_sent", false)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load unsent notifications: ${error.message}`);
  }

  return data;
}

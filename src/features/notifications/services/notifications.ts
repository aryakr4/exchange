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
    email_opt_out: boolean;
    unsubscribe_token: string;
  } | null;
}

/**
 * A rate more than this many days stale is no longer "current" — sending it
 * as today's rate would mislead the recipient, independent of anything else
 * going on with the alert or its owner. This bounds the retry sweep so a
 * notification stuck unsent (e.g. by an owner opting out before the retry
 * could land) can't sit forever and then get delivered, months later, with
 * a long-dead rate under the "Current rate" label.
 */
const RETRY_SWEEP_MAX_AGE_DAYS = 3;

/**
 * Notifications whose email never went out (claimed, then the send or the
 * sent-flag update failed). Served by the partial index on email_sent.
 * Bounded by count so one bad day can't make the next run unbounded, and by
 * age (see RETRY_SWEEP_MAX_AGE_DAYS) so a notification excluded for days by
 * the opt-out filter can't resurface later carrying a stale rate.
 */
export async function getUnsentNotifications(
  limit = 100
): Promise<UnsentNotification[]> {
  const supabase = createAdminClient();

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - RETRY_SWEEP_MAX_AGE_DAYS);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, rate, trigger_date, alerts(from_currency, to_currency, target_rate, condition), profiles!inner(email, email_opt_out, unsubscribe_token)"
    )
    .eq("email_sent", false)
    // Never re-send to someone who unsubscribed after the original attempt
    // failed. `!inner` above is required: with a left join, a filter on the
    // embedded table nulls the embed instead of dropping the row.
    .eq("profiles.email_opt_out", false)
    // Never re-send a rate that's no longer current. See RETRY_SWEEP_MAX_AGE_DAYS.
    .gte("trigger_date", cutoffDate)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load unsent notifications: ${error.message}`);
  }

  return data;
}

import "server-only";

import { evaluateAlert } from "@/features/alerts/services/evaluation";
import {
  claimNotification,
  getUnsentNotifications,
  markNotificationSent,
} from "@/features/notifications/services/notifications";
import { sendRateAlertEmail } from "@/lib/email";
import { getMultipleRates, saveDailyRates } from "@/lib/exchange-rates";
import type { FetchedRate } from "@/lib/exchange-rates";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums } from "@/types/database";

/**
 * The daily pipeline, in order:
 *
 *   1. Retry sweep — re-send emails that failed on previous runs.
 *   2. Load active alerts (with owner email).
 *   3. Fetch rates for every distinct pair in ONE API call; persist them.
 *   4. Evaluate each alert through the edge-trigger state machine.
 *   5. For triggers: claim the notification row first (the idempotency
 *      lock), only then send the email, then mark it sent.
 *
 * Safe to run twice: the second run finds every notification already
 * claimed and sends nothing.
 */

export interface DailyCheckSummary {
  sweepRetried: number;
  sweepSent: number;
  activeAlerts: number;
  pairsRequested: number;
  ratesFetched: number;
  failedPairs: string[];
  triggered: number;
  alreadyClaimed: number;
  emailsSent: number;
  emailsFailed: number;
  rearmed: number;
  durationMs: number;
}

interface ActiveAlertRow {
  id: string;
  user_id: string;
  from_currency: string;
  to_currency: string;
  target_rate: number;
  condition: Enums<"alert_condition">;
  trigger_state: Enums<"alert_trigger_state">;
  profiles: { email: string } | null;
}

const pairKey = (from: string, to: string) => `${from}->${to}`;

export async function runDailyRateCheck(): Promise<DailyCheckSummary> {
  const startedAt = Date.now();
  const supabase = createAdminClient();

  // 1. Retry sweep first, so yesterday's failures aren't starved by today's work.
  const sweep = await retryUnsentEmails();

  // 2. Active alerts with owner email.
  const { data: alerts, error: alertsError } = await supabase
    .from("alerts")
    .select(
      "id, user_id, from_currency, to_currency, target_rate, condition, trigger_state, profiles(email)"
    )
    .eq("active", true);

  if (alertsError) {
    throw new Error(`Failed to load active alerts: ${alertsError.message}`);
  }

  const summary: DailyCheckSummary = {
    ...sweep,
    activeAlerts: alerts.length,
    pairsRequested: 0,
    ratesFetched: 0,
    failedPairs: [],
    triggered: 0,
    alreadyClaimed: 0,
    emailsSent: 0,
    emailsFailed: 0,
    rearmed: 0,
    durationMs: 0,
  };

  if (alerts.length === 0) {
    summary.durationMs = Date.now() - startedAt;
    return summary;
  }

  // 3. One API call for the union of all pairs.
  const uniquePairs = [
    ...new Map(
      alerts.map((alert) => [
        pairKey(alert.from_currency, alert.to_currency),
        { from: alert.from_currency, to: alert.to_currency },
      ])
    ).values(),
  ];
  summary.pairsRequested = uniquePairs.length;

  const { rates, failedPairs, fetchedAt } = await getMultipleRates(uniquePairs);
  summary.ratesFetched = rates.length;
  summary.failedPairs = failedPairs.map((pair) => pairKey(pair.from, pair.to));

  // Market-data bookkeeping must not block notifications.
  try {
    await saveDailyRates(rates);
  } catch (error) {
    console.error(
      "[cron] saving daily rates failed, continuing with evaluation:",
      error instanceof Error ? error.message : error
    );
  }

  const rateByPair = new Map<string, FetchedRate>(
    rates.map((rate) => [pairKey(rate.base, rate.quote), rate])
  );
  const triggerDate = fetchedAt.toISOString().slice(0, 10);

  // 4 + 5. Evaluate and notify, alert by alert. An error on one alert is
  // logged and skipped — it must never take down the rest of the run.
  for (const alert of alerts as ActiveAlertRow[]) {
    const rate = rateByPair.get(pairKey(alert.from_currency, alert.to_currency));
    if (!rate) continue; // pair failed upstream, already in failedPairs

    try {
      const decision = evaluateAlert(alert, rate.rate);

      if (decision === "rearm") {
        await setTriggerState(alert.id, "armed", null);
        summary.rearmed++;
        continue;
      }

      if (decision !== "trigger") continue;
      summary.triggered++;

      const email = alert.profiles?.email;
      if (!email) {
        console.warn(`[cron] alert ${alert.id} has no owner email, skipping`);
        continue;
      }

      // Claim before sending — the row is the lock.
      const claimed = await claimNotification({
        alertId: alert.id,
        userId: alert.user_id,
        rate: rate.rate,
        triggerDate,
      });

      // Flip state even when already claimed: recovers a prior run that
      // crashed between claiming and updating the alert. Idempotent.
      await setTriggerState(alert.id, "triggered", fetchedAt.toISOString());

      if (!claimed) {
        summary.alreadyClaimed++;
        continue;
      }

      try {
        await sendRateAlertEmail({
          to: email,
          idempotencyKey: `rate-alert/${claimed.id}`,
          data: {
            userEmail: email,
            fromCurrency: alert.from_currency,
            toCurrency: alert.to_currency,
            targetRate: alert.target_rate,
            currentRate: rate.rate,
            condition: alert.condition,
            triggeredAt: fetchedAt,
            appUrl: env.NEXT_PUBLIC_APP_URL,
          },
        });
        await markNotificationSent(claimed.id);
        summary.emailsSent++;
      } catch (error) {
        // Row stays email_sent=false → tomorrow's sweep retries it.
        console.error(
          `[cron] email failed for alert ${alert.id}:`,
          error instanceof Error ? error.message : error
        );
        summary.emailsFailed++;
      }
    } catch (error) {
      console.error(
        `[cron] processing alert ${alert.id} failed:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  summary.durationMs = Date.now() - startedAt;
  return summary;
}

async function setTriggerState(
  alertId: string,
  state: Enums<"alert_trigger_state">,
  lastTriggeredAt: string | null
): Promise<void> {
  const supabase = createAdminClient();
  const update =
    state === "triggered" && lastTriggeredAt
      ? { trigger_state: state, last_triggered_at: lastTriggeredAt }
      : { trigger_state: state };

  const { error } = await supabase
    .from("alerts")
    .update(update)
    .eq("id", alertId);

  if (error) {
    throw new Error(`Failed to set trigger_state: ${error.message}`);
  }
}

/** Re-send previously claimed notifications whose email never went out. */
async function retryUnsentEmails(): Promise<{
  sweepRetried: number;
  sweepSent: number;
}> {
  const unsent = await getUnsentNotifications();
  let sweepSent = 0;

  for (const notification of unsent) {
    const alert = notification.alerts;
    const email = notification.profiles?.email;
    if (!alert || !email) {
      console.warn(
        `[cron] sweep: notification ${notification.id} missing alert or email, skipping`
      );
      continue;
    }

    try {
      // Same idempotency key as the original attempt: if the email actually
      // went out and only the sent-flag update failed, Resend dedupes.
      await sendRateAlertEmail({
        to: email,
        idempotencyKey: `rate-alert/${notification.id}`,
        data: {
          userEmail: email,
          fromCurrency: alert.from_currency,
          toCurrency: alert.to_currency,
          targetRate: alert.target_rate,
          currentRate: notification.rate,
          condition: alert.condition,
          triggeredAt: new Date(`${notification.trigger_date}T00:00:00Z`),
          appUrl: env.NEXT_PUBLIC_APP_URL,
        },
      });
      await markNotificationSent(notification.id);
      sweepSent++;
    } catch (error) {
      console.error(
        `[cron] sweep: retry failed for notification ${notification.id}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  if (unsent.length > 0) {
    console.info(
      `[cron] sweep: retried ${unsent.length}, delivered ${sweepSent}`
    );
  }

  return { sweepRetried: unsent.length, sweepSent };
}

import type { Alert } from "@/types";

/**
 * Edge-triggered alert evaluation — pure functions, no I/O.
 *
 * An alert is a two-state machine:
 *
 *   armed     --condition met-->     trigger (notify, become "triggered")
 *   triggered --condition not met--> rearm  (become "armed", no notify)
 *
 * Everything else is "none". This is what guarantees one email per
 * threshold crossing: while the rate stays past the target the alert sits
 * in "triggered" and stays quiet; once the rate retreats it re-arms, and
 * a later crossing notifies again.
 */

export type AlertDecision = "trigger" | "rearm" | "none";

type EvaluatableAlert = Pick<
  Alert,
  "condition" | "target_rate" | "trigger_state"
>;

/** greater_than: current >= target · less_than: current <= target */
export function isConditionMet(
  alert: Pick<Alert, "condition" | "target_rate">,
  currentRate: number
): boolean {
  return alert.condition === "greater_than"
    ? currentRate >= alert.target_rate
    : currentRate <= alert.target_rate;
}

export function evaluateAlert(
  alert: EvaluatableAlert,
  currentRate: number
): AlertDecision {
  const met = isConditionMet(alert, currentRate);

  if (met && alert.trigger_state === "armed") return "trigger";
  if (!met && alert.trigger_state === "triggered") return "rearm";
  return "none";
}

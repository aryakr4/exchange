import type { Enums, Tables } from "@/types/database";

export type Profile = Tables<"profiles">;
export type Alert = Tables<"alerts">;
export type DailyRate = Tables<"daily_rates">;
export type Notification = Tables<"notifications">;

export type AlertCondition = Enums<"alert_condition">;
export type AlertTriggerState = Enums<"alert_trigger_state">;

/** Discriminated result type returned by every Server Action. */
export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Alert } from "@/types";

/**
 * All alerts for the signed-in user, newest first.
 *
 * Uses the session-scoped client, so RLS guarantees the result can only
 * contain the caller's own rows — no user_id filter needed here, the
 * database enforces it.
 */
export async function getAlertsForCurrentUser(): Promise<Alert[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[alerts] failed to load alerts:", error.message);
    throw new Error("Failed to load alerts");
  }

  return data;
}

/**
 * Whether the signed-in user has opted out of alert email. RLS scopes the read
 * to their own profile row.
 */
export async function getEmailOptOutForCurrentUser(): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("email_opt_out")
    .maybeSingle();

  if (error) {
    console.error("[alerts] failed to load email opt-out:", error.message);
    return false; // Never block the dashboard on this.
  }

  return data?.email_opt_out ?? false;
}

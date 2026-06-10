"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";
import {
  alertIdSchema,
  createAlertSchema,
  toggleAlertSchema,
} from "@/features/alerts/schemas";

/**
 * Every action here follows the same contract:
 *   1. verify the session server-side (never trust the client),
 *   2. Zod-parse the input (client validation is advisory only),
 *   3. mutate through the session-scoped client — RLS is the authorization
 *      floor, the explicit user_id match is defense in depth on top of it,
 *   4. revalidate the dashboard so Server Components re-render fresh data,
 *   5. return a typed ActionResult; raw errors are logged, never leaked.
 */

export async function createAlert(input: unknown): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const parsed = createAlertSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { error } = await supabase.from("alerts").insert({
    user_id: user.id, // always from the session, never from the client
    from_currency: parsed.data.from_currency,
    to_currency: parsed.data.to_currency,
    target_rate: parsed.data.target_rate,
    condition: parsed.data.condition,
  });

  if (error) {
    console.error("[alerts] create failed:", error.message);
    return { success: false, error: "Could not create the alert. Try again." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleAlertActive(input: {
  id: string;
  active: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const parsed = toggleAlertSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  // Note: pausing/resuming intentionally leaves trigger_state untouched —
  // resuming an alert whose condition still holds must not re-notify for
  // the same market state.
  const { data, error } = await supabase
    .from("alerts")
    .update({ active: parsed.data.active })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[alerts] toggle failed:", error.message);
    return { success: false, error: "Could not update the alert. Try again." };
  }
  if (!data) {
    return { success: false, error: "Alert not found." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAlert(input: { id: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const parsedId = alertIdSchema.safeParse(input?.id);
  if (!parsedId.success) {
    return { success: false, error: "Invalid request." };
  }

  const { data, error } = await supabase
    .from("alerts")
    .delete()
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[alerts] delete failed:", error.message);
    return { success: false, error: "Could not delete the alert. Try again." };
  }
  if (!data) {
    return { success: false, error: "Alert not found." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

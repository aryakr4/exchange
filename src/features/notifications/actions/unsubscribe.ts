"use server";

import { revalidatePath } from "next/cache";

import {
  resubscribe,
  unsubscribeByToken,
} from "@/features/notifications/services/unsubscribe";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

/**
 * The human path: invoked by the confirm button on /unsubscribe.
 *
 * A Server Action rather than a GET handler, so that a link scanner fetching
 * the URL in the email cannot opt the user out without a deliberate click.
 */
export async function confirmUnsubscribe(
  token: string
): Promise<{ ok: boolean }> {
  const result = await unsubscribeByToken(token);
  return { ok: result === "ok" };
}

/** Turn alert email back on. The user id comes from the session, never the client. */
export async function resumeEmails(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  try {
    const result = await resubscribe(user.id);
    if (result === "not_found") {
      return { success: false, error: "Couldn't update your email settings." };
    }
  } catch (error) {
    console.error("[notifications] resume failed:", error instanceof Error ? error.message : String(error));
    return { success: false, error: "Couldn't update your email settings." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

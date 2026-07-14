import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Global email opt-out.
 *
 * The token is the sole credential here — the person clicking has no session
 * and never will. Writes go through the admin client because `profiles` has no
 * user-facing write policies by design (rows are owned by the auth triggers).
 */

export type UnsubscribeResult = "ok" | "not_found";

const tokenSchema = z.uuid();

/**
 * Opt a profile out of alert email by its unsubscribe token.
 *
 * Idempotent: unsubscribing an already-opted-out profile still matches the row
 * and reports "ok". This matters because mail clients retry one-click POSTs.
 */
export async function unsubscribeByToken(
  token: string
): Promise<UnsubscribeResult> {
  // Guard before the query: Postgres raises on a malformed uuid comparison,
  // which would turn a junk token into a 500 instead of a quiet miss.
  if (!tokenSchema.safeParse(token).success) {
    return "not_found";
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ email_opt_out: true })
    .eq("unsubscribe_token", token)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to unsubscribe: ${error.message}`);
  }

  return data ? "ok" : "not_found";
}

/** Clear the opt-out. Called from the dashboard, where the id comes from the session. */
export async function resubscribe(userId: string): Promise<UnsubscribeResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ email_opt_out: false })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resubscribe: ${error.message}`);
  }

  return data ? "ok" : "not_found";
}

/**
 * The two URLs an alert email carries. They are different on purpose: the body
 * link must land on a page a human confirms (a link scanner will GET it), while
 * one-click must hit a route that only acts on POST.
 */
export function buildUnsubscribeUrls(
  appUrl: string,
  token: string
): { pageUrl: string; oneClickUrl: string } {
  const base = appUrl.replace(/\/$/, "");
  return {
    pageUrl: `${base}/unsubscribe?token=${token}`,
    oneClickUrl: `${base}/api/unsubscribe?token=${token}`,
  };
}

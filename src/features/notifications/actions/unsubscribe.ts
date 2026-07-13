"use server";

import { unsubscribeByToken } from "@/features/notifications/services/unsubscribe";

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

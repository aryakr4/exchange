import "server-only";

import { Resend } from "resend";

import { env } from "@/lib/env";
import {
  buildRateAlertEmail,
  type RateAlertEmailData,
} from "@/lib/email/templates/rate-alert";

export class EmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailError";
  }
}

let resendClient: Resend | null = null;

function getResend(): Resend {
  resendClient ??= new Resend(env.RESEND_API_KEY);
  return resendClient;
}

export interface SendRateAlertEmailParams {
  to: string;
  data: RateAlertEmailData;
  /**
   * Deduplication key forwarded to Resend (defense in depth on top of the
   * database idempotency lock). Use something stable per logical send,
   * e.g. the notification row id.
   */
  idempotencyKey: string;
}

/**
 * Send a rate-alert email. Throws EmailError on failure so the caller
 * (the cron pipeline) can record the miss and let the retry sweep pick
 * it up on the next run.
 */
export async function sendRateAlertEmail({
  to,
  data,
  idempotencyKey,
}: SendRateAlertEmailParams): Promise<{ id: string }> {
  const { subject, html, text } = buildRateAlertEmail(data);

  const { data: sent, error } = await getResend().emails.send(
    {
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    },
    { idempotencyKey }
  );

  if (error || !sent) {
    console.error(
      `[email] rate-alert send failed (key=${idempotencyKey}):`,
      error?.message ?? "no response data"
    );
    throw new EmailError(error?.message ?? "Email send failed");
  }

  console.info(
    `[email] rate-alert sent (resend_id=${sent.id}, key=${idempotencyKey})`
  );
  return { id: sent.id };
}

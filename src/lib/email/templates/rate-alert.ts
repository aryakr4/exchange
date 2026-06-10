import { formatRate } from "@/lib/format";

/**
 * Rate-alert email template.
 *
 * Pure function (no env, no I/O) so it unit-tests without mocks. Email-safe
 * HTML: table layout, fully inlined styles, 600px max width, plus a
 * plain-text alternative for deliverability.
 */

export interface RateAlertEmailData {
  userEmail: string;
  fromCurrency: string;
  toCurrency: string;
  targetRate: number;
  currentRate: number;
  condition: "greater_than" | "less_than";
  triggeredAt: Date;
  /** Absolute app URL for the dashboard link. */
  appUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const CONDITION_COPY = {
  greater_than: { symbol: "≥", phrase: "risen to your target of" },
  less_than: { symbol: "≤", phrase: "fallen to your target of" },
} as const;

function formatTimestamp(date: Date): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(date) + " UTC"
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildRateAlertEmail(data: RateAlertEmailData): RenderedEmail {
  const pair = `${data.fromCurrency} → ${data.toCurrency}`;
  const condition = CONDITION_COPY[data.condition];
  const current = formatRate(data.currentRate);
  const target = formatRate(data.targetRate);
  const timestamp = formatTimestamp(data.triggeredAt);
  const dashboardUrl = `${data.appUrl}/dashboard`;

  const subject = `Target reached: ${pair} at ${current}`;

  const text = [
    `Your rate alert was triggered.`,
    ``,
    `Pair:        ${pair}`,
    `Current:     1 ${data.fromCurrency} = ${current} ${data.toCurrency}`,
    `Your target: ${condition.symbol} ${target}`,
    `Checked:     ${timestamp}`,
    ``,
    `The ${pair} rate has ${condition.phrase} ${target}.`,
    ``,
    `Manage your alerts: ${dashboardUrl}`,
    ``,
    `Sent to ${data.userEmail} by RateWatch because you created this alert.`,
  ].join("\n");

  const mono =
    "'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace";
  const sans =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;">
  <div style="display:none;max-height:0;overflow:hidden;">${pair} has ${condition.phrase} ${target} — now at ${current}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4;">
          <!-- Header -->
          <tr>
            <td style="background-color:#0c0a09;padding:20px 32px;">
              <span style="font-family:${sans};font-size:16px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">📈 RateWatch</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="font-family:${sans};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#16a34a;margin:0 0 8px;">Target reached</p>
              <h1 style="font-family:${sans};font-size:22px;font-weight:600;color:#0c0a09;margin:0 0 16px;letter-spacing:-0.01em;">
                ${pair} has ${condition.phrase} ${target}
              </h1>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="font-family:${sans};font-size:12px;color:#78716c;margin:0 0 4px;">Current rate</p>
                    <p style="font-family:${mono};font-size:28px;font-weight:600;color:#0c0a09;margin:0 0 16px;">
                      1 ${data.fromCurrency} = ${current} ${data.toCurrency}
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-family:${sans};font-size:13px;color:#78716c;padding:4px 0;">Your target</td>
                        <td align="right" style="font-family:${mono};font-size:13px;color:#0c0a09;padding:4px 0;">${condition.symbol} ${target}</td>
                      </tr>
                      <tr>
                        <td style="font-family:${sans};font-size:13px;color:#78716c;padding:4px 0;">Checked at</td>
                        <td align="right" style="font-family:${mono};font-size:13px;color:#0c0a09;padding:4px 0;">${timestamp}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
                <tr>
                  <td style="background-color:#0c0a09;border-radius:8px;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;font-family:${sans};font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;">Manage alerts</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e7e5e4;">
              <p style="font-family:${sans};font-size:12px;line-height:1.6;color:#a8a29e;margin:0;">
                Sent to ${escapeHtml(data.userEmail)} because you created this alert on RateWatch.
                This alert is now paused for this market move — it re-arms automatically if the rate
                moves away from your target.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

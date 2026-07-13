import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

import { sendRateAlertEmail } from "@/lib/email/resend";

const data = {
  userEmail: "user@example.com",
  fromCurrency: "USD",
  toCurrency: "EUR",
  targetRate: 0.95,
  currentRate: 0.96,
  condition: "greater_than" as const,
  triggeredAt: new Date("2026-06-10T06:00:00Z"),
  appUrl: "https://ratewatch.app",
  unsubscribeUrl: "https://ratewatch.app/unsubscribe?token=tok-1",
  oneClickUnsubscribeUrl: "https://ratewatch.app/api/unsubscribe?token=tok-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  send.mockResolvedValue({ data: { id: "resend-1" }, error: null });
});

describe("sendRateAlertEmail", () => {
  it("sets both one-click unsubscribe headers", async () => {
    await sendRateAlertEmail({
      to: "user@example.com",
      data,
      idempotencyKey: "rate-alert/notif-1",
    });

    // Both are required together — List-Unsubscribe alone does not satisfy
    // RFC 8058 one-click, and Gmail/Yahoo check for the pair.
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          "List-Unsubscribe":
            "<https://ratewatch.app/api/unsubscribe?token=tok-1>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
      { idempotencyKey: "rate-alert/notif-1" }
    );
  });
});

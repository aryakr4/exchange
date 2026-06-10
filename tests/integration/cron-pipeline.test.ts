import { beforeEach, describe, expect, it, vi } from "vitest";

import { runDailyRateCheck } from "@/features/notifications/services/run-daily-check";

const FETCHED_AT = new Date("2026-06-10T06:00:00Z");

const getMultipleRates = vi.fn();
const saveDailyRates = vi.fn();
vi.mock("@/lib/exchange-rates", () => ({
  getMultipleRates: (...args: unknown[]) => getMultipleRates(...args),
  saveDailyRates: (...args: unknown[]) => saveDailyRates(...args),
}));

const sendRateAlertEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendRateAlertEmail: (...args: unknown[]) => sendRateAlertEmail(...args),
}));

const claimNotification = vi.fn();
const markNotificationSent = vi.fn();
const getUnsentNotifications = vi.fn();
vi.mock("@/features/notifications/services/notifications", () => ({
  claimNotification: (...args: unknown[]) => claimNotification(...args),
  markNotificationSent: (...args: unknown[]) => markNotificationSent(...args),
  getUnsentNotifications: (...args: unknown[]) =>
    getUnsentNotifications(...args),
}));

// Admin client: select on alerts returns the fixture; updates are recorded.
let activeAlerts: unknown[] = [];
const alertUpdates: Array<{ payload: unknown; id: unknown }> = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: async () => ({ data: activeAlerts, error: null }),
      }),
      update: (payload: unknown) => ({
        eq: async (_column: string, id: unknown) => {
          alertUpdates.push({ payload, id });
          return { error: null };
        },
      }),
    }),
  }),
}));

function makeAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: "alert-1",
    user_id: "user-1",
    from_currency: "USD",
    to_currency: "EUR",
    target_rate: 0.95,
    condition: "greater_than",
    trigger_state: "armed",
    profiles: { email: "user@example.com" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  alertUpdates.length = 0;
  activeAlerts = [];
  getUnsentNotifications.mockResolvedValue([]);
  saveDailyRates.mockResolvedValue(undefined);
  getMultipleRates.mockResolvedValue({
    rates: [
      { base: "USD", quote: "EUR", rate: 0.96, fetchedAt: FETCHED_AT },
    ],
    failedPairs: [],
    fetchedAt: FETCHED_AT,
  });
  claimNotification.mockResolvedValue({ id: "notif-1" });
  sendRateAlertEmail.mockResolvedValue({ id: "resend-1" });
  markNotificationSent.mockResolvedValue(undefined);
});

describe("runDailyRateCheck", () => {
  it("triggers an armed alert: claims, emails, marks sent, flips state", async () => {
    activeAlerts = [makeAlert()];

    const summary = await runDailyRateCheck();

    expect(claimNotification).toHaveBeenCalledWith({
      alertId: "alert-1",
      userId: "user-1",
      rate: 0.96,
      triggerDate: "2026-06-10",
    });
    expect(sendRateAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        idempotencyKey: "rate-alert/notif-1",
      })
    );
    expect(markNotificationSent).toHaveBeenCalledWith("notif-1");
    expect(alertUpdates).toContainEqual({
      payload: expect.objectContaining({ trigger_state: "triggered" }),
      id: "alert-1",
    });
    expect(summary.triggered).toBe(1);
    expect(summary.emailsSent).toBe(1);
    expect(summary.emailsFailed).toBe(0);
  });

  it("duplicate run sends nothing: claim already taken", async () => {
    activeAlerts = [makeAlert()];
    claimNotification.mockResolvedValue(null); // someone already claimed today

    const summary = await runDailyRateCheck();

    expect(sendRateAlertEmail).not.toHaveBeenCalled();
    expect(markNotificationSent).not.toHaveBeenCalled();
    expect(summary.alreadyClaimed).toBe(1);
    expect(summary.emailsSent).toBe(0);
  });

  it("stays silent while a triggered alert's condition still holds", async () => {
    activeAlerts = [makeAlert({ trigger_state: "triggered" })];

    const summary = await runDailyRateCheck();

    expect(claimNotification).not.toHaveBeenCalled();
    expect(sendRateAlertEmail).not.toHaveBeenCalled();
    expect(summary.triggered).toBe(0);
    expect(summary.rearmed).toBe(0);
  });

  it("re-arms a triggered alert when the rate retreats", async () => {
    activeAlerts = [makeAlert({ trigger_state: "triggered" })];
    getMultipleRates.mockResolvedValue({
      rates: [{ base: "USD", quote: "EUR", rate: 0.9, fetchedAt: FETCHED_AT }],
      failedPairs: [],
      fetchedAt: FETCHED_AT,
    });

    const summary = await runDailyRateCheck();

    expect(alertUpdates).toContainEqual({
      payload: { trigger_state: "armed" },
      id: "alert-1",
    });
    expect(sendRateAlertEmail).not.toHaveBeenCalled();
    expect(summary.rearmed).toBe(1);
  });

  it("keeps the notification unsent when the email fails", async () => {
    activeAlerts = [makeAlert()];
    sendRateAlertEmail.mockRejectedValue(new Error("resend down"));

    const summary = await runDailyRateCheck();

    expect(markNotificationSent).not.toHaveBeenCalled();
    expect(summary.emailsFailed).toBe(1);
    expect(summary.emailsSent).toBe(0);
    // The alert still flipped to triggered — the retry sweep owns delivery.
    expect(alertUpdates).toContainEqual({
      payload: expect.objectContaining({ trigger_state: "triggered" }),
      id: "alert-1",
    });
  });

  it("one failing alert does not stop the others", async () => {
    activeAlerts = [
      makeAlert(),
      makeAlert({ id: "alert-2", profiles: { email: "two@example.com" } }),
    ];
    claimNotification
      .mockRejectedValueOnce(new Error("db hiccup"))
      .mockResolvedValueOnce({ id: "notif-2" });

    const summary = await runDailyRateCheck();

    expect(sendRateAlertEmail).toHaveBeenCalledTimes(1);
    expect(sendRateAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "two@example.com" })
    );
    expect(summary.emailsSent).toBe(1);
  });

  it("retry sweep re-sends with the original idempotency key", async () => {
    getUnsentNotifications.mockResolvedValue([
      {
        id: "notif-old",
        rate: 0.97,
        trigger_date: "2026-06-09",
        alerts: {
          from_currency: "USD",
          to_currency: "EUR",
          target_rate: 0.95,
          condition: "greater_than",
        },
        profiles: { email: "user@example.com" },
      },
    ]);

    const summary = await runDailyRateCheck();

    expect(sendRateAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "rate-alert/notif-old" })
    );
    expect(markNotificationSent).toHaveBeenCalledWith("notif-old");
    expect(summary.sweepRetried).toBe(1);
    expect(summary.sweepSent).toBe(1);
  });

  it("evaluates alerts with one rates call for many pairs", async () => {
    activeAlerts = [
      makeAlert(),
      makeAlert({ id: "alert-2", from_currency: "GBP", to_currency: "JPY" }),
      makeAlert({ id: "alert-3" }), // duplicate USD->EUR pair
    ];

    await runDailyRateCheck();

    expect(getMultipleRates).toHaveBeenCalledTimes(1);
    expect(getMultipleRates).toHaveBeenCalledWith([
      { from: "USD", to: "EUR" },
      { from: "GBP", to: "JPY" },
    ]);
  });
});

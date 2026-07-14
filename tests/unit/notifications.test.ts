import { beforeEach, describe, expect, it, vi } from "vitest";

import { getUnsentNotifications } from "@/features/notifications/services/notifications";

/**
 * Records every query-builder call issued against `notifications`, so the
 * test can assert on the *filters* the service applies — including the
 * `trigger_date` age bound — without a real database.
 *
 * Every chain method returns the same recorder and is itself thenable,
 * matching how supabase-js query builders resolve when awaited.
 */
type Call = { method: string; args: unknown[] };

let calls: Call[] = [];
let resultData: unknown[] = [];

function makeQueryBuilder() {
  const builder: Record<string, unknown> = {};
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };

  builder.select = record("select");
  builder.eq = record("eq");
  builder.gte = record("gte");
  builder.order = record("order");
  builder.limit = record("limit");
  builder.then = (
    resolve: (value: { data: unknown; error: null }) => void
  ) => resolve({ data: resultData, error: null });

  return builder;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => makeQueryBuilder(),
  }),
}));

beforeEach(() => {
  calls = [];
  resultData = [];
  vi.useRealTimers();
});

describe("getUnsentNotifications", () => {
  it("bounds the retry sweep to recent notifications by trigger_date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00Z"));

    await getUnsentNotifications();

    const gte = calls.find((call) => call.method === "gte");
    expect(gte).toBeDefined();
    expect(gte?.args[0]).toBe("trigger_date");
    // 3 days before 2026-06-10 (UTC) is 2026-06-07 — a stale rate beyond
    // this must never be delivered as "current".
    expect(gte?.args[1]).toBe("2026-06-07");

    vi.useRealTimers();
  });

  it("still filters out opted-out owners and unsent emails", async () => {
    await getUnsentNotifications();

    expect(calls).toContainEqual({ method: "eq", args: ["email_sent", false] });
    expect(calls).toContainEqual({
      method: "eq",
      args: ["profiles.email_opt_out", false],
    });
  });

  it("passes the limit through to the query", async () => {
    await getUnsentNotifications(25);

    expect(calls).toContainEqual({ method: "limit", args: [25] });
  });
});

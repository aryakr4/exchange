import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildUnsubscribeUrls,
  resubscribe,
  unsubscribeByToken,
} from "@/features/notifications/services/unsubscribe";

const TOKEN = "3f8b2c1e-9d4a-4b7e-8c1f-2a5d6e7f8a9b";

// Records every update the service issues, and controls whether a row matched.
const updates: Array<{
  payload: unknown;
  column: string;
  value: unknown;
}> = [];
let matchedRow: { id: string } | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (payload: unknown) => ({
        eq: (column: string, value: unknown) => {
          updates.push({ payload, column, value });
          return {
            select: () => ({
              maybeSingle: async () => ({ data: matchedRow, error: null }),
            }),
          };
        },
      }),
    }),
  }),
}));

beforeEach(() => {
  updates.length = 0;
  matchedRow = { id: "user-1" };
});

describe("unsubscribeByToken", () => {
  it("opts out the profile holding the token", async () => {
    const result = await unsubscribeByToken(TOKEN);

    expect(result).toBe("ok");
    expect(updates).toEqual([
      {
        payload: { email_opt_out: true },
        column: "unsubscribe_token",
        value: TOKEN,
      },
    ]);
  });

  it("is idempotent — unsubscribing twice still reports ok", async () => {
    await unsubscribeByToken(TOKEN);
    const result = await unsubscribeByToken(TOKEN);

    expect(result).toBe("ok");
    expect(updates).toHaveLength(2);
  });

  it("reports not_found for a well-formed but unknown token", async () => {
    matchedRow = null;

    expect(await unsubscribeByToken(TOKEN)).toBe("not_found");
  });

  it("rejects a malformed token without querying the database", async () => {
    // A non-uuid would make Postgres raise, turning junk input into a 500.
    expect(await unsubscribeByToken("not-a-uuid")).toBe("not_found");
    expect(await unsubscribeByToken("")).toBe("not_found");
    expect(updates).toHaveLength(0);
  });
});

describe("resubscribe", () => {
  it("clears the opt-out for the given user", async () => {
    const result = await resubscribe("user-1");

    expect(result).toBe("ok");
    expect(updates).toEqual([
      { payload: { email_opt_out: false }, column: "id", value: "user-1" },
    ]);
  });
});

describe("buildUnsubscribeUrls", () => {
  it("points the body link at the page and one-click at the API route", () => {
    const urls = buildUnsubscribeUrls("https://ratewatch.app", TOKEN);

    expect(urls.pageUrl).toBe(
      `https://ratewatch.app/unsubscribe?token=${TOKEN}`
    );
    expect(urls.oneClickUrl).toBe(
      `https://ratewatch.app/api/unsubscribe?token=${TOKEN}`
    );
  });

  it("does not double the slash when appUrl has a trailing one", () => {
    const urls = buildUnsubscribeUrls("https://ratewatch.app/", TOKEN);

    expect(urls.pageUrl).toBe(
      `https://ratewatch.app/unsubscribe?token=${TOKEN}`
    );
  });
});

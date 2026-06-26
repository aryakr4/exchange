import { describe, it, expect, vi } from "vitest";

import {
  groundTarget,
  buildSummary,
  interpretAlertDraft,
  type AlertDraftRaw,
} from "@/features/alerts/services/interpret";

describe("groundTarget", () => {
  it("keeps an explicit positive target and marks it not suggested", () => {
    expect(groundTarget("greater_than", 84.1, 90)).toEqual({
      target: 90,
      suggested: false,
    });
  });

  it("suggests above current for greater_than when target is null", () => {
    expect(groundTarget("greater_than", 100, null)).toEqual({
      target: 100.5,
      suggested: true,
    });
  });

  it("suggests below current for less_than when target is null", () => {
    expect(groundTarget("less_than", 100, null)).toEqual({
      target: 99.5,
      suggested: true,
    });
  });

  it("rounds the suggested target to 4 decimals", () => {
    expect(groundTarget("greater_than", 84.1234, null).target).toBe(84.5440);
  });

  it("treats a non-positive explicit target as 'suggest instead'", () => {
    expect(groundTarget("greater_than", 100, 0).suggested).toBe(true);
  });
});

describe("buildSummary", () => {
  it("reads as a plain-language sentence with the condition glyph", () => {
    const summary = buildSummary(
      { from_currency: "USD", to_currency: "INR", condition: "greater_than", target_rate: 84.6 },
      84.1,
    );
    expect(summary).toContain("USD");
    expect(summary).toContain("INR");
    expect(summary).toContain("84.6");
    expect(summary).toContain("84.1");
  });
});

describe("interpretAlertDraft", () => {
  const okRaw: AlertDraftRaw = {
    from_currency: "USD",
    to_currency: "INR",
    condition: "greater_than",
    target_rate: null,
    clarification: null,
  };

  it("returns an ok draft, grounding a null target against the live rate", async () => {
    const result = await interpretAlertDraft("send money to india", {
      parse: vi.fn().mockResolvedValue(okRaw),
      getRate: vi.fn().mockResolvedValue(84),
    });
    expect(result).toMatchObject({
      status: "ok",
      draft: { from_currency: "USD", to_currency: "INR", condition: "greater_than", target_rate: 84.42 },
      currentRate: 84,
      suggested: true,
    });
  });

  it("rejects empty input before calling the parser", async () => {
    const parse = vi.fn();
    const result = await interpretAlertDraft("   ", { parse, getRate: vi.fn() });
    expect(result.status).toBe("error");
    expect(parse).not.toHaveBeenCalled();
  });

  it("rejects input longer than 500 chars before calling the parser", async () => {
    const parse = vi.fn();
    const result = await interpretAlertDraft("x".repeat(501), { parse, getRate: vi.fn() });
    expect(result.status).toBe("error");
    expect(parse).not.toHaveBeenCalled();
  });

  it("surfaces a parser-supplied clarification", async () => {
    const result = await interpretAlertDraft("send money to mars", {
      parse: vi.fn().mockResolvedValue({ ...okRaw, clarification: "We don't support MARS yet." }),
      getRate: vi.fn(),
    });
    expect(result).toEqual({ status: "clarification", message: "We don't support MARS yet." });
  });

  it("clarifies when the two currencies are the same", async () => {
    const result = await interpretAlertDraft("usd to usd", {
      parse: vi.fn().mockResolvedValue({ ...okRaw, to_currency: "USD" }),
      getRate: vi.fn(),
    });
    expect(result.status).toBe("clarification");
  });

  it("clarifies when a currency is outside the supported list", async () => {
    const result = await interpretAlertDraft("zar to xyz", {
      parse: vi.fn().mockResolvedValue({ ...okRaw, to_currency: "XYZ" }),
      getRate: vi.fn(),
    });
    expect(result.status).toBe("clarification");
  });

  it("returns a graceful error when the parser throws", async () => {
    const result = await interpretAlertDraft("anything", {
      parse: vi.fn().mockRejectedValue(new Error("api down")),
      getRate: vi.fn(),
    });
    expect(result.status).toBe("error");
  });

  it("returns a graceful error when the rate fetch throws", async () => {
    const result = await interpretAlertDraft("usd to inr", {
      parse: vi.fn().mockResolvedValue(okRaw),
      getRate: vi.fn().mockRejectedValue(new Error("no rate")),
    });
    expect(result.status).toBe("error");
  });
});

import { describe, expect, it } from "vitest";

import { buildRateAlertEmail } from "@/lib/email";

const baseData = {
  userEmail: "user@example.com",
  fromCurrency: "USD",
  toCurrency: "EUR",
  targetRate: 0.95,
  currentRate: 0.9512,
  condition: "greater_than" as const,
  triggeredAt: new Date("2026-06-10T06:00:00Z"),
  appUrl: "https://ratewatch.example.com",
};

describe("buildRateAlertEmail", () => {
  it("puts the pair and current rate in the subject", () => {
    const { subject } = buildRateAlertEmail(baseData);
    expect(subject).toBe("Target reached: USD → EUR at 0.9512");
  });

  it("includes every required fact in the HTML", () => {
    const { html } = buildRateAlertEmail(baseData);
    expect(html).toContain("user@example.com"); // recipient
    expect(html).toContain("USD → EUR"); // pair
    expect(html).toContain("0.9512"); // current rate
    expect(html).toContain("≥ 0.95"); // condition + target
    expect(html).toContain("Jun 10, 2026"); // timestamp
    expect(html).toContain("06:00 UTC");
    expect(html).toContain("https://ratewatch.example.com/dashboard");
  });

  it("includes the same facts in the plain-text part", () => {
    const { text } = buildRateAlertEmail(baseData);
    expect(text).toContain("USD → EUR");
    expect(text).toContain("0.9512");
    expect(text).toContain("≥ 0.95");
    expect(text).toContain("user@example.com");
    expect(text).toContain("https://ratewatch.example.com/dashboard");
  });

  it("uses falling language for less_than alerts", () => {
    const { html } = buildRateAlertEmail({
      ...baseData,
      condition: "less_than",
    });
    expect(html).toContain("fallen to your target");
    expect(html).toContain("≤ 0.95");
  });

  it("escapes HTML in user-controlled values", () => {
    const { html } = buildRateAlertEmail({
      ...baseData,
      userEmail: '<script>alert("x")</script>@evil.com',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

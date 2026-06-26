import { describe, expect, it } from "vitest";

import { loginSchema, signupSchema } from "@/features/auth/schemas";
import { createAlertSchema } from "@/features/alerts/schemas";
import { SUPPORTED_CURRENCY_CODES } from "@/features/alerts/constants";

const validAlert = {
  from_currency: "USD",
  to_currency: "EUR",
  target_rate: "0.95",
  condition: "greater_than",
};

describe("createAlertSchema", () => {
  it("accepts valid input and coerces the rate to a number", () => {
    const result = createAlertSchema.parse(validAlert);
    expect(result.target_rate).toBe(0.95);
    expect(result.from_currency).toBe("USD");
    expect(result.condition).toBe("greater_than");
  });

  it("rejects a zero rate", () => {
    const result = createAlertSchema.safeParse({
      ...validAlert,
      target_rate: "0",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Target rate must be greater than 0"
    );
  });

  it("rejects a negative rate", () => {
    expect(
      createAlertSchema.safeParse({ ...validAlert, target_rate: "-1" }).success
    ).toBe(false);
  });

  it("rejects a non-numeric rate", () => {
    expect(
      createAlertSchema.safeParse({ ...validAlert, target_rate: "abc" })
        .success
    ).toBe(false);
  });

  it("rejects identical source and target currencies", () => {
    const result = createAlertSchema.safeParse({
      ...validAlert,
      to_currency: "USD",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Source and target currency must differ"
    );
    expect(result.error?.issues[0]?.path).toEqual(["to_currency"]);
  });

  it("rejects currencies outside the supported list", () => {
    expect(
      createAlertSchema.safeParse({ ...validAlert, from_currency: "ZZZ" })
        .success
    ).toBe(false);
  });

  it("rejects lowercase currency codes", () => {
    expect(
      createAlertSchema.safeParse({ ...validAlert, from_currency: "usd" })
        .success
    ).toBe(false);
  });

  it("rejects an unknown condition", () => {
    expect(
      createAlertSchema.safeParse({ ...validAlert, condition: "equals" })
        .success
    ).toBe(false);
  });

  it("rejects missing currencies", () => {
    expect(
      createAlertSchema.safeParse({
        target_rate: "1",
        condition: "less_than",
      }).success
    ).toBe(false);
  });

  it("rejects a rate too large for numeric(18,8)", () => {
    expect(
      createAlertSchema.safeParse({ ...validAlert, target_rate: "1e12" })
        .success
    ).toBe(false);
  });

  it("supports major remittance-corridor currencies", () => {
    for (const code of ["PHP", "NGN", "VND", "GHS", "KES", "PKR", "BDT", "COP"]) {
      expect(SUPPORTED_CURRENCY_CODES).toContain(code);
    }
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.co", password: "x" }).success
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      loginSchema.safeParse({ email: "not-an-email", password: "x" }).success
    ).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.co", password: "" }).success
    ).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = {
    email: "a@b.co",
    password: "longenough",
    confirmPassword: "longenough",
  };

  it("accepts matching passwords of sufficient length", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a short password", () => {
    expect(
      signupSchema.safeParse({
        ...valid,
        password: "short",
        confirmPassword: "short",
      }).success
    ).toBe(false);
  });

  it("rejects mismatched passwords on the confirm field", () => {
    const result = signupSchema.safeParse({
      ...valid,
      confirmPassword: "different1",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});

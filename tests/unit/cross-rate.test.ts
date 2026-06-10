import { describe, expect, it } from "vitest";

import { computeCrossRate } from "@/lib/exchange-rates";

const quotes = { EUR: 0.92, GBP: 0.79, JPY: 151.4 };

describe("computeCrossRate", () => {
  it("USD → X returns the quote directly", () => {
    expect(computeCrossRate(quotes, "USD", "EUR")).toBeCloseTo(0.92, 10);
  });

  it("X → USD returns the inverse", () => {
    expect(computeCrossRate(quotes, "EUR", "USD")).toBeCloseTo(1 / 0.92, 10);
  });

  it("X → Y derives through USD", () => {
    // EUR → GBP = (USD→GBP) / (USD→EUR)
    expect(computeCrossRate(quotes, "EUR", "GBP")).toBeCloseTo(0.79 / 0.92, 10);
  });

  it("is consistent: rate(A→B) * rate(B→A) === 1", () => {
    const ab = computeCrossRate(quotes, "EUR", "JPY");
    const ba = computeCrossRate(quotes, "JPY", "EUR");
    expect(ab * ba).toBeCloseTo(1, 10);
  });

  it("throws when the source currency has no quote", () => {
    expect(() => computeCrossRate(quotes, "XXX", "EUR")).toThrow(
      "No USD quote for XXX"
    );
  });

  it("throws when the target currency has no quote", () => {
    expect(() => computeCrossRate(quotes, "EUR", "XXX")).toThrow(
      "No USD quote for XXX"
    );
  });

  it("throws on a zero quote instead of dividing by it", () => {
    expect(() => computeCrossRate({ EUR: 0 }, "EUR", "USD")).toThrow();
  });

  it("throws on a negative quote", () => {
    expect(() => computeCrossRate({ EUR: -1 }, "USD", "EUR")).toThrow();
  });
});

import { describe, it, expect } from "vitest";

import {
  scoreCase,
  summarize,
  type Expected,
  type EvalCaseResult,
} from "./score";
import type { AlertDraftRaw } from "@/features/alerts/services/interpret";

const draft = (over: Partial<AlertDraftRaw> = {}): AlertDraftRaw => ({
  from_currency: "USD",
  to_currency: "INR",
  condition: "greater_than",
  target_rate: null,
  clarification: null,
  ...over,
});

describe("scoreCase — concrete expectations", () => {
  const expected: Expected = {
    kind: "concrete",
    from: "USD",
    to: "INR",
    condition: "greater_than",
  };

  it("passes when from, to, and condition all match", () => {
    const result = scoreCase(expected, draft());
    expect(result.pass).toBe(true);
    expect(result.fields).toMatchObject({ from: true, to: true, condition: true });
  });

  it("fails and flags the wrong field when the direction is reversed", () => {
    const result = scoreCase(expected, draft({ from_currency: "INR", to_currency: "USD" }));
    expect(result.pass).toBe(false);
    expect(result.fields.from).toBe(false);
    expect(result.fields.to).toBe(false);
    expect(result.fields.condition).toBe(true);
  });

  it("fails when the condition is wrong even if currencies match", () => {
    const result = scoreCase(expected, draft({ condition: "less_than" }));
    expect(result.pass).toBe(false);
    expect(result.fields.condition).toBe(false);
  });

  it("ignores the target when the expectation gives no number", () => {
    const result = scoreCase(expected, draft({ target_rate: 999 }));
    expect(result.pass).toBe(true);
    expect(result.fields.target).toBeNull();
  });

  it("passes a numeric target within tolerance and fails outside it", () => {
    const withTarget: Expected = { ...expected, target: 0.95 };
    expect(scoreCase(withTarget, draft({ target_rate: 0.95 })).fields.target).toBe(true);
    expect(scoreCase(withTarget, draft({ target_rate: 1.5 })).pass).toBe(false);
  });

  it("does not penalize a clarification when the concrete fields are right", () => {
    const result = scoreCase(expected, draft({ clarification: "just checking" }));
    expect(result.pass).toBe(true);
  });
});

describe("scoreCase — clarification expectations", () => {
  const expected: Expected = { kind: "clarification" };

  it("passes when the model asks for clarification", () => {
    const result = scoreCase(expected, draft({ clarification: "We don't support that yet." }));
    expect(result.pass).toBe(true);
    expect(result.fields.clarification).toBe(true);
  });

  it("fails when the model confidently fills fields instead of clarifying", () => {
    const result = scoreCase(expected, draft({ clarification: null }));
    expect(result.pass).toBe(false);
    expect(result.fields.clarification).toBe(false);
  });
});

describe("summarize", () => {
  const results: EvalCaseResult[] = [
    { id: "a", category: "direct", pass: true },
    { id: "b", category: "direct", pass: false },
    { id: "c", category: "remittance", pass: true },
    { id: "d", category: "remittance", pass: true },
  ];

  it("computes overall accuracy", () => {
    const s = summarize(results);
    expect(s.total).toBe(4);
    expect(s.passed).toBe(3);
    expect(s.accuracy).toBe(0.75);
  });

  it("breaks results down by category", () => {
    const s = summarize(results);
    expect(s.byCategory.direct).toEqual({ total: 2, passed: 1 });
    expect(s.byCategory.remittance).toEqual({ total: 2, passed: 2 });
  });

  it("treats an empty run as zero accuracy without dividing by zero", () => {
    expect(summarize([])).toMatchObject({ total: 0, passed: 0, accuracy: 0 });
  });
});

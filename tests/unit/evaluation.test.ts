import { describe, expect, it } from "vitest";

import {
  evaluateAlert,
  isConditionMet,
} from "@/features/alerts/services/evaluation";

const greaterThan = (state: "armed" | "triggered") => ({
  condition: "greater_than" as const,
  target_rate: 0.95,
  trigger_state: state,
});

const lessThan = (state: "armed" | "triggered") => ({
  condition: "less_than" as const,
  target_rate: 150,
  trigger_state: state,
});

describe("isConditionMet", () => {
  it("greater_than is met when rate exceeds target", () => {
    expect(isConditionMet(greaterThan("armed"), 0.96)).toBe(true);
  });

  it("greater_than is met at exact equality (>=)", () => {
    expect(isConditionMet(greaterThan("armed"), 0.95)).toBe(true);
  });

  it("greater_than is not met below target", () => {
    expect(isConditionMet(greaterThan("armed"), 0.9499)).toBe(false);
  });

  it("less_than is met when rate is below target", () => {
    expect(isConditionMet(lessThan("armed"), 149)).toBe(true);
  });

  it("less_than is met at exact equality (<=)", () => {
    expect(isConditionMet(lessThan("armed"), 150)).toBe(true);
  });

  it("less_than is not met above target", () => {
    expect(isConditionMet(lessThan("armed"), 150.01)).toBe(false);
  });
});

describe("evaluateAlert — edge-trigger state machine", () => {
  it("armed + condition met → trigger", () => {
    expect(evaluateAlert(greaterThan("armed"), 0.96)).toBe("trigger");
  });

  it("triggered + condition still met → none (no repeat email)", () => {
    expect(evaluateAlert(greaterThan("triggered"), 0.97)).toBe("none");
  });

  it("triggered + condition no longer met → rearm", () => {
    expect(evaluateAlert(greaterThan("triggered"), 0.94)).toBe("rearm");
  });

  it("armed + condition not met → none", () => {
    expect(evaluateAlert(greaterThan("armed"), 0.94)).toBe("none");
  });

  it("full crossing cycle notifies exactly twice", () => {
    // Day 1: rate crosses up → trigger.
    expect(evaluateAlert(greaterThan("armed"), 0.96)).toBe("trigger");
    // Days 2-3: stays above → silent.
    expect(evaluateAlert(greaterThan("triggered"), 0.99)).toBe("none");
    expect(evaluateAlert(greaterThan("triggered"), 0.95)).toBe("none");
    // Day 4: retreats → rearm, no email.
    expect(evaluateAlert(greaterThan("triggered"), 0.93)).toBe("rearm");
    // Day 5: crosses again → second trigger.
    expect(evaluateAlert(greaterThan("armed"), 0.96)).toBe("trigger");
  });

  it("works symmetrically for less_than", () => {
    expect(evaluateAlert(lessThan("armed"), 149)).toBe("trigger");
    expect(evaluateAlert(lessThan("triggered"), 148)).toBe("none");
    expect(evaluateAlert(lessThan("triggered"), 151)).toBe("rearm");
  });
});

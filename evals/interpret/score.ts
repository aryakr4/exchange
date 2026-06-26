import type {
  AlertCondition,
  AlertDraftRaw,
} from "@/features/alerts/services/interpret";

/** Numbers the model parses should be exact; allow only float-noise drift. */
const TARGET_TOLERANCE = 1e-4;

/** What a golden case expects the model to produce. */
export type Expected =
  | {
      kind: "concrete";
      from: string;
      to: string;
      condition: AlertCondition;
      /** Only checked when the input names a specific number. */
      target?: number;
    }
  | { kind: "clarification" };

export interface FieldScores {
  from: boolean;
  to: boolean;
  condition: boolean;
  /** null = not part of this expectation. */
  target: boolean | null;
  clarification: boolean | null;
}

export interface CaseScore {
  pass: boolean;
  fields: FieldScores;
}

/** Grade one model output against its golden expectation. */
export function scoreCase(expected: Expected, actual: AlertDraftRaw): CaseScore {
  if (expected.kind === "clarification") {
    const clarified = actual.clarification != null;
    return {
      pass: clarified,
      fields: {
        from: false,
        to: false,
        condition: false,
        target: null,
        clarification: clarified,
      },
    };
  }

  const from = actual.from_currency === expected.from;
  const to = actual.to_currency === expected.to;
  const condition = actual.condition === expected.condition;

  let target: boolean | null = null;
  if (expected.target != null) {
    target =
      actual.target_rate != null &&
      Math.abs(actual.target_rate - expected.target) <= TARGET_TOLERANCE;
  }

  return {
    pass: from && to && condition && target !== false,
    fields: { from, to, condition, target, clarification: null },
  };
}

export interface EvalCaseResult {
  id: string;
  category: string;
  pass: boolean;
}

export interface Summary {
  total: number;
  passed: number;
  accuracy: number;
  byCategory: Record<string, { total: number; passed: number }>;
}

/** Aggregate per-case results into an overall and per-category accuracy. */
export function summarize(results: EvalCaseResult[]): Summary {
  const byCategory: Summary["byCategory"] = {};
  let passed = 0;

  for (const result of results) {
    if (result.pass) passed += 1;
    const bucket = (byCategory[result.category] ??= { total: 0, passed: 0 });
    bucket.total += 1;
    if (result.pass) bucket.passed += 1;
  }

  const total = results.length;
  return {
    total,
    passed,
    accuracy: total === 0 ? 0 : passed / total,
    byCategory,
  };
}

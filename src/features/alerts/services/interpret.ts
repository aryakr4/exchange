import {
  CONDITION_LABELS,
  SUPPORTED_CURRENCY_CODES,
} from "@/features/alerts/constants";

export type AlertCondition = "greater_than" | "less_than";

/** What Claude returns via the strict tool — already enum-constrained, but re-validated here. */
export interface AlertDraftRaw {
  from_currency: string;
  to_currency: string;
  condition: AlertCondition;
  target_rate: number | null;
  clarification: string | null;
}

/** A fully-grounded draft ready to pre-fill the form. */
export interface AlertDraft {
  from_currency: string;
  to_currency: string;
  condition: AlertCondition;
  target_rate: number;
}

export type InterpretResult =
  | {
      status: "ok";
      draft: AlertDraft;
      currentRate: number;
      suggested: boolean;
      summary: string;
    }
  | { status: "clarification"; message: string }
  | { status: "error"; message: string };

export interface InterpretDeps {
  /** Calls the LLM; throws on transport/parse failure. */
  parse: (text: string) => Promise<AlertDraftRaw>;
  /** Live rate for the pair; throws if the pair can't be resolved. */
  getRate: (from: string, to: string) => Promise<number>;
}

const MAX_INPUT_CHARS = 500;
const SUGGEST_MARGIN = 0.005; // 0.5% past the current rate when no target given

function round4(n: number): number {
  return Number(n.toFixed(4));
}

/** If the user gave a usable number, keep it; otherwise suggest one off the live rate. */
export function groundTarget(
  condition: AlertCondition,
  currentRate: number,
  rawTarget: number | null,
): { target: number; suggested: boolean } {
  if (rawTarget != null && rawTarget > 0) {
    return { target: rawTarget, suggested: false };
  }
  const factor =
    condition === "greater_than" ? 1 + SUGGEST_MARGIN : 1 - SUGGEST_MARGIN;
  return { target: round4(currentRate * factor), suggested: true };
}

export function buildSummary(draft: AlertDraft, currentRate: number): string {
  const { symbol } = CONDITION_LABELS[draft.condition];
  return `${draft.from_currency} → ${draft.to_currency}, alert when 1 ${draft.from_currency} buys ${symbol} ${draft.target_rate} (currently ${currentRate})`;
}

function isSupported(code: string): boolean {
  return (SUPPORTED_CURRENCY_CODES as readonly string[]).includes(code);
}

export async function interpretAlertDraft(
  text: string,
  deps: InterpretDeps,
): Promise<InterpretResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { status: "error", message: "Describe your alert first." };
  }
  if (trimmed.length > MAX_INPUT_CHARS) {
    return {
      status: "error",
      message: "That's a bit long — keep it under 500 characters.",
    };
  }

  let raw: AlertDraftRaw;
  try {
    raw = await deps.parse(trimmed);
  } catch (error) {
    console.error("[interpret] parse failed:", error);
    return {
      status: "error",
      message: "Couldn't read that — try the fields below.",
    };
  }

  if (raw.clarification) {
    return { status: "clarification", message: raw.clarification };
  }
  if (!isSupported(raw.from_currency) || !isSupported(raw.to_currency)) {
    return {
      status: "clarification",
      message: "We don't support one of those currencies yet — pick from the list below.",
    };
  }
  if (raw.from_currency === raw.to_currency) {
    return {
      status: "clarification",
      message: "Pick two different currencies.",
    };
  }

  let currentRate: number;
  try {
    currentRate = await deps.getRate(raw.from_currency, raw.to_currency);
  } catch (error) {
    console.error("[interpret] rate fetch failed:", error);
    return {
      status: "error",
      message: "Couldn't fetch the current rate — try the fields below.",
    };
  }

  const { target, suggested } = groundTarget(
    raw.condition,
    currentRate,
    raw.target_rate,
  );
  const draft: AlertDraft = {
    from_currency: raw.from_currency,
    to_currency: raw.to_currency,
    condition: raw.condition,
    target_rate: target,
  };

  return {
    status: "ok",
    draft,
    currentRate,
    suggested,
    summary: buildSummary(draft, currentRate),
  };
}

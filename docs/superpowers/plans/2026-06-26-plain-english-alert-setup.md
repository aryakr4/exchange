# Plain-English Alert Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users describe an alert in plain English; Claude parses it into a draft that pre-fills the existing validated alert form.

**Architecture:** A server action calls Claude (Haiku 4.5) with a strict, enum-constrained tool to extract `{from_currency, to_currency, condition, target_rate?}` from free text, grounds a missing target against the live rate, and returns a draft. The React form pre-fills from the draft; the existing `createAlert` action/schema/RLS path is unchanged. Pure parse/ground/summary logic is split from the SDK call and the action so it is unit-testable without network or the Anthropic SDK.

**Tech Stack:** Next.js 15 (App Router, Server Actions), TypeScript (strict), `@anthropic-ai/sdk`, Zod, React Hook Form, Vitest + React Testing Library, Supabase.

## Global Constraints

- TypeScript strict; follow existing feature-folder layout (`schemas/actions/services/components`).
- Server-only secrets must `import "server-only"`; env is Zod-validated in `src/lib/env.ts`.
- Claude model id is exactly `claude-haiku-4-5` (no date suffix). Do **not** set `output_config.effort` or `thinking` — both error or are unnecessary on Haiku 4.5.
- Structured output uses **strict tool use**: `strict: true` on the tool, `additionalProperties: false`, every property in `required`, and `tool_choice: { type: "tool", name: ... }`.
- `ANTHROPIC_API_KEY` is **optional** — the app must still boot/build/test without it; the feature self-disables gracefully.
- The manual alert form must keep working with no API key and on any interpret failure.
- Tests never make a live API call: the Anthropic client and the rate fetch are injected and mocked.
- Currency codes live only in `src/features/alerts/constants.ts`; the Zod enum, the form selects, and the Claude tool enum all derive from `SUPPORTED_CURRENCY_CODES`.

---

### Task 1: Add the Anthropic SDK dependency and optional env var

**Files:**
- Modify: `package.json` (add dependency)
- Modify: `src/lib/env.ts:14-28`

**Interfaces:**
- Produces: `env.ANTHROPIC_API_KEY: string | undefined`

- [ ] **Step 1: Install the SDK**

Run: `npm install @anthropic-ai/sdk`
Expected: `@anthropic-ai/sdk` appears under `dependencies` in `package.json` and `node_modules/@anthropic-ai/sdk` exists.

- [ ] **Step 2: Add the optional env var**

In `src/lib/env.ts`, add this line inside the `serverEnvSchema` object (after the `NEXT_PUBLIC_APP_URL` line):

```typescript
  NEXT_PUBLIC_APP_URL: z.url(),
  // Optional: enables the plain-English ("Interpret") alert input. When unset,
  // the AI box self-disables and the manual form is unaffected.
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
```

- [ ] **Step 3: Verify the app still boots without the key**

Run: `npm run build`
Expected: build succeeds (no `ANTHROPIC_API_KEY` set), confirming the var is truly optional.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/env.ts
git commit -m "feat: add Anthropic SDK and optional ANTHROPIC_API_KEY"
```

---

### Task 2: Add remittance-corridor currencies

**Files:**
- Modify: `src/features/alerts/constants.ts:16-41`
- Test: `tests/unit/schemas.test.ts` (existing — extend)

**Interfaces:**
- Produces: `SUPPORTED_CURRENCY_CODES` now includes `PHP, NGN, VND, GHS, KES, PKR, BDT, COP`.

- [ ] **Step 1: Write a failing test for a new currency**

Add to `tests/unit/schemas.test.ts` (inside the existing describe for `createAlertSchema`, or a new `describe`):

```typescript
import { SUPPORTED_CURRENCY_CODES } from "@/features/alerts/constants";

it("supports major remittance-corridor currencies", () => {
  for (const code of ["PHP", "NGN", "VND", "GHS", "KES", "PKR", "BDT", "COP"]) {
    expect(SUPPORTED_CURRENCY_CODES).toContain(code);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/unit/schemas.test.ts`
Expected: FAIL — the new codes are not yet in the list.

- [ ] **Step 3: Add the currencies**

In `src/features/alerts/constants.ts`, add these entries to the `SUPPORTED_CURRENCIES` array (before the closing `] as const;`):

```typescript
  { code: "TRY", name: "Turkish Lira" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "BDT", name: "Bangladeshi Taka" },
  { code: "COP", name: "Colombian Peso" },
] as const;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/unit/schemas.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/alerts/constants.ts tests/unit/schemas.test.ts
git commit -m "feat: add remittance-corridor currencies (PHP, NGN, VND, …)"
```

---

### Task 3: Pure interpret core (ground + summary + orchestration)

**Files:**
- Create: `src/features/alerts/services/interpret.ts`
- Test: `tests/unit/interpret.test.ts`

**Interfaces:**
- Consumes: `SUPPORTED_CURRENCY_CODES`, `CONDITION_LABELS` from `@/features/alerts/constants`.
- Produces:
  - `type AlertCondition = "greater_than" | "less_than"`
  - `interface AlertDraftRaw { from_currency: string; to_currency: string; condition: AlertCondition; target_rate: number | null; clarification: string | null }`
  - `interface AlertDraft { from_currency: string; to_currency: string; condition: AlertCondition; target_rate: number }`
  - `type InterpretResult =`
    `{ status: "ok"; draft: AlertDraft; currentRate: number; suggested: boolean; summary: string }`
    `| { status: "clarification"; message: string }`
    `| { status: "error"; message: string }`
  - `interface InterpretDeps { parse: (text: string) => Promise<AlertDraftRaw>; getRate: (from: string, to: string) => Promise<number> }`
  - `function groundTarget(condition, currentRate, rawTarget): { target: number; suggested: boolean }`
  - `function buildSummary(draft: AlertDraft, currentRate: number): string`
  - `async function interpretAlertDraft(text: string, deps: InterpretDeps): Promise<InterpretResult>`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/interpret.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/unit/interpret.test.ts`
Expected: FAIL with "Cannot find module '@/features/alerts/services/interpret'".

- [ ] **Step 3: Implement the pure core**

Create `src/features/alerts/services/interpret.ts`:

```typescript
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/unit/interpret.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/features/alerts/services/interpret.ts tests/unit/interpret.test.ts
git commit -m "feat: pure interpret core (ground target, summary, orchestration)"
```

---

### Task 4: Claude client + strict-tool parse adapter

**Files:**
- Create: `src/lib/anthropic/client.ts`
- Create: `src/features/alerts/services/parse-claude.ts`

**Interfaces:**
- Consumes: `env.ANTHROPIC_API_KEY`, `SUPPORTED_CURRENCY_CODES`, `AlertDraftRaw` from Task 3.
- Produces:
  - `function createAnthropicClient(): Anthropic | null`
  - `async function parseAlertWithClaude(client: Anthropic, text: string): Promise<AlertDraftRaw>`

This task has no standalone unit test (it is a thin SDK wrapper exercised through the action and the integration test in Task 6). Verification is the type-check/build.

- [ ] **Step 1: Implement the client factory**

Create `src/lib/anthropic/client.ts`:

```typescript
import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";

/** Returns a client only when the key is configured; null disables the AI feature. */
export function createAnthropicClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}
```

- [ ] **Step 2: Implement the strict-tool parse adapter**

Create `src/features/alerts/services/parse-claude.ts`:

```typescript
import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { SUPPORTED_CURRENCY_CODES } from "@/features/alerts/constants";
import type { AlertDraftRaw } from "@/features/alerts/services/interpret";

const TOOL_NAME = "draft_alert";

const SYSTEM_PROMPT = [
  "You convert a person's plain-language money request into a structured currency-rate alert.",
  "Many users are sending remittances to family abroad.",
  "from_currency is the currency they hold/send FROM; to_currency is what the recipient gets / they send TO.",
  "condition greater_than = notify when 1 from-unit buys AT LEAST the target (good when sending money: more for each dollar).",
  "condition less_than = notify when it buys AT MOST the target.",
  "If they give no number (e.g. 'a better rate', 'more', 'cheaper to send'), set target_rate to null.",
  "Only use the supported currency codes. If they name an unsupported currency or the request is too vague to map, set clarification to a short, friendly sentence and still fill best-guess fields.",
].join(" ");

/**
 * Calls Claude with a strict, enum-constrained tool so the model can only emit
 * supported currency codes and the two valid conditions. Throws on transport
 * failure or a missing tool_use block; the caller treats that as a soft error.
 */
export async function parseAlertWithClaude(
  client: Anthropic,
  text: string,
): Promise<AlertDraftRaw> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    tool_choice: { type: "tool", name: TOOL_NAME },
    tools: [
      {
        name: TOOL_NAME,
        description: "Record the exchange-rate alert the user described.",
        strict: true,
        input_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            from_currency: {
              type: "string",
              enum: SUPPORTED_CURRENCY_CODES as unknown as string[],
              description: "Currency the user holds / sends FROM.",
            },
            to_currency: {
              type: "string",
              enum: SUPPORTED_CURRENCY_CODES as unknown as string[],
              description: "Currency the recipient gets / they send TO.",
            },
            condition: {
              type: "string",
              enum: ["greater_than", "less_than"],
              description: "greater_than = at least the target; less_than = at most.",
            },
            target_rate: {
              anyOf: [{ type: "number" }, { type: "null" }],
              description: "Numeric target if the user gave one, else null.",
            },
            clarification: {
              anyOf: [{ type: "string" }, { type: "null" }],
              description: "Short question/explanation if ambiguous or unsupported, else null.",
            },
          },
          required: [
            "from_currency",
            "to_currency",
            "condition",
            "target_rate",
            "clarification",
          ],
        },
      },
    ],
    messages: [{ role: "user", content: text }],
  });

  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Claude returned no tool_use block");
  }
  return block.input as AlertDraftRaw;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (If the SDK rejects `tools[].strict` or `tool_choice` typings, confirm `@anthropic-ai/sdk` is current; `strict` is a top-level field on the tool definition.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/anthropic/client.ts src/features/alerts/services/parse-claude.ts
git commit -m "feat: Anthropic client + strict-tool alert parser"
```

---

### Task 5: `interpretAlert` server action

**Files:**
- Create: `src/features/alerts/actions/interpret.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; `createAnthropicClient` (Task 4); `parseAlertWithClaude` (Task 4); `getLatestRate` from `@/lib/exchange-rates/service`; `interpretAlertDraft`, `InterpretResult` (Task 3).
- Produces: `async function interpretAlert(input: { text: string }): Promise<InterpretResult>`

Verified through the integration test in Task 6 (which mocks the action). This step wires real dependencies.

- [ ] **Step 1: Implement the action**

Create `src/features/alerts/actions/interpret.ts`:

```typescript
"use server";

import { getLatestRate } from "@/lib/exchange-rates/service";
import { createAnthropicClient } from "@/lib/anthropic/client";
import { createClient } from "@/lib/supabase/server";
import { parseAlertWithClaude } from "@/features/alerts/services/parse-claude";
import {
  interpretAlertDraft,
  type InterpretResult,
} from "@/features/alerts/services/interpret";

export async function interpretAlert(input: {
  text: string;
}): Promise<InterpretResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "You must be logged in." };
  }

  const client = createAnthropicClient();
  if (!client) {
    return {
      status: "error",
      message: "Plain-English setup isn't available — use the fields below.",
    };
  }

  return interpretAlertDraft(input?.text ?? "", {
    parse: (text) => parseAlertWithClaude(client, text),
    getRate: async (from, to) => (await getLatestRate(from, to)).rate,
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/alerts/actions/interpret.ts
git commit -m "feat: interpretAlert server action wiring Claude + live rate"
```

---

### Task 6: Wire the "Interpret" box into the create-alert dialog

**Files:**
- Modify: `src/features/alerts/components/create-alert-dialog.tsx`
- Test: `tests/integration/create-alert-dialog.test.tsx` (existing — extend)

**Interfaces:**
- Consumes: `interpretAlert` (Task 5), existing `createAlert`, RHF form from the existing component.

- [ ] **Step 1: Write a failing integration test for the interpret flow**

Append to `tests/integration/create-alert-dialog.test.tsx`. First ensure the action is mocked near the existing `vi.mock("@/features/alerts/actions/alerts", ...)`:

```typescript
import { interpretAlert } from "@/features/alerts/actions/interpret";

vi.mock("@/features/alerts/actions/interpret", () => ({
  interpretAlert: vi.fn(),
}));
```

Then add a test (inside the existing top-level `describe`):

```typescript
it("pre-fills the form from a plain-English description via Claude", async () => {
  const user = userEvent.setup();
  vi.mocked(interpretAlert).mockResolvedValue({
    status: "ok",
    draft: {
      from_currency: "USD",
      to_currency: "INR",
      condition: "greater_than",
      target_rate: 84.6,
    },
    currentRate: 84.1,
    suggested: true,
    summary: "USD → INR, alert when 1 USD buys ≥ 84.6 (currently 84.1)",
  });

  render(<CreateAlertDialog />);
  await user.click(screen.getByRole("button", { name: /new alert/i }));

  await user.type(
    screen.getByLabelText(/describe your alert/i),
    "tell me when my dollars buy more rupees",
  );
  await user.click(screen.getByRole("button", { name: /interpret/i }));

  expect(await screen.findByText(/currently 84\.1/i)).toBeInTheDocument();
  expect(screen.getByDisplayValue("84.6")).toBeInTheDocument();
});

it("shows a clarification message without pre-filling", async () => {
  const user = userEvent.setup();
  vi.mocked(interpretAlert).mockResolvedValue({
    status: "clarification",
    message: "Pick two different currencies.",
  });

  render(<CreateAlertDialog />);
  await user.click(screen.getByRole("button", { name: /new alert/i }));
  await user.type(screen.getByLabelText(/describe your alert/i), "usd to usd");
  await user.click(screen.getByRole("button", { name: /interpret/i }));

  expect(
    await screen.findByText(/pick two different currencies/i),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/integration/create-alert-dialog.test.tsx`
Expected: FAIL — there is no "Describe your alert" field or "Interpret" button yet.

- [ ] **Step 3: Add the interpret UI and wiring to the dialog**

In `src/features/alerts/components/create-alert-dialog.tsx`:

(a) Add imports near the top (with the other imports):

```typescript
import { Loader2, Plus, Sparkles } from "lucide-react";
import { interpretAlert } from "@/features/alerts/actions/interpret";
```

(b) Inside `CreateAlertDialog`, after the existing `const [isPending, startTransition] = useTransition();` line, add interpret state:

```typescript
  const [nlText, setNlText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isInterpreting, startInterpret] = useTransition();
```

(c) Add a handler above the `return` (next to `onSubmit`):

```typescript
  function handleInterpret() {
    setNotice(null);
    setSummary(null);
    startInterpret(async () => {
      const result = await interpretAlert({ text: nlText });
      if (result.status === "ok") {
        form.setValue("from_currency", result.draft.from_currency, {
          shouldValidate: true,
        });
        form.setValue("to_currency", result.draft.to_currency, {
          shouldValidate: true,
        });
        form.setValue("condition", result.draft.condition, {
          shouldValidate: true,
        });
        form.setValue("target_rate", String(result.draft.target_rate), {
          shouldValidate: true,
        });
        setSummary(result.summary);
      } else {
        setNotice(result.message);
      }
    });
  }
```

(d) Reset the new state in `handleOpenChange`'s close branch (alongside `form.reset()`):

```typescript
    if (!nextOpen) {
      form.reset();
      setNlText("");
      setNotice(null);
      setSummary(null);
    }
```

(e) Render the interpret block as the first child inside `<Form {...form}>`, immediately **before** the `<form ...>` element:

```tsx
        <div className="grid gap-2 rounded-lg border bg-muted/40 p-3">
          <label
            htmlFor="nl-alert"
            className="text-sm font-medium flex items-center gap-1.5"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Describe your alert in plain English
          </label>
          <textarea
            id="nl-alert"
            rows={2}
            value={nlText}
            onChange={(event) => setNlText(event.target.value)}
            placeholder="Tell me when my dollars buy more rupees so I can send money home to India"
            className="resize-none rounded-md border bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleInterpret}
            disabled={isInterpreting || nlText.trim().length === 0}
            className="justify-self-start"
          >
            {isInterpreting && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {isInterpreting ? "Reading…" : "Interpret"}
          </Button>
          {summary && (
            <p className="text-sm text-muted-foreground">{summary}</p>
          )}
          {notice && (
            <p className="text-sm text-destructive">{notice}</p>
          )}
        </div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/integration/create-alert-dialog.test.tsx`
Expected: PASS (both new tests, and the existing tests unchanged).

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/alerts/components/create-alert-dialog.tsx tests/integration/create-alert-dialog.test.tsx
git commit -m "feat: plain-English Interpret box in the create-alert dialog"
```

---

### Task 7: Docs — env table, README, and marketing copy

**Files:**
- Modify: `README.md` (env table + run notes)
- Modify: `.env.example` (if present — add the key) 
- Modify: `src/app/(marketing)/page.tsx` (light copy touch)

**Interfaces:** none (docs/copy only).

- [ ] **Step 1: Add the env var to `.env.example`**

If `.env.example` exists, add:

```
# Optional — enables the plain-English "Interpret" alert input. Without it,
# the manual form works unchanged. Get a key at https://console.anthropic.com
ANTHROPIC_API_KEY=
```

If `.env.example` does not exist, skip this step.

- [ ] **Step 2: Add `ANTHROPIC_API_KEY` to the README env table**

In `README.md`, add a row to the environment variables table (after the `CRON_SECRET` row):

```markdown
| `ANTHROPIC_API_KEY` | **Optional, Secret.** Enables plain-English alert setup (Claude). Omit to disable; manual form unaffected |
```

- [ ] **Step 3: Light marketing copy touch**

In `src/app/(marketing)/page.tsx`, update the hero/intro copy to lead with the remittance/community angle and mention plain-English setup. Keep it to the existing copy's tone and length — replace the existing tagline sentence(s) with one that mentions sending money home and describing an alert in plain English. Do not restructure the page.

- [ ] **Step 4: Verify the build and full test suite**

Run: `npm run build && npm test`
Expected: build succeeds; all tests pass (the original 73+ plus the new interpret and dialog tests).

- [ ] **Step 5: Commit**

```bash
git add README.md src/app/\(marketing\)/page.tsx .env.example
git commit -m "docs: document ANTHROPIC_API_KEY; lead with remittance/plain-English story"
```

---

## Self-Review

**Spec coverage:**
- Plain-English box + pre-fill manual form → Tasks 3, 5, 6. ✓
- Claude proposes / validated form disposes (no LLM DB write; existing `createAlert` untouched) → Task 6 only `form.setValue`s; `createAlert` path unchanged. ✓
- `interpretAlert` server action: session check, length cap, availability check, Claude strict tool, grounding, server-side validity → Tasks 3 (cap/validate/ground), 4 (strict tool), 5 (session + availability). ✓
- Strict enum-constrained tool so Claude can't emit unsupported codes → Task 4; defensive re-check → Task 3. ✓
- Grounding suggested target from live rate → Task 3 `groundTarget`. ✓
- Currency expansion (PHP/NGN/VND/GHS/KES/PKR/BDT/COP) → Task 2. ✓
- `ANTHROPIC_API_KEY` optional; boots/builds without it; feature self-disables → Task 1 (optional), Task 5 (null client → graceful error), Task 7 Step 4 (build without key). ✓
- Graceful degradation table (missing key, API error, unsupported currency, ambiguous, empty/over-length) → Task 3 + Task 5, asserted in Task 3 tests and Task 6 clarification test. ✓
- Tests with mocked Anthropic client, no live calls → Task 3 (injected `parse`/`getRate`), Task 6 (mocked action). ✓
- Marketing copy → Task 7. ✓
- Resolved the spec's `clarification` return-shape ambiguity → discriminated `status: "ok" | "clarification" | "error"` union (Task 3). ✓

**Placeholder scan:** none — every code step contains full content.

**Type consistency:** `AlertDraftRaw`, `AlertDraft`, `InterpretResult`, `InterpretDeps`, `interpretAlertDraft`, `groundTarget`, `buildSummary`, `createAnthropicClient`, `parseAlertWithClaude`, `interpretAlert` are defined once (Tasks 3–5) and referenced with matching signatures in later tasks. `target_rate` is a string in the form (`String(...)`) and a number in the draft/schema, consistent with the existing `createAlertSchema` coercion.

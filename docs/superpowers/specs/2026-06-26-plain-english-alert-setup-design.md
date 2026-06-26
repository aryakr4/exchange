# Plain-English Alert Setup — Design

**Date:** 2026-06-26
**Status:** Approved, pending implementation plan

## Context

RateWatch lets users create exchange-rate alerts shaped as
`{from_currency, to_currency, condition (above/below), target_rate}`. Today an
alert is created through a structured dialog: two currency selects, a condition
select, and a numeric target-rate field. This requires the user to understand
base/quote currency direction and to pick a numeric threshold — jargon that
excludes the exact people the tool is most useful for: immigrant families and
migrant workers timing remittances (money sent home) to get more value per
dollar.

This feature adds a **plain-English input** to alert creation, parsed by Claude
into a structured draft that pre-fills the existing validated form. It reframes
RateWatch from a finance utility into a community-access tool, and adds a
genuine, well-scoped LLM integration.

## Goals

- Let a non-technical user describe an alert in plain language and get a correct,
  editable structured alert without understanding currency-pair direction or
  choosing a threshold number.
- Keep the LLM strictly as an assist layer: Claude proposes a draft; the
  existing Zod schema + session + RLS path remains the only way data reaches the
  database.
- Make the remittance/community framing real by supporting the major
  remittance-corridor currencies.
- Degrade gracefully: the manual form keeps working with no API key, on API
  errors, or on unparseable input.

## Non-Goals

- Claude does **not** write to the database or call the create action directly.
- No conversational/multi-turn chat. One input → one structured draft.
- No changes to the alert evaluation state machine, cron pipeline, or
  notification/email path.
- No new currencies in the cron's single-fetch model beyond adding codes to the
  supported list (all pairs already derive from the one USD-base quote).

## User Flow

1. In the "New alert" dialog, a text box sits at the top: *"Describe your alert
   in plain English."* with an example placeholder.
2. User types, e.g. *"Let me know when my dollars buy more rupees so I can send
   money home to India,"* and clicks **Interpret**.
3. `interpretAlert(text)` runs (server). On success, the structured fields below
   (From / To / Condition / Target rate) populate and remain fully editable, and
   a plain-language summary appears:
   *"USD → INR, alert when 1 USD buys ≥ 84.6 (currently 84.1)."*
4. User reviews/edits and clicks **Create alert**, which runs the **existing**
   `createAlert` server action unchanged.
5. If interpretation fails (no key, API error, unsupported currency,
   unintelligible text), a friendly inline message appears and the user fills the
   fields manually. The manual path is never blocked.

## Architecture

### Principle: Claude proposes, the validated form disposes

The LLM produces a *draft only*. All existing guarantees stay intact:
`createAlertSchema` Zod validation (client + server), session re-verification,
`user_id` derived from the session, and RLS as the authorization floor.

### New server action: `interpretAlert(text)`

Location: `src/features/alerts/actions/interpret.ts` (`"use server"`).

Steps:

1. **Session check** — same contract as the other alert actions; reject if no
   user.
2. **Input guard** — trim; reject empty; cap length (e.g. 500 chars) to bound
   token cost.
3. **Feature availability** — if `ANTHROPIC_API_KEY` is absent, return a typed
   "unavailable" result so the client hides/disables the NL box cleanly.
4. **Claude call** — `@anthropic-ai/sdk`, model `claude-haiku-4-5`, low
   `max_tokens`, **tool-use with a single forced tool** (`tool_choice` pinned to
   it) whose `input_schema` is the alert draft. Currency fields are JSON-schema
   `enum`s of `SUPPORTED_CURRENCY_CODES`, so Claude cannot emit an unsupported or
   malformed code. The tool schema fields:
   - `from_currency` (enum, required)
   - `to_currency` (enum, required)
   - `condition` (`"greater_than" | "less_than"`, required)
   - `target_rate` (number, **nullable** — null when the user expressed intent
     like "better"/"more" without a number)
   - `clarification` (string, nullable — set when the request is ambiguous or
     names an unsupported currency, instead of guessing)
5. **Grounding** — fetch the live `from→to` rate via the existing
   `exchange-rates/service`. If `target_rate` is null, compute a sensible
   suggested target relative to the current rate (e.g. `greater_than` →
   `current * 1.005`, `less_than` → `current * 0.995`, rounded to the pair's
   display precision) and flag it `suggested: true`. Return the current rate for
   the summary.
6. **Server-side re-validation** — run the draft through the same
   `createAlertSchema` (or a draft variant) before returning, so the contract can
   never drift.
7. **Return** a typed result:
   `{ success: true, draft, currentRate, suggested, summary }`
   or `{ success: false, error }` / `{ success: true, clarification }`.

### Client wiring

`create-alert-dialog.tsx` gains an NL text box above the form and an
**Interpret** button calling `interpretAlert` inside a transition. On a
successful draft it calls `form.reset(draft)` (or `setValue` per field) so the
existing fields populate, then renders the summary line. The submit path is
unchanged. No new dependency on the NL box for the manual flow.

## Supporting Changes

### Currency list (`constants.ts`)

Add the major remittance-corridor currencies missing today:
**PHP, NGN, VND, GHS, KES, PKR, BDT, COP.** The Zod `currencyEnum` derives from
`SUPPORTED_CURRENCY_CODES`, so the schema, the manual selects, and the Claude
tool enum all update from this one edit. (All pairs still derive from the cron's
single USD-base quote fetch — no cron change.)

### Environment (`env.ts`)

Add `ANTHROPIC_API_KEY` as an **optional**, server-only secret. The app boots and
builds without it; the NL feature self-disables when it is absent. Document it in
the README env table.

### Marketing copy (landing page)

Light touch: lead with the remittance/community story and mention plain-English
setup. No structural redesign.

## Error Handling

| Condition | Behavior |
|---|---|
| `ANTHROPIC_API_KEY` missing | NL box hidden/disabled; manual form normal |
| Anthropic API error/timeout | Inline "Couldn't read that — use the fields below"; manual form normal |
| Unsupported currency requested | Claude returns `clarification`; shown inline ("We don't support X yet") |
| Ambiguous request | Claude returns `clarification`; shown inline |
| Empty / over-length input | Rejected before any API call |

Generic messages to the client; details logged server-side only — consistent with
the existing action contract.

## Testing (Vitest, mocked Anthropic client)

- Draft → form mapping populates the expected fields.
- Supported-currency guard: a draft with an out-of-list code is rejected/handled.
- Grounding math: null `target_rate` yields the correct suggested target for both
  conditions at the right precision.
- Availability: absent key returns the typed "unavailable" result without calling
  the API.
- No test makes a live API call; the SDK client is mocked.

## Build-Time Confirmations

Before writing the integration, consult the `claude-api` reference skill to lock
the exact tool-use request shape and confirm `claude-haiku-4-5` is the right
model and price point for this parse.

## Out of Scope / Future

- Multilingual alert emails (a natural follow-on for non-English speakers).
- Plain-language rate explainer on the dashboard and in emails.
- Multi-turn refinement of an alert via chat.

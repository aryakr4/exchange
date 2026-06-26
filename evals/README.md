# Evals

Offline evaluations of the parts of RateWatch that depend on a model's
judgment rather than deterministic code. Unit tests prove the *plumbing*
(parsing, grounding, error handling) with the LLM mocked; an eval proves the
**model itself** does what the product needs, and gives a number we can watch
over time and across prompt/model changes.

## `interpret/` — plain-English → structured alert

The [Interpret feature](../src/features/alerts/services/parse-claude.ts) turns a
sentence like _"I send money to my mom in Mexico, tell me when the dollar gets
stronger"_ into a structured alert (`from`, `to`, `condition`, `target`). The
eval scores the real Claude call against a golden set weighted toward the
remittance audience the feature is for — messy, indirect, and multilingual
phrasings, plus cases the model **should refuse to guess** and clarify instead.

```
evals/interpret/
  dataset.ts      # golden cases: input + expected structured output, by category
  score.ts        # pure grading: field-level + pass/fail + per-category summary
  score.test.ts   # unit tests for the grader (run in `npm test`, no API needed)
  report.ts       # terminal + Markdown report formatting
  run.eval.ts     # the live eval: calls Claude, scores, writes results.md
  results.md      # generated — latest run, paste-able into the README
```

### Running

```bash
# requires a real key; without one the eval skips with a clear message
ANTHROPIC_API_KEY=sk-... npm run eval

# or set ANTHROPIC_API_KEY in .env.local, then:
npm run eval
```

The run prints a per-case PASS/FAIL log and a category breakdown, writes
`evals/interpret/results.md`, and **fails if overall accuracy drops below the
bar** (`EVAL_MIN_ACCURACY`, default `0.8`) — so a prompt or model change that
regresses quality is caught, not shipped.

### Design notes

- **The grader is pure and tested.** `score.ts` has no I/O; `score.test.ts`
  covers it in the normal suite. Only `run.eval.ts` touches the network, and
  it's named `*.eval.ts` so `npm test` never calls the API or costs money.
- **Evaluates the parse, not the rate.** Live-rate grounding is deterministic
  and already covered by unit tests; the eval isolates the one non-deterministic
  step (NL → fields).
- **Refusal is a tested behavior.** Unsupported currencies and currency-free
  requests are expected to return a clarification, not a confident wrong guess.

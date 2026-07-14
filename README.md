# 📈 RateWatch

**Tell it what you're waiting for. It emails you the day the market agrees.**

[![Live](https://img.shields.io/badge/live-exchange--psi--ochre.vercel.app-35a97d?style=flat-square)](https://exchange-psi-ochre.vercel.app)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript)
![Tests](https://img.shields.io/badge/tests-102%20passing-4cc79b?style=flat-square)
![Claude](https://img.shields.io/badge/LLM%20eval-95%25-d97757?style=flat-square)

---

Someone wiring wages to family abroad doesn't think in `USD/MXN ≥ 17.5` — they
think *"tell me when my dollars send more pesos to my mom."* RateWatch lets
them say exactly that: describe the alert in plain English, Claude turns it
into a structured target, and one email lands the day the rate turns in their
favor — so more reaches home.

Strip away the copy and it's a currency-rate alerter: create an alert like
**USD → MXN ≥ 17.5**, and RateWatch checks the market daily and emails you the
moment your target is reached — exactly once per threshold crossing, forever
free, nothing to open in between.

**[→ Try it live](https://exchange-psi-ochre.vercel.app)**

## Why this repo is worth a look

This started as a weekend product idea but turned into an exercise in
building the boring parts *right* — the parts that don't show up in a demo
but are the difference between a toy and something you'd trust with your
mom's remittance:

- **An LLM feature with an actual eval harness**, not vibes. Plain-English →
  structured alert is graded against a golden set (remittance-direction
  reasoning, multilingual input, ambiguous cases the model should refuse to
  guess on) and the build fails if accuracy drops below threshold. See
  [Evals](#evals).
- **Idempotency taken seriously.** A cron job that emails people is exactly
  the kind of thing that silently double-sends during a redeploy or a retry.
  Here it can't — a unique `(alert_id, trigger_date)` claim row makes
  duplicate delivery structurally impossible, not just unlikely.
- **RLS as the actual authorization boundary**, not an app-layer `if`
  statement — the database enforces who can see what, so a bug in a Server
  Action can't leak another user's alerts.
- **102 tests + a separate eval suite**, because "the mock passed" and "the
  model got it right" are different claims and this repo doesn't conflate
  them.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS v4 + shadcn/ui |
| Auth + Database | Supabase (Postgres, Auth, Row Level Security) |
| Email | Resend |
| Market data | exchangerate.host |
| Scheduling | Vercel Cron |
| Validation | Zod (shared client/server schemas) |
| AI | Claude (plain-English → structured alert, with evals) |
| Testing | Vitest + React Testing Library (102 tests) |

## Architecture

```
Browser ──► Next.js (Server Components + Server Actions) ──► Supabase (anon key + RLS)
                                                                  ▲
Vercel Cron ──► /api/cron/check-rates (CRON_SECRET) ──► services ─┤ (service-role key)
                     │                                            │
                     ├──► exchangerate.host (1 API call/day)      │
                     └──► Resend (alert emails)                   │
```

**Engineering decisions worth noting:**

- **RLS is the authorization floor** — user-facing code runs with the anon
  key and the caller's session; the database itself prevents cross-user
  access, so app-layer bugs can't become data leaks.
- **The service-role key is compile-time fenced** (`server-only`) and used
  exclusively by the cron pipeline — it's a build error to import it from
  anywhere a client bundle could reach.
- **Edge-triggered alerts** — an alert notifies when the rate crosses the
  target, then stays silent until the rate retreats and crosses again
  (`trigger_state` state machine), so you get one email, not one per day the
  condition holds.
- **Idempotent notifications** — a unique `(alert_id, trigger_date)` row is
  claimed *before* sending; duplicate cron runs can't double-send. Failed
  emails retry on the next run with the same Resend idempotency key.
- **One upstream API call per day** — every alert's pair is derived from a
  single USD-base quote fetch, so the free tier of the rates API never runs
  out regardless of user count.

## Evals

The unit suite mocks Claude to test the plumbing around it; a separate
**eval** measures whether Claude *itself* maps a plain-English request to the
right structured alert — a claim unit tests can't make.

```bash
npm run eval     # needs ANTHROPIC_API_KEY; writes evals/interpret/results.md
```

The run fails if accuracy drops below `EVAL_MIN_ACCURACY` (default `0.8`), so
a prompt or model regression is caught before it ships. Latest run
([full report](evals/interpret/results.md)):

| Category | Accuracy | | Category | Accuracy |
|---|---|---|---|---|
| direct | 4/4 | | direction | 3/3 |
| remittance | 5/5 | | multilingual | 2/3 |
| no_number | 3/3 | | ambiguous | 2/2 |

**Overall: 19/20 (95%)** against `claude-haiku-4-5`. The one miss is a
Portuguese case where the model inverted the currency direction — exactly the
kind of edge an eval surfaces that mocked unit tests cannot. See
[`evals/`](evals/) for the dataset and grader.

## Security model

- RLS on every table; users can only see/mutate their own alerts, only read
  their own notifications, and cannot touch market data at all.
- Server Actions re-verify the session and re-validate input with Zod on
  every call; `user_id` always derives from the session, never the client.
- The cron endpoint requires a constant-time-compared Bearer secret.
- Secrets never reach the client: `server-only` makes it a build error.
- Generic error messages to clients; details only in server logs.

<details>
<summary><strong>Running it locally</strong></summary>

### Prerequisites

- Node 20+
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) API key (free tier)
- An [exchangerate.host](https://exchangerate.host) access key (free tier)

### 1. Database

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push        # applies schema, RLS, and unsubscribe migrations
```

### 2. Supabase Auth settings

In the Supabase dashboard:

1. **Authentication → URL Configuration** → Site URL: `http://localhost:3000`
   (your production URL later).
2. **Authentication → Email Templates → Confirm signup** → replace the link
   with:
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
   ```
   (Or disable **Confirm email** under Sign In / Providers → Email for
   friction-free testing — the app handles both modes.)

### 3. Environment

```bash
cp .env.example .env.local
# fill in every value; generate CRON_SECRET with: openssl rand -hex 32
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key — RLS applies (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Bypasses RLS; cron only |
| `RESEND_API_KEY` | **Secret.** Email sending |
| `EMAIL_FROM` | Optional sender; defaults to Resend onboarding sender |
| `EXCHANGERATE_API_KEY` | **Secret.** Market data access key |
| `CRON_SECRET` | **Secret.** Bearer token protecting the cron endpoint |
| `ANTHROPIC_API_KEY` | **Optional, Secret.** Enables plain-English alert setup. Omit to disable; manual form unaffected |
| `NEXT_PUBLIC_APP_URL` | Absolute app URL (links in emails) |

All variables are Zod-validated at boot (`src/lib/env.ts`) — a missing secret
fails the server immediately instead of failing silently at 6am.

### 4. Run

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 102 unit + integration tests
```

Trigger the daily pipeline manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-rates
```

Run it twice — the second response reports `alreadyClaimed` instead of
`emailsSent`. That's the idempotency lock working.

### Deploying

1. Push this repo to GitHub and **Import** it at vercel.com/new (Next.js
   preset; `vercel.json` already defines the cron).
2. Add all environment variables above under *Project Settings →
   Environment Variables* (Production). Set `NEXT_PUBLIC_APP_URL` to your
   Vercel URL.
3. Deploy — Vercel registers `GET /api/cron/check-rates` daily at
   **06:00 UTC** and sends `Authorization: Bearer ${CRON_SECRET}`
   automatically.
4. In Supabase: set Site URL to your Vercel URL, and verify a sending
   domain in Resend (`EMAIL_FROM="RateWatch <alerts@yourdomain.com>"`).

Full operational detail — production checklist, what to do when something
breaks, how to read the logs — lives in **[`RUNBOOK.md`](RUNBOOK.md)**.

</details>

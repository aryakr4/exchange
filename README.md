# 📈 RateWatch

**For everyone who sends money home.** Someone wiring wages to family abroad
doesn't think in `USD/MXN ≥ 17.5` — they think *"tell me when my dollars send
more pesos to my mom."* RateWatch lets them say exactly that: describe the alert
in plain English, Claude turns it into a structured target, and one email lands
the day the rate turns in their favor — so more reaches home.

Under the hood it's a currency-rate alerter: create an alert like
**USD → MXN ≥ 17.5**, and RateWatch checks the market daily and emails you the
moment your target is reached — exactly once per threshold crossing. Rates shown
are indicative mid-market values, before any fees a transfer provider charges.

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
| Forms | React Hook Form |
| Testing | Vitest + React Testing Library (72 tests) |

## Architecture

```
Browser ──► Next.js (Server Components + Server Actions) ──► Supabase (anon key + RLS)
                                                                  ▲
Vercel Cron ──► /api/cron/check-rates (CRON_SECRET) ──► services ─┤ (service-role key)
                     │                                            │
                     ├──► exchangerate.host (1 API call/day)      │
                     └──► Resend (alert emails)                   │
```

Key properties:

- **RLS is the authorization floor** — user-facing code runs with the anon key
  and the caller's session; the database itself prevents cross-user access.
- **The service-role key is compile-time fenced** (`server-only`) and used
  exclusively by the cron pipeline.
- **Edge-triggered alerts** — an alert notifies when the rate crosses the
  target, then stays silent until the rate retreats and crosses again
  (`trigger_state` state machine).
- **Idempotent notifications** — a unique `(alert_id, trigger_date)` row is
  claimed *before* sending; duplicate cron runs can't double-send. Failed
  emails are retried on the next run with the same Resend idempotency key.
- **One upstream API call per day** — all alerts' pairs are derived from a
  single USD-base quote fetch (free-tier friendly).

## Project structure

```
src/
  app/                  # routes: (marketing), (auth), (dashboard), api/cron
  components/ui/        # shadcn/ui primitives
  features/
    auth/               # schemas, actions, forms
    alerts/             # schemas, actions, CRUD UI, evaluation state machine
    notifications/      # claim/mark service + daily cron orchestrator
  lib/
    supabase/           # browser / server / admin clients, middleware
    exchange-rates/     # typed client (retry, timeout), cross-rate math
    email/              # Resend sender + HTML template
    env.ts              # Zod-validated environment (fails at boot)
supabase/migrations/    # schema + RLS policies
tests/                  # unit + integration suites
```

## Local development

### 1. Prerequisites

- Node 20+
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) API key (free tier)
- An [exchangerate.host](https://exchangerate.host) access key (free tier)

### 2. Database

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push        # applies both migrations (schema + RLS)
```

### 3. Supabase Auth settings

In the Supabase dashboard:

1. **Authentication → URL Configuration** → Site URL: `http://localhost:3000`
   (your production URL later).
2. **Authentication → Email Templates → Confirm signup** → replace the link with:
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
   ```
   (Or disable **Confirm email** under Sign In / Providers → Email for
   friction-free testing — the app handles both modes.)

### 4. Environment

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
| `ANTHROPIC_API_KEY` | **Optional, Secret.** Enables plain-English alert setup (Claude). Omit to disable; manual form unaffected |
| `NEXT_PUBLIC_APP_URL` | Absolute app URL (links in emails) |

All variables are Zod-validated at boot (`src/lib/env.ts`) — a missing secret
fails the server immediately instead of failing silently at 6am.

### 5. Run

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 72 unit + integration tests
```

Trigger the daily pipeline manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-rates
```

Run it twice — the second response reports `alreadyClaimed` instead of
`emailsSent`. That's the idempotency lock working.

## Evals

The unit suite mocks Claude to test the plumbing; an **eval** measures whether
Claude itself maps a plain-English request to the right structured alert. It
scores the real model call against a golden set weighted toward the remittance
audience — remittance direction reasoning, no-number intents, multilingual
inputs, and cases the model should *clarify* rather than guess.

```bash
npm run eval     # needs ANTHROPIC_API_KEY; writes evals/interpret/results.md
```

The run fails if accuracy drops below `EVAL_MIN_ACCURACY` (default `0.8`), so a
prompt or model regression is caught before it ships. Latest run
([full report](evals/interpret/results.md)):

| Category | Accuracy | | Category | Accuracy |
|---|---|---|---|---|
| direct | 4/4 | | direction | 3/3 |
| remittance | 5/5 | | multilingual | 2/3 |
| no_number | 3/3 | | ambiguous | 2/2 |

**Overall: 19/20 (95%)** against `claude-haiku-4-5`. The one miss is a Portuguese
case where the model inverted the currency direction — exactly the kind of edge
an eval surfaces that mocked unit tests cannot. See [`evals/`](evals/) for the
dataset and grader.

## Deploying to production

### Vercel

1. Push this repo to GitHub and **Import** it at vercel.com/new.
2. Framework preset: **Next.js** (defaults are correct; `vercel.json` already
   defines the cron).
3. Add **all environment variables** from the table above in
   *Project Settings → Environment Variables* (Production). Set
   `NEXT_PUBLIC_APP_URL` to your Vercel URL (no trailing slash).
4. Deploy. Vercel registers the cron from `vercel.json`:
   `GET /api/cron/check-rates` daily at **06:00 UTC**. Vercel automatically
   sends `Authorization: Bearer ${CRON_SECRET}`.

### Supabase (production)

1. **Authentication → URL Configuration** → set Site URL to your Vercel URL.
2. Confirm-signup email template uses the `token_hash` link (step 3 above).

### Resend (production)

- Verify a domain under **Domains**, then set
  `EMAIL_FROM="RateWatch <alerts@yourdomain.com>"`. Until then, the default
  onboarding sender only delivers to your own Resend account email.

## Production checklist

- [ ] Migrations applied (`supabase db push` against the production project)
- [ ] All env vars set in Vercel (Production scope)
- [ ] `CRON_SECRET` is long and random (`openssl rand -hex 32`)
- [ ] `NEXT_PUBLIC_APP_URL` = production URL (email links depend on it)
- [ ] Supabase Site URL = production URL (confirmation links depend on it)
- [ ] Confirm-signup email template updated (token_hash link)
- [ ] Resend domain verified + `EMAIL_FROM` set (or accept sandbox limits)
- [ ] Post-deploy: `curl -H "Authorization: Bearer <secret>" https://<app>/api/cron/check-rates` returns `{ ok: true, ... }`
- [ ] Post-deploy: curl without the header returns 401
- [ ] Vercel → Project → Cron Jobs shows the job as registered
- [ ] Sign up with a real account, create an alert with an
      already-satisfied condition, run the cron once, receive the email
- [ ] Run the cron a second time and verify no duplicate email arrives

## Security model

- RLS on every table; users can only see/mutate their own alerts, only read
  their own notifications, and cannot touch market data at all.
- Server Actions re-verify the session and re-validate input with Zod on
  every call; `user_id` always derives from the session.
- Cron endpoint requires a constant-time-compared Bearer secret.
- Secrets never reach the client: `server-only` makes it a build error.
- Generic error messages to clients; details only in server logs.

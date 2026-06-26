# 📈 RateWatch

Exchange-rate alerts, delivered once. Create an alert like **USD → EUR ≥ 0.95**,
and RateWatch checks the market daily and emails you the moment your target is
reached — exactly once per threshold crossing.

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

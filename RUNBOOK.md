# RateWatch Runbook — for whoever owns this next

This is written for the person who inherits RateWatch after the original author is
gone. You do **not** need to be the person who built it. You need to keep it
running, answer "is it working?", handle the handful of things that actually go
wrong, and know when a problem is yours versus an engineer's.

If you read only one section, read **[The 90-second mental model](#the-90-second-mental-model)**
and **[Is it healthy right now?](#is-it-healthy-right-now)**.

---

## The 90-second mental model

A user (someone sending money to family abroad) tells RateWatch, in plain
English, *"tell me when my dollars send more pesos to my mom."* Four things then
happen — and nothing here needs a human once it's set up:

1. **Claude reads the sentence** and turns it into a precise target, e.g.
   `USD → MXN ≥ 17.50`. (If the sentence is too vague, Claude asks the user to
   clarify instead of guessing — that's deliberate.)
2. **Once a day, at 06:00 UTC, a scheduled job wakes up**, fetches the day's
   exchange rates in a single API call, and checks every user's target.
3. **When a target is reached, RateWatch sends exactly one email** — "good time
   to send." It won't email again until the rate falls back below the target and
   crosses up again. No daily spam.
4. That's it. There is no server someone has to babysit. It runs on Vercel and
   Supabase, both hosted.

**What it is NOT:** a trading tool, or a live streaming ticker. Rates are
*indicative mid-market* values checked once a day, shown before the fees a
transfer provider charges. That honesty is a feature — don't let anyone rebrand
it as real-time financial advice.

---

## Where everything lives

You will end up logging into five services. Get access to all of them on day one.

| Service | What it does for RateWatch | What you'll use it for |
|---|---|---|
| **Vercel** | Hosts the website + runs the daily 06:00 UTC job | Deployments, the Cron Jobs tab, server logs |
| **Supabase** | The database (users, alerts, sent-email records) + login | Look up a user's alerts, read logs, see if data is flowing |
| **Resend** | Sends the actual emails | Check whether an email was delivered or bounced |
| **exchangerate.host** | Provides the daily exchange rates | Check remaining monthly quota |
| **Anthropic (Claude)** | Turns plain-English requests into structured alerts | Check API credit/usage |

> **Do this now:** confirm you can log into each one, and that you're an
> **owner/admin**, not a view-only guest. If you can't, that's your first
> escalation — see [When to call an engineer](#when-to-call-an-engineer).

The exact URLs, project names, and which login each uses should be filled in
here by the person handing off:

- Vercel project: `__________________`
- Supabase project: `__________________`
- Resend account: `__________________`
- exchangerate.host account: `__________________`
- Anthropic console: `__________________`

---

## Is it healthy right now?

Three checks, ~2 minutes, no code:

1. **The website loads.** Open the production URL. The landing page appears. ✅
2. **The daily job ran today.** In **Vercel → your project → Cron Jobs**, the
   `/api/cron/check-rates` job shows a run in the last 24 hours with a green /
   200 status. ✅
3. **Emails are going out.** In **Resend → Emails**, recent sends show
   "Delivered," not a wall of "Bounced" or "Failed." ✅ (Quiet is fine — it only
   emails when someone's target is actually hit.)

If all three are green, RateWatch is healthy. You do not need to do anything.

---

## The five things that actually come up

### 1. "A user says they never got their email"

Work down this list — the cause is almost always one of these, in order:

1. **Their target hasn't been hit yet.** Most common. In Supabase, open the
   `alerts` table, find their alert, and compare their target to today's rate.
   If the rate hasn't reached the target, the system is working correctly — there
   was nothing to send.
2. **It's in spam.** Ask them to check spam/promotions and add the sender to
   contacts.
3. **The email bounced.** In Resend → Emails, search their address. A "Bounced"
   status means their inbox rejected it (full mailbox, typo in the address).
4. **They already got it once.** By design, one alert emails **once** per
   threshold crossing. If they got it last week and the rate never dipped below
   target and back up, there's no second email. This is intended, not a bug.

### 2. "The rates look wrong"

- Remember they're **mid-market, before fees** — they will not match what a
  transfer app quotes at checkout. That gap is expected and disclosed.
- If a rate looks *wildly* off (e.g. off by 10×), check **exchangerate.host** is
  up and your account is active. Then check the most recent Vercel cron log for
  an error from the rate fetch. This is an engineer escalation if the raw data
  from the provider looks wrong.

### 3. "The daily job didn't run" (or you want to run it now)

- First check **Vercel → Cron Jobs**. If it's missing or disabled, that's the
  problem — it's defined in the project's `vercel.json` and should re-register on
  the next deploy.
- **To run it manually right now** without waiting for 06:00 UTC, an engineer (or
  you, with the secret) can trigger it. It is **safe to run repeatedly** — if
  today's emails already went out, a second run reports `alreadyClaimed` and
  sends nothing. It cannot double-email people.

### 4. "We're running low on API quota"

Both Claude and exchangerate.host have monthly limits on their free/low tiers.
RateWatch is deliberately frugal — it makes **one** exchange-rate call per day,
not one per user — but usage still grows with signups.

- Check remaining quota in the **exchangerate.host** and **Anthropic** dashboards.
- If either is close to its cap, the fix is to upgrade that one plan — not a code
  change. Budget owner's decision.
- Warning sign in advance: cron logs showing "quota exceeded" or Claude errors on
  the alert-creation screen.

### 5. "A key or password may have leaked"

Treat any secret that appears in a screenshot, a public repo, or a shared chat as
compromised. **Do not ignore it.** The keys live in **Vercel → Settings →
Environment Variables**. Rotating a key (generating a new one in the provider's
dashboard and pasting it into Vercel, then redeploying) is the fix — but if you're
not sure which key or how, this is an engineer escalation. Rotating the *wrong*
value can take the site down.

---

## What can break, in plain terms

You don't need to fix these — you need to recognize them so you can describe the
symptom accurately to an engineer.

- **The rate provider is down or over quota** → the daily job logs an error and
  simply doesn't send that day. It retries the next day. No data is lost.
- **Resend is down** → emails queue/fail; the system retries failed sends on the
  next run without duplicating. Users get the email late, not never.
- **Claude is unavailable** → the plain-English box on the "create alert" screen
  stops working, but users can still create alerts with the manual form. The rest
  of the app is unaffected.
- **Someone edits the database directly** → possible but risky. Every user can
  only ever see their own alerts because the database enforces it (not just the
  app). Don't hand out the Supabase "service role" key — it bypasses that
  protection and is meant only for the daily job.

---

## When to call an engineer

Escalate — don't improvise — when:

- The website is fully down (not loading at all).
- The daily cron has failed several days in a row.
- You need to rotate a secret and aren't 100% sure which one or how.
- The raw rates coming from the provider look wrong (not just "before fees").
- You want to change behavior: add a feature, change the schedule, change the
  email wording beyond a typo, add a new currency corridor.
- Anything involving the "service role" key, database schema, or deployments.

A good escalation message names the **symptom**, **which of the five services**,
and **what you already checked** — e.g. *"Cron job in Vercel shows red 500s for
the last 3 mornings; Resend and exchangerate.host both look up and in quota."*
That one sentence saves an engineer an hour.

---

## Glossary

- **Cron / the daily job** — the scheduled task that runs every morning at 06:00
  UTC to check rates and send emails.
- **Alert** — one user's target, e.g. "email me when USD→MXN ≥ 17.5."
- **Threshold crossing** — the moment a rate goes from below a target to at/above
  it. That's when (and only when) an email fires.
- **Idempotent** — safe to run more than once; running the job twice can't send
  duplicate emails.
- **Mid-market rate** — the "true" exchange rate before any provider's markup or
  fee. What RateWatch shows.
- **RLS (Row Level Security)** — the database rule that guarantees users can only
  ever see their own data, enforced by the database itself.
- **Service role key** — an all-access key used *only* by the daily job. Never put
  it in the browser or share it.

---

*Deeper technical detail (architecture, security model, deploy steps) lives in
[`README.md`](README.md). This runbook is intentionally the non-technical layer on
top of it.*

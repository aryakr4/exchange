# Email unsubscribe — design

**Date:** 2026-07-12
**Status:** Approved, ready for implementation plan

## Problem

RateWatch sends rate-alert email and offers no way to stop it. The template
links only to "Manage alerts", and the Resend call sets no `List-Unsubscribe`
header.

Since Gmail's and Yahoo's 2024 bulk-sender requirements, a sender that emails
many recipients must offer one-click unsubscribe (RFC 8058) and honor it within
two days. CAN-SPAM independently requires a working opt-out regardless of
volume. The practical failure mode is not a fine: it is recipients marking alerts
as spam because unsubscribing is the only lever they have, which degrades the
sending domain's reputation and silently stops delivery **for every user at
once**. A single shared sending domain means one user's spam complaints damage
everyone else's alerts.

## What unsubscribe means here

A global opt-out that preserves alerts.

RateWatch email is not a newsletter — each message corresponds to an alert the
user deliberately configured. Two readings of "unsubscribe" were considered:

- **Per-alert deactivation** was rejected. A user with five alerts would have to
  click unsubscribe five times to stop the mail. That fails the spirit of
  one-click, and arguably its letter: the action must stop the mailing, not one
  slice of it.
- **Global opt-out** is what one-click compliance expects, and it is what we do:
  set a flag on the profile, suppress all alert email, and leave every alert row
  intact.

Alerts survive the opt-out, stay visible in the dashboard, and resume with one
click. Unsubscribing costs the user nothing they configured.

## Data model

One migration, two columns on `public.profiles`:

```sql
alter table public.profiles
  add column email_opt_out     boolean not null default false,
  add column unsubscribe_token uuid    not null default gen_random_uuid();

create unique index profiles_unsubscribe_token_idx
  on public.profiles (unsubscribe_token);
```

Existing rows take the defaults. `handle_new_user()` needs no change — it does
not enumerate columns, so new profiles get a token automatically.

**Token, not HMAC.** A stored random token needs no new environment variable in
Vercel, and can be rotated for a single user if one ever leaks. A stateless
HMAC would require an `UNSUBSCRIBE_SECRET` and could only be revoked by rotating
the secret for every user simultaneously. The lookup cost is irrelevant: the
unsubscribe path writes to the database anyway.

**RLS is already correct.** The existing `profiles_select_own` policy prevents
one user from reading another's token, and the unsubscribe path runs on the
admin client, which bypasses RLS by design. No new policy.

## Endpoints

One-click POSTs arrive with **no human present** — Gmail's proxy may fire them
without the user ever seeing a page. Such an endpoint must not render a
confirmation UI. Next.js also forbids a `route.ts` and a `page.tsx` at the same
path. Hence two URLs:

| URL | Method | Purpose |
|---|---|---|
| `/api/unsubscribe?token=…` | POST | `List-Unsubscribe` header target. Opts out, returns 200, renders nothing. |
| `/api/unsubscribe?token=…` | GET | Some clients follow the header as a link. Redirects to the page below. Mutates nothing. |
| `/unsubscribe?token=…` | GET | In-body footer link. Renders a confirm button; the opt-out happens in a Server Action on click. |

**No GET may opt anyone out.** Corporate link scanners (Outlook Safe Links,
antivirus gateways) issue GET requests against every URL in an inbound email. If
the footer link opted out on load, those scanners would silently unsubscribe
users who never clicked. So the page confirms via a Server Action, and the API
route's GET only redirects. One-click is unaffected: scanners do not POST.

Middleware needs no change: `PROTECTED_PREFIXES` covers only `/dashboard`, and
the matcher already excludes `/api/`. An unauthenticated click will not be
redirected to `/login`.

Both endpoints call one service:

```ts
// src/features/notifications/services/unsubscribe.ts
unsubscribeByToken(token: string): Promise<"ok" | "not_found">
resubscribe(userId: string): Promise<void>
```

`unsubscribeByToken` sets `email_opt_out = true` where the token matches. It is
idempotent — unsubscribing twice is a no-op, which matters because mail clients
retry.

**Unknown tokens still return 200.** A mail client must not surface an error to
a user who is trying to leave, and a distinguishable 404 would confirm which
tokens are valid. The miss is logged server-side.

## Honoring the flag

Two changes in the cron, not one.

**1. `runDailyRateCheck` suppresses the send but still advances state.** For an
opted-out owner, skip `claimNotification` and the email — but still call
`setTriggerState(alert.id, "triggered", …)`. Leaving the alert `armed` would
mean a user who re-subscribes months later receives a backlog of stale
threshold crossings the moment the state machine catches up. The edge-trigger
machine stays honest; only delivery is suppressed. A `suppressed` counter joins
`DailyCheckSummary`.

**2. `retryUnsentEmails` must filter too.** This is the subtle one. The sweep
re-sends notifications claimed on *previous* runs. A user whose send failed
yesterday and who unsubscribes today would be emailed by tomorrow's sweep —
after unsubscribing. `getUnsentNotifications` therefore gains an
`email_opt_out = false` condition on the joined profile.

Skipping either change leaves a hole; skipping the second leaves a hole that
only appears after a delivery failure, which is exactly when nobody is looking.

## Email changes

`RateAlertEmailData` gains `unsubscribeUrl: string`, built as
`${env.NEXT_PUBLIC_APP_URL}/unsubscribe?token=${token}`. Both callers in
`run-daily-check.ts` (the trigger path and the sweep) must pass it, so both
alert queries must select `profiles(email, unsubscribe_token, email_opt_out)`.

The URL renders in the HTML footer **and** the plain-text part. A text-part link
is not optional: HTML-only unsubscribe is a documented spam-filter penalty.

`sendRateAlertEmail` adds the headers:

```
List-Unsubscribe:      <https://…/api/unsubscribe?token=…>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

Both are required together — `List-Unsubscribe` alone gets a "mailto-style"
interpretation and does not satisfy one-click.

## Dashboard

A banner when `email_opt_out` is true: "Email alerts are paused," with a Resume
button calling `resubscribe`. Without it, unsubscribe becomes a one-way door
with no path back inside the product — a dark pattern in its own right, and a
support burden. This is also where the confirmation page sends people who want
back in, since the unsubscribe token is not a login.

## Testing

Unit:
- `unsubscribeByToken`: valid token opts out; unknown token returns `not_found`;
  calling twice is idempotent.
- Template: `unsubscribeUrl` appears in both the HTML and the text part.
- `sendRateAlertEmail`: Resend receives both `List-Unsubscribe` and
  `List-Unsubscribe-Post`.

Integration:
- Cron suppresses email for an opted-out owner **but still advances
  `trigger_state` to `triggered`**.
- The retry sweep skips a notification whose owner has opted out. This is the
  regression test for the failure described above.

## Out of scope

- Per-alert mute (global opt-out covers the compliance need).
- `mailto:` unsubscribe (the HTTPS one-click form is what Gmail and Yahoo check).
- Unsubscribe for transactional auth email (Supabase sends it; it is not bulk
  mail and is not subject to these rules).

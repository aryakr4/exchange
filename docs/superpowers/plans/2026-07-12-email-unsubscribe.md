# Email Unsubscribe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every RateWatch alert email a working unsubscribe — an in-body link and RFC 8058 one-click headers — backed by a global opt-out that suppresses mail while preserving the user's alerts.

**Architecture:** Two new columns on `profiles` (`email_opt_out`, `unsubscribe_token`). A token-authenticated opt-out reachable without a session, exposed two ways: `POST /api/unsubscribe` for mail-client one-click, and a `/unsubscribe` confirmation page for humans clicking the footer link. The cron honors the flag in both places it sends mail — the trigger path and the retry sweep.

**Tech Stack:** Next.js 15 App Router (Server Components + Server Actions), Supabase Postgres (RLS + service-role admin client), Resend, Zod v4, Vitest.

## Global Constraints

- **GET must never opt anyone out.** Corporate link scanners (Outlook Safe Links, antivirus gateways) GET every URL in an inbound email. A mutating GET would unsubscribe users who never clicked. Mutations happen only on POST or via a Server Action.
- **Unknown tokens return HTTP 200, not 404.** A mail client must not show an error to someone trying to leave, and a distinguishable status confirms which tokens are valid. Log the miss server-side.
- **Validate the token as a UUID before querying.** Postgres raises `invalid input syntax for type uuid` on a malformed comparison value, which would turn a junk token into a 500.
- **`profiles` has no user-facing write policies by design** (rows are created and synced exclusively by auth triggers). All writes to `profiles` go through the service-role admin client, never the session client.
- **Both `List-Unsubscribe` and `List-Unsubscribe-Post` are required together.** `List-Unsubscribe` alone does not satisfy one-click.
- Migration filename: `supabase/migrations/20260712120000_unsubscribe.sql`.
- Run the full suite with `npm test`.

---

### Task 1: Schema + database types

**Files:**
- Create: `supabase/migrations/20260712120000_unsubscribe.sql`
- Modify: `src/types/database.ts:20-40` (the `profiles` Row/Insert/Update blocks)

**Interfaces:**
- Consumes: nothing.
- Produces: `profiles.email_opt_out: boolean`, `profiles.unsubscribe_token: string` (uuid) — every later task reads or writes these.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260712120000_unsubscribe.sql`:

```sql
-- ============================================================================
-- RateWatch — email unsubscribe
-- A global opt-out that suppresses alert email while preserving alerts, plus
-- a per-user token so an unsubscribe link works from a mail client with no
-- session (and no login the user will never perform).
-- ============================================================================

alter table public.profiles
  add column email_opt_out     boolean not null default false,
  add column unsubscribe_token uuid    not null default gen_random_uuid();

-- Unique: the token is the sole credential on the unsubscribe path, and the
-- lookup must resolve to exactly one profile.
create unique index profiles_unsubscribe_token_idx
  on public.profiles (unsubscribe_token);
```

Existing rows take the defaults, and `handle_new_user()` needs no change — it
does not enumerate columns, so new profiles get a token automatically.

No new RLS policy: `profiles_select_own` already scopes reads to the caller's
own row (so nobody can read anyone else's token), and every write on this path
uses the admin client, which bypasses RLS by design.

- [ ] **Step 2: Update the hand-written database types**

In `src/types/database.ts`, the `profiles` table block becomes:

```ts
      profiles: {
        Row: {
          id: string;
          email: string;
          email_opt_out: boolean;
          unsubscribe_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          email_opt_out?: boolean;
          unsubscribe_token?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          email_opt_out?: boolean;
          unsubscribe_token?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 4: Apply the migration**

Run: `npx supabase db push` (or paste the SQL into the Supabase SQL editor).
Expected: migration applies; `select email_opt_out, unsubscribe_token from profiles limit 1;` returns `false` and a uuid.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260712120000_unsubscribe.sql src/types/database.ts
git commit -m "feat(db): add email_opt_out and unsubscribe_token to profiles"
```

---

### Task 2: Unsubscribe service

**Files:**
- Create: `src/features/notifications/services/unsubscribe.ts`
- Test: `tests/unit/unsubscribe.test.ts`

**Interfaces:**
- Consumes: `profiles.email_opt_out`, `profiles.unsubscribe_token` (Task 1).
- Produces:
  - `unsubscribeByToken(token: string): Promise<"ok" | "not_found">`
  - `resubscribe(userId: string): Promise<"ok" | "not_found">`
  - `buildUnsubscribeUrls(appUrl: string, token: string): { pageUrl: string; oneClickUrl: string }`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/unsubscribe.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildUnsubscribeUrls,
  resubscribe,
  unsubscribeByToken,
} from "@/features/notifications/services/unsubscribe";

const TOKEN = "3f8b2c1e-9d4a-4b7e-8c1f-2a5d6e7f8a9b";

// Records every update the service issues, and controls whether a row matched.
const updates: Array<{
  payload: unknown;
  column: string;
  value: unknown;
}> = [];
let matchedRow: { id: string } | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (payload: unknown) => ({
        eq: (column: string, value: unknown) => {
          updates.push({ payload, column, value });
          return {
            select: () => ({
              maybeSingle: async () => ({ data: matchedRow, error: null }),
            }),
          };
        },
      }),
    }),
  }),
}));

beforeEach(() => {
  updates.length = 0;
  matchedRow = { id: "user-1" };
});

describe("unsubscribeByToken", () => {
  it("opts out the profile holding the token", async () => {
    const result = await unsubscribeByToken(TOKEN);

    expect(result).toBe("ok");
    expect(updates).toEqual([
      {
        payload: { email_opt_out: true },
        column: "unsubscribe_token",
        value: TOKEN,
      },
    ]);
  });

  it("is idempotent — unsubscribing twice still reports ok", async () => {
    await unsubscribeByToken(TOKEN);
    const result = await unsubscribeByToken(TOKEN);

    expect(result).toBe("ok");
    expect(updates).toHaveLength(2);
  });

  it("reports not_found for a well-formed but unknown token", async () => {
    matchedRow = null;

    expect(await unsubscribeByToken(TOKEN)).toBe("not_found");
  });

  it("rejects a malformed token without querying the database", async () => {
    // A non-uuid would make Postgres raise, turning junk input into a 500.
    expect(await unsubscribeByToken("not-a-uuid")).toBe("not_found");
    expect(await unsubscribeByToken("")).toBe("not_found");
    expect(updates).toHaveLength(0);
  });
});

describe("resubscribe", () => {
  it("clears the opt-out for the given user", async () => {
    const result = await resubscribe("user-1");

    expect(result).toBe("ok");
    expect(updates).toEqual([
      { payload: { email_opt_out: false }, column: "id", value: "user-1" },
    ]);
  });
});

describe("buildUnsubscribeUrls", () => {
  it("points the body link at the page and one-click at the API route", () => {
    const urls = buildUnsubscribeUrls("https://ratewatch.app", TOKEN);

    expect(urls.pageUrl).toBe(
      `https://ratewatch.app/unsubscribe?token=${TOKEN}`
    );
    expect(urls.oneClickUrl).toBe(
      `https://ratewatch.app/api/unsubscribe?token=${TOKEN}`
    );
  });

  it("does not double the slash when appUrl has a trailing one", () => {
    const urls = buildUnsubscribeUrls("https://ratewatch.app/", TOKEN);

    expect(urls.pageUrl).toBe(
      `https://ratewatch.app/unsubscribe?token=${TOKEN}`
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/unsubscribe.test.ts`
Expected: FAIL — `Failed to resolve import "@/features/notifications/services/unsubscribe"`.

- [ ] **Step 3: Write the implementation**

Create `src/features/notifications/services/unsubscribe.ts`:

```ts
import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Global email opt-out.
 *
 * The token is the sole credential here — the person clicking has no session
 * and never will. Writes go through the admin client because `profiles` has no
 * user-facing write policies by design (rows are owned by the auth triggers).
 */

export type UnsubscribeResult = "ok" | "not_found";

const tokenSchema = z.uuid();

/**
 * Opt a profile out of alert email by its unsubscribe token.
 *
 * Idempotent: unsubscribing an already-opted-out profile still matches the row
 * and reports "ok". This matters because mail clients retry one-click POSTs.
 */
export async function unsubscribeByToken(
  token: string
): Promise<UnsubscribeResult> {
  // Guard before the query: Postgres raises on a malformed uuid comparison,
  // which would turn a junk token into a 500 instead of a quiet miss.
  if (!tokenSchema.safeParse(token).success) {
    return "not_found";
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ email_opt_out: true })
    .eq("unsubscribe_token", token)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to unsubscribe: ${error.message}`);
  }

  return data ? "ok" : "not_found";
}

/** Clear the opt-out. Called from the dashboard, where the id comes from the session. */
export async function resubscribe(userId: string): Promise<UnsubscribeResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ email_opt_out: false })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resubscribe: ${error.message}`);
  }

  return data ? "ok" : "not_found";
}

/**
 * The two URLs an alert email carries. They are different on purpose: the body
 * link must land on a page a human confirms (a link scanner will GET it), while
 * one-click must hit a route that only acts on POST.
 */
export function buildUnsubscribeUrls(
  appUrl: string,
  token: string
): { pageUrl: string; oneClickUrl: string } {
  const base = appUrl.replace(/\/$/, "");
  return {
    pageUrl: `${base}/unsubscribe?token=${token}`,
    oneClickUrl: `${base}/api/unsubscribe?token=${token}`,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/unsubscribe.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/notifications/services/unsubscribe.ts tests/unit/unsubscribe.test.ts
git commit -m "feat(notifications): add token-authenticated unsubscribe service"
```

---

### Task 3: Unsubscribe routes — one-click POST and the confirmation page

**Files:**
- Create: `src/app/api/unsubscribe/route.ts`
- Create: `src/app/unsubscribe/page.tsx`
- Create: `src/features/notifications/actions/unsubscribe.ts`

**Interfaces:**
- Consumes: `unsubscribeByToken` (Task 2), `env.NEXT_PUBLIC_APP_URL`.
- Produces: `POST /api/unsubscribe?token=…` (the `List-Unsubscribe` target, used by Task 4), `GET /unsubscribe?token=…` (the body link target, used by Task 4), and the Server Action `confirmUnsubscribe(token: string): Promise<{ ok: boolean }>`.

No middleware change is needed: `PROTECTED_PREFIXES` in
`src/lib/supabase/middleware.ts` covers only `/dashboard`, and the matcher in
`src/middleware.ts` already excludes `/api/`. An unauthenticated click will not
be bounced to `/login`. Verify this in Step 5 rather than assuming it.

- [ ] **Step 1: Write the one-click route**

Create `src/app/api/unsubscribe/route.ts`:

```ts
import { NextResponse } from "next/server";

import { unsubscribeByToken } from "@/features/notifications/services/unsubscribe";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * RFC 8058 one-click unsubscribe — the `List-Unsubscribe` header target.
 *
 * The mail client POSTs here with NO human present (Gmail's proxy fires it on
 * the user's behalf), so this must not render a confirmation UI. It only acts
 * on POST: a link scanner GETting the URL must never opt anyone out.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = await unsubscribeByToken(token);

  if (result === "not_found") {
    console.warn("[unsubscribe] one-click POST with unknown token");
  }

  // Always 200, even on a miss: a mail client must not surface an error to
  // someone trying to leave, and a distinguishable status would confirm which
  // tokens are valid.
  return new NextResponse(null, { status: 200 });
}

/**
 * Some clients follow the header URL as an ordinary link. Send them to the
 * human page — and mutate nothing, because link scanners land here too.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const url = new URL("/unsubscribe", env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("token", token);
  return NextResponse.redirect(url, 303);
}
```

- [ ] **Step 2: Write the Server Action**

Create `src/features/notifications/actions/unsubscribe.ts`:

```ts
"use server";

import { unsubscribeByToken } from "@/features/notifications/services/unsubscribe";

/**
 * The human path: invoked by the confirm button on /unsubscribe.
 *
 * A Server Action rather than a GET handler, so that a link scanner fetching
 * the URL in the email cannot opt the user out without a deliberate click.
 */
export async function confirmUnsubscribe(
  token: string
): Promise<{ ok: boolean }> {
  const result = await unsubscribeByToken(token);
  return { ok: result === "ok" };
}
```

- [ ] **Step 3: Write the confirmation page**

Create `src/app/unsubscribe/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { confirmUnsubscribe } from "@/features/notifications/actions/unsubscribe";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

/**
 * Renders a confirm button rather than opting out on load: corporate link
 * scanners GET every URL in an inbound email, and a mutating GET would
 * unsubscribe people who never clicked.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string }>;
}) {
  const { token = "", done } = await searchParams;

  async function act() {
    "use server";
    await confirmUnsubscribe(token);
    redirect("/unsubscribe?done=1");
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md items-center px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Email alerts paused</CardTitle>
            <CardDescription>
              We won&apos;t email you about rate alerts anymore. Your alerts are
              still saved — sign in any time to resume them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/login">Sign in to RateWatch</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Stop RateWatch emails?</CardTitle>
          <CardDescription>
            You&apos;ll stop receiving rate-alert email. Your alerts stay saved,
            so you can turn email back on any time from your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <form action={act}>
            <Button type="submit">Unsubscribe</Button>
          </form>
          <Button asChild variant="ghost">
            <Link href="/">Cancel</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Verify the routes behave, unauthenticated**

Start the dev server (`npm run dev`), then, with no session cookie:

```bash
# Page renders the confirm UI and is NOT redirected to /login.
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/unsubscribe?token=3f8b2c1e-9d4a-4b7e-8c1f-2a5d6e7f8a9b'
# Expected: 200

# One-click POST with a junk token still returns 200 (and does not 500).
curl -s -o /dev/null -w '%{http_code}\n' -X POST 'http://localhost:3000/api/unsubscribe?token=junk'
# Expected: 200

# GET on the API route redirects to the page and mutates nothing.
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'http://localhost:3000/api/unsubscribe?token=3f8b2c1e-9d4a-4b7e-8c1f-2a5d6e7f8a9b'
# Expected: 303 http://localhost:3000/unsubscribe?token=3f8b2c1e-9d4a-4b7e-8c1f-2a5d6e7f8a9b
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/unsubscribe/route.ts src/app/unsubscribe/page.tsx src/features/notifications/actions/unsubscribe.ts
git commit -m "feat(unsubscribe): one-click POST route and confirmation page"
```

---

### Task 4: Email — footer link and List-Unsubscribe headers

**Files:**
- Modify: `src/lib/email/templates/rate-alert.ts` (the `RateAlertEmailData` interface, the `text` block, the footer `<tr>`)
- Modify: `src/lib/email/resend.ts:41-57` (the `emails.send` call)
- Test: `tests/unit/email-template.test.ts` (add cases), `tests/unit/email-headers.test.ts` (new)

**Interfaces:**
- Consumes: `buildUnsubscribeUrls` (Task 2) — the caller passes the results in.
- Produces: `RateAlertEmailData` gains two required fields, `unsubscribeUrl: string` and `oneClickUnsubscribeUrl: string`. Task 5 must supply both at every call site.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/email-template.test.ts`:

```ts
describe("unsubscribe affordances", () => {
  const data = {
    userEmail: "user@example.com",
    fromCurrency: "USD",
    toCurrency: "EUR",
    targetRate: 0.95,
    currentRate: 0.96,
    condition: "greater_than" as const,
    triggeredAt: new Date("2026-06-10T06:00:00Z"),
    appUrl: "https://ratewatch.app",
    unsubscribeUrl: "https://ratewatch.app/unsubscribe?token=tok-1",
    oneClickUnsubscribeUrl: "https://ratewatch.app/api/unsubscribe?token=tok-1",
  };

  it("links to unsubscribe from the HTML footer", () => {
    const { html } = buildRateAlertEmail(data);

    expect(html).toContain('href="https://ratewatch.app/unsubscribe?token=tok-1"');
    expect(html).toContain("Unsubscribe");
  });

  it("includes the unsubscribe URL in the plain-text part", () => {
    // Not optional: HTML-only unsubscribe is a documented spam-filter penalty.
    const { text } = buildRateAlertEmail(data);

    expect(text).toContain("https://ratewatch.app/unsubscribe?token=tok-1");
  });
});
```

Create `tests/unit/email-headers.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

import { sendRateAlertEmail } from "@/lib/email/resend";

const data = {
  userEmail: "user@example.com",
  fromCurrency: "USD",
  toCurrency: "EUR",
  targetRate: 0.95,
  currentRate: 0.96,
  condition: "greater_than" as const,
  triggeredAt: new Date("2026-06-10T06:00:00Z"),
  appUrl: "https://ratewatch.app",
  unsubscribeUrl: "https://ratewatch.app/unsubscribe?token=tok-1",
  oneClickUnsubscribeUrl: "https://ratewatch.app/api/unsubscribe?token=tok-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  send.mockResolvedValue({ data: { id: "resend-1" }, error: null });
});

describe("sendRateAlertEmail", () => {
  it("sets both one-click unsubscribe headers", async () => {
    await sendRateAlertEmail({
      to: "user@example.com",
      data,
      idempotencyKey: "rate-alert/notif-1",
    });

    // Both are required together — List-Unsubscribe alone does not satisfy
    // RFC 8058 one-click, and Gmail/Yahoo check for the pair.
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          "List-Unsubscribe":
            "<https://ratewatch.app/api/unsubscribe?token=tok-1>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
      { idempotencyKey: "rate-alert/notif-1" }
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/email-template.test.ts tests/unit/email-headers.test.ts`
Expected: FAIL — the template tests fail on the missing `href`, and the header test fails because `send` is called without `headers`.

- [ ] **Step 3: Add the fields to the template**

In `src/lib/email/templates/rate-alert.ts`, extend the interface:

```ts
export interface RateAlertEmailData {
  userEmail: string;
  fromCurrency: string;
  toCurrency: string;
  targetRate: number;
  currentRate: number;
  condition: "greater_than" | "less_than";
  triggeredAt: Date;
  /** Absolute app URL for the dashboard link. */
  appUrl: string;
  /** Human-facing confirmation page — the in-body footer link. */
  unsubscribeUrl: string;
  /** RFC 8058 POST target — goes in the List-Unsubscribe header, not the body. */
  oneClickUnsubscribeUrl: string;
}
```

Replace the `text` array's tail (currently ending at the "Sent to …" line) with:

```ts
  const text = [
    `Your rate alert was triggered.`,
    ``,
    `Pair:        ${pair}`,
    `Current:     1 ${data.fromCurrency} = ${current} ${data.toCurrency}`,
    `Your target: ${condition.symbol} ${target}`,
    `Checked:     ${timestamp}`,
    ``,
    `The ${pair} rate has ${condition.phrase} ${target}.`,
    ``,
    `Manage your alerts: ${dashboardUrl}`,
    ``,
    `Sent to ${data.userEmail} by RateWatch because you created this alert.`,
    `Unsubscribe: ${data.unsubscribeUrl}`,
  ].join("\n");
```

Replace the footer `<tr>` (currently lines 142-150) with:

```ts
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e7e5e4;">
              <p style="font-family:${sans};font-size:12px;line-height:1.6;color:#a8a29e;margin:0 0 8px;">
                Sent to ${escapeHtml(data.userEmail)} because you created this alert on RateWatch.
                This alert is now paused for this market move — it re-arms automatically if the rate
                moves away from your target.
              </p>
              <p style="font-family:${sans};font-size:12px;line-height:1.6;color:#a8a29e;margin:0;">
                <a href="${escapeHtml(data.unsubscribeUrl)}" style="color:#78716c;text-decoration:underline;">Unsubscribe</a>
                from all RateWatch emails.
              </p>
            </td>
          </tr>
```

- [ ] **Step 4: Add the headers in resend.ts**

In `src/lib/email/resend.ts`, replace the `emails.send` call:

```ts
  const { data: sent, error } = await getResend().emails.send(
    {
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
      headers: {
        // RFC 8058. Both are required together: List-Unsubscribe alone is read
        // as the old mailto-style hint and does not satisfy one-click.
        "List-Unsubscribe": `<${data.oneClickUnsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    },
    { idempotencyKey }
  );
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/email-template.test.ts tests/unit/email-headers.test.ts`
Expected: PASS.

Note: `npx tsc --noEmit` will now FAIL in `run-daily-check.ts` — both
`sendRateAlertEmail` call sites are missing the two new required fields. Task 5
fixes them. This is intended: the type error is what guarantees no send path is
forgotten.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email/templates/rate-alert.ts src/lib/email/resend.ts tests/unit/email-template.test.ts tests/unit/email-headers.test.ts
git commit -m "feat(email): unsubscribe footer link and RFC 8058 one-click headers"
```

---

### Task 5: Honor the opt-out in the cron — both send paths

**Files:**
- Modify: `src/features/notifications/services/notifications.ts:67-106` (`UnsentNotification`, `getUnsentNotifications`)
- Modify: `src/features/notifications/services/run-daily-check.ts` (`DailyCheckSummary`, `ActiveAlertRow`, the alerts select, the trigger loop, `retryUnsentEmails`)
- Test: `tests/integration/cron-pipeline.test.ts` (add cases)

**Interfaces:**
- Consumes: `buildUnsubscribeUrls` (Task 2); `RateAlertEmailData.unsubscribeUrl` / `.oneClickUnsubscribeUrl` (Task 4).
- Produces: `DailyCheckSummary` gains `suppressed: number`.

This is the task the whole feature turns on. There are **two** places the cron
sends mail, and both must check the flag. The retry sweep is the one that bites:
it re-sends notifications claimed on *previous* runs, so a user who unsubscribes
today — having had a send fail yesterday — would be emailed by tomorrow's sweep,
after unsubscribing.

- [ ] **Step 1: Write the failing tests**

In `tests/integration/cron-pipeline.test.ts`, extend the `makeAlert` fixture so
profiles carry the new columns:

```ts
function makeAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: "alert-1",
    user_id: "user-1",
    from_currency: "USD",
    to_currency: "EUR",
    target_rate: 0.95,
    condition: "greater_than",
    trigger_state: "armed",
    profiles: {
      email: "user@example.com",
      email_opt_out: false,
      unsubscribe_token: "tok-1",
    },
    ...overrides,
  };
}
```

Also update the fixture inside the **existing** test
`"retry sweep re-sends with the original idempotency key"` — its
`profiles: { email: "user@example.com" }` must gain the new columns, or the
sweep will read `unsubscribe_token` as `undefined`:

```ts
        profiles: {
          email: "user@example.com",
          email_opt_out: false,
          unsubscribe_token: "tok-1",
        },
```

Then add these cases inside `describe("runDailyRateCheck", …)`:

```ts
  it("passes unsubscribe URLs to the email", async () => {
    activeAlerts = [makeAlert()];

    await runDailyRateCheck();

    expect(sendRateAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unsubscribeUrl: expect.stringContaining("/unsubscribe?token=tok-1"),
          oneClickUnsubscribeUrl: expect.stringContaining(
            "/api/unsubscribe?token=tok-1"
          ),
        }),
      })
    );
  });

  it("suppresses email for an opted-out owner but still advances the state", async () => {
    activeAlerts = [
      makeAlert({
        profiles: {
          email: "user@example.com",
          email_opt_out: true,
          unsubscribe_token: "tok-1",
        },
      }),
    ];

    const summary = await runDailyRateCheck();

    expect(claimNotification).not.toHaveBeenCalled();
    expect(sendRateAlertEmail).not.toHaveBeenCalled();
    // State still flips: leaving it "armed" would dump a backlog of stale
    // crossings on anyone who later re-subscribes.
    expect(alertUpdates).toContainEqual({
      payload: expect.objectContaining({ trigger_state: "triggered" }),
      id: "alert-1",
    });
    expect(summary.suppressed).toBe(1);
    expect(summary.emailsSent).toBe(0);
  });

  it("still re-arms an opted-out user's alert when the rate retreats", async () => {
    activeAlerts = [
      makeAlert({
        trigger_state: "triggered",
        profiles: {
          email: "user@example.com",
          email_opt_out: true,
          unsubscribe_token: "tok-1",
        },
      }),
    ];
    getMultipleRates.mockResolvedValue({
      rates: [{ base: "USD", quote: "EUR", rate: 0.9, fetchedAt: FETCHED_AT }],
      failedPairs: [],
      fetchedAt: FETCHED_AT,
    });

    const summary = await runDailyRateCheck();

    expect(alertUpdates).toContainEqual({
      payload: { trigger_state: "armed" },
      id: "alert-1",
    });
    expect(summary.rearmed).toBe(1);
  });

  it("the retry sweep never emails an owner who has opted out", async () => {
    // Regression guard for the subtlest hole in this feature: the sweep
    // re-sends rows claimed on EARLIER runs. A user whose send failed
    // yesterday and who unsubscribed today would otherwise be emailed by
    // tomorrow's sweep — after unsubscribing.
    //
    // The query in notifications.ts already excludes these rows; this test
    // feeds one through anyway to prove the sweep also skips it defensively.
    getUnsentNotifications.mockResolvedValue([
      {
        id: "notif-old",
        rate: 0.97,
        trigger_date: "2026-06-09",
        alerts: {
          from_currency: "USD",
          to_currency: "EUR",
          target_rate: 0.95,
          condition: "greater_than",
        },
        profiles: {
          email: "user@example.com",
          email_opt_out: true,
          unsubscribe_token: "tok-1",
        },
      },
    ]);

    const summary = await runDailyRateCheck();

    expect(sendRateAlertEmail).not.toHaveBeenCalled();
    expect(markNotificationSent).not.toHaveBeenCalled();
    expect(summary.sweepSent).toBe(0);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/integration/cron-pipeline.test.ts`
Expected: FAIL — `summary.suppressed` is `undefined`, and the opted-out alert is still emailed.

- [ ] **Step 3: Filter the sweep query**

In `src/features/notifications/services/notifications.ts`, update the type and
the query. Note the `!inner` hint: without it, PostgREST performs a left join
and a filter on the embedded table will not exclude the parent row.

```ts
export interface UnsentNotification {
  id: string;
  rate: number;
  trigger_date: string;
  alerts: {
    from_currency: string;
    to_currency: string;
    target_rate: number;
    condition: "greater_than" | "less_than";
  } | null;
  profiles: {
    email: string;
    email_opt_out: boolean;
    unsubscribe_token: string;
  } | null;
}

export async function getUnsentNotifications(
  limit = 100
): Promise<UnsentNotification[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, rate, trigger_date, alerts(from_currency, to_currency, target_rate, condition), profiles!inner(email, email_opt_out, unsubscribe_token)"
    )
    .eq("email_sent", false)
    // Never re-send to someone who unsubscribed after the original attempt
    // failed. `!inner` above is required: with a left join, a filter on the
    // embedded table nulls the embed instead of dropping the row.
    .eq("profiles.email_opt_out", false)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load unsent notifications: ${error.message}`);
  }

  return data;
}
```

- [ ] **Step 4: Suppress sends in the trigger path**

In `src/features/notifications/services/run-daily-check.ts`:

Add the import:

```ts
import { buildUnsubscribeUrls } from "@/features/notifications/services/unsubscribe";
```

Add `suppressed` to the summary interface (after `emailsFailed`):

```ts
export interface DailyCheckSummary {
  sweepRetried: number;
  sweepSent: number;
  activeAlerts: number;
  pairsRequested: number;
  ratesFetched: number;
  failedPairs: string[];
  triggered: number;
  alreadyClaimed: number;
  emailsSent: number;
  emailsFailed: number;
  /** Triggers whose owner opted out of email. Evaluated, recorded, not sent. */
  suppressed: number;
  rearmed: number;
  durationMs: number;
}
```

Widen the row type:

```ts
interface ActiveAlertRow {
  id: string;
  user_id: string;
  from_currency: string;
  to_currency: string;
  target_rate: number;
  condition: Enums<"alert_condition">;
  trigger_state: Enums<"alert_trigger_state">;
  profiles: {
    email: string;
    email_opt_out: boolean;
    unsubscribe_token: string;
  } | null;
}
```

Widen the select (step 2 of the pipeline):

```ts
  const { data: alerts, error: alertsError } = await supabase
    .from("alerts")
    .select(
      "id, user_id, from_currency, to_currency, target_rate, condition, trigger_state, profiles(email, email_opt_out, unsubscribe_token)"
    )
    .eq("active", true);
```

Initialize the counter alongside the others:

```ts
    emailsFailed: 0,
    suppressed: 0,
    rearmed: 0,
```

Then, in the trigger branch, insert the opt-out check between the email lookup
and the claim:

```ts
      if (decision !== "trigger") continue;
      summary.triggered++;

      const profile = alert.profiles;
      if (!profile?.email) {
        console.warn(`[cron] alert ${alert.id} has no owner email, skipping`);
        continue;
      }

      // Opted out: still advance the state machine, but claim nothing and send
      // nothing. Leaving the alert "armed" would mean re-subscribing later
      // dumps a backlog of stale crossings into the inbox.
      if (profile.email_opt_out) {
        await setTriggerState(alert.id, "triggered", fetchedAt.toISOString());
        summary.suppressed++;
        continue;
      }

      const email = profile.email;
      const unsubscribe = buildUnsubscribeUrls(
        env.NEXT_PUBLIC_APP_URL,
        profile.unsubscribe_token
      );

      // Claim before sending — the row is the lock.
      const claimed = await claimNotification({
        alertId: alert.id,
        userId: alert.user_id,
        rate: rate.rate,
        triggerDate,
      });
```

and extend the `sendRateAlertEmail` payload in the same branch:

```ts
        await sendRateAlertEmail({
          to: email,
          idempotencyKey: `rate-alert/${claimed.id}`,
          data: {
            userEmail: email,
            fromCurrency: alert.from_currency,
            toCurrency: alert.to_currency,
            targetRate: alert.target_rate,
            currentRate: rate.rate,
            condition: alert.condition,
            triggeredAt: fetchedAt,
            appUrl: env.NEXT_PUBLIC_APP_URL,
            unsubscribeUrl: unsubscribe.pageUrl,
            oneClickUnsubscribeUrl: unsubscribe.oneClickUrl,
          },
        });
```

- [ ] **Step 5: Suppress sends in the retry sweep**

Still in `run-daily-check.ts`, update `retryUnsentEmails`. The query already
excludes opted-out profiles; this second check is defense in depth, and it is
cheap:

```ts
  for (const notification of unsent) {
    const alert = notification.alerts;
    const profile = notification.profiles;
    if (!alert || !profile?.email) {
      console.warn(
        `[cron] sweep: notification ${notification.id} missing alert or email, skipping`
      );
      continue;
    }

    // The query filters these out; belt and braces, because emailing someone
    // after they unsubscribed is the one failure this feature exists to prevent.
    if (profile.email_opt_out) continue;

    const email = profile.email;
    const unsubscribe = buildUnsubscribeUrls(
      env.NEXT_PUBLIC_APP_URL,
      profile.unsubscribe_token
    );

    try {
      // Same idempotency key as the original attempt: if the email actually
      // went out and only the sent-flag update failed, Resend dedupes.
      await sendRateAlertEmail({
        to: email,
        idempotencyKey: `rate-alert/${notification.id}`,
        data: {
          userEmail: email,
          fromCurrency: alert.from_currency,
          toCurrency: alert.to_currency,
          targetRate: alert.target_rate,
          currentRate: notification.rate,
          condition: alert.condition,
          triggeredAt: new Date(`${notification.trigger_date}T00:00:00Z`),
          appUrl: env.NEXT_PUBLIC_APP_URL,
          unsubscribeUrl: unsubscribe.pageUrl,
          oneClickUnsubscribeUrl: unsubscribe.oneClickUrl,
        },
      });
      await markNotificationSent(notification.id);
      sweepSent++;
    } catch (error) {
      console.error(
        `[cron] sweep: retry failed for notification ${notification.id}:`,
        error instanceof Error ? error.message : error
      );
    }
  }
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — all previous tests plus the four new cron cases. Then
`npx tsc --noEmit` should now be clean (the Task 4 type error is resolved).

- [ ] **Step 7: Commit**

```bash
git add src/features/notifications/services/run-daily-check.ts src/features/notifications/services/notifications.ts tests/integration/cron-pipeline.test.ts
git commit -m "feat(cron): honor email opt-out in both the trigger path and the retry sweep"
```

---

### Task 6: Dashboard — show the paused state and let users resume

**Files:**
- Create: `src/features/notifications/components/email-paused-banner.tsx`
- Modify: `src/features/notifications/actions/unsubscribe.ts` (add `resumeEmails`)
- Modify: `src/features/alerts/services/queries.ts` (add `getEmailOptOutForCurrentUser`)
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `resubscribe` (Task 2), `profiles.email_opt_out` (Task 1).
- Produces: `resumeEmails(): Promise<ActionResult>`, `getEmailOptOutForCurrentUser(): Promise<boolean>`.

Without this, unsubscribe is a one-way door with no path back inside the product
— a dark pattern, and a support burden.

- [ ] **Step 1: Add the query**

Append to `src/features/alerts/services/queries.ts`:

```ts
/**
 * Whether the signed-in user has opted out of alert email. RLS scopes the read
 * to their own profile row.
 */
export async function getEmailOptOutForCurrentUser(): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("email_opt_out")
    .maybeSingle();

  if (error) {
    console.error("[alerts] failed to load email opt-out:", error.message);
    return false; // Never block the dashboard on this.
  }

  return data?.email_opt_out ?? false;
}
```

- [ ] **Step 2: Add the resume action**

Append to `src/features/notifications/actions/unsubscribe.ts`:

```ts
import { revalidatePath } from "next/cache";

import { resubscribe } from "@/features/notifications/services/unsubscribe";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

/** Turn alert email back on. The user id comes from the session, never the client. */
export async function resumeEmails(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const result = await resubscribe(user.id);
  if (result === "not_found") {
    return { success: false, error: "Couldn't update your email settings." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
```

- [ ] **Step 3: Build the banner**

Create `src/features/notifications/components/email-paused-banner.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { resumeEmails } from "@/features/notifications/actions/unsubscribe";
import { Button } from "@/components/ui/button";

export function EmailPausedBanner() {
  const [pending, startTransition] = useTransition();

  function onResume() {
    startTransition(async () => {
      const result = await resumeEmails();
      if (result.success) {
        toast.success("Email alerts resumed.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="border-border bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">Email alerts are paused</p>
        <p className="text-muted-foreground text-sm">
          Your alerts are still being checked — we just aren&apos;t emailing you
          about them.
        </p>
      </div>
      <Button size="sm" onClick={onResume} disabled={pending}>
        {pending ? "Resuming…" : "Resume emails"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Render it on the dashboard**

Replace `src/app/(dashboard)/dashboard/page.tsx` with:

```tsx
import type { Metadata } from "next";

import { AlertsEmptyState } from "@/features/alerts/components/alerts-empty-state";
import { AlertsTable } from "@/features/alerts/components/alerts-table";
import { CreateAlertDialog } from "@/features/alerts/components/create-alert-dialog";
import {
  getAlertsForCurrentUser,
  getEmailOptOutForCurrentUser,
} from "@/features/alerts/services/queries";
import { EmailPausedBanner } from "@/features/notifications/components/email-paused-banner";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const [alerts, emailPaused] = await Promise.all([
    getAlertsForCurrentUser(),
    getEmailOptOutForCurrentUser(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground text-sm">
            Checked once a day at{" "}
            <span className="font-mono text-xs">06:00 UTC</span>
          </p>
        </div>
        <CreateAlertDialog />
      </div>

      {emailPaused && <EmailPausedBanner />}

      {alerts.length === 0 ? (
        <AlertsEmptyState />
      ) : (
        <AlertsTable alerts={alerts} />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify end to end**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all pass.

Then, against the dev server, drive the real loop:
1. Sign in, note the dashboard shows **no** banner.
2. Fetch your token: `select unsubscribe_token from profiles where email = '<you>';`
3. `curl -X POST 'http://localhost:3000/api/unsubscribe?token=<token>'` → 200.
4. Reload the dashboard → the "Email alerts are paused" banner appears.
5. Click **Resume emails** → toast, banner disappears, and
   `select email_opt_out from profiles where email = '<you>';` is `false`.

- [ ] **Step 6: Commit**

```bash
git add src/features/notifications/components/email-paused-banner.tsx src/features/notifications/actions/unsubscribe.ts src/features/alerts/services/queries.ts "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(dashboard): paused-email banner with one-click resume"
```

---

## Done when

- `npm test`, `npx tsc --noEmit`, and `npm run lint` all pass.
- An alert email carries a footer unsubscribe link **and** both
  `List-Unsubscribe` / `List-Unsubscribe-Post` headers (check the raw source in
  Gmail: "Show original").
- Gmail renders its native "Unsubscribe" affordance next to the sender name.
- After unsubscribing, the next cron run reports `suppressed >= 1` and sends no
  mail to that address — including from the retry sweep.
- The dashboard offers a one-click way back in.

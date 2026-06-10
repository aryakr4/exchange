import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { runDailyRateCheck } from "@/features/notifications/services/run-daily-check";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Constant-time comparison of the Authorization header against the expected
 * Bearer token — a plain === would leak prefix-match timing.
 */
function isAuthorized(request: Request): boolean {
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

/**
 * Daily rate check. Invoked by Vercel Cron (which sends GET with
 * `Authorization: Bearer ${CRON_SECRET}`), or manually with curl for
 * testing. Safe to invoke repeatedly — the pipeline is idempotent.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runId = crypto.randomUUID();
  console.info(`[cron] check-rates started (run=${runId})`);

  try {
    const summary = await runDailyRateCheck();
    console.info(
      `[cron] check-rates finished (run=${runId}):`,
      JSON.stringify(summary)
    );
    return NextResponse.json({ ok: true, runId, summary });
  } catch (error) {
    console.error(`[cron] check-rates failed (run=${runId}):`, error);
    return NextResponse.json(
      // Generic body — details stay in the server logs.
      { ok: false, runId, error: "Rate check failed" },
      { status: 500 }
    );
  }
}

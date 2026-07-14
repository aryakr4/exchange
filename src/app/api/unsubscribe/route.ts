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

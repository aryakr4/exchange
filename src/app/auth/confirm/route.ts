import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Email-confirmation endpoint. The Supabase confirmation email links here
 * with a one-time token_hash; verifying it establishes the session cookie
 * and lands the user on the dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      redirect("/dashboard");
    }
    console.error("[auth] email confirmation failed:", error.message);
  }

  redirect("/login?error=confirmation");
}

import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Admin Supabase client — service-role key, BYPASSES Row Level Security.
 *
 * Only the cron pipeline may import this module: it operates across all
 * users (reading every active alert, writing rates and notifications),
 * which no user-scoped client can do.
 *
 * The `server-only` import (here and transitively via env.ts) turns any
 * accidental client-bundle import into a build failure, so the service-role
 * key can never ship to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

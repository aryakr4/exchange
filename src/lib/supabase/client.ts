import { createBrowserClient } from "@supabase/ssr";

import { clientEnv } from "@/lib/env.client";
import type { Database } from "@/types/database";

/**
 * Browser Supabase client (anon key, cookie-based session).
 *
 * Every query made with this client is subject to Row Level Security —
 * the anon key grants nothing beyond what RLS policies allow the
 * authenticated user.
 */
export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

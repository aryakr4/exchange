import "server-only";

import { z } from "zod";

/**
 * Server-side environment validation.
 *
 * Parsed eagerly at module load so a missing or malformed secret fails the
 * server at boot — loudly and immediately — instead of failing a 3am cron run.
 *
 * The `server-only` import makes any attempt to pull this module (and the
 * secrets it exposes) into a client bundle a build-time error.
 */
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EXCHANGERATE_API_KEY: z.string().min(1),
  CRON_SECRET: z
    .string()
    .min(16, "CRON_SECRET must be at least 16 characters"),
  NEXT_PUBLIC_APP_URL: z.url(),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid server environment variables:\n${issues}`);
}

export const env = parsed.data;

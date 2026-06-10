"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";
import {
  loginSchema,
  signupSchema,
  type LoginInput,
  type SignupInput,
} from "@/features/auth/schemas";

/**
 * Sign in with email/password. Redirects to the dashboard on success;
 * returns a deliberately generic error otherwise (no account enumeration).
 */
export async function login(
  input: LoginInput,
  redirectTo?: string
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid email or password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { success: false, error: "Invalid email or password." };
  }

  revalidatePath("/", "layout");
  // Only same-origin paths — a value like "//evil.com" would be an open
  // redirect, so anything not starting with a single "/" falls back.
  const safeRedirect =
    redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/dashboard";
  redirect(safeRedirect);
}

/**
 * Create an account. If email confirmation is enabled in Supabase (the
 * default), returns requiresEmailConfirmation so the UI can show a
 * "check your inbox" state; otherwise the session is live and we redirect.
 */
export async function signup(
  input: SignupInput
): Promise<ActionResult<{ requiresEmailConfirmation: boolean }>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
    },
  });

  if (error) {
    console.error("[auth] signup failed:", error.message);
    return { success: false, error: "Could not create account. Try again." };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return { success: true, data: { requiresEmailConfirmation: true } };
}

/** End the session and return to the login page. */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

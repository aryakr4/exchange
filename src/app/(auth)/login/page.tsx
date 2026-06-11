import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your RateWatch account to manage your rate alerts.",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const params = await searchParams;

  return (
    <LoginForm
      confirmationError={params.error === "confirmation"}
      redirectTo={params.redirect}
    />
  );
}

import type { Metadata } from "next";

import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create a free RateWatch account and get emailed when your target exchange rate is reached.",
  robots: { index: false },
};

export default function SignupPage() {
  return <SignupForm />;
}

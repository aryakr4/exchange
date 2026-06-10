"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signup } from "@/features/auth/actions/auth";
import { signupSchema, type SignupInput } from "@/features/auth/schemas";

export function SignupForm() {
  const [isPending, startTransition] = useTransition();
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null
  );

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  function onSubmit(values: SignupInput) {
    startTransition(async () => {
      const result = await signup(values);
      // If confirmation is disabled, a successful signup redirects
      // server-side and never returns.
      if (!result) return;
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.data?.requiresEmailConfirmation) {
        setConfirmationEmail(values.email);
      }
    });
  }

  if (confirmationEmail) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <MailCheck
            className="text-muted-foreground mx-auto mb-2 size-10"
            aria-hidden="true"
          />
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to{" "}
            <span className="text-foreground font-medium">
              {confirmationEmail}
            </span>
            . Click it to activate your account.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center text-sm">
          <p className="text-muted-foreground">
            Already confirmed?{" "}
            <Link
              href="/login"
              className="text-foreground underline underline-offset-4"
            >
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start tracking exchange rates in minutes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>At least 8 characters</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {isPending ? "Creating account…" : "Sign up"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground underline underline-offset-4"
          >
            Log in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

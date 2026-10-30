"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import { AuthCard } from "./auth-card";
import { FieldError, emailSchema } from "./login-form";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(new FormData(e.currentTarget).get("email"));
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      await api("/auth/forgot-password", { method: "POST", auth: false, body: { email: parsed.data } });
      setSentTo(parsed.data);
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 429
          ? "Too many requests. Try again in a minute."
          : err instanceof ApiError
            ? err.message
            : "Something went wrong",
      );
    } finally {
      setPending(false);
    }
  }

  const back = (
    <Link href="/login" className="underline underline-offset-4">
      Back to sign in
    </Link>
  );

  if (sentTo) {
    return (
      <AuthCard title="Check your email" footer={back}>
        <p className="text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, we sent a link to reset
          the password. The link is valid for 1 hour.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot password" description="We will email you a reset link" footer={back}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!error} />
          <FieldError message={error} />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}

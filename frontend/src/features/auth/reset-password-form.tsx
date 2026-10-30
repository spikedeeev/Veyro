"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import { AuthCard } from "./auth-card";
import { FieldError, passwordSchema } from "./login-form";

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <AuthCard
        title="Invalid link"
        footer={
          <Link href="/forgot-password" className="underline underline-offset-4">
            Request a new link
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">The reset link is missing its token.</p>
      </AuthCard>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = z
      .object({ password: passwordSchema, confirm: z.string() })
      .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" })
      .safeParse({ password: f.get("password"), confirm: f.get("confirm") });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        auth: false,
        body: { token, password: parsed.data.password },
      });
      toast.success("Password changed. Sign in with the new password.");
      router.replace("/login");
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 400
          ? "The link is invalid or has expired, or the password is too weak."
          : err instanceof ApiError
            ? err.message
            : "Something went wrong",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard title="Set a new password" description="You will be signed out on all devices">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} />
          <FieldError message={errors.password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} />
          <FieldError message={errors.confirm} />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </Button>
      </form>
    </AuthCard>
  );
}

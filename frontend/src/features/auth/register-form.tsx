"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AuthCard } from "./auth-card";
import { FieldError, emailSchema, passwordSchema, safeNext } from "./login-form";

export function RegisterForm({ next }: { next?: string }) {
  const { register } = useAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = z
      .object({ email: emailSchema, password: passwordSchema, confirm: z.string() })
      .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" })
      .safeParse({ email: f.get("email"), password: f.get("password"), confirm: f.get("confirm") });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await register(parsed.data.email, parsed.data.password);
      toast.success("Account created");
      router.replace(safeNext(next));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create the account");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Create account"
      description="Sign up to place orders and save favorites"
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} />
          <FieldError message={errors.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} />
          <FieldError message={errors.password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} />
          <FieldError message={errors.confirm} />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}

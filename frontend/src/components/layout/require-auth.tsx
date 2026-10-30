"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ children, role }: { children: ReactNode; role?: "ADMIN" }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (role && user.role !== role) return <p className="text-sm text-destructive">Access denied.</p>;
  return <>{children}</>;
}

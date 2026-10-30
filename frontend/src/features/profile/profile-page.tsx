"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Activity, KeyRound, Laptop, LogOut, ShieldCheck, ShieldAlert, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  useActiveSessions,
  useRevokeOtherSessions,
  useRevokeSession,
  useSecurityAnalysis,
  type ActiveSession,
  type SecurityEvent,
} from "./api";

export function ProfilePage() {
  const { user } = useAuth();
  const sessions = useActiveSessions();
  const security = useSecurityAnalysis();
  const revokeSession = useRevokeSession();
  const revokeOtherSessions = useRevokeOtherSessions();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const revoke = async (session: ActiveSession) => {
    setRevokingId(session.sessionId);
    try {
      await revokeSession.mutateAsync(session.sessionId);
      toast.success("Session signed out");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not sign out this session");
    } finally {
      setRevokingId(null);
    }
  };

  const revokeOthers = async () => {
    try {
      const result = await revokeOtherSessions.mutateAsync();
      toast.success(result.revoked === 0 ? "No other sessions to sign out" : `Signed out ${result.revoked} other session${result.revoked === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not sign out other sessions");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and security settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserRound className="size-5" /> Account</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Email address</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Account type</p>
            <p className="font-medium">{user?.role === "ADMIN" ? "Administrator" : "Customer"}</p>
          </div>
          <div className="sm:col-span-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/forgot-password"><KeyRound /> Reset password</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Active sessions</h2>
            <p className="text-sm text-muted-foreground">Review devices signed in to your account.</p>
          </div>
          {sessions.data?.some((session) => !session.isCurrent) ? (
            <Button
              variant="outline"
              size="sm"
              disabled={revokeOtherSessions.isPending}
              onClick={revokeOthers}
            >
              <LogOut /> Sign out other sessions
            </Button>
          ) : null}
        </div>

        {sessions.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : sessions.isError ? (
          <LoadError onRetry={() => sessions.refetch()} />
        ) : sessions.data?.length ? (
          <ul className="space-y-3">
            {sessions.data.map((session) => (
              <li key={session.sessionId}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-4">
                    <Laptop className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium">
                        {session.device}
                        {session.isCurrent ? <span className="ml-2 text-xs text-muted-foreground">(This device)</span> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last active {formatDate(session.lastActivity)} · Signed in {formatDate(session.createdAt)}
                      </p>
                    </div>
                    {!session.isCurrent ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={revokingId === session.sessionId}
                        onClick={() => revoke(session)}
                      >
                        Sign out
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border p-6 text-sm text-muted-foreground">No active sessions found.</p>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Security</h2>
          <p className="text-sm text-muted-foreground">A summary of recent account activity.</p>
        </div>
        {security.isPending ? (
          <Skeleton className="h-28 w-full" />
        ) : security.isError ? (
          <LoadError onRetry={() => security.refetch()} />
        ) : security.data ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {security.data.isSuspicious ? (
                  <><ShieldAlert className="size-5 text-destructive" /> Review recommended</>
                ) : (
                  <><ShieldCheck className="size-5 text-primary" /> No suspicious activity detected</>
                )}
              </CardTitle>
              <CardDescription>Based on activity from the last 24 hours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {security.data.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
              {security.data.events.length ? (
                <div className="space-y-3 border-t pt-4">
                  <p className="flex items-center gap-2 text-sm font-medium"><Activity className="size-4" /> Recent activity</p>
                  <ul className="space-y-3">
                    {security.data.events.slice(0, 5).map((event) => <ActivityItem key={event.id} event={event} />)}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
}

function ActivityItem({ event }: { event: SecurityEvent }) {
  return (
    <li className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
      <span>{event.message}</span>
      <time className="text-xs text-muted-foreground" dateTime={event.timestamp}>{formatDate(event.timestamp)}</time>
    </li>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">Could not load this information.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

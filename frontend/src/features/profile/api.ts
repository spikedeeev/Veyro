import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export type ActiveSession = {
  sessionId: string;
  createdAt: string;
  lastActivity: string;
  device: string;
  userAgent?: string;
  isCurrent: boolean;
};

export type SecurityEvent = {
  id: string;
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
  timestamp: string;
};

export type SecurityAnalysis = {
  isSuspicious: boolean;
  score: number;
  reasons: string[];
  events: SecurityEvent[];
  generatedAt: string;
};

export function useActiveSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", "sessions"],
    queryFn: () => api<ActiveSession[]>("/auth/sessions"),
    enabled: !!user,
  });
}

export function useSecurityAnalysis() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", "security-analysis"],
    queryFn: () => api<SecurityAnalysis>("/auth/security-analysis"),
    enabled: !!user,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api(`/auth/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", "sessions"] }),
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ revoked: number }>("/auth/sessions/logout/all-other", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", "sessions"] }),
  });
}

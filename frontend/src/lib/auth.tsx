"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  getAccessToken,
  hasSessionCookie,
  logoutRequest,
  onTokenChange,
  refreshSession,
  setAccessToken,
} from "@/lib/api";

export type User = { id: number; email: string; role: "USER" | "ADMIN" };

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// The access token is a JWT whose payload carries sub, email and role; the signature is verified by the API
function userFromToken(token: string | null): User | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { sub: number; email: string; role: User["role"] };
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const off = onTokenChange((t) => setUser(userFromToken(t)));
    let cancelled = false;
    (async () => {
      if (!getAccessToken() && hasSessionCookie()) await refreshSession();
      if (!cancelled) {
        setUser(userFromToken(getAccessToken()));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ accessToken: string }>("/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    });
    setAccessToken(data.accessToken);
  }, []);

  const register = useCallback(
    async (email: string, password: string) => {
      await api("/auth/register", { method: "POST", auth: false, body: { email, password } });
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    await logoutRequest();
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

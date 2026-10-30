const BASE = "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;
const listeners = new Set<(token: string | null) => void>();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  listeners.forEach((fn) => fn(token));
}

export function onTokenChange(fn: (token: string | null) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined;
}

export function hasSessionCookie() {
  return !!readCookie("csrf_token");
}

// Concurrent 401s share one refresh call, because refresh tokens rotate and a second parallel call would fail
export function refreshSession(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const csrf = readCookie("csrf_token");
      if (!csrf) return null;
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: "POST",
          headers: { "X-CSRF-Token": csrf },
          credentials: "same-origin",
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { accessToken: string };
        setAccessToken(data.accessToken);
        return data.accessToken;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

function messageFrom(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message: unknown }).message;
    if (Array.isArray(m)) return m.join(", ");
    if (typeof m === "string") return m;
  }
  return fallback;
}

type Options = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
};

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { body, auth = true, query, headers, ...init } = opts;

  let url = `${BASE}${path}`;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  const send = (token: string | null) =>
    fetch(url, {
      ...init,
      credentials: "same-origin",
      headers: {
        ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });

  let res = await send(accessToken);
  if (res.status === 401 && auth) {
    const fresh = await refreshSession();
    if (fresh) res = await send(fresh);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }

  if (!res.ok) {
    throw new ApiError(res.status, messageFrom(data, `Request failed (${res.status})`));
  }
  return data as T;
}

export async function logoutRequest() {
  const csrf = readCookie("csrf_token");
  try {
    await fetch(`${BASE}/auth/logout`, {
      method: "POST",
      headers: csrf ? { "X-CSRF-Token": csrf } : {},
      credentials: "same-origin",
    });
  } finally {
    setAccessToken(null);
  }
}

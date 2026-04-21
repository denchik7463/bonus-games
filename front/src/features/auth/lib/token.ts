import type { AuthSession } from "@/src/features/auth/model/types";

const AUTH_SESSION_KEY = "aurum-auth-session";

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session.token || isSessionExpired(session.expiresAt)) {
      clearStoredSession();
      return null;
    }
    return session;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function saveSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

export function getAccessToken() {
  return getStoredSession()?.token ?? null;
}

export function isSessionExpired(expiresAt: string) {
  return Number.isNaN(Date.parse(expiresAt)) ? false : Date.parse(expiresAt) <= Date.now();
}

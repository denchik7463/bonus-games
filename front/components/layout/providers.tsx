"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { profileToTestUser } from "@/src/features/auth/lib/profile-to-user";
import { useAuthStore } from "@/src/features/auth/model/store";
import { useAppStore } from "@/lib/store/app-store";
import { getStoredSession } from "@/src/features/auth/lib/token";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [authBootstrapped, setAuthBootstrapped] = useState(false);
  const handleAuthReady = useCallback(() => setAuthBootstrapped(true), []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionBootstrap onReady={handleAuthReady} />
      <AuthRouteGate bootstrapped={authBootstrapped}>{children}</AuthRouteGate>
    </QueryClientProvider>
  );
}

function AuthSessionBootstrap({ onReady }: { onReady: () => void }) {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const logoutAuth = useAuthStore((state) => state.logout);
  const setUser = useAppStore((state) => state.setUser);
  const logoutApp = useAppStore((state) => state.logout);

  useEffect(() => {
    let mounted = true;
    const storedSession = getStoredSession();

    if (!storedSession) {
      logoutAuth();
      logoutApp();
      onReady();
      return () => {
        mounted = false;
      };
    }

    restoreSession()
      .then((profile) => {
        if (mounted && profile) setUser(profileToTestUser(profile));
        if (mounted && !profile) logoutApp();
      })
      .catch(() => {
        if (!mounted) return;
        logoutAuth();
        logoutApp();
      })
      .finally(() => {
        if (mounted) onReady();
      });

    return () => {
      mounted = false;
    };
  }, [logoutApp, logoutAuth, onReady, restoreSession, setUser]);

  return null;
}

function AuthRouteGate({ bootstrapped, children }: { bootstrapped: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const isPublicRoute = pathname === "/login" || pathname.startsWith("/backend-api");

  useEffect(() => {
    if (!bootstrapped) return;
    if (!isPublicRoute && status === "anonymous") router.replace("/login");
  }, [bootstrapped, isPublicRoute, pathname, router, status]);

  if (isPublicRoute) return <>{children}</>;

  if (!bootstrapped || status !== "authenticated") {
    return (
      <div className="page-shell grid min-h-screen place-items-center bg-premium-grid px-6">
        <div className="surface-solid relative overflow-hidden rounded-[30px] px-7 py-6 text-sm font-semibold text-smoke shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.16),transparent_64%)]" />
          <div className="relative flex items-center gap-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-gold shadow-glow" />
            Проверяем сессию...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

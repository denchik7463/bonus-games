"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { profileToTestUser } from "@/src/features/auth/lib/profile-to-user";
import { useAuthStore } from "@/src/features/auth/model/store";
import { useAppStore } from "@/lib/store/app-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionBootstrap />
      <AuthRouteGate>{children}</AuthRouteGate>
    </QueryClientProvider>
  );
}

function AuthSessionBootstrap() {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const setUser = useAppStore((state) => state.setUser);
  const logoutApp = useAppStore((state) => state.logout);

  useEffect(() => {
    let mounted = true;
    restoreSession().then((profile) => {
      if (mounted && profile) setUser(profileToTestUser(profile));
      if (mounted && !profile) logoutApp();
    });
    return () => {
      mounted = false;
    };
  }, [logoutApp, restoreSession, setUser]);

  return null;
}

function AuthRouteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const isPublicRoute = pathname === "/login" || pathname.startsWith("/backend-api");

  useEffect(() => {
    if (!isPublicRoute && status === "anonymous") router.replace("/login");
    if (isPublicRoute && pathname === "/login" && status === "authenticated") router.replace("/lobby");
  }, [isPublicRoute, pathname, router, status]);

  if (isPublicRoute) return <>{children}</>;

  if (status !== "authenticated") {
    return (
      <div className="page-shell grid min-h-screen place-items-center bg-premium-grid px-6">
        <div className="surface-solid rounded-[28px] px-6 py-5 text-sm font-semibold text-smoke">
          Проверяем сессию...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

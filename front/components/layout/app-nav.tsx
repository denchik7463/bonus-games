"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BarChart3, ChevronDown, History, LayoutGrid, LogOut, Moon, Shield, SlidersHorizontal, Sun, UserRound } from "lucide-react";
import { BalanceBadge, vipStatusLabel } from "@/components/domain/badges";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/src/features/auth/model/store";

const links = [
  { href: "/lobby", label: "Лобби", icon: LayoutGrid },
  { href: "/matchmaking", label: "Подбор", icon: SlidersHorizontal }
];

const privilegedLinks = [
  { href: "/dashboard", label: "Дашборд", icon: BarChart3, roles: ["expert", "admin"] },
  { href: "/transparency", label: "Журнал", icon: Shield, roles: ["expert", "admin"] },
  { href: "/admin/configurator", label: "Конфигуратор", icon: History, roles: ["admin"] }
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const logoutAuth = useAuthStore((state) => state.logout);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const profileRef = useRef<HTMLDivElement | null>(null);
  const visiblePrivilegedLinks = privilegedLinks.filter((item) => item.roles.includes(user.role));
  const visibleLinks = [...links, ...visiblePrivilegedLinks];

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("aurum-theme") === "light" ? "light" : "dark";
    setTheme(savedTheme);
    document.documentElement.dataset.theme = savedTheme;
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("aurum-theme", nextTheme);
  }

  return (
    <header className="site-header sticky top-0 z-[500] overflow-visible px-4 backdrop-blur-2xl md:px-7">
      <div className="mx-auto flex max-w-[1560px] flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <Link href="/lobby" className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-gold/20 bg-gold/10 font-black text-gold shadow-glow">
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.22),transparent_42%)]" />
            <span className="relative">A</span>
          </span>
          <div>
            <p className="font-black uppercase tracking-[0.22em] text-platinum">Аурум Комнаты</p>
            <p className="text-xs text-smoke">VIP быстрые раунды</p>
          </div>
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-0.5 md:justify-center md:gap-1">
          {visibleLinks.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold text-smoke transition hover:bg-white/[0.06] hover:text-platinum",
                  active && "bg-gold text-ink shadow-glow"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {loggingOut ? (
            <span className="rounded-full bg-gold/10 px-4 py-2 text-xs font-semibold text-gold">Выходим...</span>
          ) : (
          <>
          <BalanceBadge balance={user.balance} reserved={user.reservedBalance ?? 0} />
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:text-platinum"
            aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
            title={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
          >
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <div ref={profileRef} className="relative z-[700]">
            <button
              onClick={() => setProfileOpen((value) => !value)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 py-1.5 text-sm text-smoke transition surface-inset hover:text-platinum"
            >
              <span className="relative h-8 w-8 overflow-hidden rounded-full border border-gold/20">
                <Image src={user.avatar} alt="" fill className="object-cover" />
              </span>
              <ChevronDown className={cn("h-4 w-4 transition", profileOpen && "rotate-180")} />
            </button>
            {profileOpen ? (
              <div className="profile-menu-layer surface-solid absolute right-0 top-[calc(100%+12px)] z-[900] w-72 rounded-[24px] p-4 backdrop-blur-2xl">
                <div className="flex items-center gap-3">
                  <span className="relative h-12 w-12 overflow-hidden rounded-full border border-gold/20">
                    <Image src={user.avatar} alt="" fill className="object-cover" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-platinum">{user.name}</p>
                    <p className="truncate text-sm text-gold">{vipStatusLabel(user.tier)}</p>
                  </div>
                </div>
                <div className="mt-4 border-t border-[rgba(245,241,232,0.04)] pt-4 space-y-2">
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-smoke transition hover:bg-white/[0.06] hover:text-platinum"
                  >
                    <UserRound className="h-4 w-4" />
                    Профиль
                  </Link>
                  <button
                    onClick={() => {
                      setLoggingOut(true);
                      setProfileOpen(false);
                      logoutAuth();
                      logout();
                      router.replace("/login");
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm text-smoke transition hover:bg-ember/10 hover:text-platinum"
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          </>
          )}
        </div>
      </div>
    </header>
  );
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageClass = pathname.startsWith("/matchmaking") ? "page-shell--matchmaking" : "";

  return (
    <div className={cn("page-shell bg-premium-grid bg-[length:72px_72px]", pageClass)}>
      <AppNav />
      <main className="mx-auto max-w-[1560px] px-4 py-8 md:px-7 md:py-10">{children}</main>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Crown, LockKeyhole, Mail, Sparkles, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { Button } from "@/components/ui/button";
import { VipBadge } from "@/components/domain/badges";
import { ChinchillaRunner } from "@/components/mascots/chinchilla-runner";
import { cn } from "@/lib/utils";
import { getUserFriendlyError } from "@/src/shared/api/errors";
import { profileToTestUser } from "@/src/features/auth/lib/profile-to-user";
import { useAuthStore } from "@/src/features/auth/model/store";
import type { BackendRole } from "@/src/features/auth/model/types";
import type { VipTier } from "@/lib/domain/types";

type AuthMode = "login" | "register";

const quickLoginAccounts = [
  {
    username: "Player",
    password: "123456",
    label: "Player",
    roleLabel: "игрок",
    tier: "Gold" as VipTier
  },
  {
    username: "Expert",
    password: "123456",
    label: "Expert",
    roleLabel: "эксперт",
    tier: "Platinum" as VipTier
  },
  {
    username: "Admin",
    password: "123456",
    label: "Admin",
    roleLabel: "админ",
    tier: "Black Diamond" as VipTier
  }
];

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAppStore((state) => state.setUser);
  const authLogin = useAuthStore((state) => state.login);
  const authRegister = useAuthStore((state) => state.register);
  const [mode, setMode] = useState<AuthMode>("login");
  const [demoOpen, setDemoOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [initialBalance, setInitialBalance] = useState(1000);
  const [role, setRole] = useState<BackendRole>("USER");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const authMutation = useMutation({
    mutationFn: async () => {
      if (!username.trim() || !password.trim()) {
        throw new Error("Введите имя пользователя и пароль.");
      }

      if (mode === "register") {
        return authRegister({
          username: username.trim(),
          password,
          initialBalance: Math.max(0, initialBalance),
          role
        });
      }

      return authLogin({ username: username.trim(), password });
    },
    onSuccess: (profile) => {
      setAuthError(null);
      if (!profile) {
        setAuthSuccess("Регистрация прошла успешно. Теперь войдите с новым именем пользователя и паролем.");
        setMode("login");
        setPassword("");
        return;
      }
      setUser(profileToTestUser(profile));
      router.push("/lobby");
    },
    onError: (error) => {
      setAuthError(getUserFriendlyError(error));
    }
  });
  const quickLoginMutation = useMutation({
    mutationFn: (account: { username: string; password: string }) => authLogin(account),
    onMutate: (account) => {
      setAuthError(null);
      setAuthSuccess(null);
      setMode("login");
      setUsername(account.username);
      setPassword(account.password);
    },
    onSuccess: (profile) => {
      setUser(profileToTestUser(profile));
      router.push("/lobby");
    },
    onError: (error) => {
      setAuthError(getUserFriendlyError(error));
    }
  });

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    authMutation.mutate();
  }

  return (
    <main className="page-shell relative min-h-screen overflow-hidden bg-premium-grid bg-[length:72px_72px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,205,24,0.13),transparent_34%),radial-gradient(circle_at_86%_22%,rgba(123,60,255,0.12),transparent_32%),radial-gradient(circle_at_54%_86%,rgba(77,215,200,0.06),transparent_40%)]" />
      <div className="coin-rain inset-0 h-full w-full opacity-75">
        {Array.from({ length: 13 }).map((_, index) => (
          <span
            key={index}
            style={{
              left: `${4 + index * 7}%`,
              animationDelay: `${(index % 5) * 0.25}s`,
              width: 16 + (index % 4) * 3,
              height: 16 + (index % 4) * 3
            }}
          />
        ))}
      </div>
      <ChinchillaRunner />

      <div className="relative grid min-h-screen w-full lg:grid-cols-[1.04fr_.96fr]">
        <section className="relative flex min-h-[640px] flex-col overflow-hidden px-6 pb-12 pt-8 md:px-12 md:pb-16 md:pt-10 lg:min-h-screen">
          <div className="brand-scope left-[6%] top-[14%] h-56 w-56" />
          <div className="brand-scope right-[6%] top-[30%] h-72 w-72" />

          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-gold/25 bg-gold/10 font-black text-gold shadow-glow">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.22),transparent_42%)]" />
              <span className="relative">A</span>
            </span>
            <div>
              <p className="font-black uppercase tracking-[0.22em] text-platinum">Аурум Комнаты</p>
              <p className="text-xs text-smoke">VIP лаунж быстрых бонусных игр</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 mt-20 max-w-4xl text-left md:pt-20"
          >
            <p className="mb-10 inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:mb-12">
              <Crown className="h-4 w-4" />
              Закрытый VIP-доступ
            </p>
            <h1 className="brand-display text-balance text-4xl font-black leading-[0.98] text-platinum md:text-6xl">
            Быстрые раунды
              <br />
              для <span className="brand-marker">VIP-аудитории</span>.
            </h1>
            <p className="mt-10 max-w-2xl text-base leading-8 text-smoke md:mt-12 md:text-lg">
            Пара кликов — и вы в комнате. Один буст до старта, короткий раунд, сильный финал. Ставка — бонусы. Ритм — как у события.            </p>
          </motion.div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 md:px-8">
          <Image
            src="https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=80"
            alt=""
            fill
            className="login-bg-image object-cover opacity-16"
            priority
          />
          <div className="login-art-veil absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,rgba(255,205,24,0.12),transparent_34%),linear-gradient(135deg,rgba(5,5,5,0.9),rgba(8,9,12,0.8)_54%,rgba(5,6,8,0.64))]" />

          <div className="relative z-10 w-full max-w-xl">
            <div className="surface-solid relative overflow-hidden rounded-[36px] p-6 shadow-[0_32px_90px_rgba(0,0,0,0.42)] md:p-7">
              <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.13),transparent_64%)]" />
              <div className="pointer-events-none absolute -left-24 bottom-[-9rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.12),transparent_64%)]" />

              <div className="relative">
                <div className="mb-6 flex rounded-full bg-white/[0.045] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className={cn("flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition", mode === "login" ? "bg-gold text-ink shadow-glow" : "text-smoke hover:text-platinum")}
                  >
                    Вход
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className={cn("flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition", mode === "register" ? "bg-gold text-ink shadow-glow" : "text-smoke hover:text-platinum")}
                  >
                    Регистрация
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke">{mode === "login" ? "Вход в аккаунт" : "Новый аккаунт"}</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-platinum">
                    {mode === "login" ? "Добро пожаловать" : "Создайте профиль"}
                  </h2>
                </div>

                <form onSubmit={submitAuth} className="space-y-4">
                  <AuthField icon={mode === "register" ? <UserPlus className="h-4 w-4" /> : <Mail className="h-4 w-4" />} label="Имя пользователя" placeholder="denis" value={username} onChange={setUsername} />
                  {mode === "register" ? (
                    <>
                      <AuthField
                        icon={<Sparkles className="h-4 w-4" />}
                        label="Тестовый баланс"
                        placeholder="1000"
                        type="number"
                        value={String(initialBalance)}
                        onChange={(value) => setInitialBalance(Number(value) || 0)}
                      />
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-smoke">Роль</span>
                        <span className="auth-field-shell relative flex items-center gap-3 rounded-[22px] bg-white/[0.055] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
                          <span className="text-gold"><Crown className="h-4 w-4" /></span>
                          <select
                            value={role}
                            onChange={(event) => setRole(event.target.value as BackendRole)}
                            className="min-w-0 flex-1 appearance-none bg-transparent text-sm text-platinum outline-none"
                          >
                            <option value="USER">USER</option>
                            <option value="EXPERT">EXPERT</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                          <ArrowRight className="h-4 w-4 rotate-90 text-gold" />
                        </span>
                      </label>
                    </>
                  ) : null}
                  <AuthField icon={<LockKeyhole className="h-4 w-4" />} label="Пароль" placeholder="secret123" type="password" value={password} onChange={setPassword} />
                  {authError ? (
                    <div className="rounded-[22px] bg-ember/10 px-4 py-3 text-sm leading-6 text-ember">
                      {authError}
                    </div>
                  ) : null}
                  {authSuccess ? (
                    <div className="rounded-[22px] bg-jade/10 px-4 py-3 text-sm leading-6 text-jade">
                      {authSuccess}
                    </div>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={authMutation.isPending}>
                    {authMutation.isPending ? "Проверяем..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
                  </Button>
                </form>

                <div className="demo-box mt-5 rounded-[28px] bg-[linear-gradient(145deg,rgba(255,205,24,0.08),rgba(255,255,255,0.026)_46%,rgba(10,11,15,0.9))] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.055)]">
                  <button
                    type="button"
                    onClick={() => setDemoOpen((value) => !value)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                  >
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-platinum">
                        <Sparkles className="h-4 w-4 text-gold" />
                        Демо-вход
                      </p>
                      <p className="mt-1 text-sm leading-6 text-smoke">Быстрый вход в реальные зарегистрированные аккаунты.</p>
                    </div>
                    <ArrowRight className={cn("h-5 w-5 text-gold transition", demoOpen && "rotate-90")} />
                  </button>

                  {demoOpen ? (
                    <div className="mt-4 space-y-3">
                      {quickLoginAccounts.map((account) => (
                        <button
                          key={account.username}
                          onClick={() => quickLoginMutation.mutate({ username: account.username, password: account.password })}
                          disabled={quickLoginMutation.isPending}
                          className="demo-profile-card group flex w-full items-center gap-3 rounded-[22px] bg-[linear-gradient(180deg,rgba(44,48,58,0.78),rgba(24,27,34,0.9))] p-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-200 hover:bg-[linear-gradient(180deg,rgba(56,61,74,0.86),rgba(28,31,40,0.94))]"
                        >
                          <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,205,24,0.22),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(7,8,11,0.96))] text-lg font-black text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            {account.label.slice(0, 1)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-platinum">{account.label}</p>
                            <p className="text-xs text-smoke">{account.username} · <span className="text-[#aeb4bf]">{account.roleLabel}</span></p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <VipBadge tier={account.tier} />
                              <span className="rounded-full bg-white/[0.055] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-smoke">{account.roleLabel}</span>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-smoke transition group-hover:translate-x-1 group-hover:text-gold" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <p className="mt-5 text-center text-sm text-smoke">
                  {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
                  <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="font-semibold text-gold hover:text-[#ffe06a]">
                    {mode === "login" ? "Зарегистрируйтесь" : "Войдите"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AuthField({
  icon,
  label,
  placeholder,
  value,
  onChange,
  type = "text"
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-smoke">{label}</span>
      <span className="auth-field-shell flex items-center gap-3 rounded-[22px] bg-white/[0.055] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
        <span className="text-gold">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm text-platinum outline-none placeholder:text-muted"
        />
      </span>
    </label>
  );
}

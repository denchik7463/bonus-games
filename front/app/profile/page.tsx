"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, Dot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Flame, Gem, History, Sparkles } from "lucide-react";
import { AppFrame } from "@/components/layout/app-nav";
import { Panel } from "@/components/ui/panel";
import { BalanceBadge, VipBadge } from "@/components/domain/badges";
import { HistoryRoundCard } from "@/components/domain/history-round-card";
import { MascotLoading } from "@/components/domain/mascot-loading";
import { useAppStore } from "@/lib/store/app-store";
import { cn, formatBonus } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { journalService } from "@/src/features/journal/model/service";
import { journalQueryKeys } from "@/src/features/journal/model/query-keys";
import { getUserFriendlyError } from "@/src/shared/api/errors";
import { isRoundWonByUser, uniqueRoundsById } from "@/src/features/journal/model/outcome";
import type { WinStreakDto } from "@/src/features/journal/model/types";

export default function ProfilePage() {
  const user = useAppStore((state) => state.user);
  const { data: userRounds = [], error: historyError, isLoading: historyLoading } = useQuery({
    queryKey: [...journalQueryKeys.me, user.id],
    queryFn: () => journalService.getMyJournal(user),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true
  });
  const { data: winStreak, isLoading: streakLoading } = useQuery({
    queryKey: journalQueryKeys.myWinStreak(user.id),
    queryFn: () => journalService.getMyWinStreak(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false
  });
  const normalizedRounds = uniqueRoundsById(userRounds);
  const journalWinStreak = useMemo(() => currentWinStreakFromRounds(normalizedRounds, user.id), [normalizedRounds, user.id]);
  const effectiveWinStreak = useMemo(() => {
    const backendCount = winStreak?.currentWinStreak ?? 0;
    const currentWinStreak = Math.max(backendCount, journalWinStreak.count);
    if (!winStreak && currentWinStreak <= 0) return null;
    return {
      userId: winStreak?.userId || user.id,
      username: winStreak?.username || user.name,
      currentWinStreak,
      latestGameResultId: winStreak?.latestGameResultId ?? journalWinStreak.latestGameResultId,
      latestGameAt: winStreak?.latestGameAt ?? journalWinStreak.latestGameAt,
      calculatedAt: winStreak?.calculatedAt ?? null
    };
  }, [journalWinStreak.count, journalWinStreak.latestGameAt, journalWinStreak.latestGameResultId, user.id, user.name, winStreak]);
  const wins = normalizedRounds.filter((round) => isRoundWonByUser(round, user.id)).length;
  const winRate = normalizedRounds.length ? Math.round((wins / normalizedRounds.length) * 1000) / 10 : 0;
  const totalDelta = normalizedRounds.reduce((sum, round) => sum + round.balanceDelta, 0);
  const chart = normalizedRounds.slice().reverse().map((round, index) => ({ name: `R${index + 1}`, delta: round.balanceDelta }));

  return (
    <AppFrame>
      <div className="space-y-6">
        <section className="surface-solid relative overflow-hidden rounded-[36px] p-6 md:p-10">
          <div className="pointer-events-none absolute inset-0 opacity-85">
            <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.17),transparent_62%)]" />
            <div className="absolute right-[-12rem] top-8 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.13),transparent_64%)]" />
            <div className="absolute bottom-[-14rem] left-[42%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.09),transparent_64%)]" />
          </div>

          <div className="relative">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-[34px] shadow-[0_26px_80px_rgba(0,0,0,0.42)]">
                <Image src={user.avatar} alt="" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_18%,rgba(255,255,255,.25),transparent_36%)]" />
              </div>

              <div className="min-w-0">
                <h1 className="text-balance text-4xl font-black leading-[0.98] tracking-[-0.05em] text-platinum md:text-6xl">
                  {user.name}
                </h1>
                <p className="mt-3 text-base text-smoke">{user.handle}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <VipBadge tier={user.tier} />
                  <BalanceBadge balance={user.balance} reserved={user.reservedBalance ?? 0} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)] xl:items-stretch">
          <Panel className="surface-solid relative h-full min-h-[390px] overflow-hidden border-0 p-6 shadow-none before:hidden">
            <div className="pointer-events-none absolute -right-28 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.11),transparent_64%)]" />
            <div className="relative flex h-full flex-col">
              <SectionTitle icon={<Gem className="h-4 w-4" />} eyebrow="Сводка" title="Итоги" />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SoftMetric label="Доступно" value={formatBonus(user.balance)} tone="gold" />
                <SoftMetric label="В резерве" value={formatBonus(user.reservedBalance ?? 0)} />
                <SoftMetric label="Победы" value={`${wins}`} tone="jade" />
              </div>
              <div className="mt-5 grid flex-1 gap-3 sm:grid-cols-3">
                <SoftMetric label="Итог" value={`${totalDelta >= 0 ? "+" : ""}${formatBonus(totalDelta)}`} tone={totalDelta >= 0 ? "jade" : "ember"} />
                <SoftMetric label="Раунды" value={`${normalizedRounds.length}`} />
                <SoftMetric label="Win-rate" value={`${winRate.toFixed(winRate % 1 === 0 ? 0 : 1)}%`} tone="gold" />
              </div>
              <WinStreakCard streak={effectiveWinStreak} loading={streakLoading && !effectiveWinStreak} />
              <ButtonLink href="/matchmaking" className="mt-5 w-full justify-center">Сыграть следующий раунд</ButtonLink>
            </div>
          </Panel>

          <Panel className="surface-solid relative h-full min-h-[390px] overflow-hidden border-0 p-6 shadow-none before:hidden">
            <div className="pointer-events-none absolute -left-24 -bottom-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.09),transparent_64%)]" />
            <div className="relative h-full">
              <SectionTitle icon={<Activity className="h-4 w-4" />} eyebrow="Статистика" title="История выигрышей" />
              <p className="mt-2 text-sm leading-7 text-smoke">
                {userRounds.length
                  ? "График показывает, как менялся итог по вашим последним раундам."
                  : "Пока вы не участвовали в играх, здесь будет появляться график активности и изменения баланса."}
              </p>

              {userRounds.length ? (
                <div className="mt-4 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart}>
                      <CartesianGrid stroke="rgba(57,217,138,.08)" vertical={false} />
                      <XAxis dataKey="name" stroke="#9b978d" tickLine={false} axisLine={false} />
                      <YAxis stroke="#9b978d" tickLine={false} axisLine={false} width={36} />
                      <Tooltip contentStyle={{ background: "var(--tooltip-bg)", border: "none", borderRadius: 18, boxShadow: "var(--tooltip-shadow)" }} />
                      <Area
                        type="monotone"
                        dataKey="delta"
                        stroke="#39d98a"
                        strokeWidth={3}
                        fill="#39d98a"
                        fillOpacity={0.18}
                        dot={<Dot r={4} fill="#39d98a" stroke="#08100c" strokeWidth={2} />}
                        activeDot={{ r: 6, fill: "#39d98a", stroke: "#f7f2e7", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-5 flex h-[220px] items-center justify-center rounded-[28px] bg-[linear-gradient(145deg,rgba(255,205,24,0.08),rgba(255,255,255,0.026)_46%,rgba(10,11,15,0.9))] px-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
                  <div>
                    <p className="text-lg font-semibold text-platinum">График пока пуст</p>
                    <p className="mt-2 text-sm leading-6 text-smoke">Сыграйте первый раунд, и здесь появится динамика выигрышей и проигрышей.</p>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>

        <Panel className="surface-solid relative overflow-hidden border-0 p-6 shadow-none before:hidden md:p-7">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.12),transparent_64%)]" />
          <div className="relative mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionTitle icon={<History className="h-4 w-4" />} eyebrow="История участия" title="Последние игры" />
              <p className="mt-2 max-w-3xl text-sm leading-7 text-smoke">Прямо в профиле видно, во что вы играли, кто выиграл и как изменился баланс.</p>
            </div>
            {userRounds.length > 0 ? <ButtonLink href="/history" variant="secondary">Открыть всю историю</ButtonLink> : null}
          </div>

          <div className="relative">
            {historyLoading ? (
              <MascotLoading title="Шиншилла ищет последние игры..." description="Подгружаем историю профиля, места и итог по балансу." />
            ) : historyError ? (
              <div className="rounded-[28px] bg-ember/10 p-6 text-sm text-ember">{getUserFriendlyError(historyError)}</div>
            ) : userRounds.length > 0 ? (
              <div className="space-y-4">
                {normalizedRounds.slice(0, 2).map((round) => (
                  <HistoryRoundCard key={round.id} round={round} currentUserId={user.id} />
                ))}
              </div>
            ) : (
              <EmptyState title="История пока пуста" description="Когда вы сыграете первый раунд, здесь появятся карточки с участниками, победителем и итогом по балансу." action="Сыграть" href="/lobby" />
            )}
          </div>
        </Panel>

      </div>
    </AppFrame>
  );
}

function WinStreakCard({ streak, loading }: { streak: WinStreakDto | null; loading: boolean }) {
  const active = Boolean(streak && streak.currentWinStreak > 0);
  const latestDate = streak?.latestGameAt ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(streak.latestGameAt)) : null;
  return (
    <div className={cn(
      "relative mt-5 overflow-hidden rounded-[34px] p-5 md:p-6 shadow-[0_26px_90px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.065)]",
      loading
        ? "bg-white/[0.045]"
        : active
          ? "bg-[linear-gradient(135deg,rgba(255,205,24,0.30),rgba(255,122,104,0.24)_27%,rgba(123,60,255,0.16)_56%,rgba(255,255,255,0.04)),rgba(9,10,14,0.92)]"
          : "bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02)),rgba(9,10,14,0.86)]"
    )}>
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className={cn(
          "absolute -left-20 -top-20 h-72 w-72 rounded-full blur-3xl",
          loading ? "bg-[radial-gradient(circle,rgba(255,255,255,0.16),transparent_68%)]" : active ? "bg-[radial-gradient(circle,rgba(255,205,24,0.52),transparent_64%)]" : "bg-[radial-gradient(circle,rgba(255,255,255,0.10),transparent_68%)]"
        )} />
        <div className={cn(
          "absolute -right-12 top-0 h-64 w-64 rounded-full blur-3xl",
          active ? "bg-[radial-gradient(circle,rgba(123,60,255,0.32),transparent_70%)]" : "bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_70%)]"
        )} />
        {active ? <div className="absolute -left-8 top-6 text-[118px] leading-none opacity-35 blur-[1px]">🔥</div> : null}
      </div>
      <div className="relative grid gap-5 md:grid-cols-[minmax(0,1fr)_134px] md:items-center">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold/14 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Flame className="h-3.5 w-3.5" />
            Серия побед
          </div>
          <h3 className={cn("mt-2 text-[2.25rem] font-black leading-[0.92] tracking-[-0.06em] md:text-[2.7rem]", active ? "text-[#ffe35f]" : "text-platinum")}>
            {loading ? "Считаем..." : active ? `${streak?.currentWinStreak} подряд` : "Победная серия ждёт"}
          </h3>
          <p className="mt-2 max-w-[34rem] text-sm leading-6 text-smoke">
            {loading
              ? "Шиншилла проверяет последние результаты."
              : active
                ? `Последняя победа${latestDate ? ` · ${latestDate}` : ""}. Серия держится прямо сейчас и выглядит очень горячо.`
                : "Победная серия начнётся, когда первый подряд выигранный раунд закрепится в истории."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {active ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-gold/12 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Sparkles className="h-3.5 w-3.5" />
                Горячая форма
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-smoke shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <Sparkles className="h-3.5 w-3.5" />
                Серия собирается
              </div>
            )}
          </div>
        </div>
        <div className="relative mx-auto shrink-0 md:mx-0">
          <div className={cn(
            "absolute inset-0 -z-10 rounded-[28px] blur-2xl",
            active ? "bg-[radial-gradient(circle,rgba(255,205,24,0.50),transparent_66%)]" : "bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_68%)]"
          )} />
          <div className="flex flex-col items-center">
            <motion.div
              animate={active ? { y: [0, -7, 0], rotate: [0, -4, 0], scale: [1, 1.04, 1] } : { y: [0, -2, 0], scale: [1, 1.01, 1] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              className="relative h-[130px] w-[130px] overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,rgba(255,205,24,0.26),rgba(255,122,104,0.10)_42%,rgba(255,255,255,0.04)),rgba(9,10,14,0.78)] p-3 shadow-[0_28px_68px_rgba(0,0,0,0.30),0_0_0_1px_rgba(255,205,24,0.15),inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              <div className="absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.20),transparent_36%),radial-gradient(circle_at_50%_68%,rgba(255,205,24,0.26),transparent_62%),radial-gradient(circle_at_72%_18%,rgba(123,60,255,0.22),transparent_28%)]" />
              <Image src="/mascots/shina.png" alt="" fill className="object-contain drop-shadow-[0_18px_42px_rgba(0,0,0,0.40)]" />
            </motion.div>
            <div className="mt-2 rounded-full bg-ink/72 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-gold shadow-[0_12px_26px_rgba(0,0,0,0.22)]">
              <Flame className="mr-1 inline-block h-3 w-3" />
              hot
            </div>
          </div>
        </div>
      </div>
      {active && streak?.latestGameResultId ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href={`/result/${streak.latestGameResultId}`} variant="secondary" className="justify-center">Открыть последний раунд</ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

function SectionTitle({ icon, eyebrow, title }: { icon: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-gold">
        {icon}
        <p className="text-xs font-bold uppercase tracking-[0.2em]">{eyebrow}</p>
      </div>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-platinum md:text-3xl">{title}</h2>
    </div>
  );
}

function SoftMetric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "gold" | "jade" | "ember" }) {
  return (
    <div className={cn(
      "rounded-[22px] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.06)]",
      tone === "default" && "bg-white/[0.045]",
      tone === "gold" && "bg-gold/10",
      tone === "jade" && "bg-jade/10",
      tone === "ember" && "bg-ember/10"
    )}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-smoke">{label}</p>
      <p className={cn("mt-2 text-xl font-black tracking-[-0.03em] text-platinum", tone === "jade" && "text-jade", tone === "ember" && "text-ember")}>{value}</p>
    </div>
  );
}

function EmptyState({ title, description, action, href }: { title: string; description: string; action: string; href: string }) {
  return (
    <div className="rounded-[28px] bg-[linear-gradient(145deg,rgba(255,205,24,0.08),rgba(255,255,255,0.026)_46%,rgba(10,11,15,0.9))] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.055)]">
      <p className="text-xl font-semibold text-platinum">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-smoke">{description}</p>
      <ButtonLink href={href} className="mt-5">{action}</ButtonLink>
    </div>
  );
}

function currentWinStreakFromRounds(rounds: ReturnType<typeof uniqueRoundsById>, userId: string) {
  const ordered = rounds
    .slice()
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  let count = 0;
  let latestGameResultId: string | null = null;
  let latestGameAt: string | null = null;

  for (const round of ordered) {
    if (!latestGameResultId) {
      latestGameResultId = round.id;
      latestGameAt = round.startedAt;
    }
    if (!isRoundWonByUser(round, userId)) break;
    count += 1;
  }

  return { count, latestGameResultId, latestGameAt };
}

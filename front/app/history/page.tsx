"use client";

import { useQuery } from "@tanstack/react-query";
import { History, Sparkles, Trophy } from "lucide-react";
import { AppFrame } from "@/components/layout/app-nav";
import { Panel } from "@/components/ui/panel";
import { HistoryRoundCard } from "@/components/domain/history-round-card";
import { MascotLoading } from "@/components/domain/mascot-loading";
import { useAppStore } from "@/lib/store/app-store";
import { ButtonLink } from "@/components/ui/button";
import { formatBonus } from "@/lib/utils";
import { journalService } from "@/src/features/journal/model/service";
import { journalQueryKeys } from "@/src/features/journal/model/query-keys";
import { getUserFriendlyError } from "@/src/shared/api/errors";
import { isRoundWonByUser, uniqueRoundsById } from "@/src/features/journal/model/outcome";

export default function HistoryPage() {
  const user = useAppStore((state) => state.user);
  const { data: userRounds = [], error, isLoading } = useQuery({
    queryKey: [...journalQueryKeys.me, user.id],
    queryFn: () => journalService.getMyJournal(user),
    staleTime: 0,
    refetchOnMount: "always"
  });
  const normalizedRounds = uniqueRoundsById(userRounds);
  const wins = isLoading ? null : normalizedRounds.filter((round) => isRoundWonByUser(round, user.id)).length;
  const totalDelta = isLoading ? null : normalizedRounds.reduce((sum, round) => sum + round.balanceDelta, 0);

  return (
    <AppFrame>
      <div className="space-y-6">
        <section className="surface-solid relative overflow-hidden rounded-[36px] p-6 md:p-10">
          <div className="pointer-events-none absolute inset-0 opacity-85">
            <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.17),transparent_62%)]" />
            <div className="absolute right-[-12rem] top-8 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.13),transparent_64%)]" />
            <div className="absolute bottom-[-14rem] left-[42%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.09),transparent_64%)]" />
          </div>

          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-end">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <History className="h-4 w-4" />
                История пользователя
              </p>
              <h1 className="text-balance text-4xl font-black leading-[0.98] tracking-[-0.05em] text-platinum md:text-6xl">
                Все игровые
                <br />
                <span className="brand-marker">раунды</span>
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-smoke md:text-lg">
                Здесь собраны ваши игры: состав, победитель и итог по балансу.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <HistoryStat label="Раунды" value={isLoading ? "..." : `${normalizedRounds.length}`} icon={<History className="h-5 w-5" />} />
              <HistoryStat label="Победы" value={wins === null ? "..." : `${wins}`} icon={<Trophy className="h-5 w-5" />} tone="jade" />
              <HistoryStat label="Итог" value={totalDelta === null ? "..." : `${totalDelta >= 0 ? "+" : ""}${formatBonus(totalDelta)}`} icon={<Sparkles className="h-5 w-5" />} tone={(totalDelta ?? 0) >= 0 ? "jade" : "ember"} />
            </div>
          </div>
        </section>

        <Panel className="surface-solid relative overflow-hidden border-0 p-6 shadow-none before:hidden md:p-7">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.12),transparent_64%)]" />
          <div className="relative">
            {isLoading ? (
              <MascotLoading title="Шиншилла подгружает историю..." description="Собираем ваши раунды, места участников и изменения баланса." />
            ) : error ? (
              <div className="rounded-[28px] bg-ember/10 p-6 text-sm text-ember">{getUserFriendlyError(error)}</div>
            ) : normalizedRounds.length ? (
              <div className="space-y-4">
                {normalizedRounds.map((round) => (
                  <HistoryRoundCard key={round.id} round={round} currentUserId={user.id} />
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] bg-[linear-gradient(145deg,rgba(255,205,24,0.08),rgba(255,255,255,0.026)_46%,rgba(10,11,15,0.9))] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.055)]">
                <p className="text-xl font-semibold text-platinum">Вы еще не участвовали в играх</p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-smoke">После первого раунда здесь появятся карточки с участниками, победителем и балансом.</p>
                <ButtonLink href="/lobby" className="mt-5">Сыграть</ButtonLink>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </AppFrame>
  );
}

function HistoryStat({ label, value, icon, tone = "gold" }: { label: string; value: string; icon: React.ReactNode; tone?: "gold" | "jade" | "ember" }) {
  return (
    <div className={
      "rounded-[26px] p-4 shadow-[0_18px_54px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.065)] " +
      (tone === "gold" ? "bg-gold/12 text-gold" : tone === "jade" ? "bg-jade/10 text-jade" : "bg-ember/10 text-ember")
    }>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-smoke">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-platinum">{value}</p>
    </div>
  );
}

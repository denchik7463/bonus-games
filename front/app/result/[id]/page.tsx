"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { AppFrame } from "@/components/layout/app-nav";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ParticipantToken } from "@/components/domain/participant-token";
import { WinningCombinationBlock } from "@/components/domain/winning-combination";
import { gameService } from "@/lib/services/game-service";
import { useAppStore } from "@/lib/store/app-store";
import { formatBonus } from "@/lib/utils";
import { BoostExplainer } from "@/components/domain/boost-explainer";

export default function ResultPage() {
  const params = useParams<{ id: string }>();
  const activeRound = useAppStore((state) => state.activeRound);
  const user = useAppStore((state) => state.user);
  const settleRound = useAppStore((state) => state.settleRound);
  const { data: fetchedRound } = useQuery({ queryKey: ["round", params.id], queryFn: () => gameService.getRound(params.id), enabled: !activeRound });
  const round = activeRound?.id === params.id ? activeRound : fetchedRound;
  useEffect(() => {
    if (round) settleRound(round);
  }, [round, settleRound]);
  if (!round) return <AppFrame><Panel>Формируем итог раунда...</Panel></AppFrame>;
  const winner = round.participants.find((participant) => participant.id === round.winnerId) ?? round.participants[0];
  const userWon = round.winnerId === user.id;
  return (
    <AppFrame>
      <section className="surface-solid relative mb-8 overflow-hidden rounded-[36px]">
        <div className="absolute inset-0 opacity-85">
          <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.18),transparent_62%)]" />
          <div className="absolute right-[-10rem] top-8 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.14),transparent_64%)]" />
          <div className="absolute bottom-[-14rem] left-[42%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.10),transparent_64%)]" />
        </div>
        <div className="relative p-6 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                Итог раунда
              </p>
              <h1 className="text-balance text-4xl font-black leading-[0.98] tracking-[-0.05em] text-platinum md:text-6xl">
                {userWon ? "Вы забрали фонд." : "Победитель определён."}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-smoke md:text-lg">
                Комбинация сохранена, баланс обновлён — можно сразу зайти в следующий раунд.
              </p>
            </div>
            <div className="surface-solid flex items-center justify-between gap-4 rounded-[26px] px-5 py-4 md:min-w-[260px] md:flex-col md:items-stretch md:justify-center md:gap-2 md:text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke">Изменение баланса</p>
              <p className={round.balanceDelta >= 0 ? "text-5xl font-black tracking-[-0.04em] text-jade" : "text-5xl font-black tracking-[-0.04em] text-ember"}>
                {round.balanceDelta >= 0 ? "+" : ""}
                {formatBonus(round.balanceDelta)}
              </p>
              <p className="text-xs text-smoke">за этот раунд</p>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-solid relative mb-6 overflow-hidden rounded-[34px] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
        <div className="pointer-events-none absolute -right-28 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.14),transparent_64%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold/90">Победитель</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-platinum md:text-5xl">Кто забрал фонд</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-smoke">Итог раунда зафиксирован: победитель, начисление фонда и комбинация сохранены в истории.</p>
          </div>
          <ParticipantToken participant={winner} />
        </div>
        <div className="relative mt-6 grid gap-3 sm:grid-cols-4">
          <ButtonLink href="/matchmaking" className="w-full justify-center">Сыграть ещё</ButtonLink>
          <ButtonLink href="/history" variant="secondary" className="w-full justify-center">Открыть историю</ButtonLink>
          <ButtonLink href="/rooms" variant="secondary" className="w-full justify-center">Похожие комнаты</ButtonLink>
          <ButtonLink href="/matchmaking" variant="ghost" className="w-full justify-center">Поднять риск</ButtonLink>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2 xl:items-stretch">
        <BoostExplainer round={round} state="summary" />
        <WinningCombinationBlock combination={round.combination} />
      </div>
    </AppFrame>
  );
}

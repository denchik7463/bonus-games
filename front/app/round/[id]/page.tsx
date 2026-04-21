"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { AppFrame } from "@/components/layout/app-nav";
import { RoundBroadcast } from "@/components/game/round-broadcast";
import { gameService } from "@/lib/services/game-service";
import { useAppStore } from "@/lib/store/app-store";

export default function RoundPage() {
  const params = useParams<{ id: string }>();
  const activeRound = useAppStore((state) => state.activeRound);
  const { data: fetchedRound, isLoading } = useQuery({ queryKey: ["round", params.id], queryFn: () => gameService.getRound(params.id), enabled: !activeRound });
  const round = activeRound?.id === params.id ? activeRound : fetchedRound;
  if (isLoading || !round) {
    return (
      <AppFrame>
        <section className="surface-solid overflow-hidden rounded-[30px] p-8 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold/90">Broadcast</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-platinum">Готовим трансляцию</h1>
          <p className="mt-3 text-sm leading-7 text-smoke">Подтягиваем данные раунда и запускаем сцену раскрытия результата.</p>
        </section>
      </AppFrame>
    );
  }
  return <AppFrame><RoundBroadcast round={round} /></AppFrame>;
}

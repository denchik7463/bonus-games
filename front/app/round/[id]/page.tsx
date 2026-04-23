"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppFrame } from "@/components/layout/app-nav";
import { RoundBroadcast, roundBroadcastSeen } from "@/components/game/round-broadcast";
import { MascotLoading } from "@/components/domain/mascot-loading";
import { useAppStore } from "@/lib/store/app-store";
import { journalService } from "@/src/features/journal/model/service";
import { journalQueryKeys } from "@/src/features/journal/model/query-keys";
import type { GameMode, Round } from "@/lib/domain/types";

export default function RoundPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const { data: fetchedRound, isLoading } = useQuery({
    queryKey: journalQueryKeys.myDetail(params.id),
    queryFn: () => journalService.getRoundForUser(params.id, user),
    retry: 2,
    refetchOnMount: "always"
  });
  const round = withSavedMode(fetchedRound, params.id);
  const [alreadySeen, setAlreadySeen] = useState(false);

  useEffect(() => {
    setAlreadySeen(roundBroadcastSeen(params.id));
  }, [params.id]);

  useEffect(() => {
    if (!round || !alreadySeen) return;
    router.replace(`/result/${round.id}`);
  }, [alreadySeen, round, router]);

  if (isLoading || !round) {
    return (
      <AppFrame>
        <MascotLoading title="Шиншилла готовит трансляцию..." description="Подтягиваем данные раунда, участников и победившее место." />
      </AppFrame>
    );
  }
  if (alreadySeen) {
    return (
      <AppFrame>
        <MascotLoading title="Открываем итог раунда..." description="Трансляция уже была показана, поэтому сразу ведем вас к результату." />
      </AppFrame>
    );
  }
  return <AppFrame><RoundBroadcast round={round} /></AppFrame>;
}

function withSavedMode(round: Round | undefined, roundId: string) {
  if (!round || typeof window === "undefined") return round;
  const savedMode = window.localStorage.getItem(`round-mode:${roundId}`) as GameMode | null;
  if (!savedMode) return round;
  return { ...round, mode: savedMode };
}

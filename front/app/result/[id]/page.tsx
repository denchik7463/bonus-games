"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { AppFrame } from "@/components/layout/app-nav";
import { Button, ButtonLink } from "@/components/ui/button";
import { ParticipantToken } from "@/components/domain/participant-token";
import { MascotLoading } from "@/components/domain/mascot-loading";
import { useAppStore } from "@/lib/store/app-store";
import { formatBonus } from "@/lib/utils";
import { BoostExplainer } from "@/components/domain/boost-explainer";
import { journalService } from "@/src/features/journal/model/service";
import { journalQueryKeys } from "@/src/features/journal/model/query-keys";
import { useAuthStore } from "@/src/features/auth/model/store";
import { profileToTestUser } from "@/src/features/auth/lib/profile-to-user";
import { roomApiService } from "@/src/features/rooms/model/service";
import { roomQueryKeys } from "@/src/features/rooms/model/query-keys";
import { getUserFriendlyError } from "@/src/shared/api/errors";
import { ApiClientError } from "@/src/shared/api/errors";
import type { GameMode, Room, Round } from "@/lib/domain/types";
import { isRoundWonByUser, resolveRoundWinner } from "@/src/features/journal/model/outcome";

export default function ResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAppStore((state) => state.user);
  const updateUser = useAppStore((state) => state.updateUser);
  const authSession = useAuthStore((state) => state.session);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [replayError, setReplayError] = useState<string | null>(null);
  const profileSyncRef = useRef(false);
  const { data: fetchedRound, isLoading } = useQuery({
    queryKey: journalQueryKeys.myDetail(params.id),
    queryFn: () => journalService.getRoundForUser(params.id, user),
    retry: 2,
    refetchOnMount: false,
    staleTime: 30_000
  });
  const round = withSavedMode(fetchedRound, params.id);
  const { data: resultRoom } = useQuery({
    queryKey: round ? roomQueryKeys.detail(round.roomId) : ["rooms", "detail", "result-room-pending"],
    queryFn: () => {
      if (!round) throw new Error("Итоги раунда еще загружаются.");
      return roomApiService.getRoom(round.roomId, user);
    },
    enabled: Boolean(round?.roomId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });
  const { data: similarRooms = [], error: similarError, isLoading: similarLoading } = useQuery({
    queryKey: ["rooms", "recommendations", "similar", params.id, 200, 10],
    queryFn: () => {
      if (!round) return [];
      return roomApiService.getPostGameSimilarRecommendations({
        entryCost: round.entryCost,
        maxPlayers: round.maxPlayers,
        boostAllowed: round.boostAllowed
      }, user, { priceDelta: 200, limit: 10 });
    },
    enabled: Boolean(round),
    retry: false,
    staleTime: 15_000
  });
  const { data: riskierRoom = null, error: riskierError, isLoading: riskierLoading } = useQuery({
    queryKey: ["rooms", "recommendations", "riskier", params.id],
    queryFn: () => {
      if (!round) return null;
      return roomApiService.getPostGameRiskierRecommendation({
        entryCost: round.entryCost,
        maxPlayers: round.maxPlayers,
        boostAllowed: round.boostAllowed
      }, user);
    },
    enabled: Boolean(round),
    retry: false,
    staleTime: 15_000
  });
  const replayMutation = useMutation({
    mutationFn: async () => {
      if (!round) throw new Error("Итоги раунда еще загружаются.");
      const maxPlayers = Math.max(1, round.maxPlayers ?? round.participants.length ?? 2);
      const userSeatCount = round.participants.filter((participant) => participant.userId === user.id || participant.id === user.id).length;
      const seatsCount = Math.max(1, Math.min(5, userSeatCount || 1, Math.max(1, Math.floor(maxPlayers / 2))));
      const boostAllowed = round.boostAllowed ?? (round.boostCost > 0 || round.boostUsed);
      return roomApiService.findRoom({
        maxPlayers,
        entryCost: round.entryCost,
        boostAllowed,
        seatsCount
      }, user);
    },
    onMutate: () => {
      setReplayError(null);
      queryClient.removeQueries({ queryKey: roomQueryKeys.all });
    },
    onSuccess: (room) => {
      queryClient.removeQueries({ queryKey: roomQueryKeys.all });
      router.push(`/room/${room.id}`);
    },
    onError: (error) => {
      setReplayError(getUserFriendlyError(error));
    }
  });
  useEffect(() => {
    if (!round || !authSession || profileSyncRef.current) return;
    profileSyncRef.current = true;
    refreshProfile(authSession)
      .then((profile) => updateUser(profileToTestUser(profile)))
      .catch(() => {
        profileSyncRef.current = false;
      });
  }, [authSession, profileSyncRef, refreshProfile, round, updateUser]);
  if (isLoading || !round) {
    return (
      <AppFrame>
        <MascotLoading title="Шиншилла собирает итоги..." description="Подтягиваем победителя, место, баланс и участников раунда." />
      </AppFrame>
    );
  }
  const winner = resolveRoundWinner(round);
  const userWon = isRoundWonByUser(round, user.id);
  const winnerSeat = winner?.seatNumber ? `Место ${winner.seatNumber}` : "Победивший слот";
  const isChinchillaRace = round.mode === "chinchilla-race";
  const financeRows = userFinanceRows(round, user.id);
  const openHistory = async () => {
    await queryClient.invalidateQueries({ queryKey: journalQueryKeys.me });
    router.push("/history");
  };
  return (
    <AppFrame>
      <section className={`surface-solid relative mb-8 overflow-hidden rounded-[36px] ${isChinchillaRace ? "border border-gold/20 shadow-[0_28px_90px_rgba(255,205,24,0.12)]" : ""}`}>
        <div className="absolute inset-0 opacity-85">
          <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.18),transparent_62%)]" />
          <div className="absolute right-[-10rem] top-8 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.14),transparent_64%)]" />
          <div className="absolute bottom-[-14rem] left-[42%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.10),transparent_64%)]" />
        </div>
        <div className="relative p-6 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                {isChinchillaRace ? "Финиш шиншилл" : "Итог раунда"}
              </p>
              <h1 className="text-balance text-4xl font-black leading-[0.98] tracking-[-0.05em] text-platinum md:text-6xl">
                {isChinchillaRace ? `${winnerSeat}: шиншилла на финише.` : userWon ? "Вы забрали фонд." : "Победитель определён."}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-smoke md:text-lg">
                {isChinchillaRace
                  ? `${winner ? `${winner.name} забирает победу на своей дорожке.` : "Победитель зафиксирован по итогам раунда."} Баланс обновлён, результат сохранён в истории.`
                  : "Баланс обновлён, победитель зафиксирован — можно сразу зайти в следующий раунд."}
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
            <p className="mt-3 max-w-2xl text-sm leading-7 text-smoke">Итог раунда зафиксирован: победитель и начисление фонда сохранены в истории.</p>
          </div>
          {winner ? <ParticipantToken participant={winner} /> : <div className="rounded-[24px] bg-white/[0.045] p-4 text-sm text-smoke">Победитель не подтверждён.</div>}
        </div>
        <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
          <Button type="button" onClick={() => replayMutation.mutate()} disabled={replayMutation.isPending} className="w-full justify-center">
            {replayMutation.isPending ? "Готовим раунд..." : "Сыграть ещё"}
          </Button>
          <Button type="button" variant="secondary" onClick={openHistory} className="w-full justify-center">Открыть историю</Button>
        </div>
        {replayError ? (
          <div className="relative mt-3 rounded-[20px] bg-ember/10 px-4 py-3 text-sm font-semibold text-ember">
            {replayError}
          </div>
        ) : null}
        <PostGameRecommendations
          similarRooms={similarRooms}
          similarError={similarError}
          similarLoading={similarLoading}
          riskierRoom={riskierRoom}
          riskierError={riskierError}
          riskierLoading={riskierLoading}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2 xl:items-stretch">
        <BoostExplainer room={resultRoom} round={round} state="summary" />
        <section className="surface-solid relative overflow-hidden rounded-[30px] p-6">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.14),transparent_64%)]" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Победившее место</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-platinum">{winnerSeat}</h2>
            <div className="mt-4 rounded-[24px] bg-white/[0.045] p-4">
              {winner ? <ParticipantToken participant={winner} /> : <p className="text-sm text-smoke">Победитель не подтверждён.</p>}
            </div>
            <p className="mt-4 text-sm leading-7 text-smoke">
              {userWon ? "Ваш слот забрал фонд. Начисление уже зафиксировано в истории." : winner ? `${winner.name} забрал фонд через ${winnerSeat.toLowerCase()}.` : "Итог зафиксирован в истории."}
            </p>
          </div>
        </section>
      </div>

      <section className="surface-solid relative mt-6 overflow-hidden rounded-[34px] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
        <div className="pointer-events-none absolute -right-28 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(95,168,131,0.14),transparent_64%)]" />
        <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Баланс за раунд</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-platinum">Финальная расшифровка</h2>
            <p className="mt-2 text-sm leading-6 text-smoke">Вход, буст и выигрыш собраны из результата раунда.</p>
          </div>
          <p className={round.balanceDelta >= 0 ? "text-3xl font-black text-jade" : "text-3xl font-black text-ember"}>
            {round.balanceDelta >= 0 ? "+" : ""}{formatBonus(round.balanceDelta)}
          </p>
        </div>
        <div className="relative grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {financeRows.map((row) => (
            <FinanceBreakdownItem key={row.label} label={row.label} value={row.value} tone={row.tone} />
          ))}
        </div>
      </section>

    </AppFrame>
  );
}

function PostGameRecommendations({
  similarRooms,
  similarError,
  similarLoading,
  riskierRoom,
  riskierError,
  riskierLoading
}: {
  similarRooms: Room[];
  similarError: unknown;
  similarLoading: boolean;
  riskierRoom: Room | null;
  riskierError: unknown;
  riskierLoading: boolean;
}) {
  const similarRoom = similarRooms[0];
  return (
    <div className="relative mt-5 rounded-[28px] bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Что дальше</p>
          <p className="mt-1 text-sm text-smoke">Быстрые варианты без лишней прокрутки.</p>
        </div>
        <ButtonLink href="/matchmaking" variant="ghost">Открыть подбор</ButtonLink>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {similarLoading ? (
          <RecommendationPlaceholder title="Похожая комната" text="Ищем ближайший вариант..." />
        ) : similarRoom ? (
          <RecommendationCard title="Похожая комната" room={similarRoom} />
        ) : (
          <RecommendationPlaceholder title="Похожая комната" text={friendlyRecommendationMessage("similar", similarError)} />
        )}
        {riskierLoading ? (
          <RecommendationPlaceholder title="Больше риска" text="Ищем комнату дороже текущей..." />
        ) : riskierRoom ? (
          <RecommendationCard title="Больше риска" room={riskierRoom} featured />
        ) : (
          <RecommendationPlaceholder title="Больше риска" text={friendlyRecommendationMessage("riskier", riskierError)} />
        )}
      </div>
    </div>
  );
}

function RecommendationCard({ title, room, featured }: { title: string; room: Room; featured?: boolean }) {
  return (
    <div className="rounded-[24px] bg-black/15 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">{title}</p>
          <h3 className="mt-1 text-xl font-black text-platinum">{room.title}</h3>
          <p className="mt-1 text-sm text-smoke">Вход {formatBonus(room.entryCost)} · места {room.occupied}/{room.seats}</p>
        </div>
        {featured ? <span className="rounded-full bg-gold px-3 py-1 text-[11px] font-black text-ink">риск</span> : null}
      </div>
      <ButtonLink href={`/room/${room.id}`} className="mt-4 w-full justify-center">Перейти</ButtonLink>
    </div>
  );
}

function RecommendationPlaceholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] bg-black/15 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-smoke">{text}</p>
      <ButtonLink href="/matchmaking" variant="secondary" className="mt-4 w-full justify-center">Подобрать вручную</ButtonLink>
    </div>
  );
}

function userFinanceRows(round: Round, userId: string) {
  const currentUserBalanceKey = `${userId}-`;
  const userChanges = round.balanceChanges.filter((change) => change.participantId === userId || change.participantId.startsWith(currentUserBalanceKey));
  const entry = userChanges.filter((change) => change.reason === "entry-reserve").reduce((sum, change) => sum + change.delta, 0);
  const boost = userChanges.filter((change) => change.reason === "boost").reduce((sum, change) => sum + change.delta, 0);
  const prize = userChanges.filter((change) => change.reason === "prize").reduce((sum, change) => sum + change.delta, 0);
  return [
    { label: "Вход", value: entry, tone: "ember" as const },
    { label: "Буст", value: boost, tone: boost < 0 ? "ember" as const : "muted" as const },
    { label: "Выигрыш", value: prize, tone: prize > 0 ? "jade" as const : "muted" as const },
    { label: "Итог", value: round.balanceDelta, tone: round.balanceDelta >= 0 ? "jade" as const : "ember" as const }
  ];
}

function FinanceBreakdownItem({ label, value, tone }: { label: string; value: number; tone: "jade" | "ember" | "muted" }) {
  return (
    <div className="rounded-[22px] bg-black/15 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-smoke">{label}</p>
      <p className={tone === "jade" ? "mt-1 text-xl font-black text-jade" : tone === "ember" ? "mt-1 text-xl font-black text-ember" : "mt-1 text-xl font-black text-platinum"}>
        {value > 0 ? "+" : ""}{formatBonus(value)}
      </p>
    </div>
  );
}

function friendlyRecommendationMessage(kind: "similar" | "riskier", error: unknown) {
  const fallback = kind === "similar" ? "Похожие комнаты сейчас не найдены." : "Сейчас нет более рискованных комнат.";
  if (!error) return fallback;
  if (error instanceof ApiClientError) {
    if (error.status === 401) return "Сессия устарела. Войдите заново, чтобы увидеть рекомендации.";
    if (error.status === 404) return kind === "similar" ? "Похожие комнаты не найдены." : "Более рискованная комната пока не найдена.";
    if (error.status === 400) return "Не удалось подобрать комнаты по этим параметрам.";
  }
  const message = getUserFriendlyError(error);
  const normalized = message.toLowerCase();
  if (normalized.includes("token") || normalized.includes("unauthorized")) return "Сессия устарела. Войдите заново, чтобы увидеть рекомендации.";
  if (normalized.includes("pricedelta") || normalized.includes("limit")) return "Подходящих вариантов по этим параметрам пока нет.";
  return fallback;
}

function withSavedMode(round: Round | undefined, roundId: string) {
  if (!round || typeof window === "undefined") return round;
  const savedMode = window.localStorage.getItem(`round-mode:${roundId}`) as GameMode | null;
  if (!savedMode) return round;
  return { ...round, mode: savedMode };
}

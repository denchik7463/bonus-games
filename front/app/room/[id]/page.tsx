"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { AlertTriangle, Bot, Clock, Copy, DoorOpen, Gem, Radio, Sparkles, Users } from "lucide-react";
import { AppFrame } from "@/components/layout/app-nav";
import { RoundBroadcast } from "@/components/game/round-broadcast";
import { MascotLoading } from "@/components/domain/mascot-loading";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { LiveStatus } from "@/components/domain/badges";
import { useAppStore } from "@/lib/store/app-store";
import { formatBonus } from "@/lib/utils";
import type { Participant, Room, RoomLifecyclePhase, Round, TestUser } from "@/lib/domain/types";
import { roomApiService } from "@/src/features/rooms/model/service";
import { getUserFriendlyError } from "@/src/shared/api/errors";
import { profileToTestUser } from "@/src/features/auth/lib/profile-to-user";
import { useAuthStore } from "@/src/features/auth/model/store";
import { useRoomSocket } from "@/src/features/rooms/model/ws";
import { roomDtoToDomain } from "@/src/features/rooms/model/mappers";
import type { RoomEventDto } from "@/src/features/rooms/model/types";
import { journalService } from "@/src/features/journal/model/service";
import { roomQueryKeys } from "@/src/features/rooms/model/query-keys";

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAppStore((state) => state.user);
  const updateUser = useAppStore((state) => state.updateUser);
  const authSession = useAuthStore((state) => state.session);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [localError, setLocalError] = useState("");
  const [phase, setPhase] = useState<RoomLifecyclePhase>("idle");
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [openingResultId, setOpeningResultId] = useState<string | null>(null);
  const [joinRejectedForBalance, setJoinRejectedForBalance] = useState(false);
  const finishedRoomHandledRef = useRef<string | null>(null);
  const { data: backendRoom, isLoading: roomLoading, error: roomError } = useQuery({
    queryKey: roomQueryKeys.detail(params.id),
    queryFn: () => roomApiService.getRoom(params.id, user),
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: (query) => {
      const data = query.state.data as Room | undefined;
      if (!data) return 1000;
      if (data.backendStatus === "WAITING" || data.backendStatus === "FULL") return 1000;
      if (data.backendStatus === "FINISHED" && !openingResultId) return 500;
      return false;
    },
    staleTime: 0,
    gcTime: 0
  });
  const roomSocketId = backendRoom?.id;
  const roomSocket = useRoomSocket(roomSocketId, authSession?.token);
  const socketRoom = roomSocket.roomState ? roomDtoToDomain(roomSocket.roomState, user) : undefined;
  const mergedRoom = backendRoom ? mergeSocketRoom(backendRoom, socketRoom, roomSocket.roomState ?? undefined) : undefined;
  const room = useMemo(() => suppressRejectedUserSeats(mergedRoom, user.id, joinRejectedForBalance), [joinRejectedForBalance, mergedRoom, user.id]);
  const roomEvents = useMemo(() => roomSocket.events, [roomSocket.events]);
  const backendJoined = room?.participants.some((participant) => isParticipantUser(participant, user.id) && typeof participant.seatNumber === "number") ?? false;
  const joined = backendJoined && !joinRejectedForBalance;
  const userSeats = useMemo(() => room?.participants.filter((participant) => isParticipantUser(participant, user.id)).map((participant) => participant.seatNumber).filter((seat): seat is number => typeof seat === "number") ?? [], [room, user.id]);
  const userSeatParticipants = useMemo(() => room?.participants.filter((participant) => isParticipantUser(participant, user.id) && typeof participant.seatNumber === "number") ?? [], [room, user.id]);
  const boosted = userSeatParticipants.length > 0 && userSeatParticipants.every((participant) => participant.hasBoost);
  const seatsToReserve = joined ? userSeats.length : selectedSeats.length;
  const entryReserveCost = room ? room.entryCost * seatsToReserve : 0;
  const confirmedReserveCost = joined && room ? room.entryCost * userSeats.length : 0;
  const insufficient = Boolean(room && !joined && seatsToReserve > 0 && user.balance < entryReserveCost);
  const full = Boolean(room && room.occupied >= room.seats && !joined);
  const backendStatus = room?.backendStatus;
  const finished = backendStatus === "FINISHED";
  const cancelled = backendStatus === "CANCELLED";
  const closed = cancelled;
  const roomCountdownActive = Boolean(room?.firstPlayerJoinedAt && (backendStatus === "WAITING" || backendStatus === "FULL"));
  const isChinchillaRace = room?.mode === "chinchilla-race";
  const isDuelClash = room?.mode === "duel-clash";
  const isMascotSpecial = Boolean(isChinchillaRace || isDuelClash);
  const displayedSeconds = typeof roomSocket.roomState?.remainingSeconds === "number"
    ? roomSocket.roomState.remainingSeconds
    : room?.reservedUntilSec ?? room?.timerSeconds ?? 60;
  const finishResultSignal = useMemo(() => {
    const socketState = roomSocket.roomState;
    const socketResultId = socketState ? getFinishedResultId([], socketState) : null;
    const eventResultId = getFinishedResultId(roomEvents, socketState);
    return [
      room?.id ?? "",
      backendStatus ?? "",
      room?.gameResultId ?? "",
      room?.roundId ?? "",
      room?.resultId ?? "",
      socketResultId ?? "",
      eventResultId ?? ""
    ].join("|");
  }, [backendStatus, room?.gameResultId, room?.id, room?.resultId, room?.roundId, roomEvents, roomSocket.roomState]);

  useEffect(() => {
    finishedRoomHandledRef.current = null;
    setSelectedSeats([]);
    setLocalError("");
    setJoinRejectedForBalance(false);
  }, [room?.id]);

  useEffect(() => {
    if (!room || joined || !selectedSeats.length) return;
    const occupiedSeats = new Set(room.participants.map((participant) => participant.seatNumber).filter((seat): seat is number => typeof seat === "number"));
    const availableSelection = selectedSeats.filter((seat) => seat >= 1 && seat <= room.seats && !occupiedSeats.has(seat));
    if (availableSelection.length !== selectedSeats.length) {
      setSelectedSeats(availableSelection);
      setLocalError("Часть выбранных мест уже заняли. Выберите свободные места и подтвердите участие.");
    }
  }, [joined, room, selectedSeats]);

  useEffect(() => {
    if (joined && localError.startsWith("Backend не подтвердил участие")) {
      setLocalError("");
    }
  }, [joined, localError]);

  useEffect(() => {
    if (finished) {
      setPhase("launching");
      return;
    }
    if (backendStatus === "CANCELLED") {
      setPhase("expired");
      return;
    }
    setPhase(roomCountdownActive ? "countdown" : "idle");
  }, [backendStatus, finished, room?.id, roomCountdownActive]);

  const join = useMutation({
    mutationFn: async () => {
      if (!room) throw new Error("Комната еще не загружена.");
      const freshUser = authSession ? profileToTestUser(await refreshProfile(authSession)) : user;
      if (authSession) updateUser(freshUser);
      const seats = selectedSeats.length ? [...selectedSeats].sort((a, b) => a - b) : [];
      const requiredBalance = room.entryCost * (seats.length || 1);
      if (freshUser.balance < requiredBalance) {
        throw new Error(`Недостаточно бонусных баллов. Нужно ${formatBonus(requiredBalance)} за выбранные места. Выберите меньше мест или измените параметры подбора.`);
      }
      return roomApiService.joinRoom(room.id, freshUser, seats.length ? { seats } : { seatsCount: 1 });
    },
    onSuccess: (nextRoom) => {
      setJoinRejectedForBalance(false);
      const confirmed = nextRoom.participants.some((participant) => isParticipantUser(participant, user.id));
      if (!confirmed) {
        setSelectedSeats([]);
        setPhase("idle");
        setLocalError("Backend не подтвердил участие. Место не занято, обновляем состояние комнаты.");
        queryClient.invalidateQueries({ queryKey: roomQueryKeys.detail(params.id) });
        queryClient.invalidateQueries({ queryKey: roomQueryKeys.detail(nextRoom.id) });
        refreshCurrentProfile(authSession, refreshProfile, updateUser);
        return;
      }
      queryClient.setQueryData(roomQueryKeys.detail(params.id), nextRoom);
      queryClient.setQueryData(roomQueryKeys.detail(nextRoom.id), nextRoom);
      queryClient.invalidateQueries({ queryKey: roomQueryKeys.detail(params.id) });
      refreshCurrentProfile(authSession, refreshProfile, updateUser);
      setLocalError("");
      setSelectedSeats([]);
      setPhase("reserved");
      window.setTimeout(() => setPhase("countdown"), 450);
    },
    onError: (error) => {
      const friendlyError = getUserFriendlyError(error);
      setSelectedSeats([]);
      setPhase("idle");
      setJoinRejectedForBalance(isBalanceError(friendlyError));
      setLocalError(friendlyError);
      if (room) {
        queryClient.invalidateQueries({ queryKey: roomQueryKeys.detail(params.id) });
        queryClient.invalidateQueries({ queryKey: roomQueryKeys.detail(room.id) });
      }
      refreshCurrentProfile(authSession, refreshProfile, updateUser);
    }
  });

  const boost = useMutation({
    mutationFn: (seatNumber: number) => {
      if (!room) throw new Error("Комната еще не загружена.");
      return roomApiService.activateBoost(room.id, user, seatNumber);
    },
    onSuccess: (nextRoom) => {
      queryClient.setQueryData(roomQueryKeys.detail(params.id), nextRoom);
      queryClient.setQueryData(roomQueryKeys.detail(nextRoom.id), nextRoom);
      queryClient.invalidateQueries({ queryKey: roomQueryKeys.detail(params.id) });
      refreshCurrentProfile(authSession, refreshProfile, updateUser);
      setLocalError("");
    },
    onError: (error) => setLocalError(getUserFriendlyError(error))
  });

  const maxSelectableSeats = room ? Math.max(1, Math.min(5, Math.floor(room.seats / 2))) : 1;
  const balanceErrorVisible = !joined && (insufficient || isBalanceError(localError));
  const visibleStatus = joined ? room?.status ?? "open" : full ? "ready" : "open";
  const inlineRound = useMemo(() => room && finished ? roomToLiveRound(room, user) : null, [finished, room, user]);

  useEffect(() => {
    if (!room || !finished || openingResultId) return;
    let cancelled = false;
    const finishedRoom = room;
    const finishedRoomId = finishedRoom.id;
    const finishedRoomMode = finishedRoom.mode;
    if (finishedRoomHandledRef.current === finishResultSignal) return;
    finishedRoomHandledRef.current = finishResultSignal;

    async function openFinishedRound() {
      const resultIdFromSocket = getFinishedResultId(roomEvents, roomSocket.roomState)
        ?? finishedRoom.gameResultId
        ?? finishedRoom.roundId
        ?? finishedRoom.resultId;
      if (resultIdFromSocket) {
        rememberRoundMode(resultIdFromSocket, finishedRoomMode);
        setOpeningResultId(resultIdFromSocket);
        router.replace(`/round/${resultIdFromSocket}`);
        return;
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (cancelled) return;
        const freshEvents = await roomApiService.getRoomEvents(finishedRoomId).catch(() => []);
        const resultId = getFinishedResultId(freshEvents);
        if (resultId) {
          rememberRoundMode(resultId, finishedRoomMode);
          setOpeningResultId(resultId);
          router.replace(`/round/${resultId}`);
          return;
        }
        const journalResultId = attempt > 0 ? await findFinishedRoundIdInJournal(finishedRoomId, user) : null;
        if (cancelled) return;
        if (journalResultId) {
          rememberRoundMode(journalResultId, finishedRoomMode);
          setOpeningResultId(journalResultId);
          router.replace(`/round/${journalResultId}`);
          return;
        }
        await delay(260 + attempt * 120);
      }
      if (!cancelled) setLocalError("Раунд завершен. Шиншилла еще ищет запись результата, попробуйте открыть историю через несколько секунд.");
    }

    openFinishedRound();
    return () => {
      cancelled = true;
    };
  }, [finishResultSignal, finished, openingResultId, room, router, roomEvents, roomSocket.roomState, user]);

  if (!room) {
    return (
      <AppFrame>
        <Panel>
          {roomLoading ? "Загружаем состояние комнаты..." : roomError ? getUserFriendlyError(roomError) : "Комната не найдена."}
        </Panel>
      </AppFrame>
    );
  }

  if (finished && inlineRound && !openingResultId) {
    return (
      <AppFrame>
        <RoundBroadcast round={inlineRound} autoRedirect={false} />
      </AppFrame>
    );
  }

  if (finished && !openingResultId) {
    return (
      <AppFrame>
        <MascotLoading title="Запускаем розыгрыш..." description="Победитель уже определен, открываем трансляцию раунда." />
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <section className={`surface-solid relative mb-8 overflow-hidden rounded-[36px] ${isMascotSpecial ? "border border-gold/20 shadow-[0_28px_90px_rgba(255,205,24,0.12)]" : ""}`}>
        <div className="absolute inset-0 opacity-80">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.16),transparent_62%)]" />
          <div className="absolute right-[-9rem] top-6 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.14),transparent_64%)]" />
          <div className="absolute bottom-[-10rem] left-[42%] h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.08),transparent_64%)]" />
          {isMascotSpecial ? <div className={`absolute left-[18%] top-24 h-72 w-72 rounded-full ${isDuelClash ? "bg-[radial-gradient(circle,rgba(228,80,61,0.13),transparent_62%)]" : "bg-[radial-gradient(circle,rgba(255,205,24,0.12),transparent_62%)]"}`} /> : null}
        </div>
        <div className="relative p-6 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <LiveStatus status={phase === "launching" ? "running" : roomCountdownActive ? "matching" : visibleStatus} />
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-smoke surface-inset">
                  <Radio className="h-3.5 w-3.5 text-gold" />
                  {phaseLabel(phase, joined, roomCountdownActive)}
                </span>
                {isMascotSpecial ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-gold/12 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-gold">
                    <Sparkles className="h-3.5 w-3.5" />
                    Special room
                  </span>
                ) : null}
              </div>
              <h1 className="mt-5 text-balance text-4xl font-black leading-[0.98] tracking-[-0.05em] text-platinum md:text-6xl">
                {room.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-smoke md:text-lg">
                {isDuelClash && !joined
                  ? "Выберите бойцовские места. После подтверждения шиншиллы выйдут на арену дуэли."
                  : isChinchillaRace && !joined
                    ? "Выберите дорожки шиншилл прямо в местах комнаты. Участие начнется только после подтверждения."
                    : phaseDescription(phase, joined, roomCountdownActive)}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="room-id-pill inline-flex items-center gap-2 rounded-full bg-[linear-gradient(180deg,rgba(255,205,24,0.14),rgba(255,205,24,0.06)),rgba(8,10,14,0.55)] px-3 py-1.5 text-xs font-semibold text-gold shadow-[0_18px_60px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.07)]">
                  ID <span className="font-mono text-[12px] font-bold">{room.publicId}</span>
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(`${window.location.origin}/room/${room.publicId}`);
                    setInviteCopied(true);
                    window.setTimeout(() => setInviteCopied(false), 1400);
                  }}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-smoke transition surface-inset hover:bg-[rgba(255,205,24,0.08)] hover:text-platinum"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {inviteCopied ? "Ссылка скопирована" : "Скопировать приглашение"}
                </button>
              </div>
            </div>

            <div className="surface-solid flex items-center justify-between gap-4 rounded-[26px] px-5 py-4 md:min-w-[240px] md:flex-col md:items-stretch md:justify-center md:gap-2 md:text-center">
              <div className="flex items-center gap-3 md:mx-auto md:flex-col md:gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/10 text-gold shadow-[0_0_26px_rgba(255,205,24,0.12)]">
                  <Clock className="h-5 w-5" />
                </span>
                <div className="leading-tight">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke">{roomCountdownActive ? "До старта" : "Ожидание"}</p>
                  <p className="mt-1 text-4xl font-black tracking-[-0.04em] text-platinum">{displayedSeconds}</p>
                </div>
              </div>
              <p className="text-xs text-smoke md:mt-2">сек</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_.55fr]">
        <div className="space-y-6">
          <section className="surface-solid overflow-hidden rounded-[30px] p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke">Состав и ставка</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-platinum">Ваше участие в раунде</h2>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:min-w-[560px] xl:grid-cols-5">
                <KeyMetric icon={<DoorOpen className="h-4 w-4" />} label="Вход" value={formatBonus(room.entryCost)} tone="gold" />
                <KeyMetric icon={<Gem className="h-4 w-4" />} label={joined ? "Вклад" : "К оплате"} value={formatBonus((joined ? confirmedReserveCost : entryReserveCost) + boostCostForUser(room, user.id))} tone={boosted ? "violet" : "platinum"} />
                <KeyMetric icon={<Gem className="h-4 w-4" />} label="Фонд" value={formatBonus(room.prizePool)} tone="jade" />
                <KeyMetric icon={<Sparkles className="h-4 w-4" />} label="Победителю" value={`${room.prizePoolPercent}% фонда`} tone="gold" />
                <KeyMetric icon={<Users className="h-4 w-4" />} label="Места" value={`${room.occupied}/${room.seats}`} tone="cyan" />
              </div>
            </div>
            {isMascotSpecial ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="mb-5 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,rgba(255,205,24,0.12),rgba(123,60,255,0.10)_54%,rgba(255,255,255,0.03)),rgba(9,11,15,0.84)] p-4 shadow-[0_24px_72px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <div className="relative flex items-center gap-4">
                  <motion.div
                    animate={{ y: [0, -5, 0], x: [0, 3, 0], rotate: [0, -3, 0] }}
                    transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[22px] bg-[rgba(255,255,255,0.045)] shadow-[0_18px_42px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.06)]"
                  >
                    <div className="absolute inset-0 rounded-[22px] bg-[radial-gradient(circle,rgba(255,205,24,0.20),transparent_68%)]" />
                    <Image src="/mascots/shina.png" alt="" fill className="object-contain drop-shadow-[0_14px_34px_rgba(0,0,0,0.34)]" />
                  </motion.div>
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-gold/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-gold">
                      <Sparkles className="h-3.5 w-3.5" />
                      Special room
                    </div>
                    <p className="mt-2 text-lg font-black tracking-[-0.03em] text-platinum">
                      {isDuelClash ? "Это моя боевая комната." : "Это моя любимая комната."}
                    </p>
                    <p className="mt-1 max-w-2xl text-sm leading-7 text-smoke">
                      {isDuelClash
                        ? "Тут шиншиллы выходят на арену: свечение, мечи, бусты и финальный удар собираются в нереально крутую дуэль!"
                        : "Здесь прямо сочный заезд: шиншиллы, свет, буст и финал!"}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : null}
            <div className="mb-5 rounded-[26px] bg-[linear-gradient(180deg,rgba(255,205,24,0.10),rgba(255,255,255,0.035)),rgba(12,14,18,0.84)] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.07)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Места комнаты</p>
                  <p className="mt-1 text-sm leading-6 text-smoke">
                    {joined ? "Ваши места выделены в сетке. Буст можно купить ниже на конкретное место." : `Выберите свободные места прямо в сетке, затем подтвердите участие.`}
                  </p>
                </div>
                <span className="rounded-full bg-black/20 px-3 py-1.5 text-xs font-bold text-platinum">
                  {joined ? `${userSeats.length} ${seatWord(userSeats.length)}` : selectedSeats.length ? `${selectedSeats.length} ${seatWord(selectedSeats.length)}` : `можно выбрать до ${maxSelectableSeats}`}
                </span>
              </div>
              <SeatSlots
                room={room}
                currentUser={user}
                selectedSeats={selectedSeats}
                maxSelected={maxSelectableSeats}
                disabled={joined}
                selectionBlocked={insufficient}
                onChange={setSelectedSeats}
              />
              {!joined && selectedSeats.length ? (
                <p className="mt-4 rounded-[20px] bg-gold/10 px-4 py-3 text-sm font-semibold text-gold">
                  Выбрано: {selectedSeats.map((seat) => `${seat} место`).join(", ")} · к резерву {formatBonus(entryReserveCost)}
                </p>
              ) : null}
            </div>
            {joined ? (
              <div className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,rgba(255,205,24,0.18),rgba(123,60,255,0.14)_52%,rgba(255,255,255,0.04)),rgba(12,14,18,0.90)] p-4 shadow-[0_22px_80px_rgba(0,0,0,0.26),0_0_0_1px_rgba(255,205,24,0.08),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="pointer-events-none absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_85%_20%,rgba(255,205,24,0.16),transparent_28%),radial-gradient(circle_at_10%_100%,rgba(123,60,255,0.12),transparent_34%)]" />
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Буст по местам</p>
                    <p className="mt-1 text-sm leading-6 text-smoke">
                      {room.boostEnabled
                        ? `После покупки места можно один раз усилить именно его. ${formatBonus(room.boostCost)} за место · ${boostChanceLabel(room)} к шансу победы.`
                        : "В этой комнате бусты отключены."}
                    </p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,rgba(255,205,24,0.96),rgba(255,168,0,0.88))] text-ink shadow-[0_0_30px_rgba(255,205,24,0.22)]">
                    <Sparkles className="h-5 w-5" />
                  </span>
                </div>
                <SeatBoostList
                  room={room}
                  userId={user.id}
                  joined={joined}
                  boostPending={boost.isPending}
                  onBoost={(seat) => boost.mutate(seat)}
                />
              </div>
            ) : null}
          </section>
        </div>
        <aside className="space-y-6">
          <section className="surface-solid overflow-hidden rounded-[30px] p-6">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke">Действия</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-platinum">Что сделать сейчас</h2>
            </div>
            {balanceErrorVisible ? (
              <div className="mt-4 rounded-[22px] border border-ember/30 bg-ember/10 p-4 text-sm text-platinum">
                <AlertTriangle className="mb-2 h-5 w-5 text-ember" />
                <p>
                  {localError && isBalanceError(localError)
                    ? localError
                    : `Недостаточно бонусных баллов. Нужно ${formatBonus(entryReserveCost)} за выбранные места. Выберите меньше мест или измените параметры подбора.`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => {
                    setSelectedSeats([]);
                    setLocalError("");
                    setPhase("idle");
                  }}>
                    Изменить места
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => {
                    setSelectedSeats([]);
                    setLocalError("");
                    setJoinRejectedForBalance(false);
                    queryClient.removeQueries({ queryKey: roomQueryKeys.all });
                    router.replace("/matchmaking");
                  }}>
                    Изменить параметры
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => {
                    setSelectedSeats([]);
                    setLocalError("");
                    setJoinRejectedForBalance(false);
                    queryClient.removeQueries({ queryKey: roomQueryKeys.all });
                    router.replace("/rooms");
                  }}>
                    Выбрать другую комнату
                  </Button>
                </div>
              </div>
            ) : null}
            {full || (closed && joined) ? (
              <div className="mt-4 rounded-[22px] border border-ember/30 bg-ember/10 p-4 text-sm text-platinum">
                <AlertTriangle className="mb-2 h-5 w-5 text-ember" />
                {closed ? "Комната закрыта для входа." : "Комната уже заполнена. Выберите похожую комнату."}
              </div>
            ) : null}
            <div className="mt-5 space-y-3">
              <Button onClick={() => join.mutate()} disabled={joined || insufficient || full || join.isPending || selectedSeats.length === 0} className="w-full">
                {joined ? "Участие подтверждено" : "Подтвердить участие"}
              </Button>
              {joined ? (
                <p className="rounded-[22px] bg-white/[0.045] p-4 text-sm leading-6 text-smoke">
                  Ваше участие подтверждено. Ожидаем старт раунда и заполнение комнаты.
                </p>
              ) : null}
            </div>
            {localError && !balanceErrorVisible ? <p className="mt-4 rounded-[22px] border border-ember/25 bg-ember/10 p-4 text-sm text-ember">{localError}</p> : null}
          </section>
          <BoostInfoCard room={room} />
        </aside>
      </div>
    </AppFrame>
  );
}

function SeatSlots({
  room,
  currentUser,
  selectedSeats,
  maxSelected,
  disabled,
  selectionBlocked,
  onChange
}: {
  room: Room;
  currentUser: TestUser;
  selectedSeats: number[];
  maxSelected: number;
  disabled: boolean;
  selectionBlocked: boolean;
  onChange: (seats: number[]) => void;
}) {
  const isChinchillaRace = room.mode === "chinchilla-race";
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: room.seats }, (_, index) => index + 1).map((seat) => {
        const owner = room.participants.find((participant) => participant.seatNumber === seat);
        const occupied = Boolean(owner);
        const mine = owner ? isParticipantUser(owner, currentUser.id) : false;
        const bot = owner?.kind === "bot";
        const selected = selectedSeats.includes(seat);
        const boosted = Boolean(owner?.hasBoost);
        return (
          <button
            key={seat}
            type="button"
            disabled={disabled || (occupied && !mine)}
            onClick={() => {
              if (occupied && !mine) return;
              if (selected) onChange(selectedSeats.filter((item) => item !== seat));
              else if (selectedSeats.length < maxSelected) onChange([...selectedSeats, seat].sort((a, b) => a - b));
            }}
            className={[
              "group relative flex min-h-[132px] items-center gap-4 overflow-hidden rounded-[22px] border p-4 text-left transition",
              mine
                ? "border-jade/45 bg-[linear-gradient(135deg,rgba(95,168,131,0.22),rgba(255,255,255,0.065)),rgba(9,15,12,0.92)] text-jade shadow-[0_22px_60px_rgba(95,168,131,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]"
                : selected
                  ? selectionBlocked
                    ? "border-ember/45 border-dashed bg-[linear-gradient(135deg,rgba(255,92,92,0.14),rgba(255,255,255,0.035)),rgba(10,12,16,0.88)] text-ember"
                    : "border-gold/55 border-dashed bg-[linear-gradient(135deg,rgba(255,205,24,0.16),rgba(255,255,255,0.045)),rgba(10,12,16,0.88)] text-gold shadow-[0_18px_50px_rgba(255,205,24,0.10)]"
                  : bot
                    ? "border-[rgba(180,160,255,0.28)] bg-[linear-gradient(135deg,rgba(123,60,255,0.16),rgba(255,255,255,0.05)),rgba(10,11,18,0.90)] text-[#c9b7ff] shadow-[0_18px_48px_rgba(123,60,255,0.10),inset_0_1px_0_rgba(255,255,255,0.07)]"
                    : occupied
                      ? "border-[rgba(237,232,220,0.24)] bg-[linear-gradient(135deg,rgba(237,232,220,0.12),rgba(255,255,255,0.04)),rgba(12,13,16,0.92)] text-platinum shadow-[0_18px_48px_rgba(237,232,220,0.07),inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018)),rgba(6,8,12,0.78)] text-platinum hover:border-gold/35 hover:bg-[linear-gradient(135deg,rgba(255,205,24,0.12),rgba(255,255,255,0.035)),rgba(6,8,12,0.78)]"
            ].join(" ")}
          >
            <span className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-r-full bg-current opacity-35" />
            <span className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-current opacity-[0.06] blur-xl transition group-hover:opacity-[0.10]" />
            {boosted ? (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-ink shadow-glow">
                <Sparkles className="h-3 w-3" />
                буст
              </span>
            ) : null}
            {occupied && !boosted ? (
              <span className={[
                "absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
                mine ? "bg-jade text-ink" : bot ? "bg-[rgba(201,183,255,0.16)] text-[#c9b7ff]" : "bg-white/[0.10] text-platinum"
              ].join(" ")}>
                {mine ? "моё" : bot ? "бот" : "игрок"}
              </span>
            ) : null}
            <span className={[
              "relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] text-lg font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
              selected ? selectionBlocked ? "ring-1 ring-ember/30 bg-ember/10" : "ring-1 ring-gold/35 bg-gold/12" : mine ? "ring-1 ring-jade/30 bg-jade/12" : bot ? "ring-1 ring-violet-200/20 bg-violet-200/10 text-violet-200" : occupied ? "ring-1 ring-white/10 bg-white/[0.06] text-platinum" : "ring-1 ring-gold/20 bg-gold/10 text-gold"
            ].join(" ")}>
              {isChinchillaRace ? (
                <>
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.25),transparent_42%),radial-gradient(circle_at_50%_70%,rgba(255,205,24,0.10),transparent_62%)]" />
                  <span className="pointer-events-none absolute inset-0 rounded-[20px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
                  <Image
                    src={seatMascotSource(seat - 1)}
                    alt=""
                    fill
                    className={[
                      "object-contain transition duration-300",
                      selected || mine || occupied ? "scale-105" : "scale-100 group-hover:scale-110"
                    ].join(" ")}
                    priority={seat <= 3}
                  />
                  {boosted ? <span className="pointer-events-none absolute inset-0 rounded-[20px] shadow-[0_0_0_1px_rgba(255,205,24,0.28),0_0_24px_rgba(255,205,24,0.24)]" /> : null}
                </>
              ) : bot ? <Bot className="h-5 w-5" /> : seat}
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">{seat} место</span>
              <span className="mt-1 block truncate text-sm font-black">
                {mine ? "ваше место" : owner ? owner.name : selected ? "выбрано, не занято" : "свободное место"}
              </span>
              <span className="mt-1 block text-xs font-semibold opacity-75">
                {boosted ? "усилено бустом" : mine ? "участие подтверждено" : bot ? "бот подключился к раунду" : owner ? "занято игроком" : selected ? selectionBlocked ? "не хватает баллов для резерва" : "ожидает подтверждения" : "если не займет игрок, место закроет бот"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SeatBoostList({
  room,
  userId,
  joined,
  boostPending,
  onBoost
}: {
  room: Room;
  userId: string;
  joined: boolean;
  boostPending: boolean;
  onBoost: (seatNumber: number) => void;
}) {
  const seats = room.participants
    .filter((participant) => isParticipantUser(participant, userId) && typeof participant.seatNumber === "number")
    .sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0));

  if (!joined) {
    return (
      <div className="rounded-[22px] bg-black/15 p-4 text-sm leading-6 text-smoke">
        Сначала купите места. После резерва на каждом вашем месте появится отдельная покупка буста.
      </div>
    );
  }

  if (!room.boostEnabled) {
    return <div className="rounded-[22px] bg-black/15 p-4 text-sm leading-6 text-smoke">Бусты отключены для этой комнаты.</div>;
  }

  if (!seats.length) {
    return <div className="rounded-[22px] bg-black/15 p-4 text-sm leading-6 text-smoke">Обновляем ваши места в комнате.</div>;
  }

  return (
    <div className="space-y-2">
      {seats.map((seat) => (
        <div key={seat.seatNumber} className="flex items-center justify-between gap-3 rounded-[22px] bg-black/15 p-3">
          <div>
            <p className="text-sm font-black text-platinum">{seat.seatNumber} место</p>
            <p className="mt-1 text-xs text-smoke">{seat.hasBoost ? "Буст уже куплен" : `Можно усилить за ${formatBonus(room.boostCost)}`}</p>
          </div>
          <Button
            type="button"
            variant={seat.hasBoost ? "secondary" : "primary"}
            disabled={seat.hasBoost || boostPending}
            onClick={() => seat.seatNumber && onBoost(seat.seatNumber)}
            className="min-w-[122px]"
          >
            {seat.hasBoost ? "Активен" : "Купить"}
          </Button>
        </div>
      ))}
    </div>
  );
}

function seatWord(count: number) {
  if (count === 1) return "место";
  if (count > 1 && count < 5) return "места";
  return "мест";
}

function seatMascotSource(seatIndex: number) {
  const sources = [
    "/mascots/ch1.png",
    "/mascots/ch2.png",
    "/mascots/ch3.png",
    "/mascots/ch4.png",
    "/mascots/ch5.png",
    "/mascots/ch6.png",
    "/mascots/ch7.png",
    "/mascots/ch8.png",
    "/mascots/ch9.png",
    encodeURI("/mascots/сh10.png")
  ];
  return sources[Math.max(0, seatIndex) % sources.length];
}

function getFinishedResultId(events: RoomEventDto[], roomState?: unknown) {
  const stateResultId = resultIdFromPayload(roomState);
  if (stateResultId) return stateResultId;

  const finishedEvent = [...events]
    .reverse()
    .find((event) => (event.eventType ?? event.type) === "ROOM_FINISHED" || event.gameResultId || event.roundId || event.resultId);
  if (!finishedEvent) return null;

  return finishedEvent.gameResultId
    ?? finishedEvent.roundId
    ?? finishedEvent.resultId
    ?? resultIdFromPayload(finishedEvent.payload)
    ?? resultIdFromPayloadJson(finishedEvent.payloadJson);
}

function resultIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const value = record.gameResultId ?? record.roundId ?? record.resultId ?? record.id;
  if (typeof value === "string" && value.length > 0) return value;

  for (const nestedValue of Object.values(record)) {
    if (nestedValue && typeof nestedValue === "object") {
      const nestedResultId = resultIdFromPayload(nestedValue);
      if (nestedResultId) return nestedResultId;
    }
  }

  return null;
}

function resultIdFromPayloadJson(payloadJson?: string) {
  if (!payloadJson) return null;
  try {
    return resultIdFromPayload(JSON.parse(payloadJson));
  } catch {
    return null;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function refreshCurrentProfile(
  authSession: ReturnType<typeof useAuthStore.getState>["session"],
  refreshProfile: ReturnType<typeof useAuthStore.getState>["refreshProfile"],
  updateUser: (user: TestUser) => void
) {
  if (!authSession) return;
  refreshProfile(authSession)
    .then((profile) => updateUser(profileToTestUser(profile)))
    .catch(() => undefined);
}

async function findFinishedRoundIdInJournal(roomId: string, user: TestUser) {
  const [myResult, journalResult] = await Promise.allSettled([
    journalService.getMyJournal(user),
    journalService.getJournal({ roomId })
  ]);
  if (myResult.status === "fulfilled") {
    const myRound = myResult.value.find((round) => round.roomId === roomId);
    if (myRound?.id) return myRound.id;
  }
  if (journalResult.status === "fulfilled") return journalResult.value[0]?.id ?? null;
  return null;
}

function boostCostForUser(room: Room, userId: string) {
  const boostedSeats = room.participants.filter((participant) => isParticipantUser(participant, userId) && participant.hasBoost).length;
  return boostedSeats * room.boostCost;
}

function boostChanceLabel(room: Room) {
  if (typeof room.boostAbsoluteGainPercent === "number" && Number.isFinite(room.boostAbsoluteGainPercent)) {
    const rounded = Math.round(room.boostAbsoluteGainPercent * 100) / 100;
    return `+${Number.isInteger(rounded) ? rounded : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
  }
  const match = room.boostImpact.match(/\+[\d.]+%/);
  return match?.[0] ?? "доступно";
}

function isParticipantUser(participant: Participant, userId: string) {
  return participant.userId === userId || participant.id === userId;
}

function isBalanceError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("недостаточно") || normalized.includes("insufficient") || normalized.includes("balance");
}

function BoostInfoCard({ room }: { room: Room }) {
  return (
    <section className="surface-solid relative overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,rgba(255,205,24,0.10),rgba(255,255,255,0.035)_48%,rgba(8,10,14,0.90))] p-6 shadow-[0_24px_76px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.07)]">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.14),transparent_64%)] blur-2xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
      <div className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-gold/50 via-white/10 to-transparent" />
      <div className="relative">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-gold/12 text-gold shadow-[0_0_30px_rgba(255,205,24,0.16)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Буст участия</p>
            <h3 className="text-xl font-black tracking-[-0.035em] text-platinum">Усиление для конкретного места</h3>
          </div>
        </div>
          <div className="rounded-[24px] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_40px_rgba(0,0,0,0.12)]">
            <p className="text-sm leading-7 text-platinum">
          {room.boostEnabled
            ? `${formatBonus(room.boostCost)} за одно место. Буст даёт ${boostChanceLabel(room)} к вероятности победы, работает только до старта и не гарантирует победу.`
            : "В этой комнате бусты отключены настройками шаблона."}
          </p>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <BoostInfoStat label="Стоимость" value={room.boostEnabled ? formatBonus(room.boostCost) : "недоступно"} tone="gold" />
          <BoostInfoStat label="Когда" value="только до старта" tone="violet" />
          <BoostInfoStat label="Лимит" value="1 раз на место" tone="cyan" />
          <BoostInfoStat label="Эффект" value={room.boostEnabled ? boostChanceLabel(room) : "недоступно"} tone="jade" />
        </div>
        <div className="mt-4 rounded-[22px] bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-smoke">Как это ощущается</p>
          <p className="mt-2 text-sm leading-6 text-platinum">
            Сначала вы занимаете место, а потом при желании усиливаете именно его. Буст делает это место заметнее в розыгрыше, но не обещает победу.
          </p>
        </div>
      </div>
    </section>
  );
}

function BoostInfoStat({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "gold" | "jade" | "cyan" | "ember" | "violet";
}) {
  return (
    <div className="rounded-[20px] bg-white/[0.045] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-smoke">{label}</p>
      <p
        className={
          "mt-1 text-sm font-black tracking-[-0.02em] " +
          (tone === "gold" ? "text-gold" : "text-platinum")
        }
      >
        {value}
      </p>
    </div>
  );
}

function roomToLiveRound(room: Room, user: TestUser): Round | null {
  const winner = winnerFromRoom(room);
  const resultId = room.gameResultId ?? room.roundId ?? room.resultId ?? room.id;
  if (!winner || !resultId) return null;
  return {
    id: resultId,
    roomId: room.id,
    roomPublicId: room.publicId,
    roomTitle: room.title,
    mode: room.mode,
    startedAt: room.startedAt ?? room.finishedAt ?? new Date().toISOString(),
    entryCost: room.entryCost,
    boostUsed: room.participants.some((participant) => isParticipantUser(participant, user.id) && participant.hasBoost),
    boostCost: room.boostCost,
    boostImpact: room.boostImpact,
    prizePoolPercent: room.prizePoolPercent,
    roomVolatility: room.volatility,
    prizePool: room.prizePool,
    participants: room.participants,
    winnerId: winner.id,
    userId: user.id,
    balanceDelta: 0,
    balanceChanges: [],
    combination: {
      id: `winner-seat-${winner.seatNumber ?? winner.id}`,
      label: winner.seatNumber ? `Победило место ${winner.seatNumber}` : `Победил ${winner.name}`,
      rarity: "signature",
      tokens: [winner.seatNumber ? `S${winner.seatNumber}` : "WIN"],
      palette: ["#ffcd18", "#39d98a", "#7b3cff"]
    },
    auditTrail: ["Победитель получен из финального состояния комнаты."]
  };
}

function winnerFromRoom(room: Room) {
  return room.participants.find((participant) => participant.winner)
    ?? room.participants.find((participant) => typeof room.winnerPositionIndex === "number" && participant.seatNumber === room.winnerPositionIndex)
    ?? null;
}

function rememberRoundMode(roundId: string, mode: Room["mode"]) {
  try {
    window.localStorage.setItem(`round-mode:${roundId}`, mode);
  } catch {
    // localStorage is only a best-effort bridge for journal payloads without gameMechanic.
  }
}

function mergeSocketRoom(
  backendRoom: Room | undefined,
  socketRoom: Room | undefined,
  socketDto?: { currentPlayers?: number; players?: unknown[]; participants?: unknown[] }
) {
  if (!backendRoom) return socketRoom;
  if (!socketRoom) return backendRoom;
  if (socketRoom.id && backendRoom.id && socketRoom.id !== backendRoom.id) return backendRoom;

  const socketHasParticipantsPayload = Boolean(socketDto && (Array.isArray(socketDto.players) || Array.isArray(socketDto.participants)));
  const socketHasCurrentPlayers = typeof socketDto?.currentPlayers === "number";
  const socketHasBackendStatus = Boolean(socketRoom.backendStatus);
  const socketHasTimerState = hasSocketField(socketDto, "remainingSeconds") || hasSocketField(socketDto, "firstPlayerJoinedAt");
  const socketWinnerPosition = socketRoom.winnerPositionIndex;
  const nextStatus = socketHasBackendStatus ? socketRoom.status : backendRoom.status;
  const nextBackendStatus = socketHasBackendStatus ? socketRoom.backendStatus : backendRoom.backendStatus;
  const participants = socketHasParticipantsPayload ? socketRoom.participants : backendRoom.participants;
  return {
    ...backendRoom,
    id: socketRoom.id || backendRoom.id,
    publicId: socketRoom.publicId && socketRoom.publicId !== "ROOM" ? socketRoom.publicId : backendRoom.publicId,
    status: nextStatus,
    backendStatus: nextBackendStatus,
    occupied: socketHasCurrentPlayers ? socketRoom.occupied : backendRoom.occupied,
    participants,
    reservedUntilSec: socketHasTimerState ? socketRoom.reservedUntilSec : backendRoom.reservedUntilSec,
    timerSeconds: hasSocketField(socketDto, "timerSeconds") ? socketRoom.timerSeconds : backendRoom.timerSeconds,
    firstPlayerJoinedAt: hasSocketField(socketDto, "firstPlayerJoinedAt") ? socketRoom.firstPlayerJoinedAt : backendRoom.firstPlayerJoinedAt,
    startedAt: hasSocketField(socketDto, "startedAt") ? socketRoom.startedAt : backendRoom.startedAt,
    finishedAt: hasSocketField(socketDto, "finishedAt") ? socketRoom.finishedAt : backendRoom.finishedAt,
    gameResultId: hasSocketField(socketDto, "gameResultId") ? socketRoom.gameResultId : backendRoom.gameResultId,
    roundId: hasSocketField(socketDto, "roundId") ? socketRoom.roundId : backendRoom.roundId,
    resultId: hasSocketField(socketDto, "resultId") ? socketRoom.resultId : backendRoom.resultId,
    winnerPositionIndex: hasSocketField(socketDto, "winnerPositionIndex") || hasSocketField(socketDto, "winnerSeatNumber") || hasSocketField(socketDto, "winnerSeat")
      ? socketWinnerPosition
      : backendRoom.winnerPositionIndex
  };
}

function suppressRejectedUserSeats(room: Room | undefined, userId: string, rejectedForBalance: boolean) {
  if (!room || !rejectedForBalance) return room;
  const participants = room.participants.filter((participant) => !isParticipantUser(participant, userId));
  const occupied = Math.min(room.seats, participants.filter((participant) => typeof participant.seatNumber === "number").length);
  return {
    ...room,
    participants,
    occupied,
    fillRate: room.seats > 0 ? Math.round((occupied / room.seats) * 100) : 0
  };
}

function hasSocketField<T extends string>(socketDto: unknown, field: T) {
  return Boolean(socketDto && typeof socketDto === "object" && field in socketDto);
}

function phaseDescription(phase: RoomLifecyclePhase, joined: boolean, roomCountdownActive: boolean) {
  if (!joined && roomCountdownActive) return "Первый участник уже вошел. Места, боты, старт и победитель обновляются автоматически.";
  if (!joined) return "Выберите свободные места и подтвердите участие. Таймер комнаты начнется после входа первого участника.";
  return {
    idle: "Подтвердите участие. После резерва начнется короткий таймер ожидания.",
    reserved: "Бонусные баллы зарезервированы. До старта можно один раз усилить участие бустом.",
    countdown: "Идет обратный отсчет. Если места останутся свободными, их займут боты и раунд сразу стартует.",
    "bot-fill": "Закрываем свободные места и формируем финальный состав комнаты.",
    launching: "Переходим к трансляции и доводим раунд до красивого финала.",
    expired: "Окно ожидания завершено. Можно подобрать другую комнату.",
    error: "Синхронизация комнаты прервалась. Повторите действие или выберите другую комнату."
  }[phase];
}

function KeyMetric({
  label,
  value,
  icon,
  tone = "platinum"
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "gold" | "jade" | "cyan" | "violet" | "platinum";
}) {
  return (
    <div className="room-key-metric group relative overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.012)),rgba(8,10,14,0.78)] px-4 py-3 shadow-[0_24px_70px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:translate-y-[-1px] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016)),rgba(8,10,14,0.78)]">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-200 group-hover:opacity-100">
        <div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.10),transparent_62%)]" />
      </div>
      <div className="relative flex items-center gap-2">
        <span
          className={
            "inline-flex h-9 w-9 items-center justify-center rounded-[18px] bg-white/[0.04] " +
            (tone === "gold"
              ? "text-gold"
              : tone === "jade"
                ? "text-jade"
                : tone === "cyan"
                  ? "text-cyan"
                  : tone === "violet"
                    ? "text-violet-200"
                    : "text-platinum")
          }
        >
          {icon}
        </span>
        <div className="leading-tight">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-smoke">{label}</p>
          <p className="mt-1 text-lg font-black tracking-[-0.03em] text-platinum">{value}</p>
        </div>
      </div>
    </div>
  );
}

function phaseLabel(phase: RoomLifecyclePhase, joined: boolean, roomCountdownActive: boolean) {
  if (!joined && roomCountdownActive) return "идет набор";
  if (!joined) return "ожидание подтверждения";
  return {
    idle: "ожидание подтверждения",
    reserved: "резерв активен",
    countdown: "обратный отсчет",
    "bot-fill": "закрываем места",
    launching: "выходим в эфир",
    expired: "окно закрыто",
    error: "ошибка синхронизации"
  }[phase];
}

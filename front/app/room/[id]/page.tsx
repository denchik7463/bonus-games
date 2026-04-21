"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Bot, Clock, Copy, DoorOpen, Gem, Radio, Sparkles, Users } from "lucide-react";
import { AppFrame } from "@/components/layout/app-nav";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ParticipantToken } from "@/components/domain/participant-token";
import { LiveStatus } from "@/components/domain/badges";
import { gameService } from "@/lib/services/game-service";
import { useAppStore } from "@/lib/store/app-store";
import { formatBonus } from "@/lib/utils";
import type { Room, RoomLifecyclePhase, TestUser } from "@/lib/domain/types";
import { BoostExplainer } from "@/components/domain/boost-explainer";
import { roomApiService } from "@/src/features/rooms/model/service";
import { getUserFriendlyError } from "@/src/shared/api/errors";
import { profileToTestUser } from "@/src/features/auth/lib/profile-to-user";
import { useAuthStore } from "@/src/features/auth/model/store";

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setRoom = useAppStore((state) => state.setActiveRoom);
  const setRound = useAppStore((state) => state.setActiveRound);
  const updateUser = useAppStore((state) => state.updateUser);
  const authSession = useAuthStore((state) => state.session);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [seconds, setSeconds] = useState(18);
  const [localError, setLocalError] = useState("");
  const [phase, setPhase] = useState<RoomLifecyclePhase>("idle");
  const autoStartedRef = useRef(false);
  const { data: backendRoom } = useQuery({
    queryKey: ["room", params.id],
    queryFn: () => roomApiService.getRoom(params.id, user),
    retry: false,
    refetchInterval: 2000
  });
  const { data: rounds = [] } = useQuery({ queryKey: ["rounds"], queryFn: gameService.getRounds });
  const activeRoom = useAppStore((state) => state.activeRoom);
  const activeRoomMatches = activeRoom?.id === params.id || activeRoom?.sourceTemplateId === params.id || activeRoom?.publicId.toLowerCase() === params.id.toLowerCase();
  const room = mergeRoomForCurrentUser(backendRoom, activeRoomMatches ? activeRoom : undefined, user);
  const joined = room?.participants.some((participant) => participant.id === user.id) ?? false;
  const boosted = room?.participants.find((participant) => participant.id === user.id)?.hasBoost ?? false;
  const finishedRound = room ? rounds.find((round) => round.roomId === room.id && round.userId === user.id) : undefined;
  const insufficient = Boolean(room && user.balance < room.entryCost);
  const full = Boolean(room && room.occupied >= room.seats && !joined);
  const closed = room?.status === "closed";

  useEffect(() => {
    setSeconds(room?.reservedUntilSec ?? 18);
  }, [room?.id, room?.reservedUntilSec]);

  useEffect(() => {
    autoStartedRef.current = false;
    setPhase(finishedRound ? "launching" : joined ? "countdown" : "idle");
  }, [finishedRound, joined, room?.id]);

  useEffect(() => {
    if (!finishedRound) return;
    setRound(finishedRound);
    router.replace(`/result/${finishedRound.id}`);
  }, [finishedRound, router, setRound]);

  useEffect(() => {
    if (!joined || finishedRound || phase === "bot-fill" || phase === "launching" || phase === "expired") return;
    const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [finishedRound, joined, phase]);

  const join = useMutation({
    mutationFn: () => roomApiService.joinRoom(params.id, user),
    onSuccess: (nextRoom) => {
      setRoom(nextRoom);
      refreshCurrentProfile(authSession, refreshProfile, updateUser);
      setLocalError("");
      setPhase("reserved");
      setSeconds(nextRoom.reservedUntilSec);
      window.setTimeout(() => setPhase("countdown"), 450);
    },
    onError: (error) => setLocalError(getUserFriendlyError(error))
  });

  const boost = useMutation({
    mutationFn: () => roomApiService.activateBoost(params.id, user),
    onSuccess: (nextRoom) => {
      setRoom(nextRoom);
      refreshCurrentProfile(authSession, refreshProfile, updateUser);
      setLocalError("");
    },
    onError: (error) => setLocalError(getUserFriendlyError(error))
  });

  const start = useMutation({
    mutationFn: async () => {
      setPhase("bot-fill");
      const filledRoom = await gameService.fillRoomWithBots(params.id);
      setRoom(filledRoom);
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      setPhase("launching");
      const round = await gameService.createRound(params.id, user);
      return { round };
    },
    onSuccess: ({ round }) => {
      setRound(round);
      router.push(`/round/${round.id}`);
    },
    onError: (error) => {
      autoStartedRef.current = false;
      setPhase("error");
      setLocalError(error instanceof Error ? error.message : "Не удалось запустить раунд.");
    }
  });

  useEffect(() => {
    if (!joined || finishedRound || seconds > 0 || start.isPending || autoStartedRef.current) return;
    autoStartedRef.current = true;
    start.mutate();
  }, [finishedRound, joined, seconds, start]);

  const botFill = useMemo(() => room ? Math.max(0, room.seats - room.occupied) : 0, [room]);

  if (!room) {
    return <AppFrame><Panel>Комната не найдена или уже закрыта.</Panel></AppFrame>;
  }

  return (
    <AppFrame>
      <section className="surface-solid relative mb-8 overflow-hidden rounded-[36px]">
        <div className="absolute inset-0 opacity-80">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.16),transparent_62%)]" />
          <div className="absolute right-[-9rem] top-6 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.14),transparent_64%)]" />
          <div className="absolute bottom-[-10rem] left-[42%] h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.08),transparent_64%)]" />
        </div>
        <div className="relative p-6 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <LiveStatus status={phase === "launching" ? "running" : joined ? "matching" : room.status} />
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-smoke surface-inset">
                  <Radio className="h-3.5 w-3.5 text-gold" />
                  {phaseLabel(phase, joined)}
                </span>
              </div>
              <h1 className="mt-5 text-balance text-4xl font-black leading-[0.98] tracking-[-0.05em] text-platinum md:text-6xl">
                {room.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-smoke md:text-lg">
                {phaseDescription(phase, joined)}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="room-id-pill inline-flex items-center gap-2 rounded-full bg-[linear-gradient(180deg,rgba(255,205,24,0.14),rgba(255,205,24,0.06)),rgba(8,10,14,0.55)] px-3 py-1.5 text-xs font-semibold text-gold shadow-[0_18px_60px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.07)]">
                  ID <span className="font-mono text-[12px] font-bold">{room.publicId}</span>
                </span>
                <button
                  onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${room.inviteUrl}`)}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-smoke transition surface-inset hover:bg-[rgba(255,205,24,0.08)] hover:text-platinum"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Скопировать приглашение
                </button>
              </div>
            </div>

            <div className="surface-solid flex items-center justify-between gap-4 rounded-[26px] px-5 py-4 md:min-w-[240px] md:flex-col md:items-stretch md:justify-center md:gap-2 md:text-center">
              <div className="flex items-center gap-3 md:mx-auto md:flex-col md:gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/10 text-gold shadow-[0_0_26px_rgba(255,205,24,0.12)]">
                  <Clock className="h-5 w-5" />
                </span>
                <div className="leading-tight">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke">До старта</p>
                  <p className="mt-1 text-4xl font-black tracking-[-0.04em] text-platinum">{joined ? seconds : room.reservedUntilSec}</p>
                </div>
              </div>
              <p className="text-xs text-smoke md:mt-2">{joined ? "сек до автозапуска" : "сек после входа"}</p>
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
              <div className="flex flex-wrap gap-2">
                <KeyMetric icon={<DoorOpen className="h-4 w-4" />} label="Вход" value={formatBonus(room.entryCost)} tone="gold" />
                <KeyMetric icon={<Gem className="h-4 w-4" />} label="Вклад" value={joined ? formatBonus(room.entryCost + (boosted ? room.boostCost : 0)) : formatBonus(room.entryCost)} tone={boosted ? "violet" : "platinum"} />
                <KeyMetric icon={<Gem className="h-4 w-4" />} label="Фонд" value={formatBonus(room.entryCost * room.seats)} tone="jade" />
                <KeyMetric icon={<Users className="h-4 w-4" />} label="Места" value={`${room.occupied}/${room.seats}`} tone="cyan" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {room.participants.map((participant) => <ParticipantToken key={participant.id} participant={participant} />)}
              {Array.from({ length: botFill }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 rounded-[22px] border border-dashed border-gold/15 p-4 text-sm text-smoke surface-inset">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.04)]">
                    <Bot className="h-5 w-5 text-muted" />
                  </span>
                  <div>
                    <p className="font-semibold text-platinum">Свободное место</p>
                    <p className="mt-1 text-sm leading-6 text-smoke">
                      {phase === "bot-fill" || phase === "launching" ? "Бот подключается к раунду" : "Если не займут игроки — место закроется ботом перед стартом."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="surface-solid overflow-hidden rounded-[30px] p-6">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke">Действия</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-platinum">Что сделать сейчас</h2>
            </div>
            {insufficient ? (
              <div className="mt-4 rounded-[22px] border border-ember/30 bg-ember/10 p-4 text-sm text-platinum">
                <AlertTriangle className="mb-2 h-5 w-5 text-ember" />
                <p>Недостаточно бонусных баллов. Выберите комнату с меньшей стоимостью входа или измените параметры подбора.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => router.push("/matchmaking")}>Изменить параметры</Button>
                  <Button type="button" variant="secondary" onClick={() => router.push("/rooms")}>Выбрать другую комнату</Button>
                </div>
              </div>
            ) : null}
            {full || closed ? (
              <div className="mt-4 rounded-[22px] border border-ember/30 bg-ember/10 p-4 text-sm text-platinum">
                <AlertTriangle className="mb-2 h-5 w-5 text-ember" />
                {closed ? "Комната закрыта для входа." : "Комната уже заполнена. Выберите похожую комнату."}
              </div>
            ) : null}
            <div className="mt-5 space-y-3">
              <Button onClick={() => join.mutate()} disabled={joined || insufficient || full || closed || join.isPending} className="w-full">
                {joined ? "Место занято" : "Подтвердить участие"}
              </Button>
              <Button variant="secondary" onClick={() => boost.mutate()} disabled={!joined || boosted || !room.boostEnabled || boost.isPending} className="w-full">
                <Sparkles className="mr-2 h-4 w-4" />
                {boosted ? "Буст активирован" : room.boostEnabled ? `Купить буст за ${formatBonus(room.boostCost)}` : "Буст отключен"}
              </Button>
              {room.boostEnabled ? (
                <div className="room-boost-note rounded-[24px] p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-gold text-ink shadow-glow">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-platinum">Буст — premium‑усиление участия</p>
                      <p className="mt-1 text-sm leading-7 text-smoke">
                        Одно усиление до старта. В этой комнате: <span className="font-semibold text-platinum">{room.boostImpact}</span>. Не гарантирует победу.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              <Button onClick={() => {
                autoStartedRef.current = true;
                start.mutate();
              }} disabled={!joined || Boolean(finishedRound) || start.isPending} className="w-full">
                {start.isPending ? "Запускаем раунд..." : "Запустить трансляцию сейчас"}
              </Button>
              {finishedRound ? (
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/result/${finishedRound.id}`)}
                  className="w-full"
                >
                  Открыть итог последнего раунда
                </Button>
              ) : null}
            </div>
            {localError ? <p className="mt-4 rounded-[22px] border border-ember/25 bg-ember/10 p-4 text-sm text-ember">{localError}</p> : null}
          </section>
          <section className="overflow-hidden rounded-[30px]">
            <BoostExplainer room={room} state={boosted ? "active" : joined ? "available" : "locked"} />
          </section>
        </aside>
      </div>
    </AppFrame>
  );
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

function mergeRoomForCurrentUser(backendRoom: Room | undefined, activeRoom: Room | undefined, user: TestUser) {
  const room = backendRoom ?? activeRoom;
  if (!room) return undefined;

  const activeUserParticipant = activeRoom?.participants.find((participant) => participant.id === user.id);
  const hasUserInRoom = room.participants.some((participant) => participant.id === user.id);
  if (hasUserInRoom || !activeUserParticipant) return room;

  const participants = room.participants.length && /^Игрок \d+$/.test(room.participants[0].name)
    ? [{ ...activeUserParticipant, hasBoost: activeUserParticipant.hasBoost }, ...room.participants.slice(1)]
    : [activeUserParticipant, ...room.participants];

  return {
    ...room,
    participants: participants.slice(0, room.seats),
    occupied: Math.max(room.occupied, Math.min(participants.length, room.seats))
  };
}

function phaseDescription(phase: RoomLifecyclePhase, joined: boolean) {
  if (!joined) return "Подтвердите участие. После резерва начнется короткий таймер ожидания.";
  return {
    idle: "Подтвердите участие. После резерва начнется короткий таймер ожидания.",
    reserved: "Бонусные баллы зарезервированы. До старта можно один раз усилить участие бустом.",
    countdown: "Идет обратный отсчет. Если места останутся свободными, их займут боты и раунд сразу стартует.",
    "bot-fill": "Закрываем свободные места и формируем финальный состав комнаты.",
    launching: "Переходим к трансляции и доводим раунд до красивого финала.",
    expired: "Окно ожидания завершено. Можно подобрать другую комнату.",
    error: "Связь с мок-сервисом сбилась. Повторите запуск или выберите другую комнату."
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

function phaseLabel(phase: RoomLifecyclePhase, joined: boolean) {
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

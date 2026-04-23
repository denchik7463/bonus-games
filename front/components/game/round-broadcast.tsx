"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Round, RoundPhase } from "@/lib/domain/types";
import { phaseCopy, visualGameModules } from "@/lib/game/modules";
import { ParticipantToken } from "@/components/domain/participant-token";
import { ButtonLink } from "@/components/ui/button";
import { resolveRoundWinner } from "@/src/features/journal/model/outcome";

const ArenaSprintScene = dynamic(() => import("@/components/game/arena-sprint-scene").then((m) => m.ArenaSprintScene), { ssr: false });

export function RoundBroadcast({ round, autoRedirect = true, resultHref }: { round: Round; autoRedirect?: boolean; resultHref?: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<RoundPhase>("intro");
  const gameModule = visualGameModules[round.mode];
  const winner = resolveRoundWinner(round);
  const isChinchillaRace = round.mode === "chinchilla-race";
  const isDuelClash = round.mode === "duel-clash";
  const timeline = useMemo(() => {
    const total = gameModule.durationMs;
    if (round.mode === "claw-machine") {
      return [
        { phase: "intro" as const, at: 0 },
        { phase: "live" as const, at: Math.round(total * 0.18) },
        { phase: "suspense" as const, at: Math.round(total * 0.66) },
        { phase: "reveal" as const, at: Math.round(total * 0.955) },
        { phase: "result" as const, at: Math.round(total * 0.998) }
      ];
    }
    return [
      { phase: "intro" as const, at: 0 },
      { phase: "live" as const, at: Math.round(total * 0.18) },
      { phase: "suspense" as const, at: Math.round(total * 0.56) },
      { phase: "reveal" as const, at: Math.round(total * 0.84) },
      { phase: "result" as const, at: Math.round(total * 0.94) }
    ];
  }, [gameModule.durationMs, round.mode]);

  useEffect(() => {
    setPhase("intro");
    const timers = timeline.map((item) => window.setTimeout(() => setPhase(item.phase), item.at));
    return () => timers.forEach(window.clearTimeout);
  }, [round.id, timeline]);

  useEffect(() => {
    if (!autoRedirect) return;
    const href = resultHref ?? `/result/${round.id}`;
    router.prefetch(href);
  }, [autoRedirect, resultHref, round.id, router]);

  useEffect(() => {
    if (phase !== "result" || !autoRedirect) return;
    markRoundBroadcastSeen(round.id);
    const timer = window.setTimeout(() => router.replace(resultHref ?? `/result/${round.id}`), round.winnerId === round.userId ? 2400 : 1900);
    return () => window.clearTimeout(timer);
  }, [autoRedirect, phase, resultHref, round.id, round.userId, round.winnerId, router]);

  const progress = useMemo(() => {
    const index = gameModule.phases.indexOf(phase);
    return ((index + 1) / gameModule.phases.length) * 100;
  }, [gameModule.phases, phase]);

  return (
    <div className="space-y-6">
      <section className="surface-solid relative overflow-hidden rounded-[34px] p-4 md:p-6">
        <div className="absolute inset-0 opacity-75">
          <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.14),transparent_62%)]" />
          <div className="absolute right-[-8rem] top-8 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.14),transparent_62%)]" />
        </div>
        <div className="relative">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold/90">{gameModule.title}</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-platinum md:text-5xl">
                {isChinchillaRace ? "Гонки шиншилл" : isDuelClash ? "Дуэль шиншилл" : round.mode === "slot-reveal" ? "Магия имени" : "Прямая трансляция раунда"}
              </h1>
            </div>
            <div className="rounded-full px-4 py-2 text-right surface-inset">
              <p className="text-[11px] uppercase tracking-[0.14em] text-smoke">Раунд</p>
              <p className="font-mono text-sm text-platinum">{round.id}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] p-2 surface-inset md:p-3">
            <ArenaSprintScene roundId={round.id} mode={round.mode} participants={round.participants} winnerId={round.winnerId} combination={round.combination} />
          </div>

          {round.mode === "duel-clash" ? <DuelBattleLog round={round} phase={phase} /> : null}

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-smoke">{phaseCopy[phase].title}</span>
              <span className="font-semibold text-platinum">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-platinum/10">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-jade via-gold to-ember" animate={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          <div className="surface-solid relative overflow-hidden rounded-[30px] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.11),transparent_64%)]" />
            <AnimatePresence mode="wait">
              <motion.div key={phase} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold/90">Сейчас в эфире</p>
                <h2 className="mt-2 text-2xl font-semibold text-platinum">{phaseCopy[phase].title}</h2>
                <p className="mt-2 text-sm leading-7 text-smoke">{phaseCopy[phase].body}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="surface-solid relative overflow-hidden rounded-[30px] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute -left-20 -bottom-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.08),transparent_64%)]" />
            <h2 className="relative mb-4 text-xl font-semibold text-platinum">Участники</h2>
            <div className="space-y-2">
              {round.participants.map((participant, index) => (
                <ParticipantToken key={`${participant.id}-${participant.seatNumber ?? index}`} participant={participant} compact />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="surface-solid relative overflow-hidden rounded-[30px] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.11),transparent_64%)]" />
            <h2 className="relative mb-4 text-xl font-semibold text-platinum">Финальный момент</h2>
              {phase === "result"
              ? winner
                ? <ParticipantToken participant={winner} />
                : <p className="relative text-sm leading-7 text-smoke">Победитель зафиксирован, но карточка пока подгружается.</p>
              : <p className="relative text-sm leading-7 text-smoke">{finalMomentCopy(round.mode)}</p>}
          </div>

          {phase === "result" ? (
            <div className="surface-solid relative overflow-hidden rounded-[30px] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.16),transparent_64%)]" />
              <div className="relative rounded-[26px] bg-[linear-gradient(135deg,rgba(255,205,24,0.13),rgba(255,255,255,0.035)_52%,rgba(8,10,14,0.72))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.065)]">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
                  {round.mode === "duel-clash" ? "Арена выбрала чемпиона" : round.mode === "slot-reveal" ? "Карты собрали имя" : "Финальный результат"}
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-platinum">
                  {winner?.seatNumber ? `Победило место ${winner.seatNumber}` : winner?.name ?? "Победитель"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-smoke">
                  {round.mode === "duel-clash"
                    ? "Финальный удар завершен. Победитель уже зафиксирован в результате раунда."
                    : round.mode === "slot-reveal"
                      ? "Карты сложили имя победителя. Результат уже сохранен и готов к открытию."
                      : "Финальный результат уже сохранен и готов к открытию."}
                </p>
                {winner ? <div className="mt-4"><ParticipantToken participant={winner} compact /></div> : null}
              </div>
              {autoRedirect || resultHref ? <ButtonLink href={resultHref ?? `/result/${round.id}`} className="mt-4 w-full">Открыть итог раунда</ButtonLink> : null}
            </div>
          ) : (
            <div className="surface-solid relative overflow-hidden rounded-[30px] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
              <div className="pointer-events-none absolute -left-20 -bottom-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.10),transparent_64%)]" />
              <p className="text-sm leading-7 text-smoke">После раскрытия автоматически откроется экран результата с балансом и победившим слотом.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function roundBroadcastSeen(roundId: string) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(roundBroadcastSeenKey(roundId)) === "1";
}

function markRoundBroadcastSeen(roundId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(roundBroadcastSeenKey(roundId), "1");
}

function roundBroadcastSeenKey(roundId: string) {
  return `round-broadcast-seen:${roundId}`;
}

function finalMomentCopy(mode: Round["mode"]) {
  if (mode === "claw-machine") return "Кран доводит шар до лотка. Имя победителя откроется в последней доле секунды.";
  if (mode === "chinchilla-race") return "Шиншиллы уже у финишной прямой. Победит дорожка, которую подтвердил результат раунда.";
  if (mode === "duel-clash") return "Бойцы сходятся в центре арены. Финальный удар покажет место, которое подтвердил результат раунда.";
  if (mode === "slot-reveal") return "Карты уже пробуют чужие фрагменты. Финальная сборка покажет имя победителя.";
  return "Сцена держит напряжение до кульминации. Финальный ответ появится в решающий момент.";
}

function DuelBattleLog({ round, phase }: { round: Round; phase: RoundPhase }) {
  const winner = resolveRoundWinner(round) ?? round.participants[0];
  const steps = buildDuelBattleSteps(round, winner);
  const phaseIndex = {
    intro: 0,
    live: Math.max(1, Math.floor(steps.length * 0.38)),
    suspense: Math.max(1, Math.floor(steps.length * 0.68)),
    reveal: Math.max(1, steps.length - 1),
    result: steps.length
  }[phase];

  return (
    <div className="mt-4 overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,rgba(255,205,24,0.08),rgba(228,80,61,0.08)_48%,rgba(5,6,10,0.74))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">Ход битвы</p>
          <p className="mt-1 text-sm text-smoke">Раунд за раундом, пока не останется победитель.</p>
        </div>
        <span className="rounded-full bg-black/20 px-3 py-1.5 text-xs font-black text-platinum">
          {phase === "result" ? "победитель раскрыт" : "бой идет"}
        </span>
      </div>
      <div className="duel-battle-scroll flex gap-3 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const completed = index < phaseIndex;
          const active = index === phaseIndex;
          const revealed = completed || phase === "result";
          const upcoming = !completed && !active;
          return (
            <motion.div
              key={`${step.winner.id}-${step.loser?.id ?? "final"}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035 }}
              className={[
                "min-w-[178px] rounded-[18px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]",
                completed
                  ? "border-gold/35 bg-gold/[0.08]"
                  : active
                    ? "border-cyan/40 bg-cyan/[0.08] shadow-[0_0_34px_rgba(77,215,200,0.10),inset_0_1px_0_rgba(255,255,255,0.07)]"
                    : "border-white/10 bg-black/18"
              ].join(" ")}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-smoke">{step.time}</p>
              <p className="mt-2 text-sm font-black leading-5 text-platinum">
                {revealed ? step.title : active ? step.activeTitle : step.pendingTitle}
              </p>
              <p className="mt-1 text-xs leading-5 text-smoke">
                {revealed ? step.body : active ? step.activeBody : step.pendingBody}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <DuelMiniToken participant={revealed ? step.winner : step.left} tone={duelLogColors[index % duelLogColors.length]} muted={upcoming} />
                {step.right ? <span className="text-sm font-black text-gold">{revealed ? "›" : "×"}</span> : null}
                {step.right ? <DuelMiniToken participant={revealed ? step.right : step.right} muted={upcoming || revealed} tone={duelLogColors[(index + 3) % duelLogColors.length]} /> : null}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function DuelMiniToken({ participant, tone, muted }: { participant: Round["participants"][number]; tone: string; muted?: boolean }) {
  return (
    <span
      className="inline-flex min-w-0 items-center gap-2 rounded-full bg-black/20 px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      style={{ color: muted ? "rgba(237,232,220,0.58)" : tone }}
    >
      <span
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-ink"
        style={{ background: muted ? "rgba(237,232,220,0.32)" : tone }}
      >
        {participant.name.slice(0, 1).toUpperCase()}
      </span>
      <span className="max-w-[86px] truncate text-xs font-bold">{participant.name}</span>
    </span>
  );
}

function buildDuelBattleSteps(round: Round, winner: Round["participants"][number] | undefined) {
  if (!winner) return [];
  const fights = buildDuelBracket(round.participants, winner);
  return [
    ...fights.map((fight, index) => ({
      time: `00:${String(2 + index * 2).padStart(2, "0")}`,
      title: `${fight.winner.name} проходит дальше`,
      body: `${fight.loser.name} выбывает после столкновения.`,
      activeTitle: "Дуэль в разгаре",
      activeBody: `${fight.left.name} и ${fight.right.name} сходятся в центре арены.`,
      pendingTitle: "Дуэль готовится",
      pendingBody: "Пара еще не раскрыта. Ждем удар.",
      winner: fight.winner,
      loser: fight.loser,
      left: fight.left,
      right: fight.right
    })),
    {
      time: `00:${String(2 + fights.length * 2).padStart(2, "0")}`,
      title: "Финальная дуэль",
      body: winner.seatNumber ? `Победило ${winner.seatNumber} место.` : "Победитель удержал центр арены.",
      activeTitle: "Финальная дуэль",
      activeBody: "Последнее столкновение решает исход.",
      pendingTitle: "Финал впереди",
      pendingBody: "Главный бой еще не раскрыт.",
      winner,
      loser: undefined,
      left: winner,
      right: undefined
    }
  ];
}

function buildDuelBracket(participants: Round["participants"], finalWinner: Round["participants"][number]) {
  const fights: Array<{
    winner: Round["participants"][number];
    loser: Round["participants"][number];
    left: Round["participants"][number];
    right: Round["participants"][number];
  }> = [];
  let contenders = participants.slice(0, 10);
  let safety = 0;

  while (contenders.length > 1 && safety < 6) {
    const next: Round["participants"] = [];
    for (let index = 0; index < contenders.length; index += 2) {
      const first = contenders[index];
      const second = contenders[index + 1];
      if (!second) {
        next.push(first);
        continue;
      }
      const pairWinner = chooseDuelStepWinner(first, second, finalWinner, fights.length);
      fights.push({ winner: pairWinner, loser: pairWinner.id === first.id ? second : first, left: first, right: second });
      next.push(pairWinner);
    }
    contenders = next;
    safety += 1;
  }

  return fights;
}

function chooseDuelStepWinner(
  first: Round["participants"][number],
  second: Round["participants"][number],
  finalWinner: Round["participants"][number],
  fightIndex: number
) {
  if (first.id === finalWinner.id || first.userId === finalWinner.userId) return first;
  if (second.id === finalWinner.id || second.userId === finalWinner.userId) return second;
  const firstScore = (first.hasBoost ? 2 : 0) + ((first.seatNumber ?? fightIndex + 1) % 3);
  const secondScore = (second.hasBoost ? 2 : 0) + ((second.seatNumber ?? fightIndex + 2) % 3);
  if (firstScore === secondScore) return fightIndex % 2 === 0 ? second : first;
  return firstScore > secondScore ? first : second;
}

const duelLogColors = ["#b86cff", "#22c7ff", "#ffcd18", "#7ee75f", "#ff6ba8", "#ff7a1a", "#4dd7c8", "#e4503d"];

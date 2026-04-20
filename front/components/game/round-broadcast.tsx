"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Round, RoundPhase } from "@/lib/domain/types";
import { phaseCopy, visualGameModules } from "@/lib/game/modules";
import { ParticipantToken } from "@/components/domain/participant-token";
import { WinningCombinationBlock } from "@/components/domain/winning-combination";
import { ButtonLink } from "@/components/ui/button";

const ArenaSprintScene = dynamic(() => import("@/components/game/arena-sprint-scene").then((m) => m.ArenaSprintScene), { ssr: false });

export function RoundBroadcast({ round }: { round: Round }) {
  const router = useRouter();
  const [phase, setPhase] = useState<RoundPhase>("intro");
  const gameModule = visualGameModules[round.mode];
  const winner = round.participants.find((participant) => participant.id === round.winnerId) ?? round.participants[0];
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
    if (phase !== "result") return;
    const timer = window.setTimeout(() => router.replace(`/result/${round.id}`), round.winnerId === round.userId ? 2400 : 1900);
    return () => window.clearTimeout(timer);
  }, [phase, round.id, round.userId, round.winnerId, router]);

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
              <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-platinum md:text-5xl">Прямая трансляция раунда</h1>
            </div>
            <div className="rounded-full px-4 py-2 text-right surface-inset">
              <p className="text-[11px] uppercase tracking-[0.14em] text-smoke">Раунд</p>
              <p className="font-mono text-sm text-platinum">{round.id}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] p-2 surface-inset md:p-3">
            <ArenaSprintScene roundId={round.id} mode={round.mode} participants={round.participants} winnerId={round.winnerId} combination={round.combination} />
          </div>

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
              {round.participants.map((participant) => (
                <ParticipantToken key={participant.id} participant={participant} compact />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="surface-solid relative overflow-hidden rounded-[30px] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.11),transparent_64%)]" />
            <h2 className="relative mb-4 text-xl font-semibold text-platinum">Финальный момент</h2>
            {phase === "result"
              ? <ParticipantToken participant={winner} />
              : <p className="relative text-sm leading-7 text-smoke">{round.mode === "claw-machine" ? "Кран доводит шар до лотка. Имя победителя откроется в последней доле секунды." : "Сцена держит напряжение до кульминации. Финальный ответ появится в решающий момент."}</p>}
          </div>

          {phase === "result" ? (
            <div className="surface-solid relative overflow-hidden rounded-[30px] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
              <WinningCombinationBlock combination={round.combination} />
              <ButtonLink href={`/result/${round.id}`} className="mt-4 w-full">Открыть итог раунда</ButtonLink>
            </div>
          ) : (
            <div className="surface-solid relative overflow-hidden rounded-[30px] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
              <div className="pointer-events-none absolute -left-20 -bottom-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.10),transparent_64%)]" />
              <p className="text-sm leading-7 text-smoke">После раскрытия автоматически откроется экран результата с балансом и сохранённой комбинацией.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

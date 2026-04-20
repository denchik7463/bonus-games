"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, ChevronDown, CircleDollarSign, Crown, FileCheck2, Fingerprint, ShieldCheck, Sparkles, Trophy, UsersRound } from "lucide-react";
import { AppFrame } from "@/components/layout/app-nav";
import { Panel } from "@/components/ui/panel";
import { ParticipantToken } from "@/components/domain/participant-token";
import { WinningCombinationBlock } from "@/components/domain/winning-combination";
import { AccessGuard } from "@/components/domain/access-guard";
import { Round, RoundBalanceChange } from "@/lib/domain/types";
import { cn, formatBonus } from "@/lib/utils";
import { journalService } from "@/src/features/journal/model/service";
import { journalQueryKeys } from "@/src/features/journal/model/query-keys";
import { getUserFriendlyError } from "@/src/shared/api/errors";

export default function TransparencyPage() {
  const { data: rounds = [], error, isLoading } = useQuery({
    queryKey: journalQueryKeys.list(),
    queryFn: () => journalService.getJournal()
  });
  const totalPrize = rounds.reduce((sum, round) => sum + round.prizePool, 0);
  const boostedRounds = rounds.filter((round) => round.boostUsed).length;
  const bots = rounds.reduce((sum, round) => sum + round.participants.filter((participant) => participant.kind === "bot").length, 0);

  return (
    <AppFrame>
      <AccessGuard roles={["expert", "admin"]} title="Раздел недоступен">
        <div className="space-y-6">
          <section className="surface-solid relative overflow-hidden rounded-[36px] p-6 md:p-10">
            <div className="pointer-events-none absolute inset-0 opacity-85">
              <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.17),transparent_62%)]" />
              <div className="absolute right-[-12rem] top-8 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.13),transparent_64%)]" />
              <div className="absolute bottom-[-14rem] left-[44%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.09),transparent_64%)]" />
            </div>

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
              <div className="max-w-4xl">
                <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <ShieldCheck className="h-4 w-4" />
                  Экспертная прозрачность
                </p>
                <h1 className="text-balance text-4xl font-black leading-[0.98] tracking-[-0.05em] text-platinum md:text-6xl">
                  Журнал
                  <br />
                  <span className="brand-marker">проведенных раундов</span>.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-smoke md:text-lg">
                  Здесь видно, как прошли игровые сессии: состав, боты, параметры комнаты, бусты, фонд, победитель, комбинация и изменения балансов.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <AuditStat icon={<FileCheck2 className="h-5 w-5" />} label="Раунды" value={`${rounds.length}`} tone="gold" />
                <AuditStat icon={<CircleDollarSign className="h-5 w-5" />} label="Фонд всего" value={formatBonus(totalPrize)} tone="jade" />
                <AuditStat icon={<Sparkles className="h-5 w-5" />} label="С бустом" value={`${boostedRounds}`} tone="violet" />
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <OverviewCard title="Участники и боты" value={`${bots} ботов`} description="Свободные места фиксируются в составе раунда, чтобы эксперт видел автозаполнение." icon={<UsersRound className="h-5 w-5" />} />
            <OverviewCard title="Проверка результата" value="зафиксировано" description="Победитель, комбинация и балансные операции сохраняются в журнале после завершения раунда." icon={<Fingerprint className="h-5 w-5" />} />
            <OverviewCard title="Роль доступа" value="admin / expert" description="Журнал скрыт от обычного игрока и используется как экран прозрачности." icon={<ShieldCheck className="h-5 w-5" />} />
          </div>

          {isLoading ? (
            <Panel className="surface-solid border-0 p-6 shadow-none before:hidden">Загружаем журнал раундов...</Panel>
          ) : error ? (
            <Panel className="surface-solid border-0 p-6 text-ember shadow-none before:hidden">{getUserFriendlyError(error)}</Panel>
          ) : (
            <div className="space-y-5">
              {rounds.map((round, index) => (
                <RoundAuditCard key={round.id} round={round} index={index} />
              ))}
            </div>
          )}
        </div>
      </AccessGuard>
    </AppFrame>
  );
}

function RoundAuditCard({ round, index }: { round: Round; index: number }) {
  const winner = round.participants.find((participant) => participant.id === round.winnerId) ?? round.participants[0];
  const botsCount = round.participants.filter((participant) => participant.kind === "bot").length;
  const realCount = round.participants.length - botsCount;

  return (
    <Panel className="surface-solid relative overflow-hidden border-0 p-0 shadow-none before:hidden">
      <div className="pointer-events-none absolute -right-28 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.11),transparent_64%)]" />
      <div className="pointer-events-none absolute -left-28 bottom-[-14rem] h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.08),transparent_64%)]" />

      <div className="relative p-5 md:p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold text-sm font-black text-ink shadow-glow">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="rounded-full bg-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">{modeLabel(round.mode)}</span>
              <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-platinum">Комната {round.roomPublicId}</span>
              <span className="rounded-full bg-jade/10 px-3 py-1 text-xs font-semibold text-jade">Раунд завершен</span>
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-platinum md:text-3xl">{round.roomTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-smoke">
              Фонд {formatBonus(round.prizePool)} · вход {formatBonus(round.entryCost)} · доля фонда {round.prizePoolPercent}% · риск {round.roomVolatility}% · {round.boostUsed ? `буст ${round.boostImpact}, ${formatBonus(round.boostCost)}` : "буст не применен"}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <SoftMetric label="Реальные" value={`${realCount}`} />
              <SoftMetric label="Боты" value={`${botsCount}`} tone="cyan" />
              <SoftMetric label="Фонд" value={formatBonus(round.prizePool)} tone="gold" />
              <SoftMetric label="Победитель" value={winner.name} tone="jade" />
            </div>
          </div>

          <div className="rounded-[28px] bg-[linear-gradient(145deg,rgba(255,205,24,0.12),rgba(255,255,255,0.035)_44%,rgba(9,10,14,0.9))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Победитель</p>
            <div className="mt-3">
              <ParticipantToken participant={winner} />
            </div>
            <p className="mt-3 text-sm leading-6 text-smoke">Победитель и выигрышная комбинация зафиксированы после завершения визуального раунда.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[.95fr_1.05fr_.9fr]">
          <section>
            <BlockTitle icon={<CircleDollarSign className="h-4 w-4" />} title="Изменения балансов" />
            <div className="mt-3 space-y-2">
              {round.balanceChanges.map((change, changeIndex) => (
                <BalanceAuditRow key={`${change.participantId}-${change.reason}-${changeIndex}`} change={change} />
              ))}
            </div>
          </section>

          <section>
            <BlockTitle icon={<UsersRound className="h-4 w-4" />} title="Состав раунда" />
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {round.participants.map((participant) => (
                <div
                  key={participant.id}
                  className={cn(
                    "rounded-[22px] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]",
                    participant.id === round.winnerId ? "bg-gold/10" : "bg-white/[0.04]"
                  )}
                >
                  <ParticipantToken participant={participant} compact />
                </div>
              ))}
            </div>
          </section>

          <section>
            <BlockTitle icon={<Trophy className="h-4 w-4" />} title="Комбинация" />
            <div className="mt-3">
              <WinningCombinationBlock combination={round.combination} compact />
            </div>
          </section>
        </div>

        <details className="group mt-6 rounded-[26px] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018)),rgba(9,10,14,0.88)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Цепочка событий</p>
              <p className="mt-1 text-sm text-smoke">Ключевые действия, по которым можно проверить корректность раунда.</p>
            </div>
            <ChevronDown className="h-5 w-5 text-gold transition group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {round.auditTrail.map((item, itemIndex) => (
              <div key={item} className="flex items-start gap-3 rounded-[20px] bg-white/[0.045] p-3 text-sm leading-6 text-smoke shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold/12 text-[11px] font-black text-gold">{itemIndex + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </Panel>
  );
}

function AuditStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "gold" | "jade" | "violet" }) {
  return (
    <div className={cn(
      "rounded-[26px] p-4 shadow-[0_18px_54px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.065)]",
      tone === "gold" && "bg-gold/12 text-gold",
      tone === "jade" && "bg-jade/10 text-jade",
      tone === "violet" && "bg-velvet/12 text-[#c9b7ff]"
    )}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-smoke">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-platinum">{value}</p>
    </div>
  );
}

function OverviewCard({ icon, title, value, description }: { icon: React.ReactNode; title: string; value: string; description: string }) {
  return (
    <div className="surface-solid relative overflow-hidden rounded-[28px] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
      <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.1),transparent_64%)]" />
      <div className="relative">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold/10 text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">{icon}</span>
        <p className="mt-4 text-sm font-semibold text-platinum">{title}</p>
        <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-platinum">{value}</p>
        <p className="mt-2 text-sm leading-6 text-smoke">{description}</p>
      </div>
    </div>
  );
}

function SoftMetric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "gold" | "jade" | "cyan" }) {
  return (
    <div className={cn(
      "rounded-[22px] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
      tone === "default" && "bg-white/[0.045]",
      tone === "gold" && "bg-gold/10",
      tone === "jade" && "bg-jade/10",
      tone === "cyan" && "bg-cyan/10"
    )}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold text-platinum">{value}</p>
    </div>
  );
}

function BlockTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-gold">
      {icon}
      <p className="text-xs font-bold uppercase tracking-[0.2em]">{title}</p>
    </div>
  );
}

function BalanceAuditRow({ change }: { change: RoundBalanceChange }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] bg-white/[0.045] px-3 py-2.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="min-w-0">
        <p className="truncate font-medium text-platinum">{change.participantName}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
          {change.kind === "bot" ? <Bot className="h-3.5 w-3.5" /> : <Crown className="h-3.5 w-3.5" />}
          {reasonLabel(change.reason)}
        </p>
      </div>
      <span className={cn("shrink-0 font-semibold", change.delta >= 0 ? "text-jade" : "text-ember")}>
        {change.delta >= 0 ? "+" : ""}{formatBonus(change.delta)}
      </span>
    </div>
  );
}

function modeLabel(mode: Round["mode"]) {
  return {
    "arena-sprint": "Гонка шаров",
    "claw-machine": "Автомат с шарами",
    "duel-clash": "Дуэль арены",
    "slot-reveal": "Раскрытие символов"
  }[mode];
}

function reasonLabel(reason: RoundBalanceChange["reason"]) {
  return {
    "entry-reserve": "резерв входа",
    boost: "покупка буста",
    prize: "начисление фонда"
  }[reason];
}

"use client";

import { useState } from "react";
import { Bot, ChevronDown, Clock3, Sparkles, Trophy } from "lucide-react";
import { WinningCombinationBlock } from "@/components/domain/winning-combination";
import { ParticipantToken } from "@/components/domain/participant-token";
import { Round, RoundBalanceChange } from "@/lib/domain/types";
import { cn, formatBonus } from "@/lib/utils";

export function HistoryRoundCard({
  round,
  currentUserId,
  defaultExpanded = false
}: {
  round: Round;
  currentUserId: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const winner = round.participants.find((participant) => participant.id === round.winnerId) ?? round.participants[0];
  const prizeWon = round.balanceChanges
    .filter((change) => change.participantId === currentUserId && change.reason === "prize")
    .reduce((sum, change) => sum + change.delta, 0);
  const placed = round.entryCost + (round.boostUsed ? round.boostCost : 0);
  const statusWon = round.winnerId === currentUserId;

  return (
    <article className="surface-solid relative overflow-hidden rounded-[30px] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
      <div className="pointer-events-none absolute -right-28 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.12),transparent_64%)]" />
      <div className="pointer-events-none absolute -left-28 bottom-[-14rem] h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.08),transparent_64%)]" />
      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gold/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">{modeLabel(round.mode)}</span>
              <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-platinum">Комната {round.roomPublicId}</span>
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusWon ? "bg-jade/12 text-jade" : "bg-ember/12 text-ember")}>
                {statusWon ? "Выигрыш" : "Проигрыш"}
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-platinum">{round.roomTitle}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted">
                <span className="inline-flex items-center gap-2 text-smoke">
                  <Clock3 className="h-4 w-4" />
                  {formatDateTime(round.startedAt)}
                </span>
                <span className="text-smoke">{round.participants.length} участников</span>
                <span className="text-smoke">{round.boostUsed ? "Буст пользователя: да" : "Буст пользователя: нет"}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[430px]">
            <FinanceMetric label="Поставлено" value={formatBonus(placed)} />
            <FinanceMetric label="Выигрыш" value={prizeWon > 0 ? formatBonus(prizeWon) : "0"} accent={prizeWon > 0 ? "jade" : undefined} />
            <FinanceMetric label="Итог" value={`${round.balanceDelta >= 0 ? "+" : ""}${formatBonus(round.balanceDelta)}`} accent={round.balanceDelta >= 0 ? "jade" : "ember"} />
          </div>
        </div>
      </div>

      <div className="history-summary-panel relative mt-5 grid gap-5 rounded-[28px] bg-[linear-gradient(145deg,rgba(255,205,24,0.07),rgba(255,255,255,0.026)_46%,rgba(10,11,15,0.86))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric label="Цена входа" value={formatBonus(round.entryCost)} />
            <SummaryMetric label="Фонд" value={formatBonus(round.prizePool)} />
            <SummaryMetric label="Победитель" value={winner.name} highlight={statusWon} />
            <SummaryMetric label="Статус" value={statusWon ? "Вы выиграли" : `${winner.name} выиграл`} highlight={statusWon} />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Участники</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {round.participants.map((participant) => (
                <ParticipantPill
                  key={participant.id}
                  name={participant.name}
                  isCurrentUser={participant.id === currentUserId}
                  isWinner={participant.id === round.winnerId}
                  isBot={participant.kind === "bot"}
                  hasBoost={participant.hasBoost}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <WinningCombinationBlock combination={round.combination} compact />
          <div className="rounded-[24px] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Краткий итог</p>
            <p className="mt-3 text-sm leading-7 text-smoke">
              {statusWon
                ? `Вы обошли ${round.participants.length - 1} соперников. Победная комбинация сохранена в истории, а баланс вырос на ${formatBonus(round.balanceDelta)}.`
                : `Раунд завершился в пользу ${winner.name}. Комбинация сохранена, а итог по вашему балансу составил ${formatBonus(Math.abs(round.balanceDelta))}.`}
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-4">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full bg-white/[0.055] px-4 py-2 text-sm font-semibold text-platinum transition hover:bg-gold/10 hover:text-gold"
        >
          <ChevronDown className={cn("h-4 w-4 transition", expanded && "rotate-180")} />
          {expanded ? "Скрыть детали раунда" : "Открыть детали раунда"}
        </button>
      </div>

      {expanded ? (
        <div className="history-summary-panel relative mt-5 grid gap-5 rounded-[28px] bg-[linear-gradient(145deg,rgba(255,255,255,0.052),rgba(255,255,255,0.02)_48%,rgba(8,10,14,0.88))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] xl:grid-cols-[1fr_.95fr]">
          <section className="rounded-[26px] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.052)]">
            <h3 className="text-lg font-semibold text-platinum">Полный состав участников</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {round.participants.map((participant) => (
                <div
                  key={participant.id}
                  className={cn(
                    "rounded-[20px] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]",
                    participant.id === round.winnerId ? "bg-gold/[0.09]" : "bg-white/[0.035]"
                  )}
                >
                  <ParticipantToken participant={participant} />
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-[26px] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.052)]">
              <h3 className="text-lg font-semibold text-platinum">Параметры и прозрачность</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SummaryMetric label="Публичный ID" value={round.roomPublicId} />
                <SummaryMetric label="Игра" value={modeLabel(round.mode)} />
                <SummaryMetric label="Фонд" value={formatBonus(round.prizePool)} />
                <SummaryMetric label="Доля фонда" value={`${round.prizePoolPercent}%`} />
                <SummaryMetric label="Буст пользователя" value={round.boostUsed ? `${formatBonus(round.boostCost)} · ${round.boostImpact}` : "не использовался"} />
                <SummaryMetric label="Победитель" value={winner.name} highlight={statusWon} />
              </div>
            </section>

            <section className="rounded-[26px] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.052)]">
              <h3 className="text-lg font-semibold text-platinum">Изменения баланса</h3>
              <div className="mt-4 space-y-2">
                {round.balanceChanges.map((change) => (
                  <BalanceRow key={`${change.participantId}-${change.reason}-${change.delta}`} change={change} currentUserId={currentUserId} />
                ))}
              </div>
            </section>

            <section className="rounded-[26px] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.052)]">
              <h3 className="text-lg font-semibold text-platinum">Логика результата</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {round.auditTrail.map((item) => (
                  <span key={item} className="rounded-[18px] bg-white/[0.045] px-3 py-2 text-sm text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
                    {item}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ParticipantPill({
  name,
  isCurrentUser,
  isWinner,
  isBot,
  hasBoost
}: {
  name: string;
  isCurrentUser: boolean;
  isWinner: boolean;
  isBot: boolean;
  hasBoost: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]",
        isWinner ? "bg-gold/[0.09] text-platinum" : "bg-white/[0.045] text-muted",
        isCurrentUser && "bg-jade/[0.09] text-platinum"
      )}
    >
      {isWinner ? <Trophy className="h-3.5 w-3.5 text-gold" /> : null}
      <span className="font-medium">{name}</span>
      {isCurrentUser ? <span className="text-[11px] uppercase tracking-[0.18em] text-jade">вы</span> : null}
      {isBot ? <Bot className="h-3.5 w-3.5 text-muted" /> : null}
      {hasBoost ? <Sparkles className="h-3.5 w-3.5 text-gold" /> : null}
    </span>
  );
}

function SummaryMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-[20px] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]", highlight ? "bg-gold/[0.09]" : "bg-white/[0.045]")}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold text-platinum">{value}</p>
    </div>
  );
}

function FinanceMetric({ label, value, accent }: { label: string; value: string; accent?: "jade" | "ember" }) {
  return (
    <div className="rounded-[20px] bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-1 text-lg font-black text-platinum", accent === "jade" && "text-jade", accent === "ember" && "text-ember")}>{value}</p>
    </div>
  );
}

function BalanceRow({ change, currentUserId }: { change: RoundBalanceChange; currentUserId: string }) {
  return (
    <div className={cn("flex items-center justify-between rounded-[20px] p-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]", change.participantId === currentUserId ? "bg-jade/[0.08]" : "bg-white/[0.045]")}>
      <div>
        <p className="font-medium text-platinum">{change.participantName}</p>
        <p className="text-xs text-muted">{reasonLabel(change.reason)} {change.kind === "bot" ? "· бот" : ""}</p>
      </div>
      <p className={cn("font-semibold", change.delta >= 0 ? "text-jade" : "text-ember")}>
        {change.delta >= 0 ? "+" : ""}{formatBonus(change.delta)}
      </p>
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
    prize: "начисление приза"
  }[reason];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

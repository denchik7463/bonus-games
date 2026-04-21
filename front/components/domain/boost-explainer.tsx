import { Info, Sparkles } from "lucide-react";
import { Room, Round } from "@/lib/domain/types";
import { formatBonus } from "@/lib/utils";

type Props = {
  room?: Room;
  round?: Round;
  state?: "available" | "active" | "locked" | "summary";
};

export function BoostExplainer({ room, round, state = "available" }: Props) {
  const cost = room?.boostCost ?? round?.boostCost ?? 0;
  const impact = room?.boostImpact ?? round?.boostImpact ?? "увеличивает вес участия";
  const enabled = room?.boostEnabled ?? true;
  const used = state === "active" || round?.boostUsed;
  const cleanImpact = impact.replace(/^буст\s*/i, "").trim();

  return (
    <div className="boost-explainer relative h-full w-full overflow-hidden rounded-[30px] p-6">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.14),transparent_62%)]" />
        <div className="absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.12),transparent_62%)]" />
      </div>

      <div className="relative flex items-start gap-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] bg-gold/10 text-gold shadow-[0_0_34px_rgba(255,205,24,0.14)]">
          <Sparkles className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="mt-1 text-xl font-black tracking-[-0.03em] text-platinum">Буст участия</h3>
            </div>
            <span className="inline-flex items-center rounded-full bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-sm font-black tracking-[-0.02em] text-platinum shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              {enabled ? formatBonus(cost) : "отключен"}
            </span>
          </div>

          <p className="mt-3 text-sm leading-7 text-smoke">
            Один раз до старта. В этой комнате: <span className="font-semibold text-platinum">{cleanImpact}</span>. Буст меняет вес участия, но не гарантирует победу.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <StatPill label="Когда" value="до старта" />
            <StatPill label="Лимит" value="1 раз" />
            <StatPill label="Статус" value={used ? "активирован" : enabled ? "доступен" : "недоступен"} accent={used ? "gold" : enabled ? "jade" : "muted"} />
          </div>

          <div className="boost-soft-panel mt-4 flex items-start gap-2 rounded-[18px] bg-[rgba(255,255,255,0.065)] px-4 py-3 text-xs leading-5 text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
            Эффект виден в комнате, трансляции, результате, истории и экспертном журнале.
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent?: "gold" | "jade" | "muted";
}) {
  return (
    <div className="boost-soft-panel rounded-[18px] bg-[rgba(255,255,255,0.065)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-smoke">{label}</p>
      <p
        className={
          "mt-1 text-sm font-black tracking-[-0.02em] " +
          (accent === "gold" ? "text-gold" : accent === "jade" ? "text-jade" : "text-platinum")
        }
      >
        {value}
      </p>
    </div>
  );
}

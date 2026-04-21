import { Crown, Gem, Radio } from "lucide-react";
import { VipTier } from "@/lib/domain/types";
import { cn, formatBonus } from "@/lib/utils";

export function vipStatusLabel(tier: VipTier) {
  return {
    Gold: "VIP Gold",
    Platinum: "VIP Platinum",
    "Black Diamond": "VIP Diamond"
  }[tier];
}

export function VipBadge({ tier }: { tier: VipTier }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[linear-gradient(180deg,rgba(255,205,24,0.22),rgba(255,205,24,0.1)),rgba(8,10,14,0.6)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-gold shadow-[0_18px_60px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <Crown className="h-3.5 w-3.5 shrink-0 text-gold drop-shadow-[0_0_10px_rgba(255,205,24,0.24)]" />
      <span className="truncate leading-tight">{vipStatusLabel(tier)}</span>
    </span>
  );
}

export function BalanceBadge({ balance, reserved = 0 }: { balance: number; reserved?: number }) {
  return (
    <span className="balance-badge inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[#041210]">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ecfdf5]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
        <Gem className="h-4 w-4 text-[#2b7a5a]" strokeWidth={2.25} />
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-sm font-black tabular-nums tracking-[-0.02em]">{formatBonus(balance)}</span>
      </span>
      {reserved > 0 ? (
        <span className="balance-badge__reserved ml-1 inline-flex flex-col rounded-full px-2.5 py-1 leading-none">
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-65">резерв</span>
          <span className="mt-0.5 text-[12px] font-black tabular-nums">{formatBonus(reserved)}</span>
        </span>
      ) : null}
    </span>
  );
}

export function LiveStatus({ status, className }: { status: string; className?: string }) {
  const label: Record<string, string> = {
    open: "Открыта",
    matching: "Подбор",
    ready: "Готова",
    running: "Раунд",
    closed: "Закрыта"
  };
  const tone =
    status === "open"
      ? "open"
      : status === "running"
        ? "running"
        : status === "ready"
          ? "ready"
          : status === "matching"
            ? "matching"
            : "closed";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold leading-tight tracking-normal shadow-[0_18px_54px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]",
        tone === "open" &&
          "bg-[linear-gradient(180deg,rgba(255,205,24,0.28),rgba(255,205,24,0.1)),rgba(8,10,14,0.55)] text-gold",
        tone === "running" &&
          "bg-[linear-gradient(180deg,rgba(77,215,200,0.22),rgba(77,215,200,0.08)),rgba(8,10,14,0.55)] text-cyan",
        tone === "ready" &&
          "bg-[linear-gradient(180deg,rgba(95,168,131,0.22),rgba(95,168,131,0.08)),rgba(8,10,14,0.55)] text-jade",
        tone === "matching" &&
          "bg-[linear-gradient(180deg,rgba(123,60,255,0.22),rgba(123,60,255,0.08)),rgba(8,10,14,0.55)] text-violet-200",
        tone === "closed" &&
          "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)),rgba(8,10,14,0.55)] text-muted",
        className
      )}
    >
      <Radio
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          tone === "open" && "drop-shadow-[0_0_10px_rgba(255,205,24,0.18)]",
          tone === "running" && "drop-shadow-[0_0_10px_rgba(77,215,200,0.14)]",
          tone === "ready" && "drop-shadow-[0_0_10px_rgba(95,168,131,0.14)]",
          tone === "matching" && "drop-shadow-[0_0_10px_rgba(123,60,255,0.14)]"
        )}
        strokeWidth={2}
      />
      {label[status] ?? status}
    </span>
  );
}

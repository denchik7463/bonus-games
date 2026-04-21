import Image from "next/image";
import { Bot, Sparkles } from "lucide-react";
import { Participant } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function ParticipantToken({ participant, compact = false }: { participant: Participant; compact?: boolean }) {
  const isUrl = participant.avatar.startsWith("http");
  return (
    <div className={cn("participant-shell flex items-center gap-3 rounded-[20px] bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]", compact && "p-2")}>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-graphite text-sm font-bold text-gold">
        {isUrl ? <Image src={participant.avatar} alt="" fill className="object-cover" /> : participant.avatar}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-platinum">{participant.name}</p>
          {participant.kind === "bot" ? <Bot className="h-3.5 w-3.5 text-muted" /> : null}
          {participant.hasBoost ? <Sparkles className="h-3.5 w-3.5 text-gold" /> : null}
        </div>
        <p className="text-xs text-muted">{participant.kind === "bot" ? "бот-заполнение" : participant.vipTier}</p>
      </div>
    </div>
  );
}

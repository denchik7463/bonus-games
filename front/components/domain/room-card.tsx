"use client";

import { motion } from "framer-motion";
import { ArrowRight, Copy, Gauge, Users } from "lucide-react";
import { Room } from "@/lib/domain/types";
import { formatBonus } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { LiveStatus } from "@/components/domain/badges";

export function RoomCard({ room, featured = false }: { room: Room; featured?: boolean }) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      className="surface-solid flex h-full flex-col rounded-[28px] p-5 md:p-6"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <LiveStatus status={room.status} />
          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-platinum">{room.title}</h3>
          <p className="mt-2 text-sm text-smoke">{modeLabel(room.mode)} · {room.boostEnabled ? room.boostLabel : "без буста"}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {featured ? <span className="rounded-full bg-gold px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink shadow-glow">Лучшая</span> : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="Вход" value={formatBonus(room.entryCost)} />
        <Metric label="Фонд" value={formatBonus(room.prizePool)} />
        <Metric icon={<Users className="h-4 w-4" />} label="Места" value={`${room.occupied}/${room.seats}`} />
        <Metric icon={<Gauge className="h-4 w-4" />} label="Динамика" value={`${room.volatility}%`} />
      </div>
      <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-gradient-to-r from-gold via-[#ffe06a] to-gold" style={{ width: `${room.fillRate}%` }} />
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs leading-5 text-smoke">{room.boostEnabled ? `${room.boostImpact}. Один буст до старта.` : "Буст отключен для этой конфигурации."}</p>
          <button
            onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${room.inviteUrl}`)}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-smoke transition surface-inset hover:bg-[rgba(255,205,24,0.08)] hover:text-platinum"
          >
            <Copy className="h-3.5 w-3.5" />
            Скопировать приглашение
          </button>
        </div>
        <ButtonLink href={`/room/${room.id}`} className="shrink-0">
          Войти <ArrowRight className="ml-2 h-4 w-4" />
        </ButtonLink>
      </div>
    </motion.article>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="surface-inset rounded-[20px] p-3.5">
      <p className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-smoke">{icon}{label}</p>
      <p className="font-semibold text-platinum">{value}</p>
    </div>
  );
}

function modeLabel(mode: Room["mode"]) {
  return {
    "arena-sprint": "Гонка шаров",
    "duel-clash": "Дуэль арены",
    "claw-machine": "Автомат с шарами",
    "slot-reveal": "Раскрытие символов"
  }[mode];
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Copy, Gauge, Sparkles, Users } from "lucide-react";
import { Room } from "@/lib/domain/types";
import { formatBonus } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { LiveStatus } from "@/components/domain/badges";

export function RoomCard({ room, featured = false }: { room: Room; featured?: boolean }) {
  const isChinchillaRace = room.mode === "chinchilla-race";
  const isDuelClash = room.mode === "duel-clash";
  const isMascotSpecial = isChinchillaRace || isDuelClash;
  const [mascotNoteVisible, setMascotNoteVisible] = useState(isMascotSpecial);
  const [copyLabel, setCopyLabel] = useState("Скопировать ссылку");

  useEffect(() => {
    if (!isMascotSpecial) return;
    setMascotNoteVisible(true);
    const timer = window.setTimeout(() => setMascotNoteVisible(false), 4400);
    return () => window.clearTimeout(timer);
  }, [isMascotSpecial, room.id]);

  const copyRoomLink = async () => {
    const link = `${window.location.origin}${room.inviteUrl}`;
    await navigator.clipboard.writeText(link);
    setCopyLabel("Ссылка скопирована");
    window.setTimeout(() => setCopyLabel("Скопировать ссылку"), 1600);
  };

  return (
    <motion.article
      whileHover={{ y: -4 }}
      onHoverStart={() => isMascotSpecial && setMascotNoteVisible(true)}
      className="relative flex h-full flex-col overflow-visible rounded-[28px]"
    >
      {isMascotSpecial ? (
        <div className="pointer-events-none absolute left-4 top-0 z-20 flex -translate-y-1/2 items-end gap-3">
          <motion.div
            animate={{ opacity: mascotNoteVisible ? 1 : 0, y: mascotNoteVisible ? 0 : -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="max-w-[182px] rounded-[20px] border border-gold/20 bg-[linear-gradient(180deg,rgba(255,205,24,0.18),rgba(8,10,14,0.90))] px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.24),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-md"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">{isDuelClash ? "Дуэль шиншилл" : "Гонки шиншилл"}</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-platinum">
              {isDuelClash ? "Моя боевая комната." : "Моя любимая комната."}
              <br />
              {isDuelClash ? "Тут будет мощная дуэль" : "Здесь прямо сочный заезд"}
            </p>
          </motion.div>
          <motion.div
            animate={{ y: [0, -5, 0], x: [0, 3, 0], rotate: [0, -3, 0] }}
            transition={{ duration: 3.8, ease: "easeInOut", repeat: Infinity }}
            className="relative h-24 w-24 shrink-0"
          >
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.20),transparent_68%)] blur-sm" />
            <Image
              src="/mascots/shina.png"
              alt=""
              fill
              className="object-contain drop-shadow-[0_16px_40px_rgba(0,0,0,0.42)]"
              priority={false}
            />
          </motion.div>
        </div>
      ) : null}
      <div className={`surface-solid relative flex h-full flex-col rounded-[28px] p-5 md:p-6 ${isMascotSpecial ? "border border-gold/20 shadow-[0_24px_80px_rgba(255,205,24,0.10),inset_0_1px_0_rgba(255,255,255,0.075)]" : ""}`}>
        {isMascotSpecial ? (
          <div className="pointer-events-none absolute inset-0 opacity-85">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.20),transparent_60%)]" />
            <div className={`absolute bottom-[-7rem] left-8 h-72 w-72 rounded-full ${isDuelClash ? "bg-[radial-gradient(circle,rgba(228,80,61,0.13),transparent_64%)]" : "bg-[radial-gradient(circle,rgba(57,217,138,0.11),transparent_64%)]"}`} />
            <div className="absolute left-1/3 top-8 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.10),transparent_70%)]" />
          </div>
        ) : null}
        <div className="relative mb-5 flex items-start justify-between gap-4">
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <LiveStatus status={room.status} />
              <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-smoke shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                {room.publicId}
              </span>
            </div>
            <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-platinum">{room.title}</h3>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-smoke">
              <span>{modeLabel(room.mode)}</span>
              <span>·</span>
              <span>{room.boostEnabled ? room.boostLabel : "без буста"}</span>
              <span className="inline-flex rounded-full bg-gold/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gold">
                {room.prizePoolPercent}% фонда победителю
              </span>
            </p>
          </div>
          <div className="relative flex flex-col items-end gap-2">
            {featured ? <span className="rounded-full bg-gold px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink shadow-glow">Лучшая</span> : null}
            {isMascotSpecial ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-gold">
                <Sparkles className="h-3.5 w-3.5" /> Special
              </span>
            ) : null}
          </div>
        </div>
        <div className="relative grid grid-cols-2 gap-3 text-sm">
          <Metric label="Вход" value={formatBonus(room.entryCost)} />
          <Metric label="Фонд" value={formatBonus(room.prizePool)} />
          <Metric icon={<Users className="h-4 w-4" />} label="Места" value={`${room.occupied}/${room.seats}`} />
          <Metric icon={<Gauge className="h-4 w-4" />} label="Буст" value={boostGainLabel(room)} tone={room.boostEnabled ? "gold" : "default"} />
        </div>
        <div className="relative mt-6 h-2.5 overflow-hidden rounded-full bg-white/8">
          <div className={`h-full rounded-full ${isDuelClash ? "bg-gradient-to-r from-[#e4503d] via-gold to-[#b86cff]" : isChinchillaRace ? "bg-gradient-to-r from-gold via-jade to-[#53c7ff]" : "bg-gradient-to-r from-gold via-[#ffe06a] to-gold"}`} style={{ width: `${room.fillRate}%` }} />
        </div>
        <div className="relative mt-5 flex items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="max-w-[34rem] text-xs leading-5 text-smoke">{room.boostEnabled ? `${room.boostImpact}. Один буст до старта.` : "Буст отключен для этой конфигурации."}</p>
            <button
              type="button"
              onClick={() => void copyRoomLink()}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-smoke transition surface-inset hover:bg-[rgba(255,205,24,0.08)] hover:text-platinum"
            >
              <Copy className="h-3.5 w-3.5" />
              {copyLabel}
            </button>
          </div>
          <ButtonLink href={`/room/${room.id}`} className="shrink-0">
            Войти <ArrowRight className="ml-2 h-4 w-4" />
          </ButtonLink>
        </div>
      </div>
    </motion.article>
  );
}

function Metric({ label, value, icon, tone = "default" }: { label: string; value: string; icon?: React.ReactNode; tone?: "default" | "gold" | "jade" | "ember" | "blue" }) {
  const toneClass = {
    default: "bg-white/[0.055] text-platinum",
    gold: "bg-gold/12 text-gold",
    jade: "bg-jade/10 text-jade",
    ember: "bg-ember/10 text-ember",
    blue: "bg-[rgba(83,199,255,0.10)] text-[#53c7ff]"
  }[tone];
  return (
    <div className={`${toneClass} rounded-[20px] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]`}>
      <p className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-smoke">{icon}{label}</p>
      <p className="font-semibold text-platinum">{value}</p>
    </div>
  );
}

function modeLabel(mode: Room["mode"]) {
  return {
    "arena-sprint": "Гонка шаров",
    "duel-clash": "Дуэль шиншилл",
    "claw-machine": "Призовой автомат",
    "slot-reveal": "Магия имени",
    "chinchilla-race": "Гонки шиншилл"
  }[mode];
}

function boostGainLabel(room: Room) {
  if (!room.boostEnabled) return "выкл";
  if (typeof room.boostAbsoluteGainPercent === "number" && Number.isFinite(room.boostAbsoluteGainPercent)) {
    const rounded = Math.round(room.boostAbsoluteGainPercent * 100) / 100;
    return `+${Number.isInteger(rounded) ? rounded : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
  }
  return room.boostImpact?.match(/\+[\d.]+%/)?.[0] ?? "доступен";
}

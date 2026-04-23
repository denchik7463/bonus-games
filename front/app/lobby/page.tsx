"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Sparkles, Trophy } from "lucide-react";
import { AppFrame } from "@/components/layout/app-nav";
import { ButtonLink } from "@/components/ui/button";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { RoomCard } from "@/components/domain/room-card";
import { useAppStore } from "@/lib/store/app-store";
import { BalanceBadge, VipBadge } from "@/components/domain/badges";
import { roomApiService } from "@/src/features/rooms/model/service";
import { getUserFriendlyError } from "@/src/shared/api/errors";
import { roomQueryKeys } from "@/src/features/rooms/model/query-keys";

export default function LobbyPage() {
  const user = useAppStore((state) => state.user);
  const { data: rooms = [], error: roomsError } = useQuery({
    queryKey: roomQueryKeys.waiting,
    queryFn: roomApiService.getWaitingRooms,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000
  });

  return (
    <AppFrame>
      <section className="lobby-hero-slab relative mb-8 min-h-[560px] overflow-hidden rounded-[36px] bg-[rgba(9,10,13,0.98)]">
        <Image
          src="/Main.png"
          alt=""
          fill
          className="lobby-hero-backdrop lobby-hero-backdrop--dark scale-105 object-cover object-center opacity-40 blur-[2px]"
          priority
          unoptimized
        />
        <Image
          src="/Main2.png"
          alt=""
          fill
          className="lobby-hero-backdrop lobby-hero-backdrop--light scale-105 object-cover object-center opacity-40 blur-[2px]"
          priority
          unoptimized
        />
        <div className="absolute inset-y-0 right-0 w-[68%] max-w-[920px] opacity-95">
          <Image
            src="/Main.png"
            alt=""
            fill
            className="lobby-hero-figure lobby-hero-figure--dark object-contain object-right drop-shadow-[0_34px_90px_rgba(0,0,0,0.46)]"
            priority
            unoptimized
          />
          <Image
            src="/Main2.png"
            alt=""
            fill
            className="lobby-hero-figure lobby-hero-figure--light object-contain object-right drop-shadow-[0_30px_72px_rgba(90,105,130,0.18)]"
            priority
            unoptimized
          />
        </div>
        <div className="lobby-hero-veil absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(255,205,24,.16),transparent_30%),linear-gradient(105deg,rgba(5,5,5,.97),rgba(5,6,8,.88)_45%,rgba(5,6,8,.42)_72%,rgba(5,6,8,.16))]" />
        <div className="brand-scope left-[58%] top-[12%] h-[340px] w-[340px] motion-safe:animate-[lobby-brand-drift_18s_ease-in-out_infinite]" />
        <div className="relative z-10 flex min-h-[560px] max-w-4xl flex-col justify-center p-6 md:p-10 xl:p-12">
          <div className="mb-5 flex flex-wrap gap-2">
            <VipBadge tier={user.tier} />
            <BalanceBadge balance={user.balance} reserved={user.reservedBalance ?? 0} />
          </div>
          <p className="brand-kicker mb-5">Закрытый игровой лаунж</p>
          <h1 className="brand-display text-balance text-5xl font-black text-platinum md:text-7xl">
            VIP-комнаты,
            <br />
            где каждый <span className="brand-marker"> розыгрыш</span>
            <br />
            ощущается
            <span className="text-gold"> событием</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-smoke md:text-lg">
            Выберите темп и вход — остальное мы превратим в короткое шоу. Одно решение перед стартом, сильный финал и момент, который хочется повторить.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/matchmaking">Быстрый подбор <ArrowRight className="ml-2 h-4 w-4" /></ButtonLink>
            <ButtonLink href="/rooms" variant="secondary">Активные комнаты</ButtonLink>
          </div>
        </div>
      </section>

      <section className="user-premium-card relative mt-2 overflow-hidden rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_55%),rgba(8,10,14,0.55)] px-6 py-6 shadow-[0_26px_84px_rgba(0,0,0,0.38)] backdrop-blur-xl md:px-8">
        <div className="absolute inset-0 opacity-70 [mask-image:radial-gradient(circle_at_30%_20%,black,transparent_62%)]">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.18),transparent_62%)]" />
          <div className="absolute -right-20 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.14),transparent_62%)]" />
        </div>
        <div className="relative grid gap-4 md:grid-cols-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/10 text-gold shadow-[0_0_28px_rgba(255,205,24,0.12)]">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-platinum">Быстрый раунд</p>
              <p className="mt-1 text-sm leading-7 text-smoke">Зашли, выбрали место и сразу ждете розыгрыш. Формат без долгого ожидания.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 md:pl-2">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/10 text-gold shadow-[0_0_28px_rgba(255,205,24,0.12)]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-platinum">Буст шанса</p>
              <p className="mt-1 text-sm leading-7 text-smoke">Можно усилить выбранное место до старта. Это повышает шанс, но победу не гарантирует.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 md:pl-2">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/10 text-gold shadow-[0_0_28px_rgba(255,205,24,0.12)]">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-platinum">Понятный финал</p>
              <p className="mt-1 text-sm leading-7 text-smoke">В конце видно, какое место выиграло и кто сидел на нем в этом раунде.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader eyebrow="Сейчас" title="Активные комнаты" description="Заходите в уже созданную комнату — или запустите быстрый подбор." />
        {rooms.length ? (
          <div className="grid gap-5 lg:grid-cols-2">{rooms.map((room) => <RoomCard key={room.id} room={room} />)}</div>
        ) : roomsError ? (
          <Panel>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Комнаты временно недоступны</h2>
            <p className="mt-2 text-sm text-smoke">{getUserFriendlyError(roomsError)}</p>
          </Panel>
        ) : (
          <Panel>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Активных комнат пока нет</h2>
            <p className="mt-2 text-sm text-smoke">Запустите игру через подбор или выберите готовый шаблон.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ButtonLink href="/matchmaking">Подбор</ButtonLink>
              <ButtonLink href="/rooms" variant="secondary">Все комнаты</ButtonLink>
            </div>
          </Panel>
        )}
      </section>
    </AppFrame>
  );
}

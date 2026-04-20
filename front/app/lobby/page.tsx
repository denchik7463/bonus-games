"use client";

import Image from "next/image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Clock, Sparkles, Trophy } from "lucide-react";
import { AppFrame } from "@/components/layout/app-nav";
import { ButtonLink } from "@/components/ui/button";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { RoomCard } from "@/components/domain/room-card";
import { useAppStore } from "@/lib/store/app-store";
import { BalanceBadge, VipBadge } from "@/components/domain/badges";
import { useRouter } from "next/navigation";
import { formatBonus } from "@/lib/utils";
import { roomApiService } from "@/src/features/rooms/model/service";
import { getUserFriendlyError } from "@/src/shared/api/errors";
import { roomQueryKeys } from "@/src/features/rooms/model/query-keys";
import { roomTemplateQueryKeys } from "@/src/features/room-templates/model/query-keys";
import { roomTemplateService } from "@/src/features/room-templates/model/service";
import { profileToTestUser } from "@/src/features/auth/lib/profile-to-user";
import { useAuthStore } from "@/src/features/auth/model/store";

export default function LobbyPage() {
  const user = useAppStore((state) => state.user);
  const setActiveRoom = useAppStore((state) => state.setActiveRoom);
  const updateUser = useAppStore((state) => state.updateUser);
  const authSession = useAuthStore((state) => state.session);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const router = useRouter();
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templatePendingId, setTemplatePendingId] = useState<string | null>(null);
  const { data: rooms = [], error: roomsError } = useQuery({ queryKey: roomQueryKeys.waiting, queryFn: roomApiService.getWaitingRooms });
  const {
    data: templates = [],
    error: templatesError,
    isLoading: templatesLoading
  } = useQuery({ queryKey: roomTemplateQueryKeys.visible, queryFn: roomTemplateService.getVisibleTemplates });

  async function handleTemplateStart(templateId: string, entryCost: number) {
    setTemplateError(null);

    if (user.balance < entryCost) {
      setTemplateError(
        `Недостаточно бонусных баллов: для входа нужно ${formatBonus(entryCost)}, а на балансе сейчас ${formatBonus(user.balance)}. Выберите шаблон дешевле или другой тестовый профиль.`
      );
      return;
    }

    setTemplatePendingId(templateId);
    try {
      const template = templates.find((item) => item.id === templateId);
      if (!template) throw new Error("Шаблон не найден.");
      const room = await roomApiService.createAndJoinRoom(template, user);
      setActiveRoom(room);
      if (authSession) {
        refreshProfile(authSession)
          .then((profile) => updateUser(profileToTestUser(profile)))
          .catch(() => undefined);
      }
      router.push(`/room/${room.id}`);
    } catch (error) {
      setTemplateError(getUserFriendlyError(error));
    } finally {
      setTemplatePendingId(null);
    }
  }

  return (
    <AppFrame>
      <section className="lobby-hero-slab relative mb-8 min-h-[560px] overflow-hidden rounded-[36px] bg-[rgba(9,10,13,0.98)]">
        <Image src="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1800&q=80" alt="" fill className="object-cover opacity-24" priority />
        <div className="lobby-hero-veil absolute inset-[-8%] bg-[radial-gradient(circle_at_78%_12%,rgba(255,205,24,.2),transparent_28%),linear-gradient(110deg,rgba(5,5,5,.96),rgba(5,6,8,.86)_52%,rgba(5,6,8,.52))]" />
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
            где каждый
            <span className="brand-marker"> розыгрыш</span>
            <br />
            ощущается
            <span className="text-gold"> событием</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-smoke md:text-lg">
            Выберите темп и вход — остальное мы превратим в короткое шоу. Одно решение перед стартом, сильный финал и момент, который хочется повторить.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/matchmaking">Быстрый подбор <ArrowRight className="ml-2 h-4 w-4" /></ButtonLink>
            <ButtonLink href="#templates" variant="secondary">Шаблоны комнат</ButtonLink>
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
              <p className="text-sm font-semibold text-platinum">Короткий цикл</p>
              <p className="mt-1 text-sm leading-7 text-smoke">От входа до результата — компактно. Без “долго жду”, только действие.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 md:pl-2">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/10 text-gold shadow-[0_0_28px_rgba(255,205,24,0.12)]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-platinum">Один буст</p>
              <p className="mt-1 text-sm leading-7 text-smoke">Одно решение перед стартом — и дальше только шоу раскрытия.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 md:pl-2">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/10 text-gold shadow-[0_0_28px_rgba(255,205,24,0.12)]">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-platinum">Комбинация</p>
              <p className="mt-1 text-sm leading-7 text-smoke">Победа оставляет код — в результате и истории. Есть что собирать.</p>
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
              <ButtonLink href="#templates" variant="secondary">Шаблоны</ButtonLink>
            </div>
          </Panel>
        )}
      </section>

      <section className="mt-10">
        <div id="templates" />
        <SectionHeader eyebrow="Один клик" title="Шаблоны комнат" description="Выберите сценарий — мы найдём подходящую комнату или создадим новую и сразу перенесём внутрь." />
        {templateError ? (
          <div className="mb-4 flex items-start gap-3 rounded-[24px] bg-[linear-gradient(135deg,rgba(255,78,78,0.14),rgba(255,205,24,0.08)),rgba(18,11,11,0.82)] px-5 py-4 shadow-[0_22px_70px_rgba(0,0,0,0.32)]">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ember/15 text-ember">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black tracking-[-0.02em] text-platinum">Шаблон не запущен</p>
              <p className="mt-1 text-sm leading-6 text-smoke">{templateError}</p>
            </div>
          </div>
        ) : null}
        {templatesLoading ? (
          <Panel>Загружаем шаблоны...</Panel>
        ) : templatesError ? (
          <Panel>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Не удалось загрузить шаблоны</h2>
            <p className="mt-2 text-sm text-smoke">{getUserFriendlyError(templatesError)}</p>
          </Panel>
        ) : templates.length === 0 ? (
          <Panel>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Опубликованных шаблонов пока нет</h2>
            <p className="mt-2 text-sm text-smoke">Администратор может создать и опубликовать шаблон в конфигураторе.</p>
          </Panel>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateStart(template.id, template.entryCost)}
                disabled={templatePendingId === template.id}
                className="template-card group relative overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012)),rgba(8,10,14,0.9)] p-5 text-left shadow-[0_26px_80px_rgba(0,0,0,0.38)] transition duration-200 hover:translate-y-[-2px] disabled:cursor-wait disabled:opacity-70"
              >
                <div className="absolute inset-0 opacity-0 transition duration-200 group-hover:opacity-100">
                  <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.18),transparent_62%)]" />
                  <div className="absolute -right-28 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.14),transparent_62%)]" />
                </div>
                <p className="template-kicker relative mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold/90">Готовый сценарий</p>
                <h3 className="relative text-xl font-black tracking-[-0.04em] text-platinum">{template.title}</h3>
                <div className="mt-4 space-y-2 text-sm text-smoke">
                  <p><span className="text-smoke">Цена:</span> <span className="font-semibold text-platinum">{template.entryCost}</span></p>
                  <p><span className="text-smoke">Участников:</span> <span className="font-semibold text-platinum">{template.seats}</span></p>
                  <p><span className="text-smoke">Буст:</span> <span className="font-semibold text-platinum">{template.boostEnabled ? "есть" : "нет"}</span></p>
                </div>
                <div className="mt-4">
                  <span className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-gold px-5 py-2.5 text-sm font-extrabold tracking-[-0.01em] text-ink shadow-glow transition duration-200 group-hover:bg-[#ffd84a]">
                    {templatePendingId === template.id ? "Готовим комнату..." : "Играть по шаблону"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </AppFrame>
  );
}

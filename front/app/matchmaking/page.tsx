"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { AppFrame } from "@/components/layout/app-nav";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/panel";
import { RoomCard } from "@/components/domain/room-card";
import { useAppStore } from "@/lib/store/app-store";
import { cn, formatBonus } from "@/lib/utils";
import { roomApiService } from "@/src/features/rooms/model/service";
import { getUserFriendlyError } from "@/src/shared/api/errors";
import { roomQueryKeys } from "@/src/features/rooms/model/query-keys";
import { roomTemplateQueryKeys } from "@/src/features/room-templates/model/query-keys";
import { buildTemplateFilterOptions, findMatchingTemplates, getBoostCostOptions } from "@/src/features/room-templates/model/selectors";
import { roomTemplateService } from "@/src/features/room-templates/model/service";
import { profileToTestUser } from "@/src/features/auth/lib/profile-to-user";
import { useAuthStore } from "@/src/features/auth/model/store";

export default function MatchmakingPage() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setActiveRoom = useAppStore((state) => state.setActiveRoom);
  const updateUser = useAppStore((state) => state.updateUser);
  const authSession = useAuthStore((state) => state.session);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [entryCost, setEntryCost] = useState<number | null>(null);
  const [seats, setSeats] = useState<number | null>(null);
  const [boostDesired, setBoostDesired] = useState<boolean | null>(null);
  const [boostCost, setBoostCost] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templatePendingId, setTemplatePendingId] = useState<string | null>(null);
  const { data: templates = [], isLoading: templatesLoading, error: templatesError } = useQuery({
    queryKey: roomTemplateQueryKeys.visible,
    queryFn: roomTemplateService.getVisibleTemplates
  });

  const filterOptions = useMemo(() => buildTemplateFilterOptions(templates), [templates]);
  const priceOptions = filterOptions.entryCosts;
  const seatOptions = filterOptions.seats;
  const boostOptions = filterOptions.boostAllowed;
  const boostPriceOptions = useMemo(() => getBoostCostOptions(templates, { entryCost, seats }), [entryCost, seats, templates]);

  useEffect(() => {
    if (!templates.length) return;
    setEntryCost((value) => value !== null && priceOptions.includes(value) ? value : priceOptions[0] ?? null);
    setSeats((value) => value !== null && seatOptions.includes(value) ? value : seatOptions[0] ?? null);
    setBoostDesired((value) => value !== null && boostOptions.includes(value) ? value : boostOptions[0] ?? null);
  }, [boostOptions, priceOptions, seatOptions, templates.length]);

  useEffect(() => {
    if (boostDesired) {
      setBoostCost((value) => value && boostPriceOptions.includes(value) ? value : boostPriceOptions[0] ?? null);
    } else {
      setBoostCost(null);
    }
  }, [boostDesired, boostPriceOptions]);

  const boostReady = boostDesired === false || (boostDesired === true && boostCost !== null);
  const filtersReady = entryCost !== null && seats !== null && boostDesired !== null && boostReady;
  const filteredRoomsQuery = useQuery({
    queryKey: roomQueryKeys.filter({ entryCost, maxPlayers: seats, boostAllowed: boostDesired }),
    queryFn: () => roomApiService.filterRooms({
      entryCost: entryCost ?? undefined,
      maxPlayers: seats ?? undefined,
      boostAllowed: boostDesired ?? undefined
    }),
    enabled: searched && filtersReady
  });
  const filteredActiveRooms = filteredRoomsQuery.data ?? [];
  const matchingTemplates = filtersReady ? findMatchingTemplates(templates, { entryCost, seats, boostEnabled: boostDesired, boostCost }) : [];
  const fallbackTemplates = matchingTemplates.length ? matchingTemplates : templates;
  const chart = [
    { subject: "Фонд", value: entryCost && seats ? entryCost * seats / 40 : 0 },
    { subject: "Заполнение", value: seats ? seats * 11 : 0 },
    { subject: "Буст", value: boostDesired ? 78 : 32 }
  ];

  async function handleTemplateStart(templateId: string, templateEntryCost: number) {
    setTemplateError(null);
    if (user.balance < templateEntryCost) {
      setTemplateError(`Недостаточно бонусных баллов: нужно ${formatBonus(templateEntryCost)}, на балансе ${formatBonus(user.balance)}.`);
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
      <section className="user-premium-hero surface-solid relative mb-8 overflow-hidden rounded-[36px] p-6 md:p-8 xl:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.18),transparent_62%)]" />
          <div className="absolute right-[-8rem] top-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.12),transparent_64%)]" />
          <div className="absolute bottom-[-14rem] left-[40%] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.08),transparent_64%)]" />
        </div>
        <div className="relative max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            Подбор комнаты
          </p>
          <h1 className="text-balance text-4xl font-black leading-[0.98] tracking-[-0.05em] text-platinum md:text-6xl">
            Выберите готовые параметры,
            <br />
            а мы покажем <span className="brand-marker">живые комнаты</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-smoke md:text-lg">
            Доступные значения приходят из шаблонов. Сначала ищем активные комнаты, а если их нет — предлагаем готовый сценарий для нового раунда.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(420px,0.82fr)] xl:items-stretch">
        <div className="user-premium-card surface-solid relative h-full min-h-[500px] overflow-hidden rounded-[32px] p-6">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.14),transparent_64%)]" />
          <div className="relative">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke">Фильтры из шаблонов</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-platinum">Соберите ритм игры</h2>
            </div>
            <div className="space-y-5">
              <PriceSelector options={priceOptions} value={entryCost} onChange={(value) => { setEntryCost(value); setSearched(false); }} />
              <SeatSlider options={seatOptions} value={seats} onChange={(value) => { setSeats(value); setSearched(false); }} />
              <BoostSelector
                options={boostOptions}
                priceOptions={boostPriceOptions}
                value={boostDesired}
                boostCost={boostCost}
                onBoostChange={(value) => { setBoostDesired(value); setSearched(false); }}
                onCostChange={(value) => { setBoostCost(value); setSearched(false); }}
              />
              <Button onClick={() => setSearched(true)} className="w-full" disabled={!filtersReady}>
                Найти активные комнаты
              </Button>
            </div>
          </div>
        </div>

        <div className="user-premium-card surface-solid relative h-full min-h-[430px] overflow-hidden rounded-[32px] p-6">
          <div className="pointer-events-none absolute inset-0 opacity-65">
            <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.18),transparent_62%)]" />
            <div className="absolute -left-24 bottom-[-8rem] h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.10),transparent_64%)]" />
          </div>
          <div className="relative mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke">Сценарий</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-platinum">Профиль комнаты</h2>
          </div>
          <div className="relative">
            <div className="h-[410px] min-w-0 md:h-[450px] xl:h-[470px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chart}>
                  <PolarGrid stroke="var(--chart-grid)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--chart-label)", fontSize: 12, fontWeight: 700 }} />
                  <Radar dataKey="value" stroke="var(--chart-accent)" fill="var(--chart-fill)" fillOpacity={1} strokeWidth={2.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 px-1 text-xs leading-6 text-muted">
              Подсказка: это визуальная оценка выбранных параметров, а не гарантия результата.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <SectionHeader eyebrow="Шаг 1" title="Активные комнаты" description="Сначала показываем уже существующие игровые сессии с выбранными параметрами." />
        {templatesLoading ? (
          <div className="user-premium-card surface-solid rounded-[28px] p-6">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Загружаем доступные параметры</h2>
            <p className="mt-2 text-sm leading-7 text-smoke">Берем цены, места и бусты из опубликованных шаблонов backend.</p>
          </div>
        ) : templatesError ? (
          <div className="user-premium-card surface-solid rounded-[28px] p-6">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Не удалось загрузить шаблоны</h2>
            <p className="mt-2 text-sm leading-7 text-smoke">{getUserFriendlyError(templatesError)}</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="user-premium-card surface-solid rounded-[28px] p-6">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Нет опубликованных шаблонов</h2>
            <p className="mt-2 text-sm leading-7 text-smoke">Подбор станет доступен после публикации хотя бы одного шаблона администратором.</p>
          </div>
        ) : !searched ? (
          <div className="user-premium-card surface-solid rounded-[28px] p-6">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Выберите фильтры и запустите поиск</h2>
            <p className="mt-2 text-sm leading-7 text-smoke">Комнаты не создаются произвольно: фильтры основаны на опубликованных шаблонах.</p>
          </div>
        ) : filteredRoomsQuery.isLoading ? (
          <div className="user-premium-card surface-solid rounded-[28px] p-6">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Ищем активные комнаты</h2>
            <p className="mt-2 text-sm leading-7 text-smoke">Проверяем backend по выбранным параметрам.</p>
          </div>
        ) : filteredRoomsQuery.error ? (
          <div className="user-premium-card surface-solid rounded-[28px] p-6">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Не удалось проверить активные комнаты</h2>
            <p className="mt-2 text-sm leading-7 text-smoke">{getUserFriendlyError(filteredRoomsQuery.error)}</p>
          </div>
        ) : filteredActiveRooms.length ? (
          <div className="grid gap-5 lg:grid-cols-2">{filteredActiveRooms.map((room) => <RoomCard key={room.id} room={room} />)}</div>
        ) : (
          <div className="user-premium-card surface-solid rounded-[30px] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Подходящих активных комнат нет</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-smoke">Можно выбрать готовый шаблон комнаты. После выбора система создаст активную комнату с этими параметрами.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 text-sm font-semibold text-gold">
                <Sparkles className="h-4 w-4" />
                Шаблоны доступны
              </span>
            </div>
            {templateError ? (
              <div className="mt-5 flex items-start gap-3 rounded-[22px] bg-ember/10 p-4 text-sm text-ember">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {templateError}
              </div>
            ) : null}
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {fallbackTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateStart(template.id, template.entryCost)}
                  disabled={templatePendingId === template.id}
                  className="template-card group relative overflow-hidden rounded-[28px] p-5 text-left transition duration-200 hover:translate-y-[-2px] disabled:cursor-wait disabled:opacity-70"
                >
                  <p className="template-kicker mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Готовый сценарий</p>
                  <h3 className="text-xl font-black tracking-[-0.04em] text-platinum">{template.title}</h3>
                  <div className="mt-4 grid gap-2 text-sm text-smoke">
                    <p>Цена: <span className="font-semibold text-platinum">{formatBonus(template.entryCost)}</span></p>
                    <p>Участников: <span className="font-semibold text-platinum">{template.seats}</span></p>
                    <p>Буст: <span className="font-semibold text-platinum">{template.boostEnabled ? "есть" : "нет"}</span></p>
                  </div>
                  <span className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-gold px-5 py-2.5 text-sm font-extrabold text-ink shadow-glow">
                    {templatePendingId === template.id ? "Готовим комнату..." : "Создать комнату"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </AppFrame>
  );
}

function PriceSelector({ options, value, onChange }: { options: number[]; value: number | null; onChange: (value: number) => void }) {
  const compact = options.length <= 6;
  return (
    <div className="premium-filter-shell rounded-[26px] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black tracking-[-0.02em] text-platinum">Цена входа</p>
          <p className="mt-1 text-xs text-muted">Только цены из опубликованных шаблонов</p>
        </div>
        {value ? <span className="rounded-full bg-gold px-3 py-1 text-xs font-black text-ink">{formatBonus(value)}</span> : null}
      </div>
      {compact ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                value === option ? "bg-gold text-ink shadow-glow" : "bg-white/[0.065] text-smoke hover:bg-gold/10 hover:text-platinum"
              )}
            >
              {formatBonus(option)}
            </button>
          ))}
        </div>
      ) : (
        <label className="relative block">
          <select
            value={value ?? ""}
            onChange={(event) => onChange(Number(event.target.value))}
            className="premium-select h-12 w-full appearance-none rounded-2xl px-4 pr-11 text-sm font-bold outline-none"
          >
            {options.map((option) => (
              <option key={option} value={option}>{formatBonus(option)}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
        </label>
      )}
    </div>
  );
}

function SeatSlider({ options, value, onChange }: { options: number[]; value: number | null; onChange: (value: number) => void }) {
  const safeOptions = options.length ? options : [2];
  const current = value ?? safeOptions[0];
  const min = Math.min(...safeOptions, 2);
  const max = 10;

  function snapSeat(next: number) {
    const closest = safeOptions.reduce((best, option) => (
      Math.abs(option - next) < Math.abs(best - next) ? option : best
    ), safeOptions[0]);
    onChange(Math.min(10, Math.max(2, closest)));
  }

  return (
    <div className="premium-filter-shell rounded-[24px] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black tracking-[-0.02em] text-platinum">Количество мест</p>
          <p className="mt-1 text-xs text-muted">До 10 человек, только доступные значения</p>
        </div>
        <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl bg-gold text-base font-black text-ink shadow-glow">
          {current}
        </span>
      </div>
      <input
        aria-label="Количество мест"
        type="range"
        min={min}
        max={max}
        step={1}
        value={current}
        onChange={(event) => snapSeat(Number(event.target.value))}
        className="premium-range mt-4 w-full"
      />
      <div className="mt-2 flex justify-between text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
        <span>2 места</span>
        <span>10 мест</span>
      </div>
    </div>
  );
}

function BoostSelector({
  options,
  priceOptions,
  value,
  boostCost,
  onBoostChange,
  onCostChange
}: {
  options: boolean[];
  priceOptions: number[];
  value: boolean | null;
  boostCost: number | null;
  onBoostChange: (value: boolean) => void;
  onCostChange: (value: number) => void;
}) {
  const canUseBoost = options.includes(true);
  const enabled = Boolean(value && canUseBoost);

  return (
    <div className="premium-filter-shell rounded-[24px] p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <label className={cn("boost-inline-toggle flex cursor-pointer items-center gap-3 rounded-[20px] px-4 py-3 transition", enabled && "boost-inline-toggle--active", !canUseBoost && "cursor-not-allowed opacity-50")}>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#ffcd18]"
            checked={enabled}
            disabled={!canUseBoost}
            onChange={(event) => onBoostChange(event.target.checked)}
          />
          <span>
            <span className="block text-sm font-black tracking-[-0.02em] text-platinum">Буст</span>
            <span className="block text-xs text-muted">Один раз до старта, не гарантирует победу</span>
          </span>
        </label>

        <label className={cn("relative min-w-0 flex-1 md:max-w-[230px]", !enabled && "opacity-45")}>
          <select
            value={boostCost ?? ""}
            disabled={!enabled || !priceOptions.length}
            onChange={(event) => onCostChange(Number(event.target.value))}
            className="premium-select h-12 w-full appearance-none rounded-2xl px-4 pr-11 text-sm font-bold outline-none disabled:cursor-not-allowed"
          >
            {priceOptions.map((price) => (
              <option key={price} value={price}>{formatBonus(price)}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
        </label>
      </div>
    </div>
  );
}

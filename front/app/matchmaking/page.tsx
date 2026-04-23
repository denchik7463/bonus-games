"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { ChevronDown } from "lucide-react";
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
import { buildTemplateFilterOptions, getBoostCostOptions } from "@/src/features/room-templates/model/selectors";
import { roomTemplateService } from "@/src/features/room-templates/model/service";
import type { Room } from "@/lib/domain/types";

export default function MatchmakingPage() {
  const queryClient = useQueryClient();
  const user = useAppStore((state) => state.user);
  const [entryCost, setEntryCost] = useState<number | null>(null);
  const [seats, setSeats] = useState<number | null>(null);
  const [prizeFund, setPrizeFund] = useState<number | null>(null);
  const [boostDesired, setBoostDesired] = useState<boolean | null>(null);
  const [boostCost, setBoostCost] = useState<number | null>(null);
  const [seatsToBuy, setSeatsToBuy] = useState(1);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPending, setSearchPending] = useState(false);
  const [searchRooms, setSearchRooms] = useState<Room[]>([]);
  const { data: templates = [], isLoading: templatesLoading, error: templatesError } = useQuery({
    queryKey: roomTemplateQueryKeys.visible,
    queryFn: roomTemplateService.getVisibleTemplates
  });
  const { data: initialRooms = [], isLoading: roomsLoading, error: roomsError } = useQuery({
    queryKey: roomQueryKeys.waiting,
    queryFn: roomApiService.getWaitingRooms,
    refetchInterval: searched ? false : 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000
  });

  const filterOptions = useMemo(() => buildTemplateFilterOptions(templates), [templates]);
  const roomFallbackOptions = useMemo(() => ({
    entryCosts: Array.from(new Set(initialRooms.map((room) => room.entryCost))).filter(Number.isFinite).sort((a, b) => a - b),
    prizeFunds: Array.from(new Set(initialRooms.map((room) => room.prizePool))).filter(Number.isFinite).sort((a, b) => a - b),
    seats: Array.from(new Set(initialRooms.map((room) => room.seats))).filter(Number.isFinite).sort((a, b) => a - b),
    boostAllowed: Array.from(new Set(initialRooms.map((room) => room.boostEnabled)))
  }), [initialRooms]);
  const priceOptions = filterOptions.entryCosts.length ? filterOptions.entryCosts : roomFallbackOptions.entryCosts;
  const prizeFundOptions = filterOptions.prizeFunds.length ? filterOptions.prizeFunds : roomFallbackOptions.prizeFunds;
  const seatOptions = filterOptions.seats.length ? filterOptions.seats : roomFallbackOptions.seats;
  const boostOptions = filterOptions.boostAllowed.length ? filterOptions.boostAllowed : roomFallbackOptions.boostAllowed;
  const boostPriceOptions = useMemo(() => getBoostCostOptions(templates, { entryCost, seats }), [entryCost, seats, templates]);

  useEffect(() => {
    if (!templates.length && !initialRooms.length) return;
    setEntryCost((value) => value !== null && priceOptions.includes(value) ? value : priceOptions[0] ?? null);
    setPrizeFund((value) => value !== null && prizeFundOptions.includes(value) ? value : prizeFundOptions[0] ?? null);
    setSeats((value) => value !== null && seatOptions.includes(value) ? value : seatOptions[0] ?? null);
    setBoostDesired((value) => value !== null && boostOptions.includes(value) ? value : boostOptions[0] ?? null);
  }, [boostOptions, initialRooms.length, priceOptions, prizeFundOptions, seatOptions, templates.length]);

  useEffect(() => {
    if (boostDesired) {
      setBoostCost((value) => value && boostPriceOptions.includes(value) ? value : boostPriceOptions[0] ?? null);
    } else {
      setBoostCost(null);
    }
  }, [boostDesired, boostPriceOptions]);

  const boostReady = boostDesired === false || (boostDesired === true && boostCost !== null);
  const filtersReady = entryCost !== null && seats !== null && boostDesired !== null && boostReady;
  const visibleRooms = searched ? searchRooms : initialRooms;
  const chart = [
    { subject: "Фонд", value: entryCost && seats ? entryCost * seats / 40 : 0 },
    { subject: "Заполнение", value: seats ? seats * 11 : 0 },
    { subject: "Буст", value: boostDesired ? 78 : 32 }
  ];

  async function handleSearch() {
    if (!filtersReady) return;
    setSearchError(null);
    setSearchPending(true);
    setSearched(true);
    const totalEntryCost = (entryCost ?? 0) * seatsToBuy;
    if (user.balance < totalEntryCost) {
      setSearchError(`Недостаточно бонусных баллов: нужно ${formatBonus(totalEntryCost)}, на балансе ${formatBonus(user.balance)}.`);
      setSearchPending(false);
      return;
    }
    try {
      const room = await roomApiService.findRoom({
        maxPlayers: seats ?? 2,
        entryCost: entryCost ?? 0,
        boostAllowed: Boolean(boostDesired),
        seatsCount: seatsToBuy
      }, user);
      queryClient.removeQueries({ queryKey: roomQueryKeys.detail(room.id), exact: true });
      setSearchRooms([room]);
    } catch (error) {
      setSearchError(matchmakingErrorMessage(error));
    } finally {
      setSearchPending(false);
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
            Сначала показываем активные комнаты. Если подходящей нет, система создаст комнату по выбранным параметрам.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(420px,0.82fr)] xl:items-stretch">
        <div className="user-premium-card surface-solid relative h-full min-h-[500px] overflow-hidden rounded-[32px] p-6">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.14),transparent_64%)]" />
          <div className="relative">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke">Фильтры комнаты</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-platinum">Соберите ритм игры</h2>
            </div>
            <div className="space-y-5">
              <PriceSelector options={priceOptions} value={entryCost} onChange={(value) => { setEntryCost(value); setSearched(false); }} />
              <PrizeFundSelector options={prizeFundOptions} value={prizeFund} onChange={(value) => { setPrizeFund(value); setSearched(false); }} />
              <SeatSlider options={seatOptions} value={seats} onChange={(value) => { setSeats(value); setSearched(false); }} />
              <SeatsToBuySelector value={seatsToBuy} max={Math.min(5, Math.max(1, Math.floor((seats ?? 2) / 2)))} onChange={(value) => { setSeatsToBuy(value); setSearched(false); }} />
              <BoostSelector
                options={boostOptions}
                priceOptions={boostPriceOptions}
                value={boostDesired}
                boostCost={boostCost}
                onBoostChange={(value) => { setBoostDesired(value); setSearched(false); }}
                onCostChange={(value) => { setBoostCost(value); setSearched(false); }}
              />
              <Button onClick={handleSearch} className="w-full" disabled={!filtersReady || searchPending}>
                {searchPending ? "Подбираем комнату..." : "Найти комнату"}
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
        <SectionHeader eyebrow={searched ? "Результат" : "Сейчас"} title={searched ? "Подходящие комнаты" : "Активные комнаты"} description={searched ? "Если свободной комнаты не было, система создала новую по выбранным параметрам." : "Доступные комнаты показываются сразу. Фильтры помогут сузить выбор."} />
        {templatesLoading || roomsLoading ? (
          <div className="user-premium-card surface-solid rounded-[28px] p-6">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Загружаем комнаты</h2>
            <p className="mt-2 text-sm leading-7 text-smoke">Проверяем актуальные игровые сессии.</p>
          </div>
        ) : templatesError || roomsError ? (
          <div className="user-premium-card surface-solid rounded-[28px] p-6">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Не удалось загрузить комнаты</h2>
            <p className="mt-2 text-sm leading-7 text-smoke">{getUserFriendlyError(templatesError ?? roomsError)}</p>
          </div>
        ) : searchError ? (
          <div className="user-premium-card surface-solid rounded-[28px] p-6">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Не удалось подобрать комнату</h2>
            <p className="mt-2 text-sm leading-7 text-smoke">{searchError}</p>
          </div>
        ) : visibleRooms.length ? (
          <>
            <div className="grid gap-5 lg:grid-cols-2">{visibleRooms.map((room) => <RoomCard key={room.id} room={room} />)}</div>
          </>
        ) : (
          <div className="user-premium-card surface-solid rounded-[28px] p-6">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-platinum">Активных комнат пока нет</h2>
            <p className="mt-2 text-sm leading-7 text-smoke">Выберите параметры выше, и система создаст подходящую комнату.</p>
          </div>
        )}
      </section>
    </AppFrame>
  );
}

function matchmakingErrorMessage(error: unknown) {
  const message = getUserFriendlyError(error);
  const normalized = message.toLowerCase();
  if (normalized.includes("active room template") || normalized.includes("requested parameters")) {
    return "По выбранным параметрам сейчас нет подходящей комнаты. Попробуйте изменить стоимость входа, фонд или количество мест.";
  }
  return message;
}

function SeatsToBuySelector({ value, max, onChange }: { value: number; max: number; onChange: (value: number) => void }) {
  const safeMax = Math.max(1, Math.min(5, max));
  return (
    <div className="premium-filter-shell rounded-[26px] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black tracking-[-0.02em] text-platinum">Сколько мест купить</p>
          <p className="mt-1 text-xs text-muted">Можно купить до 5 мест, но не больше половины комнаты</p>
        </div>
        <span className="rounded-full bg-gold px-3 py-1 text-xs font-black text-ink">{value}</span>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: safeMax }, (_, index) => index + 1).map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => onChange(count)}
            className={cn(
              "h-11 flex-1 rounded-2xl text-sm font-black transition",
              value === count ? "bg-gold text-ink shadow-glow" : "bg-white/[0.065] text-smoke hover:bg-gold/10 hover:text-platinum"
            )}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  );
}

function PriceSelector({ options, value, onChange }: { options: number[]; value: number | null; onChange: (value: number) => void }) {
  const compact = options.length <= 6;
  return (
    <div className="premium-filter-shell rounded-[26px] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black tracking-[-0.02em] text-platinum">Цена входа</p>
          <p className="mt-1 text-xs text-muted">Доступные варианты входа</p>
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

function PrizeFundSelector({ options, value, onChange }: { options: number[]; value: number | null; onChange: (value: number) => void }) {
  const compact = options.length <= 5;
  return (
    <div className="premium-filter-shell rounded-[26px] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black tracking-[-0.02em] text-platinum">Призовой фонд</p>
          <p className="mt-1 text-xs text-muted">Сколько получит победитель</p>
        </div>
        {value ? <span className="rounded-full bg-gold px-3 py-1 text-xs font-black text-ink shadow-glow">{formatBonus(value)}</span> : null}
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

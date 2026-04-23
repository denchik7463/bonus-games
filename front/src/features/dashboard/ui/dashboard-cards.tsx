"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, BarChart3, Crown, DoorOpen, Gem, LayoutTemplate, UsersRound } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { DemoRole } from "@/lib/domain/types";
import { cn, formatBonus } from "@/lib/utils";
import type { DashboardMetricPointDto, DashboardResponseDto, PopularRoomTemplateDto, TopPlayerBalanceDto } from "@/src/features/dashboard/model/types";

export function DashboardHero({ role, generatedAt }: { role: DemoRole; generatedAt?: string }) {
  const isAdmin = role === "admin";
  return (
    <section className="surface-solid relative overflow-hidden rounded-[36px] p-6 md:p-10">
      <div className="pointer-events-none absolute inset-0 opacity-85">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.18),transparent_62%)]" />
        <div className="absolute right-[-12rem] top-8 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(123,60,255,0.13),transparent_64%)]" />
        <div className="absolute bottom-[-14rem] left-[42%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.09),transparent_64%)]" />
      </div>
      <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
        <div className="max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <BarChart3 className="h-4 w-4" />
            {isAdmin ? "Контроль продукта" : "Операционный обзор"}
          </p>
          <h1 className="text-balance text-4xl font-black leading-[0.98] tracking-[-0.05em] text-platinum md:text-6xl">
            Дашборд
            <br />
            <span className="brand-marker">активности</span>.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-smoke md:text-lg">
            Активные комнаты, игроки в раундах, популярность шаблонов и балансы. Один экран для быстрой проверки состояния продукта.
          </p>
        </div>
        <div className="surface-solid rounded-[28px] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-smoke">Срез данных</p>
          <p className="mt-2 text-2xl font-black text-platinum">{generatedAt ? formatDateTime(generatedAt) : "последние 24 часа"}</p>
          <p className="mt-2 text-sm leading-6 text-smoke">Быстрый переход к журналу, конфигурациям и текущей динамике продукта.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/transparency" variant="secondary">Открыть журнал</ButtonLink>
            {isAdmin ? <ButtonLink href="/admin/configurator">Конфигуратор</ButtonLink> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function DashboardSummary({ data }: { data: DashboardResponseDto }) {
  return (
    <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="Игроки сейчас" value={`${data.currentActivePlayers}`} description="В комнатах WAITING и FULL" icon={<UsersRound className="h-5 w-5" />} tone="gold" />
      <MetricCard title="Активные комнаты" value={`${data.currentActiveRooms}`} description="Ожидают или уже заполнены" icon={<DoorOpen className="h-5 w-5" />} tone="jade" />
      <MetricCard title="Шаблоны" value={`${data.popularTemplates.length}`} description="В рейтинге популярности" icon={<LayoutTemplate className="h-5 w-5" />} tone="violet" />
      <MetricCard title="Топ балансов" value={`${data.topBalances.length}`} description="До 100 игроков" icon={<Gem className="h-5 w-5" />} tone="cyan" />
    </div>
  );
}

export function DashboardCharts({ activePlayers, rooms }: { activePlayers: DashboardMetricPointDto[]; rooms: DashboardMetricPointDto[] }) {
  return (
    <div className="grid items-stretch gap-6 xl:grid-cols-2">
      <TimelineChart title="Игроки в активных комнатах" description="История онлайна по интервалам: только реальные игроки, без дублей в каждом интервале." data={activePlayers} color="#ffcd18" icon={<Activity className="h-4 w-4" />} />
      <TimelineChart title="Созданные комнаты" description="Динамика создания комнат по времени." data={rooms} color="#39d98a" icon={<DoorOpen className="h-4 w-4" />} />
    </div>
  );
}

export function PopularTemplatesTable({ templates }: { templates: PopularRoomTemplateDto[] }) {
  return (
    <Panel className="surface-solid relative overflow-hidden border-0 p-6 shadow-none before:hidden">
      <PanelGlow />
      <div className="relative mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Шаблоны</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-platinum">Популярные конфигурации</h2>
        </div>
        <LayoutTemplate className="h-6 w-6 text-gold" />
      </div>
      <div className="relative space-y-3">
        {templates.slice(0, 8).map((template, index) => (
          <div key={template.templateId} className="dashboard-row grid gap-3 rounded-[22px] p-4 md:grid-cols-[48px_1fr_auto] md:items-center">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold/10 text-sm font-black text-gold">{String(index + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-platinum">{template.templateName}</p>
              <p className="mt-1 text-sm text-smoke">{template.maxPlayers} игроков · вход {formatBonus(template.entryCost)} · {template.bonusEnabled ? "буст включен" : "без буста"}</p>
            </div>
            <span className="rounded-full bg-gold/10 px-3 py-1.5 text-sm font-black text-gold">{template.roomCount} комнат</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function TopBalancesTable({ balances }: { balances: TopPlayerBalanceDto[] }) {
  return (
    <Panel className="surface-solid relative overflow-hidden border-0 p-6 shadow-none before:hidden">
      <PanelGlow />
      <div className="relative mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Балансы</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-platinum">Топ игроков</h2>
        </div>
        <Crown className="h-6 w-6 text-gold" />
      </div>
      <div className="relative space-y-3">
        {balances.slice(0, 10).map((player, index) => (
          <div key={player.userId} className="dashboard-row rounded-[22px] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold/10 text-sm font-black text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 flex-1 items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-platinum">{player.username}</p>
                  <p className="mt-1 text-sm font-black text-jade">{formatBonus(player.totalBalance)}</p>
                </div>
                <p className="shrink-0 text-right text-xs font-semibold text-smoke">Резерв {formatBonus(player.reservedBalance)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function DashboardEmptyState({ message }: { message: string }) {
  return (
    <Panel className="surface-solid border-0 p-6 text-sm text-smoke shadow-none before:hidden">
      {message}
    </Panel>
  );
}

function TimelineChart({ title, description, data, color, icon }: { title: string; description: string; data: DashboardMetricPointDto[]; color: string; icon: React.ReactNode }) {
  const multipleDays = hasMultipleDays(data);
  const chartData = data.map((point) => ({
    ...point,
    label: formatBackendTimeLabel(point.time, multipleDays)
  }));

  return (
    <Panel className="surface-solid relative overflow-hidden border-0 p-6 shadow-none before:hidden">
      <PanelGlow />
      <div className="relative mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-gold">
            {icon}
            <p className="text-xs font-bold uppercase tracking-[0.2em]">График</p>
          </div>
        </div>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-platinum">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-smoke">{description}</p>
      </div>
      <div className="relative h-[280px]">
        {chartData.length ? (
          <InlineTimelineChart data={chartData} color={color} title={title} />
        ) : (
          <div className="grid h-full place-items-center rounded-[24px] bg-white/[0.035] px-6 text-center">
            <p className="max-w-sm text-sm font-semibold leading-6 text-smoke">Для этого графика пока нет точек данных.</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

function InlineTimelineChart({
  data,
  color,
  title
}: {
  data: Array<DashboardMetricPointDto & { label: string }>;
  color: string;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);
  const height = 280;
  const maxCount = Math.max(0, ...data.map((point) => point.count));
  const yMax = Math.max(1, maxCount);
  const allZero = maxCount === 0;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const updateWidth = () => {
      const nextWidth = element.clientWidth;
      if (nextWidth > 0) setWidth(nextWidth);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden rounded-[24px] bg-white/[0.025]">
      <LineChart width={width} height={height} data={data} margin={{ top: 18, right: 18, bottom: 22, left: 4 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="var(--chart-label)"
          tickLine={false}
          axisLine={false}
          interval={Math.max(0, Math.ceil(data.length / 10) - 1)}
          tick={{ fontSize: 11, fontWeight: 700 }}
        />
        <YAxis stroke="var(--chart-label)" tickLine={false} axisLine={false} width={36} allowDecimals={false} domain={[0, yMax]} ticks={allZero ? [0] : undefined} tick={{ fontSize: 11, fontWeight: 700 }} />
        <Tooltip
          cursor={{ stroke: color, strokeOpacity: 0.22, strokeWidth: 2 }}
          contentStyle={{ background: "var(--tooltip-bg)", border: "none", borderRadius: 18, boxShadow: "var(--tooltip-shadow)" }}
          formatter={(value) => [`${value}`, "Количество"]}
          labelFormatter={(label) => `${title}: ${label}`}
        />
        <ReferenceLine y={0} stroke={color} strokeOpacity={0.55} strokeWidth={2} />
        <Line type="linear" dataKey="count" stroke={color} strokeWidth={3} dot={{ r: 4, fill: color, strokeWidth: 0 }} activeDot={{ r: 6, fill: color, strokeWidth: 0 }} isAnimationActive={false} />
      </LineChart>
    </div>
  );
}

function MetricCard({ title, value, description, icon, tone }: { title: string; value: string; description: string; icon: React.ReactNode; tone: "gold" | "jade" | "violet" | "cyan" }) {
  return (
    <div className={cn("dashboard-metric relative overflow-hidden rounded-[28px] p-5", `dashboard-metric--${tone}`)}>
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-smoke">{title}</p>
          <p className="mt-3 text-4xl font-black tracking-[-0.045em] text-platinum">{value}</p>
          <p className="mt-2 text-sm leading-6 text-smoke">{description}</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.055] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">{icon}</span>
      </div>
    </div>
  );
}

function PanelGlow() {
  return (
    <>
      <div className="pointer-events-none absolute -right-28 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.11),transparent_64%)]" />
      <div className="pointer-events-none absolute -left-28 bottom-[-14rem] h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.08),transparent_64%)]" />
    </>
  );
}

function formatBackendTimeLabel(value: string, includeDate: boolean) {
  const date = parseDashboardDate(value);
  if (!date) return value;

  return date.toLocaleString("ru-RU", {
    day: includeDate ? "2-digit" : undefined,
    month: includeDate ? "2-digit" : undefined,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).replace(",", "");
}

function hasMultipleDays(data: DashboardMetricPointDto[]) {
  const days = new Set(
    data
      .map((point) => {
        const date = parseDashboardDate(point.time);
        if (!date) return null;
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      })
      .filter(Boolean)
  );
  return days.size > 1;
}

function formatDateTime(value: string) {
  const date = parseDashboardDate(value);
  if (!date) return value;
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function parseDashboardDate(value: string) {
  if (!value) return null;

  const withZone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

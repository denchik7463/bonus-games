"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { AccessGuard } from "@/components/domain/access-guard";
import { AppFrame } from "@/components/layout/app-nav";
import { Button } from "@/components/ui/button";
import {
  DashboardCharts,
  DashboardEmptyState,
  DashboardHero,
  DashboardSummary,
  PopularTemplatesTable,
  TopBalancesTable
} from "@/src/features/dashboard/ui/dashboard-cards";
import { dashboardQueryKeys } from "@/src/features/dashboard/model/query-keys";
import { dashboardService } from "@/src/features/dashboard/model/service";
import type { DashboardQueryParams } from "@/src/features/dashboard/model/types";
import { useAppStore } from "@/lib/store/app-store";
import { getUserFriendlyError } from "@/src/shared/api/errors";

const periods = [
  { label: "24 часа", days: 1, bucketMinutes: 30 },
  { label: "7 дней", days: 7, bucketMinutes: 360 },
  { label: "30 дней", days: 30, bucketMinutes: 1440 }
];

export default function DashboardPage() {
  const user = useAppStore((state) => state.user);
  const [periodIndex, setPeriodIndex] = useState(0);
  const params = useMemo(() => buildPeriodParams(periods[periodIndex]), [periodIndex]);
  const canLoadDashboard = user.role === "expert" || user.role === "admin";
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: dashboardQueryKeys.summary(params),
    queryFn: () => dashboardService.getDashboard(params),
    enabled: canLoadDashboard
  });

  return (
    <AppFrame>
      <AccessGuard roles={["expert", "admin"]} title="Раздел недоступен">
        <div className="space-y-6">
          <DashboardHero role={user.role} generatedAt={data?.generatedAt} />

          <section className="surface-solid relative overflow-hidden rounded-[30px] p-4 md:p-5">
            <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Период</p>
                <p className="mt-1 text-sm text-smoke">Графики можно смотреть по разной глубине данных.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {periods.map((period, index) => (
                  <button
                    key={period.label}
                    type="button"
                    onClick={() => setPeriodIndex(index)}
                    className={
                      "rounded-full px-4 py-2 text-sm font-bold transition " +
                      (periodIndex === index ? "bg-gold text-ink shadow-glow" : "surface-inset text-smoke hover:text-platinum")
                    }
                  >
                    {period.label}
                  </button>
                ))}
                <Button type="button" variant="secondary" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={"mr-2 h-4 w-4 " + (isFetching ? "animate-spin" : "")} />
                  Обновить
                </Button>
              </div>
            </div>
          </section>

          {isLoading ? <DashboardEmptyState message="Загружаем дашборд..." /> : null}
          {error ? <DashboardEmptyState message={getUserFriendlyError(error)} /> : null}

          {data ? (
            <>
              <DashboardSummary data={data} />
              <DashboardCharts activePlayers={data.activePlayersTimeline} rooms={data.roomCountTimeline} />
              <div className="grid items-start gap-6 xl:grid-cols-2">
                <PopularTemplatesTable templates={data.popularTemplates} />
                <TopBalancesTable balances={data.topBalances} />
              </div>
            </>
          ) : null}
        </div>
      </AccessGuard>
    </AppFrame>
  );
}

function buildPeriodParams(period: { days: number; bucketMinutes: number }): DashboardQueryParams {
  const end = endOfLocalDay(new Date());
  const start = startOfLocalDay(end);
  start.setDate(start.getDate() - period.days + 1);
  return {
    start: withoutMs(start),
    end: withoutMs(end),
    bucketMinutes: period.bucketMinutes
  };
}

function withoutMs(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "");
}

function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 0);
  return next;
}

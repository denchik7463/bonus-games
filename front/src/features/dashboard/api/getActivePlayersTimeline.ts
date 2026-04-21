import { apiGet } from "@/src/shared/api/client";
import type { DashboardMetricPointDto, DashboardQueryParams } from "@/src/features/dashboard/model/types";
import { dashboardQueryString } from "@/src/features/dashboard/model/query-string";

export function getActivePlayersTimeline(params: DashboardQueryParams = {}) {
  return apiGet<DashboardMetricPointDto[]>(`/api/dashboard/active-players${dashboardQueryString(params)}`);
}

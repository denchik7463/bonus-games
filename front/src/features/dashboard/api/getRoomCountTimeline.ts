import { apiGet } from "@/src/shared/api/client";
import type { DashboardMetricPointDto, DashboardQueryParams } from "@/src/features/dashboard/model/types";
import { dashboardQueryString } from "@/src/features/dashboard/model/query-string";

export function getRoomCountTimeline(params: DashboardQueryParams = {}) {
  return apiGet<DashboardMetricPointDto[]>(`/api/dashboard/rooms${dashboardQueryString(params)}`);
}

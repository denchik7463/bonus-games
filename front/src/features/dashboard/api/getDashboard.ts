import { apiGet } from "@/src/shared/api/client";
import type { DashboardQueryParams, DashboardResponseDto } from "@/src/features/dashboard/model/types";
import { dashboardQueryString } from "@/src/features/dashboard/model/query-string";

export function getDashboard(params: DashboardQueryParams = {}) {
  return apiGet<DashboardResponseDto>(`/api/dashboard${dashboardQueryString(params)}`);
}

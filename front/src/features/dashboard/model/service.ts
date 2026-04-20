import { getDashboard } from "@/src/features/dashboard/api/getDashboard";
import { getActivePlayersTimeline } from "@/src/features/dashboard/api/getActivePlayersTimeline";
import { getRoomCountTimeline } from "@/src/features/dashboard/api/getRoomCountTimeline";
import { getPopularTemplates } from "@/src/features/dashboard/api/getPopularTemplates";
import { getTopBalances } from "@/src/features/dashboard/api/getTopBalances";
import type { DashboardQueryParams } from "@/src/features/dashboard/model/types";

export const dashboardService = {
  getDashboard: (params: DashboardQueryParams = {}) => getDashboard(params),
  getActivePlayersTimeline: (params: DashboardQueryParams = {}) => getActivePlayersTimeline(params),
  getRoomCountTimeline: (params: DashboardQueryParams = {}) => getRoomCountTimeline(params),
  getPopularTemplates,
  getTopBalances
};

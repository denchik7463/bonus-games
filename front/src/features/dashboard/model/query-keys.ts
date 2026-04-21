import type { DashboardQueryParams } from "@/src/features/dashboard/model/types";

export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  summary: (params: DashboardQueryParams = {}) => [...dashboardQueryKeys.all, "summary", params] as const,
  activePlayers: (params: DashboardQueryParams = {}) => [...dashboardQueryKeys.all, "active-players", params] as const,
  rooms: (params: DashboardQueryParams = {}) => [...dashboardQueryKeys.all, "rooms", params] as const,
  popularTemplates: ["dashboard", "popular-templates"] as const,
  topBalances: ["dashboard", "top-balances"] as const
};

import type { DashboardQueryParams } from "@/src/features/dashboard/model/types";

export function dashboardQueryString(params: DashboardQueryParams = {}) {
  const query = new URLSearchParams();
  if (params.start) query.set("start", params.start);
  if (params.end) query.set("end", params.end);
  if (params.bucketMinutes) query.set("bucketMinutes", String(params.bucketMinutes));
  const value = query.toString();
  return value ? `?${value}` : "";
}

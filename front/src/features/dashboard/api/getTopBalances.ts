import { apiGet } from "@/src/shared/api/client";
import type { TopPlayerBalanceDto } from "@/src/features/dashboard/model/types";

export function getTopBalances() {
  return apiGet<TopPlayerBalanceDto[]>("/api/dashboard/top-balances");
}

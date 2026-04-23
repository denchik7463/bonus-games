import { apiGet } from "@/src/shared/api/client";
import type { WinStreakDto } from "@/src/features/journal/model/types";

export function getMyWinStreak() {
  return apiGet<WinStreakDto>("/api/game/journal/me/win-streak");
}

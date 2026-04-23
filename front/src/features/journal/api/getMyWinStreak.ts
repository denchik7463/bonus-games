import { apiGet } from "@/src/shared/api/client";
import type { WinStreakDto } from "@/src/features/journal/model/types";

export function getMyWinStreak() {
  return apiGet<unknown>("/api/game/journal/me/win-streak").then(normalizeWinStreak);
}

function normalizeWinStreak(value: unknown): WinStreakDto {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawStreak = record.currentWinStreak ?? record.currentWinStrea ?? record.winStreak ?? record.streak;
  return {
    userId: typeof record.userId === "string" ? record.userId : "",
    username: typeof record.username === "string" ? record.username : "",
    currentWinStreak: typeof rawStreak === "number" && Number.isFinite(rawStreak) ? Math.max(0, rawStreak) : 0,
    latestGameResultId: typeof record.latestGameResultId === "string" ? record.latestGameResultId : null,
    latestGameAt: typeof record.latestGameAt === "string" ? record.latestGameAt : null,
    calculatedAt: typeof record.calculatedAt === "string" ? record.calculatedAt : null
  };
}

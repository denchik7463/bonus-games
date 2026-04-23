import { getDashboard } from "@/src/features/dashboard/api/getDashboard";
import { getActivePlayersTimeline } from "@/src/features/dashboard/api/getActivePlayersTimeline";
import { getRoomCountTimeline } from "@/src/features/dashboard/api/getRoomCountTimeline";
import { getPopularTemplates } from "@/src/features/dashboard/api/getPopularTemplates";
import { getTopBalances } from "@/src/features/dashboard/api/getTopBalances";
import type { DashboardMetricPointDto, DashboardMetricPointRawDto, DashboardQueryParams, DashboardResponseDto } from "@/src/features/dashboard/model/types";

export const dashboardService = {
  getDashboard: async (params: DashboardQueryParams = {}) => {
    const [summaryResult, activePlayersResult, roomsResult] = await Promise.allSettled([
      getDashboard(params),
      getActivePlayersTimeline(params),
      getRoomCountTimeline(params)
    ]);

    if (summaryResult.status === "rejected") {
      return getDashboardFromSeparateEndpoints(params, summaryResult.reason);
    }

    const normalized = normalizeDashboard(summaryResult.value);
    const activePlayersTimeline = activePlayersResult.status === "fulfilled"
      ? normalizeTimeline(activePlayersResult.value, "players")
      : [];
    const roomCountTimeline = roomsResult.status === "fulfilled"
      ? normalizeTimeline(roomsResult.value, "rooms")
      : [];

    return {
      ...normalized,
      currentActivePlayers: normalized.currentActivePlayers,
      currentActiveRooms: normalized.currentActiveRooms,
      activePlayersTimeline,
      roomCountTimeline
    };
  },
  getActivePlayersTimeline: (params: DashboardQueryParams = {}) => getActivePlayersTimeline(params),
  getRoomCountTimeline: (params: DashboardQueryParams = {}) => getRoomCountTimeline(params),
  getPopularTemplates,
  getTopBalances
};

async function getDashboardFromSeparateEndpoints(params: DashboardQueryParams, originalError: unknown): Promise<DashboardResponseDto> {
  try {
    const [activePlayersTimeline, roomCountTimeline, popularTemplates, topBalances] = await Promise.all([
      getActivePlayersTimeline(params),
      getRoomCountTimeline(params),
      getPopularTemplates(),
      getTopBalances()
    ]);

    return normalizeDashboard({
      generatedAt: new Date().toISOString(),
      currentActivePlayers: normalizeTimeline(activePlayersTimeline, "players").at(-1)?.count ?? 0,
      currentActiveRooms: normalizeTimeline(roomCountTimeline, "rooms").at(-1)?.count ?? 0,
      activePlayersTimeline,
      roomCountTimeline,
      popularTemplates,
      topBalances
    });
  } catch {
    throw originalError;
  }
}

function normalizeDashboard(data: DashboardResponseDto): DashboardResponseDto {
  const popularTemplates = Array.isArray(data.popularTemplates) ? data.popularTemplates : [];
  const topBalances = Array.isArray(data.topBalances) ? data.topBalances : [];

  return {
    generatedAt: data.generatedAt ?? new Date().toISOString(),
    currentActivePlayers: data.currentActivePlayers ?? 0,
    currentActiveRooms: data.currentActiveRooms ?? 0,
    activePlayersTimeline: normalizeTimeline(data.activePlayersTimeline, "players"),
    roomCountTimeline: normalizeTimeline(data.roomCountTimeline, "rooms"),
    popularTemplates,
    topBalances
  };
}

function normalizeTimeline(points: unknown, valueHint: "players" | "rooms"): DashboardMetricPointDto[] {
  if (!Array.isArray(points)) return [];

  return points
    .map((point) => normalizePoint(point, valueHint))
    .filter((point): point is DashboardMetricPointDto => Boolean(point));
}

function normalizePoint(point: unknown, valueHint: "players" | "rooms"): DashboardMetricPointDto | null {
  if (!point || typeof point !== "object") return null;
  const raw = point as DashboardMetricPointRawDto;
  const time = raw.time ?? raw.bucket ?? raw.bucketStart ?? raw.bucketEnd ?? raw.dateTime ?? raw.timestamp ?? raw.generatedAt ?? raw.createdAt;
  const rawValue = raw.count
    ?? raw.value
    ?? raw.total
    ?? (valueHint === "rooms"
      ? raw.rooms ?? raw.roomCount ?? raw.activeRooms ?? raw.currentRooms
      : raw.players ?? raw.playerCount ?? raw.activePlayers ?? raw.currentPlayers);
  const value = typeof rawValue === "string" ? Number(rawValue) : rawValue;
  if (!time || typeof value !== "number" || !Number.isFinite(value)) return null;

  return {
    time,
    count: value
  };
}

import type { JoinRoomParams } from "@/src/features/rooms/model/types";

export function normalizeJoinPayload(payload: Omit<JoinRoomParams, "roomId">): Omit<JoinRoomParams, "roomId"> {
  if (Array.isArray(payload.seats) && payload.seats.length > 0) {
    return {
      seats: [...new Set(payload.seats)].sort((a, b) => a - b)
    };
  }

  return {
    seatsCount: Math.max(1, payload.seatsCount ?? 1)
  };
}

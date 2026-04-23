import { apiGet } from "@/src/shared/api/client";
import type { RoomDto } from "@/src/features/rooms/model/types";

export function getRoomState(roomId: string) {
  return apiGet<RoomDto>(`/api/rooms/${encodeURIComponent(roomId)}/state`);
}

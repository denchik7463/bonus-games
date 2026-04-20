import { apiGet } from "@/src/shared/api/client";
import type { RoomEventDto } from "@/src/features/rooms/model/types";

export function getRoomEvents(roomId: string) {
  return apiGet<RoomEventDto[]>(`/api/rooms/${roomId}/events`);
}

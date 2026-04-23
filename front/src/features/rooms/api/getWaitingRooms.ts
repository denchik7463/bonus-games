import { apiGet } from "@/src/shared/api/client";
import type { RoomDto } from "@/src/features/rooms/model/types";

export function getWaitingRooms() {
  return apiGet<RoomDto[]>("/api/rooms/waiting");
}

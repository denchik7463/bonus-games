import { apiPost } from "@/src/shared/api/client";
import type { CreateRoomRequest, RoomDto } from "@/src/features/rooms/model/types";

export function createRoom(payload: CreateRoomRequest) {
  return apiPost<RoomDto, CreateRoomRequest>("/api/rooms/create", payload);
}

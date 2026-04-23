import { apiPost } from "@/src/shared/api/client";
import type { FindRoomRequest, RoomDto } from "@/src/features/rooms/model/types";

export function findRoom(payload: FindRoomRequest) {
  return apiPost<RoomDto, FindRoomRequest>("/api/room/find", payload);
}

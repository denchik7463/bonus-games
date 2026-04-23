import { apiGet } from "@/src/shared/api/client";
import type { RoomDto } from "@/src/features/rooms/model/types";

export function getRoomByCode(shortId: string) {
  return apiGet<RoomDto>(`/api/rooms/code/${encodeURIComponent(shortId)}`);
}

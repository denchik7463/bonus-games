import { apiPostUnknown } from "@/src/shared/api/client";
import type { FinishRoomRequest } from "@/src/features/rooms/model/types";

export function finishRoom(roomId: string, payload: FinishRoomRequest) {
  return apiPostUnknown<FinishRoomRequest>(`/api/rooms/${roomId}/finish`, payload);
}

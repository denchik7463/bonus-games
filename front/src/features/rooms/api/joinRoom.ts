import { http } from "@/src/shared/api/http";
import { normalizeApiError } from "@/src/shared/api/errors";
import type { JoinRoomParams } from "@/src/features/rooms/model/types";

export async function joinRoom(roomId: JoinRoomParams["roomId"], boostUsed: JoinRoomParams["boostUsed"] = false) {
  try {
    const response = await http.post<unknown>(`/api/rooms/${roomId}/join`, { boostUsed });
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

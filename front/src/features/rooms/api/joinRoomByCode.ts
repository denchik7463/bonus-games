import { http } from "@/src/shared/api/http";
import { normalizeApiError } from "@/src/shared/api/errors";
import type { JoinRoomParams } from "@/src/features/rooms/model/types";
import { normalizeJoinPayload } from "@/src/features/rooms/model/join-payload";

export async function joinRoomByCode(shortId: string, payload: Omit<JoinRoomParams, "roomId">) {
  try {
    const response = await http.post<unknown>(`/api/rooms/code/${encodeURIComponent(shortId)}/join`, normalizeJoinPayload(payload));
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

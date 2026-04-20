import { apiPut } from "@/src/shared/api/client";
import type { RoomTemplateDto, UpdateRoomTemplateRequest } from "@/src/features/admin-room-templates/model/types";

export function updateRoomTemplate(id: string, payload: UpdateRoomTemplateRequest) {
  return apiPut<RoomTemplateDto, UpdateRoomTemplateRequest>(`/api/room-templates/${id}`, payload);
}
